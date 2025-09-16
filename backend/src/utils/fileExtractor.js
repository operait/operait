import fs from "fs";
import path from "path";

/**
 * Extracts text content from various file types.
 * @param {string} filePath - The full path to the file.
 * @returns {Promise<string>} - The extracted text content.
 */
export async function extractTextFromFile(filePath) {
  const file = path.basename(filePath);
  let extracted = "";

  if (file.endsWith(".txt") || file.endsWith(".md") || file.endsWith(".pdf")) {
    // Plain text or markdown
    extracted = fs.readFileSync(filePath, "utf-8");
  } else if (file.endsWith(".docx")) {
    // DOCX with mammoth
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.extractRawText({ path: filePath });
    extracted = result.value || "";
  } else if (file.endsWith(".xlsx")) {
    // XLSX with xlsx
    // The 'xlsx' package is a CommonJS module, so we access 'default'.
    const XLSX = (await import("xlsx")).default;
    const workbook = XLSX.readFile(filePath);
    extracted = Object.keys(workbook.Sheets)
      .map(
        (sheetName) =>
          `Sheet: ${sheetName}\n` +
          XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName])
      )
      .join("\n\n");
  } else {
    // Attempt to read any other file as plain text.
    try {
      extracted = fs.readFileSync(filePath, "utf-8");
    } catch (e) {
      console.warn(`Could not read ${file} as plain text.`);
    }
  }

  return extracted;
}