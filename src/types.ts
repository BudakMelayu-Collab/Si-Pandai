export interface Recipient {
  id: string;
  name: string;
  nik: string;
  kk: string;
  pob: string; // Tempat Lahir
  dob: string; // Tanggal Lahir
  gender: 'Laki-laki' | 'Perempuan';
  familyStatus: string;
  headOfFamilyName: string;
  headOfFamilyDob: string;
  
  // Domicile
  address: string;
  rt: string;
  rw: string;
  kampung: string;
  district: string;
  
  // Aid Details
  registrationId: string;
  source: string; // Sumber Berkas
  sector: string; // Bidang
  subSector: string; // Sub Bidang
  aidType: AidType;
  programName: string;
  purpose: string; // Mengajukan bantuan untuk
  amountProposed: number; // Nominal yang akan dibantu
  contact: string;
  companion?: string; // Pendamping
  
  // Timeline
  submissionDate: string; // Tanggal Masuk Berkas
  surveyDate?: string;
  disbursementDate?: string;
  amountDisbursed?: number;
  
  // School Data
  schoolName?: string;
  schoolLevel?: string;
  schoolClass?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  
  // Banking
  bankAccountNo?: string;
  bankName?: string;
  bankAccountHolder?: string;

  status: AidStatus;
  notes: string;
  documents: AidDocument[];
  signedPdfUrl?: string; // Base64 of the signed PPD
  signedReceiptPdfUrl?: string; // Base64 of the signed receipt
  signedMPZISPdfUrl?: string; // Base64 of the signed MPZIS
  signedSurveyPdfUrl?: string; // Base64 of the signed Survey
  hasSignedPdf?: boolean;
  hasSignedReceiptPdf?: boolean;
  hasSignedMPZISPdf?: boolean;
  hasSignedSurveyPdf?: boolean;
  isTermsAccepted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PPDRecord {
  id: string;
  no: string;
  date: string;
  requestedBy: string;
  amount: number;
  proposeFor: string;
  recipientId: string;
  createdAt: string;
}

export interface MonthlyPayment {
  id: string;
  sector: string;
  programName: string;
  registrationId: string;
  asnaf: string;
  name: string;
  nik: string;
  contact: string;
  level?: string;
  schoolName?: string;
  disbursementDate?: string;
  budget: number;
  fundingSource: string;
  bankAccountNo: string;
  bankAccountName: string;
  bankName: string;
  monthControl: string;
  january: boolean;
  februari: boolean;
  maret: boolean;
  april: boolean;
  mei: boolean;
  juni: boolean;
  juli: boolean;
  agustus: boolean;
  september: boolean;
  oktober: boolean;
  november: boolean;
  desember: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: string;
  logoUrl?: string; // Base64 or URL
  appName: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'urgent';
  createdAt: string;
  isActive: boolean;
}

export type AidStatus = 'Pending' | 'Calon' | 'Disetujui' | 'Ditolak' | 'Disalurkan' | 'Proses Berkas' | 'Selesai';

export type AidType = 'Beasiswa' | 'Kesehatan' | 'Sembako' | 'Modal Usaha' | 'Bencana Alam';

export interface AidDocument {
  name: string;
  type: 'image' | 'pdf' | 'excel';
  url: string;
}

export interface RegionData {
  provinces: {
    id: string;
    name: string;
    cities: {
      id: string;
      name: string;
      districts: string[];
    }[];
  }[];
}
