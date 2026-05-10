import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Recipient, AidStatus } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isRecipientFileTracked(recipient: Recipient, type: 'receipt' | 'eppd' | 'mpzis' | 'survey'): boolean {
  switch (type) {
    case 'receipt':
      if (recipient.hasSignedReceiptPdf !== undefined) return recipient.hasSignedReceiptPdf;
      return !!recipient.signedReceiptPdfUrl && recipient.signedReceiptPdfUrl.length > 100;
    case 'eppd':
      if (recipient.hasSignedPdf !== undefined) return recipient.hasSignedPdf;
      return !!recipient.signedPdfUrl && recipient.signedPdfUrl.length > 100;
    case 'mpzis':
      if (recipient.hasSignedMPZISPdf !== undefined) return recipient.hasSignedMPZISPdf;
      return !!recipient.signedMPZISPdfUrl && recipient.signedMPZISPdfUrl.length > 100;
    case 'survey':
      if (recipient.hasSignedSurveyPdf !== undefined) return recipient.hasSignedSurveyPdf;
      return !!recipient.signedSurveyPdfUrl && recipient.signedSurveyPdfUrl.length > 100;
    default:
      return false;
  }
}

export function evaluateRecipientStatus(recipient: Recipient): AidStatus {
  const hasReceipt = isRecipientFileTracked(recipient, 'receipt');
  const hasEPPD = isRecipientFileTracked(recipient, 'eppd');
  const hasMPZIS = isRecipientFileTracked(recipient, 'mpzis');
  const hasSurvey = isRecipientFileTracked(recipient, 'survey');

  // If all 4 are present, it's Selesai
  if (hasReceipt && hasEPPD && hasMPZIS && hasSurvey) {
    return 'Selesai';
  }

  // If even one is missing, it's Proses Berkas
  return 'Proses Berkas';
}

/**
 * Compresses an image if it's too large using Canvas.
 * Returns a base64 string.
 */
export async function compressImage(base64: string, maxWidth = 1200, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to JPEG with compression
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = () => resolve(base64);
  });
}

/**
 * Validates if a base64 string is small enough for Firestore (1MB limit).
 * 1MB = 1,048,576 bytes. 
 * We check if it's under 1,000,000 for safety.
 */
export function isBase64SizeValid(base64: string): boolean {
  // Base64 size in bytes is roughly (length * 0.75)
  const sizeInBytes = base64.length * 0.75;
  return sizeInBytes < 1000000;
}
