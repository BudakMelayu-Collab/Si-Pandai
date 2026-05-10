import { RegionData, AidType, AidStatus } from './types';

export const AID_TYPES: AidType[] = ['Beasiswa', 'Kesehatan', 'Sembako', 'Modal Usaha', 'Bencana Alam'];

export const AID_STATUSES: AidStatus[] = ['Pending', 'Calon', 'Disetujui', 'Ditolak', 'Disalurkan', 'Proses Berkas', 'Selesai'];

export const STATUS_COLORS: Record<AidStatus, string> = {
  Pending: 'bg-gray-100 text-gray-700',
  Calon: 'bg-blue-100 text-blue-700',
  Disetujui: 'bg-green-100 text-green-700',
  Ditolak: 'bg-red-100 text-red-700',
  Disalurkan: 'bg-purple-100 text-purple-700',
  'Proses Berkas': 'bg-amber-100 text-amber-700 font-bold',
  Selesai: 'bg-emerald-100 text-emerald-700 font-bold ring-1 ring-emerald-500/20',
};

export const SIAK_REGIONAL_DATA: Record<string, string[]> = {
  "Bungaraya": ["Buatan Lestari", "Bunga Raya", "Dayang Suri", "Jati Baru", "Jaya Pura", "Kemuning Muda", "Langsat Permai", "Suak Merambai", "Temusai", "Tuah Indrapura"],
  "Dayun": ["Banjar Seminai", "Berumbung Baru", "Buana Makmur", "Dayun", "Lubuk Tilan", "Merangkai", "Pangkalan Makmur", "Sawit Permai", "Sialang Sakti", "Suka Mulya", "Teluk Merbau"],
  "Kandis": ["Kandis Kota", "Simpang Belutu", "Telaga Sam Sam", "Bekalar", "Belutu", "Jambai Makmur", "Kandis", "Libo Jaya", "Pencing Bekulo", "Sam Sam", "Sungai Gondang"],
  "Kerinci Kanan": ["Buana Bakti", "Buatan Baru", "Bukit Agung", "Bukit Harapan", "Delima Jaya", "Gabung Makmur", "Jati Mulya", "Kerinci Kanan", "Kerinci Kiri", "Kumbara Utama", "Seminai", "Simpang Perak Jaya"],
  "Koto Gasib": ["Buatan I", "Buatan II", "Empang Pandan", "Keranji Guguh", "Kuala Gasip", "Pangkalan Pisang", "Rantau Panjang", "Sengkemang", "Sri Gemilang", "Tasik Seminai", "Teluk Rimba"],
  "Lubuk Dalam": ["Empang Baru", "Lubuk Dalam", "Rawang Kao", "Rawang Kao Barat", "Sialang Baru", "Sialang Palas", "Sri Gading"],
  "Mempura": ["Sungai Mempura", "Benteng Hilir", "Benteng Hulu", "Kampung Tengah", "Kota Ringin", "Merempan Hilir", "Paluh", "Telukmerempan"],
  "Minas": ["Minas Jaya", "Mandi Angin", "Minas Barat", "Minas Timur", "Rantau Bertuah"],
  "Pusako": ["Benayah", "Dosan", "Dusun Pusaka", "Pebadaran", "Perincit", "Sungai Berbari", "Sungai Limau"],
  "Sabak Auh": ["Bandar Pedada", "Bandar Sungai", "Belading", "Laksamana", "Rempak", "Sabak Permai", "Selat Guntung", "Sungai Tengah"],
  "Siak": ["Kampung Dalam", "Kampung Rempak", "Buantan Besar", "Langkai", "Merempan Hulu", "Rawang Air Putih", "Suak Lanjut", "Tumang"],
  "Sungai Apit": ["Sungai Apit", "Bunsur", "Harapan", "Kayu Ara Permai", "Lalang", "Mengkapan", "Parit I/II", "Penyengat", "Rawa Mekar Jaya", "Sungai Kayu Ara", "Sungai Rawa", "Tanjung Kuras", "Teluk Batil", "Teluk Mesjid"],
  "Sungai Mandau": ["Bencah Umbai", "Lubuk Jering", "Lubuk Umbut", "Muara Bungkal", "Muara Kelantan", "Olak", "Tasik Betung", "Teluk Lancang"],
  "Tualang": ["Perawang", "Maredan", "Maredan Barat", "Perawang Barat", "Pinang Sebatang", "Pinang Sebatang Barat", "Pinang Sebatang Timur", "Tualang", "Tualang Timur"]
};

