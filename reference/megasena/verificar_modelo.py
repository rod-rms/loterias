"""Exact, reproducible checks for a 6-of-60 lottery research model.

No historical draw data, prediction, app, or betting integration is used.
All amounts assume BRL 6 per elementary six-number ticket.
Run with Python 3.10+; standard library only.
"""
from __future__ import annotations
from decimal import Decimal, localcontext
from fractions import Fraction
from itertools import combinations
from math import comb, expm1
import json
from pathlib import Path

TOTAL = comb(60, 6)
COST = 6


def count_exact_hits(hits: int) -> int:
    if not 0 <= hits <= 6:
        raise ValueError('hits must be between 0 and 6')
    return comb(6, hits) * comb(54, 6 - hits)


def favourable_draws(ticket: tuple[int, ...], threshold: int) -> set[int]:
    """Enumerate every draw with at least threshold matches, as 60-bit masks."""
    if len(ticket) != 6 or len(set(ticket)) != 6 or not all(1 <= n <= 60 for n in ticket):
        raise ValueError('A ticket must contain six different integers in [1, 60]')
    if threshold not in (4, 5, 6):
        raise ValueError('threshold must be 4, 5, or 6')
    outside = tuple(n for n in range(1, 61) if n not in ticket)
    result: set[int] = set()
    for hit_count in range(threshold, 7):
        hit_masks = [sum(1 << (n - 1) for n in part) for part in combinations(ticket, hit_count)]
        miss_masks = [sum(1 << (n - 1) for n in part) for part in combinations(outside, 6 - hit_count)]
        for hit_mask in hit_masks:
            for miss_mask in miss_masks:
                result.add(hit_mask | miss_mask)
    return result


def count_union(portfolio: tuple[tuple[int, ...], ...], threshold: int) -> int:
    result: set[int] = set()
    for ticket in portfolio:
        result.update(favourable_draws(ticket, threshold))
    return len(result)


def average_random_probability(n_tickets: int, threshold: int) -> Decimal:
    """Average over uniformly selected portfolios of n DISTINCT tickets.

    Probability = 1 - C(TOTAL-K,n)/C(TOTAL,n), where K is the
    number of tickets matching any fixed draw at the given threshold.
    """
    k = sum(count_exact_hits(h) for h in range(threshold, 7))
    if not 1 <= n_tickets <= TOTAL - k:
        raise ValueError('Invalid portfolio size for this implementation')
    with localcontext() as ctx:
        ctx.prec = 50
        no_hit = Decimal(1)
        for j in range(n_tickets):
            no_hit *= Decimal(TOTAL - k - j) / Decimal(TOTAL - j)
        return Decimal(1) - no_hit


def probability_report(favourable: int) -> dict[str, object]:
    p = Fraction(favourable, TOTAL)
    return {'favourable_draws': favourable, 'fraction': str(p),
            'probability': float(p), 'percent': 100 * float(p),
            'one_in': 1 / float(p)}


def main() -> None:
    n = 7
    concentrated = tuple(combinations(range(1, 8), 6))
    disjoint = tuple(tuple(range(6 * i + 1, 6 * i + 7)) for i in range(n))
    results: dict[str, object] = {
        'method': 'Exact combinatorics and complete enumeration of favourable draws',
        'historical_data_used': False,
        'total_possible_draws': TOTAL,
        'elementary_ticket_cost_brl': COST,
        'number_of_tickets': n,
        'total_cost_brl': n * COST,
        'per_ticket_exact_hits': {str(h): count_exact_hits(h) for h in (4, 5, 6)},
        'portfolios': {},
    }
    for label, portfolio in [('all_combinations_within_seven_numbers', concentrated),
                             ('seven_pairwise_disjoint_tickets', disjoint)]:
        report: dict[str, object] = {}
        for threshold in (4, 5, 6):
            counted = count_union(portfolio, threshold)
            if label == 'all_combinations_within_seven_numbers':
                expected_count = sum(comb(7, h) * comb(53, 6 - h) for h in range(threshold, 7))
            else:
                expected_count = n * sum(count_exact_hits(h) for h in range(threshold, 7))
            assert counted == expected_count, (label, threshold, counted, expected_count)
            report[f'at_least_{threshold}'] = probability_report(counted)
        results['portfolios'][label] = report
    results['uniform_distinct_portfolio_average'] = {
        f'at_least_{h}_percent': str(100 * average_random_probability(n, h)) for h in (4, 5, 6)
    }
    k4 = sum(count_exact_hits(h) for h in (4, 5, 6))
    upper = Fraction(n * k4, TOTAL)
    avg = average_random_probability(n, 4)
    results['expected_prize_winning_tickets_both_portfolios'] = float(upper)
    results['relative_improvement_disjoint_vs_random_mean_percent'] = 100 * (float(upper) / float(avg) - 1)
    results['percentage_point_improvement_disjoint_vs_random_mean'] = 100 * (float(upper) - float(avg))
    results['relative_improvement_disjoint_vs_concentrated_percent'] = 100 * (n * k4 / 49350 - 1)
    results['poisson_share_scenarios_not_real_world_estimates'] = {
        str(lam): -expm1(-lam) / lam for lam in (0.1, 1.0, 3.0)
    }
    # Global relabeling preserves all uniform-draw coverage probabilities.
    permutation = {i: 61 - i for i in range(1, 61)}
    relabeled = tuple(tuple(sorted(permutation[x] for x in ticket)) for ticket in disjoint)
    assert count_union(relabeled, 4) == n * k4
    results['global_relabeling_invariance_checked'] = True
    results['zero_prize_probability_disjoint_percent'] = 100 * (1 - float(upper))
    target = Path(__file__).with_name('resultados_verificados.json')
    target.write_text(json.dumps(results, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
