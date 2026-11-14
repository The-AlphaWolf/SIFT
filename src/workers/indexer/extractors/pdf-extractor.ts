import * as fs from 'fs';

let pdfjsLibPromise: Promise<any> | null = null;

async function getPdfjs(): Promise<any> {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then((lib) => {
      // Disable internal web worker requirement for Node.js worker execution
      if (lib.GlobalWorkerOptions) {
        lib.GlobalWorkerOptions.workerSrc = '';
      }
      return lib;
    });
  }
  return pdfjsLibPromise;
}

export async function extractPdfText(
  filePath: string,
  maxPages: number = 500
): Promise<{ text: string; pageCount: number; isTruncated: boolean }> {
  const pdfjs = await getPdfjs();
  const fileData = await fs.promises.readFile(filePath);
  const uint8Array = new Uint8Array(fileData);

  const loadingTask = pdfjs.getDocument({
    data: uint8Array,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
  });

  const doc = await loadingTask.promise;
  const totalPages = doc.numPages;
  const pagesToExtract = Math.min(totalPages, maxPages);

  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pagesToExtract; pageNum++) {
    try {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageString = textContent.items
        .map((item: any) => item?.str || '')
        .join(' ');

      if (pageString.trim().length > 0) {
        pageTexts.push(pageString);
      }
    } catch (pageErr) {
      console.warn(`[PDFExtractor] Error reading page ${pageNum} in ${filePath}:`, pageErr);
    }
  }

  return {
    text: pageTexts.join('\n\n'),
    pageCount: totalPages,
    isTruncated: totalPages > maxPages,
  };
}
