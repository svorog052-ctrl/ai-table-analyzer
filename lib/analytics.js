function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function parseNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/\s+/g, "")
    .replace(/₽|\$|€|£/g, "")
    .replace(",", ".");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function findColumn(headers, candidates) {
  const normalized = headers.map(normalize);
  const wanted = candidates.map(normalize);
  const index = normalized.findIndex((header) => wanted.includes(header));
  return index >= 0 ? headers[index] : null;
}

export function buildDemoAnalysis(rows, question = "") {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Table has no data rows.");
  }

  const headers = [...new Set(rows.flatMap((row) => Object.keys(row ?? {})))];
  const productColumn = findColumn(headers, ["product", "item", "name", "товар", "название"]);
  const salesColumn = findColumn(headers, ["sales", "revenue", "выручка", "продажи"]);
  const expenseColumn = findColumn(headers, ["expenses", "expense", "cost", "costs", "расходы", "затраты"]);

  if (salesColumn && expenseColumn) {
    const ranked = rows
      .map((row, index) => {
        const sales = parseNumber(row[salesColumn]);
        const expenses = parseNumber(row[expenseColumn]);
        if (sales === null || expenses === null) return null;
        return {
          label: productColumn ? String(row[productColumn] ?? `Row ${index + 1}`) : `Row ${index + 1}`,
          sales,
          expenses,
          profit: sales - expenses
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.profit - a.profit);

    if (ranked.length > 0) {
      const best = ranked[0];
      const worst = ranked[ranked.length - 1];
      const totalProfit = ranked.reduce((sum, row) => sum + row.profit, 0);
      return [
        `Demo analysis for: ${question || "table profitability"}`,
        `Best result: ${best.label} — profit ${best.profit.toFixed(2)}.`,
        `Lowest result: ${worst.label} — profit ${worst.profit.toFixed(2)}.`,
        `Total profit across ${ranked.length} analyzed rows: ${totalProfit.toFixed(2)}.`,
        "Tip: add an AI API key to receive a natural-language model analysis instead of the deterministic demo response."
      ].join("\n");
    }
  }

  const numericColumns = headers
    .map((header) => {
      const values = rows.map((row) => parseNumber(row[header])).filter((value) => value !== null);
      if (values.length === 0) return null;
      const sum = values.reduce((total, value) => total + value, 0);
      return {
        header,
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        average: sum / values.length
      };
    })
    .filter(Boolean);

  if (numericColumns.length === 0) {
    return `Demo analysis: ${rows.length} rows loaded, but no numeric columns were detected. Question: ${question || "not specified"}.`;
  }

  return [
    `Demo analysis for: ${question || "numeric summary"}`,
    `Rows: ${rows.length}. Numeric columns: ${numericColumns.length}.`,
    ...numericColumns.slice(0, 5).map(
      (column) => `${column.header}: avg ${column.average.toFixed(2)}, min ${column.min.toFixed(2)}, max ${column.max.toFixed(2)}`
    )
  ].join("\n");
}

export function compactRowsForAi(rows, maxRows = 200) {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, maxRows).map((row) => {
    const cleaned = {};
    for (const [key, value] of Object.entries(row ?? {})) {
      cleaned[String(key).slice(0, 80)] = typeof value === "string" ? value.slice(0, 500) : value;
    }
    return cleaned;
  });
}
