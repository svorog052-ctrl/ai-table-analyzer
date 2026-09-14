const fileInput = document.querySelector("#fileInput");
const parseButton = document.querySelector("#parseButton");
const fileStatus = document.querySelector("#fileStatus");
const previewSection = document.querySelector("#previewSection");
const analysisSection = document.querySelector("#analysisSection");
const previewTable = document.querySelector("#previewTable");
const rowCount = document.querySelector("#rowCount");
const question = document.querySelector("#question");
const analyzeButton = document.querySelector("#analyzeButton");
const answer = document.querySelector("#answer");
const analysisMode = document.querySelector("#analysisMode");

let tableRows = [];
let tableHeaders = [];

function setBusy(button, busy, label) {
  button.disabled = busy;
  button.dataset.originalLabel ||= button.textContent;
  button.textContent = busy ? label : button.dataset.originalLabel;
}

function renderPreview(headers, rows) {
  const head = `<thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>`;
  const body = rows.slice(0, 20).map((row) =>
    `<tr>${headers.map((header) => `<td>${escapeHtml(row[header] ?? "")}</td>`).join("")}</tr>`
  ).join("");
  previewTable.innerHTML = `${head}<tbody>${body}</tbody>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function readJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

parseButton.addEventListener("click", async () => {
  const file = fileInput.files?.[0];
  if (!file) {
    fileStatus.textContent = "Choose a CSV or XLSX file first.";
    return;
  }

  setBusy(parseButton, true, "Parsing…");
  fileStatus.textContent = "Reading table…";
  previewSection.classList.add("hidden");
  analysisSection.classList.add("hidden");

  try {
    const body = new FormData();
    body.append("file", file);
    const payload = await readJson(await fetch("/api/parse", { method: "POST", body }));

    tableRows = payload.rows;
    tableHeaders = payload.headers;
    renderPreview(tableHeaders, tableRows);
    rowCount.textContent = `${payload.rowCount} rows`;
    fileStatus.textContent = `${payload.fileName} · sheet: ${payload.sheetName}`;
    previewSection.classList.remove("hidden");
    analysisSection.classList.remove("hidden");
  } catch (error) {
    fileStatus.textContent = `Error: ${error.message}`;
  } finally {
    setBusy(parseButton, false);
  }
});

analyzeButton.addEventListener("click", async () => {
  if (tableRows.length === 0) return;
  setBusy(analyzeButton, true, "Analyzing…");
  answer.textContent = "Working…";
  analysisMode.textContent = "";

  try {
    const payload = await readJson(await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: tableRows, question: question.value })
    }));
    analysisMode.textContent = payload.mode === "ai" ? `AI · ${payload.model}` : "DEMO MODE";
    answer.textContent = payload.answer;
  } catch (error) {
    answer.textContent = `Error: ${error.message}`;
  } finally {
    setBusy(analyzeButton, false);
  }
});
