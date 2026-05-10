import React from 'react';
import { Recipient } from '../types';
import { Printer, Download, X } from 'lucide-react';

interface PrintTemplateProps {
  recipient: Recipient;
  onClose: () => void;
}

export default function PrintTemplate({ recipient, onClose }: PrintTemplateProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:block">
      <div className="bg-white w-full max-w-[800px] min-h-[1000px] shadow-2xl rounded-xl relative flex flex-col print:shadow-none print:rounded-none">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between print:hidden">
          <h3 className="font-bold text-slate-800">Pratinjau Dokumen</h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
            >
              <Printer className="w-4 h-4" />
              Cetak Sekarang
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 p-12 md:p-20 font-serif leading-relaxed text-slate-800 print:p-10">
          {/* Header Lembaga */}
          <div className="text-center mb-12 border-b-4 border-double border-slate-900 pb-6">
            <h1 className="text-2xl font-bold uppercase tracking-widest mb-1">LEMBAGA KEUANGAN SOSIAL NASIONAL</h1>
            <p className="text-sm italic">Jl. Raya Pembangunan No. 123, Jakarta Selatan, DKI Jakarta</p>
            <p className="text-sm italic">Telp: (021) 555-0123 | Email: info@keuangansosial.org</p>
          </div>

          {/* Judul Dokumen */}
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold underline mb-1 uppercase">RENCANA PENETAPAN BANTUAN SOSIAL</h2>
            <p className="text-sm font-medium italic">Nomor: {recipient.id.substring(0, 8).toUpperCase()}/ADM-BANTUAN/{new Date().getFullYear()}</p>
          </div>

          <p className="mb-6">
            Berdasarkan hasil verifikasi dan validasi data calon penerima bantuan yang telah diajukan kepada kami, maka dengan ini ditetapkan rencana bantuan bagi:
          </p>

          {/* Data Body */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-10 text-sm">
            <div className="space-y-3">
              <p><span className="font-bold inline-block w-40">No Registrasi</span>: {recipient.registrationId}</p>
              <p><span className="font-bold inline-block w-40">Nama Penerima</span>: {recipient.name}</p>
              <p><span className="font-bold inline-block w-40">NIK</span>: {recipient.nik}</p>
              <p><span className="font-bold inline-block w-40">No KK</span>: {recipient.kk}</p>
              <p><span className="font-bold inline-block w-40">Tempat, Tgl Lahir</span>: {recipient.pob}, {recipient.dob}</p>
              <p><span className="font-bold inline-block w-40">Jenis Kelamin</span>: {recipient.gender}</p>
            </div>
            <div className="space-y-3">
              <p><span className="font-bold inline-block w-40">Alamat</span>: {recipient.address}</p>
              <p><span className="font-bold inline-block w-40">RT / RW</span>: {recipient.rt} / {recipient.rw}</p>
              <p><span className="font-bold inline-block w-40">Kampung</span>: {recipient.kampung}</p>
              <p><span className="font-bold inline-block w-40">Kecamatan</span>: {recipient.district}</p>
              <p><span className="font-bold inline-block w-40">No Handphone</span>: {recipient.contact}</p>
            </div>
          </div>

          <div className="border-y border-slate-200 py-6 mb-10 grid grid-cols-2 gap-8 text-sm">
             <div className="space-y-3">
                <h4 className="font-bold uppercase mb-2 border-b border-slate-900 pb-1">Detail Program</h4>
                <p><span className="font-bold inline-block w-40">Bidang</span>: {recipient.sector}</p>
                <p><span className="font-bold inline-block w-40">Jenis Bantuan</span>: {recipient.aidType}</p>
                <p><span className="font-bold inline-block w-40">Nama Program</span>: {recipient.programName}</p>
                <p><span className="font-bold inline-block w-40">Tujuan</span>: {recipient.purpose}</p>
             </div>
             <div className="space-y-3">
                <h4 className="font-bold uppercase mb-2 border-b border-slate-900 pb-1">Rincian Dana</h4>
                <p><span className="font-bold inline-block w-40">Nominal Bantu</span>: Rp {Number(recipient.amountProposed).toLocaleString('id-ID')}</p>
                <p><span className="font-bold inline-block w-40">Bank Penyalur</span>: {recipient.bankName}</p>
                <p><span className="font-bold inline-block w-40">No Rekening</span>: {recipient.bankAccountNo}</p>
                <p><span className="font-bold inline-block w-40">Atas Nama</span>: {recipient.bankAccountHolder}</p>
             </div>
          </div>

          <p className="mb-12">
            Demikian surat ini dibuat untuk dapat dipergunakan sebagaimana mestinya sebagai syarat administrasi dalam proses penyaluran bantuan sosial tahap selanjutnya.
          </p>

          {/* Signatures */}
          <div className="flex justify-between items-start pt-10">
            <div className="text-center w-1/3">
              <p className="mb-20 text-sm">Pemohon,</p>
              <p className="font-bold border-b border-black">{recipient.name}</p>
              <p className="text-xs italic">(Calon Penerima)</p>
            </div>
            <div className="text-center w-1/3">
              <p className="text-sm mb-20">Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="font-bold border-b border-black">H. Ahmad Fauzi, M.M.</p>
              <p className="text-xs italic">Staff Administrasi Keuangan Sosial</p>
            </div>
          </div>
          
          {/* Stamp Area (Visual Only) */}
          <div className="absolute bottom-40 right-40 opacity-10 pointer-events-none rotate-12 print:opacity-20">
            <div className="border-4 border-indigo-600 text-indigo-600 p-4 rounded-full font-bold text-center inline-block">
              TERVERIFIKASI<br/>SI-PANDAI
            </div>
          </div>
        </div>

        {/* Footer print only */}
        <div className="hidden print:block text-[10px] text-slate-400 text-center pb-4">
          Dokumen ini dicetak melalui Sistem Administrasi Bantuan Sosial (Si-PANDAI) pada {new Date().toLocaleString('id-ID')}
        </div>
      </div>
    </div>
  );
}
