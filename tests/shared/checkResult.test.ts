import { describe, expect, it } from "vitest";
import { checkTicketsAgainstDraw, highestScore } from "../../src/shared/lib/checkResult";

describe("checkTicketsAgainstDraw", () => {
  it("counts hits per ticket against the official draw", () => {
    const tickets = [
      [1, 2, 3, 4, 5],
      [4, 5, 6, 7, 8],
    ];
    const result = checkTicketsAgainstDraw(tickets, { contest: 1, numbers: [1, 2, 3, 9, 10] });
    expect(result.hitsPerTicket).toEqual([3, 0]);
    expect(highestScore(result)).toBe(3);
  });

  it("does not invent a monetary prize", () => {
    const result = checkTicketsAgainstDraw([[1, 2, 3]], { contest: 1, numbers: [1, 2, 3] });
    expect(result.prizeGrossBRL).toBeUndefined();
  });
});
