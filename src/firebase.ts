import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore,
  initializeFirestore,
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  getDocs, 
  query, 
  where,
  orderBy, 
  setDoc,
  getDocFromServer,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Recipient, AidStatus, PPDRecord, MonthlyPayment, AppSettings, Announcement } from './types';
import { evaluateRecipientStatus } from './lib/utils';

// Priority: JSON Config > Env Vars (to allow user overrides in the UI)
const finalConfig = {
  apiKey: firebaseConfig?.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: firebaseConfig?.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: firebaseConfig?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: firebaseConfig?.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: firebaseConfig?.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: firebaseConfig?.appId || import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Use explicit ID from config, then env, or fall back to default
const dbIdFromJson = (firebaseConfig as any)?.firestoreDatabaseId;
const dbIdFromEnv = import.meta.env.VITE_FIREBASE_DATABASE_ID;
const dbId = (dbIdFromJson && dbIdFromJson !== "" ? dbIdFromJson : null) || dbIdFromEnv || '(default)';

console.log('Firebase Initialization Status:');
console.log('- Project ID (Active):', finalConfig.projectId || 'NOT SET');
console.log('- JSON Project ID:', firebaseConfig?.projectId || 'NOT SET');
console.log('- Env Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID || 'NOT SET');
console.log('- API Key:', finalConfig.apiKey ? 'PRESENT (First 5 chars: ' + finalConfig.apiKey.substring(0, 5) + '...)' : 'MISSING');
console.log('- Database ID:', dbId);

if (!finalConfig.apiKey || !finalConfig.projectId) {
  console.warn('Firebase configuration is incomplete. Authentication and Database features will be unavailable.');
}

const app = initializeApp(finalConfig);

console.log('Using Firestore Database Instance:', dbId);

// Initialize Firestore with experimentalForceLongPolling to bypass iframe WebSocket issues
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, dbId);

export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  code?: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    code: error?.code,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  }
  
  // If we get a permission error while auth is null, it's almost certainly a race condition during sign-out
  // where the SDK receives one last "denied" event before the listener is fully stopped.
  if (error?.code === 'permission-denied' && !auth.currentUser) {
    console.log(`[Firebase] Ignoring permission-denied for ${path} during logout cleanup.`);
    return;
  }

  console.error('Firestore Error Detailed:', JSON.stringify(errInfo, null, 2));
  
  if (error?.code === 'unavailable') {
    console.error('FIREBASE UNAVAILABLE: Cloud Firestore backend is unreachable. Possible reasons:');
    console.error('1. No internet connection');
    console.error('2. Firestore not enabled for project:', finalConfig.projectId);
    console.error('3. Project ID/API Key mismatch');
    console.error('4. Outgoing port 443 blocked in the current network');
  }
  
  throw new Error(JSON.stringify(errInfo));
}

function handleAuthError(error: any) {
  let message = error.message;
  
  switch (error.code) {
    case 'auth/invalid-credential':
      message = 'Email atau kata sandi salah. Silakan periksa kembali kredensial Anda.';
      break;
    case 'auth/user-not-found':
      message = 'Akun tidak ditemukan. Silakan mendaftar terlebih dahulu.';
      break;
    case 'auth/wrong-password':
      message = 'Kata sandi salah. Silakan coba lagi.';
      break;
    case 'auth/email-already-in-use':
      message = 'Email sudah terdaftar. Silakan gunakan email lain atau masuk.';
      break;
    case 'auth/weak-password':
      message = 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
      break;
    case 'auth/invalid-email':
      message = 'Format email tidak valid.';
      break;
    case 'auth/user-disabled':
      message = 'Akun ini telah dinonaktifkan.';
      break;
    case 'auth/too-many-requests':
      message = 'Terlalu banyak percobaan masuk. Akun Anda diblokir sementara. Coba lagi nanti.';
      break;
    case 'auth/operation-not-allowed':
      message = 'Metode masuk ini belum diaktifkan di Firebase Console. Silakan buka Console > Authentication > Sign-in method dan aktifkan "Email/Password" serta "Google".';
      break;
    case 'auth/popup-closed-by-user':
      message = 'Jendela login ditutup sebelum selesai.';
      break;
    case 'auth/unauthorized-domain':
      message = `Domain ${window.location.hostname} belum diizinkan. Tambahkan di Firebase Console > Auth > Settings.`;
      break;
    case 'auth/network-request-failed':
      message = 'Koneksi internet bermasalah (Network Request Failed). Periksa jaringan Anda atau pastikan domain ini diizinkan di Firebase Console.';
      break;
    default:
      // Keep original message if it doesn't match a known code
      if (!error.code) message = error.message;
      else message = `Kesalahan Autentikasi (${error.code}): ${error.message}`;
      break;
  }
  
  error.message = message;
  return error;
}

