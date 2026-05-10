# Si-PANDAI (Sistem Administrasi Bantuan Sosial)

A comprehensive Social Aid Administration System built with React, Vite, Tailwind CSS, and Firebase.

## Features
- Recipient Management (CRUD)
- Social Aid status tracking (Pending, Disetujui, Disalurkan, etc.)
- Payment tracking & receipts
- Export to PDF templates (PPD, EPPD, Receipts)
- Dashboard overview with charts
- Dynamic App Settings (Logo & App Name)
- Announcements system

## Tech Stack
- Frontend: React 18 (Vite)
- Styling: Tailwind CSS v4
- Database/Auth: Firebase (Firestore & Google Auth)
- Animations: Framer Motion

## Opsi Deployment Gratis

### 1. AI Studio Share (Tercepat & Termudah)
Anda tidak perlu melakukan apa-apa lagi. Cukup klik tombol **Share** di pojok kanan atas AI Studio. Anda akan mendapatkan link publik yang bisa langsung digunakan tanpa biaya.

### 2. Vercel (Melalui GitHub)
Jika Anda tetap ingin menggunakan Vercel:
1. Pastikan file `index.html` menggunakan `<script type="module" src="/src/main.tsx"></script>`.
2. Pastikan `vite.config.ts` memiliki `base: '/'`.
3. Di Vercel Dashboard -> Project Settings -> Environment Variables, masukkan semua nilai dari `.env.example`.

### 3. Firebase Hosting (Direkomendasikan)
Karena Anda sudah memiliki proyek Firebase, ini adalah cara terbaik:
1.  **Install Firebase CLI**: `npm install -g firebase-tools`
2.  **Login**: `firebase login`
3.  **Build**: `npm run build`
4.  **Deploy**: `firebase deploy --only hosting`

Aplikasi akan tersedia di: `https://digital-nawa.web.app`

## Konfigurasi Environment Variables (PENTING)
Gunakan nilai berikut di Vercel/Hosting Anda:
```env
VITE_FIREBASE_API_KEY="AIzaSyAOtRkCc7-o9rrf_jYUoNem4EB0v58DUdc"
VITE_FIREBASE_AUTH_DOMAIN="digital-nawa.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="digital-nawa"
VITE_FIREBASE_STORAGE_BUCKET="digital-nawa.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="155734418115"
VITE_FIREBASE_APP_ID="1:155734418115:web:f9593f800357522a3fb876"
VITE_FIREBASE_DATABASE_ID="(default)"
VITE_APP_URL="https://ais-dev-znmzjwkcv3pun6cfrcwnev-91788719976.asia-east1.run.app"
```

### Firebase Rules
Ensure you deploy the `firestore.rules` included in this project to your Firebase Console to maintain data security.

## License
MIT
