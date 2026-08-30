/**
 * Builds a minimal but genuinely valid PDF containing the given lines of text,
 * so extraction can be tested against a real parse rather than a stub.
 */
function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function buildTestResumePdf(lines: string[]): Uint8Array {
  let content = "BT\n/F1 11 Tf\n50 760 Td\n13 TL\n";
  for (const line of lines) {
    content += `(${escapePdfText(line)}) Tj T*\n`;
  }
  content += "ET\n";

  const contentBytes = Buffer.from(content, "latin1");

  const objects: Buffer[] = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "latin1"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "latin1"),
    Buffer.from(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
      "latin1"
    ),
    Buffer.concat([
      Buffer.from(`<< /Length ${contentBytes.length} >>\nstream\n`, "latin1"),
      contentBytes,
      Buffer.from("endstream", "latin1"),
    ]),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", "latin1"),
  ];

  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n", "latin1")];
  const offsets: number[] = [];
  let position = chunks[0].length;

  objects.forEach((body, index) => {
    offsets.push(position);
    const chunk = Buffer.concat([
      Buffer.from(`${index + 1} 0 obj\n`, "latin1"),
      body,
      Buffer.from("\nendobj\n", "latin1"),
    ]);
    chunks.push(chunk);
    position += chunk.length;
  });

  const xrefOffset = position;
  const size = objects.length + 1;

  let xref = `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  chunks.push(Buffer.from(xref, "latin1"));

  return new Uint8Array(Buffer.concat(chunks));
}