export const registerWithEmail = async (email: string, pass: string, name: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(result.user, { displayName: name });
    return result.user;
  } catch (error: any) {
    console.error('Firebase Registration Error:', error);
    throw handleAuthError(error);
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error: any) {
    console.error('Firebase Login Error:', error);
    throw handleAuthError(error);
  }
};

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    const handled = handleAuthError(error);
    if (error.code === 'auth/unauthorized-domain') {
      console.error('DOMAIN NOT AUTHORIZED: You must add the current domain to Firebase Console > Auth > Settings > Authorized Domains');
      console.error('Domain to add:', window.location.hostname);
    } else if (error.code === 'auth/api-key-not-valid' || error.message?.includes('api-key-not-valid')) {
      console.error('API KEY INVALID: The API key provided is invalid for project', finalConfig.projectId);
      console.error('Check if the API Key matches the project in Firebase Console.');
      const isConfigEmpty = !finalConfig.apiKey || finalConfig.apiKey === '';
      handled.message = isConfigEmpty ? 'Firebase API Key is missing. Please run "Set up Firebase" in the chat.' : 'Firebase API Key is invalid. Check your Firebase console settings.';
    }
    console.error('Firebase Login Detail:', handled);
    throw handled;
  }
};

export const logout = () => auth.signOut();

export const testConnection = async () => {
  if (!finalConfig.apiKey || !finalConfig.projectId) {
    const msg = 'Configuration is missing.';
    console.warn('Skipping connection test:', msg);
    return msg;
  }
  
  console.log('Starting Firebase Connection Test...');
  console.log('- Endpoint: firestore.googleapis.com');
  console.log('- Using Long Polling:', true);
  
  try {
    // Attempt to fetch a document with a longer timeout
    const fetchPromise = getDocFromServer(doc(db, 'test', 'connection'));
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout (20s) - Backend unreachable')), 20000)
    );
    
    await Promise.race([fetchPromise, timeoutPromise]);
    console.log('Firebase connection successful');
    return null;
  } catch (error: any) {
    let errorMsg = error.message;
    const errorCode = error.code || 'unknown';
    
    console.log(`Connection Test Failed with code: ${errorCode}`);

    // Permission denied is actually GOOD signs here as it means we connected
    if (errorMsg.includes('permission-denied') || error.code === 'permission-denied') {
      console.log('Firebase connection confirmed (received permission denied which implies connectivity)');
      return null;
    }
    
    if (errorMsg.includes('the client is offline') || errorCode === 'unavailable' || errorMsg.includes('timeout')) {
      errorMsg = "Koneksi Bermasalah (Offline/Timeout): SDK tidak dapat terhubung ke server. " +
                 "Pastikan Project ID (" + finalConfig.projectId + ") dan Database ID (" + dbId + ") benar, " +
                 "serta Firestore sudah aktif di Region yang dipilih.";
    }
    
    console.error("Firebase connection test error:", errorMsg);
    return errorMsg;
  }
};

// Helper to remove undefined fields that would cause Firestore to error
const sanitizeData = (data: any) => {
  const sanitized: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      sanitized[key] = data[key];
    }
  });
  return sanitized;
};

