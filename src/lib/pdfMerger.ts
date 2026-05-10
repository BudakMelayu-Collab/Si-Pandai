import { PDFDocument } from 'pdf-lib';
import { getRecipientFile } from '../firebase';

/**
 * Merges all available scans for a recipient into a single PDF.
 * Order: Receipt, MPZIS, E-PPD, Survey
 */
export async function mergeRecipientScans(recipientId: string, recipientName: string) {
  const fileTypes = ['receipt', 'mpzis', 'eppd', 'survey'];
  const mergedPdf = await PDFDocument.create();
  
  let addedCount = 0;

  for (const type of fileTypes) {
    const base64 = await getRecipientFile(recipientId, type);
    if (!base64) continue;

    try {
      // Extract pure base64 data
      const parts = base64.split(',');
      if (parts.length < 2) continue;
      
      const binaryString = atob(parts[1]);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      if (base64.includes('application/pdf')) {
        const pdf = await PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
        addedCount++;
      } else if (base64.includes('image/')) {
        let image;
        if (base64.includes('image/jpeg') || base64.includes('image/jpg')) {
          image = await mergedPdf.embedJpg(bytes);
        } else if (base64.includes('image/png')) {
          image = await mergedPdf.embedPng(bytes);
        }

        if (image) {
          // Add a new page with the image size (or fit to A4 if preferred)
          // For simplicity, we use image size
          const page = mergedPdf.addPage([image.width, image.height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
          });
          addedCount++;
        }
      }
    } catch (err) {
      console.error(`Error merging ${type}:`, err);
    }
  }

  if (addedCount === 0) {
    throw new Error('Tidak ada berkas scan yang ditemukan untuk digabungkan.');
  }

  const pdfBytes = await mergedPdf.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  const fileName = `REKAP_SCAN_${recipientName.toUpperCase().replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  setTimeout(() => URL.revokeObjectURL(url), 100);
  return true;
}
