/**
 * Test helper functions for PDF text extraction
 */

export const extractPdfTextForTests = (buffer: Buffer): string => {
  const bufferStr = buffer.toString('utf-8');
  
  // Method 1: Look for hex-encoded text strings in PDF streams (how pdfkit stores text)
  const hexMatches = bufferStr.match(/<([0-9A-Fa-f]+)>/g);
  if (hexMatches && hexMatches.length > 0) {
    const extractedTexts = hexMatches
      .map(match => {
        const hexString = match.slice(1, -1);
        try {
          return Buffer.from(hexString, 'hex').toString('utf-8');
        } catch {
          return '';
        }
      })
      .filter(text => {
        return text.length > 2 && 
               !text.match(/^[\x00-\x1F\x7F-\x9F]+$/) &&
               text.split(' ').length >= 1;
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\s]/g, '')
      .trim();
    
    if (extractedTexts && extractedTexts.length >= 15 && extractedTexts.split(' ').length >= 3) {
      return extractedTexts;
    }
  }
  
  // Method 2: Fallback to parentheses-based extraction for other test PDFs
  const textMatches = bufferStr.match(/\(([^)]+)\)/g);
  if (textMatches && textMatches.length > 0) {
    const extractedTexts = textMatches
      .map(match => match.slice(1, -1))
      .filter(text => {
        const lowerText = text.toLowerCase();
        return !lowerText.includes('pdfkit') && 
               !lowerText.includes('d:') && 
               !lowerText.match(/^\d{8,}/) && 
               text.length > 5 && 
               text.split(' ').length > 1;
      })
      .join(' ')
      .replace(/\\[rn]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (extractedTexts && extractedTexts.length > 5) {
      return extractedTexts;
    }
  }
  
  throw new Error('No meaningful text content found in test PDF');
};

/**
 * Create a large PDF buffer for testing file size constraints
 */
export const createLargePdfBuffer = (sizeInMB: number): Promise<Buffer> => {
  return new Promise((resolve) => {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ compress: false });
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    
    const targetSize = sizeInMB * 1024 * 1024;
    const baseContent = 'This is a large PDF document created for testing file size constraints. ';
    
    const repetitions = Math.floor(targetSize / (baseContent.length * 2)); 

    for (let i = 0; i < repetitions; i++) {
      doc.text(`${baseContent}Page ${Math.floor(i / 50) + 1}, Line ${(i % 50) + 1}. `);
      
      if (i % 50 === 49) {
        doc.addPage();
      }
    }
    
    doc.end();
  });
}; 