export const saveRecipient = async (recipientData: any) => {
  const path = 'recipients';
  try {
    // Ensure all mandatory keys for firestore rules are present
    const payload = sanitizeData({
      pob: '',
      dob: '',
      isTermsAccepted: false,
      ...recipientData, // Spread the incoming data
      status: 'Proses Berkas',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    const docRef = await addDoc(collection(db, path), payload);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const savePPDRecord = async (record: Omit<PPDRecord, 'id' | 'createdAt'> & { signedPdfUrl?: string | null }) => {
  const path = 'ppd_records';
  try {
    const payload = sanitizeData({
      ...record,
      createdAt: serverTimestamp(),
    });
    const docRef = await addDoc(collection(db, path), payload);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const deletePPDRecordServer = async (id: string) => {
  const path = `ppd_records/${id}`;
  try {
    // Note: deleteDoc needs a DocumentReference
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'ppd_records', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const getRecipientFile = async (recipientId: string, fileType: string) => {
  const path = `recipients/${recipientId}/scans/${fileType}`;
  try {
    const ref = doc(db, 'recipients', recipientId, 'scans', fileType);
    const snap = await getDocFromServer(ref);
    if (snap.exists()) {
      return snap.data().base64 as string;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const getRecipientTemplateData = async (recipientId: string, templateType: string) => {
  const path = `recipients/${recipientId}/templates/${templateType}`;
  try {
    const ref = doc(db, 'recipients', recipientId, 'templates', templateType);
    const snap = await getDocFromServer(ref);
    if (snap.exists()) {
      return snap.data().data;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const saveRecipientTemplateData = async (recipientId: string, templateType: string, templateData: any) => {
  const path = `recipients/${recipientId}/templates/${templateType}`;
  try {
    const ref = doc(db, 'recipients', recipientId, 'templates', templateType);
    await setDoc(ref, {
      data: templateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const streamRecipientScan = (id: string, docType: 'receipt' | 'mpzis' | 'eppd' | 'survey', callback: (base64: string | null) => void) => {
  const scanRef = doc(db, 'recipients', id, 'scans', docType);
  return onSnapshot(scanRef, (docSnap) => {
    if (docSnap.exists() && docSnap.data().base64) {
      callback(docSnap.data().base64);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Error streaming scan:", error);
    callback(null);
  });
};

export const updateRecipientReceiptPdf = async (id: string, pdfBase64: string | null) => {
  const path = `recipients/${id}`;
  try {
    const { getDoc } = await import('firebase/firestore');
    const ref = doc(db, 'recipients', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Recipient not found');
    
    const recipient = snap.data() as Recipient;
    const hasFile = !!pdfBase64 && pdfBase64.length > 100;
    
    // Save heavy file/delete from subcollection
    const scanRef = doc(db, 'recipients', id, 'scans', 'receipt');
    if (pdfBase64) {
      await setDoc(scanRef, {
        base64: pdfBase64,
        updatedAt: serverTimestamp()
      });
    } else {
      const snapScan = await getDocFromServer(scanRef);
      if (snapScan.exists()) {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(scanRef);
      }
    }

    const updatedStatus = evaluateRecipientStatus({ ...recipient, hasSignedReceiptPdf: hasFile });
    
    await updateDoc(ref, {
      hasSignedReceiptPdf: hasFile,
      signedReceiptPdfUrl: '', // Clear legacy field
      status: updatedStatus,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const updateRecipientPdf = async (id: string, pdfBase64: string | null) => {
  const path = `recipients/${id}`;
  try {
    const { getDoc } = await import('firebase/firestore');
    const ref = doc(db, 'recipients', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Recipient not found');
    
    const recipient = snap.data() as Recipient;
    const hasFile = !!pdfBase64 && pdfBase64.length > 100;

    // Save heavy file/delete from subcollection
    const scanRef = doc(db, 'recipients', id, 'scans', 'eppd');
    if (pdfBase64) {
      await setDoc(scanRef, {
        base64: pdfBase64,
        updatedAt: serverTimestamp()
      });
    } else {
      const snapScan = await getDocFromServer(scanRef);
      if (snapScan.exists()) {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(scanRef);
      }
    }

    const updatedStatus = evaluateRecipientStatus({ ...recipient, hasSignedPdf: hasFile });
    
    await updateDoc(ref, {
      hasSignedPdf: hasFile,
      signedPdfUrl: '', // Clear legacy field
      status: updatedStatus,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const updateRecipientMPZISPdf = async (id: string, pdfBase64: string | null) => {
  const path = `recipients/${id}`;
  try {
    const { getDoc } = await import('firebase/firestore');
    const ref = doc(db, 'recipients', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Recipient not found');
    
    const recipient = snap.data() as Recipient;
    const hasFile = !!pdfBase64 && pdfBase64.length > 100;

    // Save heavy file/delete from subcollection
    const scanRef = doc(db, 'recipients', id, 'scans', 'mpzis');
    if (pdfBase64) {
      await setDoc(scanRef, {
        base64: pdfBase64,
        updatedAt: serverTimestamp()
      });
    } else {
      const snapScan = await getDocFromServer(scanRef);
      if (snapScan.exists()) {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(scanRef);
      }
    }

    const updatedStatus = evaluateRecipientStatus({ ...recipient, hasSignedMPZISPdf: hasFile });
    
    await updateDoc(ref, {
      hasSignedMPZISPdf: hasFile,
      signedMPZISPdfUrl: '', // Clear legacy field
      status: updatedStatus,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const updateRecipientSurveyPdf = async (id: string, pdfBase64: string | null) => {
  const path = `recipients/${id}`;
  try {
    const { getDoc } = await import('firebase/firestore');
    const ref = doc(db, 'recipients', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Recipient not found');
    
    const recipient = snap.data() as Recipient;
    const hasFile = !!pdfBase64 && pdfBase64.length > 100;

    // Save heavy file/delete from subcollection
    const scanRef = doc(db, 'recipients', id, 'scans', 'survey');
    if (pdfBase64) {
      await setDoc(scanRef, {
        base64: pdfBase64,
        updatedAt: serverTimestamp()
      });
    } else {
      const snapScan = await getDocFromServer(scanRef);
      if (snapScan.exists()) {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(scanRef);
      }
    }

    const updatedStatus = evaluateRecipientStatus({ ...recipient, hasSignedSurveyPdf: hasFile });
    
    await updateDoc(ref, {
      hasSignedSurveyPdf: hasFile,
      signedSurveyPdfUrl: '', // Clear legacy field
      status: updatedStatus,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const updateRecipientStatus = async (id: string, status: AidStatus) => {
  const path = `recipients/${id}`;
  try {
    const ref = doc(db, 'recipients', id);
    await updateDoc(ref, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const streamRecipients = (callback: (data: Recipient[]) => void) => {
  const path = 'recipients';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(d => {
      const data = d.data();
      return { 
        id: d.id, 
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      } as Recipient;
    });
    callback(data);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const streamPPDRecords = (callback: (data: PPDRecord[]) => void) => {
  const path = 'ppd_records';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(d => {
      const data = d.data();
      return { 
        id: d.id, 
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      } as PPDRecord;
    });
    callback(data);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

// Companion Reports
export interface CompanionReport {
  id?: string;
  companionId: string;
  companionName: string;
  month: string;
  year: number;
  reportType: 'Bulanan' | 'Program';
  sector: string;
  title: string;
  coverUrl: string;
  fileUrl?: string;
  uploadedAt: string;
  uploaderId: string;
}

export const streamCompanionReports = (companionId: string, callback: (reports: CompanionReport[]) => void) => {
  const path = 'companionReports';
  // Removed orderBy to avoid index requirement
  const q = query(
    collection(db, path), 
    where('companionId', '==', companionId)
  );

  const MONTH_ORDER: Record<string, number> = {
    'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4, 'Mei': 5, 'Juni': 6,
    'Juli': 7, 'Agustus': 8, 'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12
  };

  return onSnapshot(q, (snapshot) => {
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanionReport));
    
    // Manual sort: Year desc, then Month desc
    reports.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      const orderA = MONTH_ORDER[a.month] || 0;
      const orderB = MONTH_ORDER[b.month] || 0;
      return orderB - orderA;
    });

    callback(reports);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const streamSectorReports = (sector: string, callback: (reports: CompanionReport[]) => void) => {
  const path = 'companionReports';
  const q = query(
    collection(db, path), 
    where('sector', '==', sector),
    where('reportType', '==', 'Bulanan')
  );

  const MONTH_ORDER: Record<string, number> = {
    'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4, 'Mei': 5, 'Juni': 6,
    'Juli': 7, 'Agustus': 8, 'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12
  };

  return onSnapshot(q, (snapshot) => {
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanionReport));
    
    // Manual sort: Year desc, then Month desc
    reports.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      const orderA = MONTH_ORDER[a.month] || 0;
      const orderB = MONTH_ORDER[b.month] || 0;
      return orderB - orderA;
    });

    callback(reports);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const saveCompanionReport = async (report: Omit<CompanionReport, 'id' | 'uploadedAt' | 'uploaderId'>) => {
  const path = 'companionReports';
  if (!auth.currentUser) throw new Error("Must be logged in to upload reports");
  
  try {
    const reportData = sanitizeData({
      ...report,
      uploadedAt: new Date().toISOString(),
      uploaderId: auth.currentUser.uid
    });
    
    const docRef = await addDoc(collection(db, path), reportData);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const deleteCompanionReport = async (reportId: string) => {
  const path = `companionReports/${reportId}`;
  try {
    await deleteDoc(doc(db, 'companionReports', reportId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Monthly Payments
export const saveMonthlyPayment = async (data: Omit<MonthlyPayment, 'id' | 'createdAt' | 'updatedAt'>) => {
  const path = 'monthly_payments';
  try {
    const payload = sanitizeData({
      ...data,
      budget: Number(data.budget) || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const docRef = await addDoc(collection(db, path), payload);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateMonthlyPayment = async (id: string, data: Partial<MonthlyPayment>) => {
  const path = `monthly_payments/${id}`;
  try {
    const payload = sanitizeData({
      ...data,
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'monthly_payments', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const streamMonthlyPayments = (sector: string, callback: (data: MonthlyPayment[]) => void) => {
  const path = 'monthly_payments';
  // Removed orderBy to avoid index requirement
  const q = query(
    collection(db, path), 
    where('sector', '==', sector)
  );
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(d => {
      const data = d.data();
      return { 
        id: d.id, 
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      } as MonthlyPayment;
    });

    // Manual sort by createdAt desc
    data.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    callback(data);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const deleteMonthlyPayment = async (id: string) => {
  const path = `monthly_payments/${id}`;
  try {
    await deleteDoc(doc(db, 'monthly_payments', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// App Settings
export const streamAppSettings = (callback: (data: AppSettings | null) => void) => {
  const path = 'settings/app';
  const ref = doc(db, 'settings', 'app');
  
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      callback({
        id: snap.id,
        ...data,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      } as AppSettings);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

export const updateAppSettings = async (data: Partial<AppSettings>) => {
  const path = 'settings/app';
  try {
    const ref = doc(db, 'settings', 'app');
    const payload = sanitizeData({
      ...data,
      updatedAt: serverTimestamp(),
    });
    await setDoc(ref, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// Announcements
export const streamAnnouncements = (callback: (data: Announcement[]) => void) => {
  const path = 'announcements';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(d => {
      const data = d.data();
      return { 
        id: d.id, 
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      } as Announcement;
    });
    callback(data);
  }, (error) => {
    // If no index, fallback to manual sort
    if (error.message.includes('requires an index')) {
      const qNoOrder = query(collection(db, path));
      return onSnapshot(qNoOrder, (snap) => {
        const data = snap.docs.map(d => ({ 
          id: d.id, 
          ...d.data(),
          createdAt: d.data().createdAt instanceof Timestamp ? d.data().createdAt.toDate().toISOString() : d.data().createdAt,
        } as Announcement));
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(data);
      });
    }
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const saveAnnouncement = async (data: Omit<Announcement, 'id' | 'createdAt'>) => {
  const path = 'announcements';
  try {
    const payload = sanitizeData({
      ...data,
      createdAt: serverTimestamp(),
    });
    await addDoc(collection(db, path), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateAnnouncement = async (id: string, data: Partial<Announcement>) => {
  const path = `announcements/${id}`;
  try {
    await updateDoc(doc(db, 'announcements', id), sanitizeData(data));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteAnnouncement = async (id: string) => {
  const path = `announcements/${id}`;
  try {
    await deleteDoc(doc(db, 'announcements', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
