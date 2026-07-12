export function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function toCsv(rows: Array<Record<string, string | number | boolean>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | boolean) => `"${String(value).replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

export function toExcelHtml(title: string, rows: Array<Record<string, string | number | boolean>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const cells = rows.map((row) => `<tr>${headers.map((header) => `<td>${row[header]}</td>`).join("")}</tr>`).join("");
  return `
    <html>
      <head><meta charset="utf-8" /></head>
      <body>
        <h1>${title}</h1>
        <table border="1">
          <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
          <tbody>${cells}</tbody>
        </table>
      </body>
    </html>
  `;
}
