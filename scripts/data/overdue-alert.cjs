/**
 * Opens or comments on the `data-update-failure` issue when the updater reports an overdue draw
 * (see scripts/data/overdue.mjs). Called from .github/workflows/data-update.yml via actions/github-script.
 *
 * - Shares the label with the failure alert on purpose, so the existing "close incident on recovery"
 *   step closes it once data catches up (that step is skipped on runs that are themselves overdue).
 * - Never comments more than once per MIN_INTERVAL_MS on an already-open issue (no spam): the time of
 *   the last notice is read from the issue body / comments carrying MARKER.
 * - The text states a likely cause, never asserts a CAIXA fault, and mentions that the official
 *   calendar may have moved the draw (holidays/exceptions).
 */

const LABEL = "data-update-failure";
const MARKER = "<!-- data-update-overdue -->";
const MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;
const TITLE = "[Data] Resultado oficial possivelmente ainda não publicado";
const MODALITY_NAMES = { lotofacil: "Lotofácil", megasena: "Mega-Sena" };

function pad(n) {
  return String(n).padStart(2, "0");
}

/** UTC ISO string -> "DD/MM/YYYY HH:MM" in BRT (UTC-3). */
function formatBrt(iso) {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return String(iso);
  const b = new Date(t.getTime() - 3 * 60 * 60 * 1000);
  return `${pad(b.getUTCDate())}/${pad(b.getUTCMonth() + 1)}/${b.getUTCFullYear()} ${pad(b.getUTCHours())}:${pad(b.getUTCMinutes())}`;
}

function buildBody({ entries, runUrl, nowIso }) {
  const lines = entries.map(
    (e) =>
      `- **${MODALITY_NAMES[e.modality] ?? e.modality}**: último concurso na base e na fonte oficial: ${e.officialLatest}; ` +
      `próximo sorteio informado pela fonte: ${e.nextDrawDateBr}; tolerância até ${formatBrt(e.deadlineIso)} (BRT).`,
  );
  return [
    MARKER,
    "**O resultado oficial pode ainda não ter sido publicado, ou há um problema no atualizador ou na fonte.**",
    "",
    "Para a(s) modalidade(s) abaixo, a data do próximo sorteio informada pela fonte oficial já passou da margem de tolerância e o último concurso publicado continua sendo o que já estava na base:",
    "",
    ...lines,
    "",
    "Causa provável (não confirmada): o resultado oficial ainda não foi publicado, ou existe um problema no atualizador ou na fonte. O calendário oficial da CAIXA também pode ter movido o sorteio (feriado ou mudança de agenda), caso em que isto se resolve sozinho. Este aviso não afirma que houve falha da CAIXA.",
    "",
    `- Execução: ${runUrl}`,
    `- Horário (UTC): ${nowIso}`,
    "",
    "O último dataset validado foi preservado. Esta issue fecha sozinha quando os dados forem atualizados; novos avisos nela são limitados a um a cada 12 h.",
  ].join("\n");
}

async function ensureLabelExists(github, owner, repo) {
  try {
    await github.rest.issues.getLabel({ owner, repo, name: LABEL });
  } catch (getError) {
    if (getError.status !== 404) throw getError;
    try {
      await github.rest.issues.createLabel({
        owner,
        repo,
        name: LABEL,
        color: "d73a4a",
        description: "Falha automática na atualização dos dados das loterias (criada/gerenciada por data-update.yml)",
      });
    } catch (createError) {
      if (createError.status !== 422) throw createError; // 422 = a concurrent run already created it.
    }
  }
}

/** @returns {Promise<{ action: "created" | "commented" | "skipped-recent" | "none" }>} */
async function overdueAlert({ github, context, entries, now = new Date() }) {
  if (!Array.isArray(entries) || entries.length === 0) return { action: "none" };
  const { owner, repo } = context.repo;
  const runUrl = `${context.serverUrl}/${owner}/${repo}/actions/runs/${context.runId}`;
  const body = buildBody({ entries, runUrl, nowIso: now.toISOString() });

  await ensureLabelExists(github, owner, repo);
  const { data: openIssues } = await github.rest.issues.listForRepo({ owner, repo, state: "open", labels: LABEL });

  if (openIssues.length === 0) {
    await github.rest.issues.create({ owner, repo, title: TITLE, body, labels: [LABEL] });
    return { action: "created" };
  }

  const issue = openIssues[0];
  const listArgs = { owner, repo, issue_number: issue.number, per_page: 100 };
  const comments = typeof github.paginate === "function"
    ? await github.paginate(github.rest.issues.listComments, listArgs)
    : (await github.rest.issues.listComments(listArgs)).data;
  const noticeTimes = comments.filter((c) => typeof c.body === "string" && c.body.includes(MARKER)).map((c) => new Date(c.created_at).getTime());
  if (typeof issue.body === "string" && issue.body.includes(MARKER)) noticeTimes.push(new Date(issue.created_at).getTime());
  const lastNotice = noticeTimes.length ? Math.max(...noticeTimes) : null;
  if (lastNotice !== null && now.getTime() - lastNotice < MIN_INTERVAL_MS) return { action: "skipped-recent" };

  await github.rest.issues.createComment({ owner, repo, issue_number: issue.number, body });
  return { action: "commented" };
}

module.exports = overdueAlert;
module.exports.MARKER = MARKER;
module.exports.MIN_INTERVAL_MS = MIN_INTERVAL_MS;
module.exports.LABEL = LABEL;
module.exports.buildBody = buildBody;
module.exports.formatBrt = formatBrt;