export const SIAK_SECTORS: Record<string, string[]> = {
  "Siak Cerdas": [
    "Pendidikan Anak Usia Dini",
    "Pendidikan Dasar",
    "Pendidikan Menengah",
    "Pendidikan Atas",
    "Pendidikan Tinggi",
    "Pendidikan Khusus",
    "Pendidikan Agama",
    "Pendidikan Vokasional dan Kejuruan",
    "Transportasi Luar Negeri",
    "Transportasi Dalam Negeri",
    "Seragam"
  ],
  "Siak Dakwah": [
    "Muallaf",
    "Suluk",
    "Amil UPZ",
    "Operasional"
  ],
  "Siak Peduli": [
    "Bantuan Alat Kesehatan",
    "Kesehatan Ibu dan Anak",
    "Layanan Medis",
    "Bantuan Utilitas",
    "Infrastruktur Sanitasi",
    "Kebutuhan Dasar",
    "Layanan Asuhan"
  ],
  "Siak Sejahtera": [
    "Ekonomi Kreatif",
    "Kuliner",
    "Food Herbal",
    "Perdagangan Eceran",
    "Perikanan dan Perdagangan",
    "Industri dan Perdagangan",
    "Peternakan dan Perdagangan",
    "Kehutanan dan Perdagangan",
    "Jasa Perawatan Pribadi dan Rumah Tangga",
    "Jasa Pembersihan Kendaraan",
    "Jasa Perawatan dan Perbaikan Kendaraan"
  ],
  "Siak Sehat": [
    "Santunan Harian",
    "Santunan Transportasi Rujukan",
    "Dana Transportasi Kontrol"
  ]
};

export const SIAK_AID_TYPES: Record<string, string[]> = {
  "Siak Cerdas": [
    "Bantuan Tunai Pendidikan",
    "Beasiswa Tunai Pendidikan",
    "Bantuan Tunai Pendidikan Transportasi Pendidikan Luar Negeri",
    "Seragam Tunai",
    "Seragam Non Tunai",
    "Beasiswa Penuh",
    "Bantuan Tunai Pendidikan Transportasi Pendidikan Dalam Negeri"
  ],
  "Siak Sejahtera": [
    "Modal Usaha",
    "Gerobak",
    "Pertanian",
    "Perikanan",
    "Kambing",
    "Sapi",
    "Ayam",
    "Peralatan Usaha dan Modal Usaha",
    "Branding",
    "Peralatan Usaha"
  ],
  "Siak Dakwah": [
    "Santunan Tunai",
    "Santunan Non Tunai",
    "Bahan Pokok dan Sembako"
  ],
  "Siak Peduli": [
    "Alat Kesehatan Non Tunai",
    "Tunai",
    "Rehabilitasi Rumah",
    "Pemasangan KWH Listrik",
    "Pembangunan Infrastruktur Sanitasi",
    "Sembako/Bahan Pokok",
    "Transfer Bulanan",
    "Santunan",
    "Alat Kesehatan Tunai"
  ],
  "Siak Sehat": [
    "Bantuan Tunai",
    "Bantuan Non Tunai"
  ]
};

export const SIAK_PROGRAM_NAMES: Record<string, string[]> = {
  "Siak Cerdas": [
    "Biaya Pendidikan",
    "Siceria Yatim Dhuafa",
    "Siceria Riset",
    "Siceria KAT",
    "Beasiswa Cendikia Baznas",
    "Satu Keluarga Satu Sarjana"
  ],
  "Siak Dakwah": [
    "Santunan Mualaf",
    "Suluk"
  ],
  "Siak Sejahtera": [
    "Mitra Skelas",
    "Mitra BLK",
    "Usaha Produktif Kecamatan III",
    "Usaha Produktif Kecamatan II",
    "MIKO",
    "Z-Kuliner Gerobak Bakso",
    "Z-Auto",
    "Z-Mart",
    "Ternak Unggas",
    "Ternak Kambing/Domba",
    "Lumbung Pangan",
    "Z-Chiken",
    "Microprenuer Mandiri",
    "Santripreneur",
    "Terunapreneur"
  ],
  "Siak Peduli": [
    "Bantuan Alat Kesehatan",
    "Stunting",
    "KWH Listrik",
    "Sanitasi Sehat",
    "Fakir Berkelanjutan",
    "Biaya Hidup",
    "RTLH",
    "RLH",
    "Khitanan Massal",
    "Tanggap Bencana"
  ],
  "Siak Sehat": [
    "Transfortasi Pasien",
    "Pendamping Pasien"
  ]
};

export const SIAK_COMPANIONS = [
  "Andika Sidi",
  "Anshori",
  "Dasuki Rahman",
  "Ikhlasul Amal",
  "M. Sanusi Bernawa",
  "M. Zulfahmi"
];

export const INDONESIA_REGIONAL_DATA: RegionData = {
  provinces: [
    {
      id: 'p1',
      name: 'Jawa Barat',
      cities: [
        {
          id: 'c1',
          name: 'Bandung',
          districts: ['Cicendo', 'Andir', 'Coblong', 'Sumur Bandung']
        },
        {
          id: 'c2',
          name: 'Bogor',
          districts: ['Bogor Utara', 'Bogor Selatan', 'Tanah Sareal']
        }
      ]
    },
    {
      id: 'p2',
      name: 'DKI Jakarta',
      cities: [
        {
          id: 'c3',
          name: 'Jakarta Selatan',
          districts: ['Tebet', 'Setiabudi', 'Mampang Prapatan']
        },
        {
          id: 'c4',
          name: 'Jakarta Pusat',
          districts: ['Gambir', 'Menteng', 'Sawah Besar']
        }
      ]
    }
  ]
};
