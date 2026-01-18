"use server"

// 1. Schimbăm importul către varianta 'legacy' pentru Node.js
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

import { 
  TextItem
} from 'pdfjs-dist/types/src/display/api';

// 2. Importăm worker-ul tot din varianta 'legacy'
import 'pdfjs-dist/legacy/build/pdf.worker.mjs';

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  charCount: number;
}

export async function extractTextFromPdf(file: File): Promise<PdfExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  
  // 3. Convertim în Uint8Array pentru stabilitate pe server
  const data = new Uint8Array(arrayBuffer);

  const loadingTask = pdfjsLib.getDocument({ 
    data: data,
    useSystemFonts: true,
    // 4. Dezactivăm funcțiile care caută DOM/Canvas
    disableFontFace: true
  });
  
  const pdf = await loadingTask.promise;
  let fullText = "";
  const numPages = pdf.numPages;

  for (let i = 1; i <= numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .filter((item): item is TextItem => 'str' in item)
        .map((item: TextItem) => item.str)
        .join(" ");
        
      fullText += pageText + "\n";
    } catch (err) {
      console.warn(`Error extracting page ${i}:`, err);
    }
  }

  return {
    text: fullText,
    pageCount: numPages,
    charCount: fullText.length
  };
}
