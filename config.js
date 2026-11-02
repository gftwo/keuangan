import { App } from './core.js';

App.Config = {
    // ⚠️  GANTI dengan VAPID Key dari Firebase Console →
    //    Project Settings → Cloud Messaging → Web Push certificates
    VapidKey: 'GANTI_DENGAN_VAPID_KEY_KAMU',
    Firebase: { 
        apiKey: "AIzaSyCI32Fl3oFo8MqcFfaWOae73vbP-aKqqSw",
        authDomain: "bygf-6f77.firebaseapp.com",
        databaseURL: "https://bygf-6f77-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "bygf-6f77",
        storageBucket: "bygf-6f77.firebasestorage.app",
        messagingSenderId: "127025825709",
        appId: "1:127025825709:web:e6b75daea1f707c674c324",
        measurementId: "G-SWW4R8FHC1"
    },
    // Updated Default Categories based on user request image
    DefaultCategories: [
        { id: 'lainnya', name: 'Lainnya', icon: '📦' },
        { id: 'jajan', name: 'Jajan', icon: '🍿' },
        { id: 'uang_mingguan', name: 'Uang Mingguan', icon: '💵' },
        { id: 'shopping', name: 'Shopping', icon: '🛍️' },
        { id: 'gift', name: 'Gift', icon: '🎁' }
    ],
    AccountIcons: { cash: '💵', saldo: '🪪' },
    Changelog: [
        { version: 'v8.8', date: 'September 2026', items: [
            'Perbaikan bug besar: nambah/ubah data di tab Kuliah (absen, tugas, dll) sebelumnya selalu "nyeret" balik ke tab Keuangan — sekarang gak lagi',
            'Tab Task: tugas yang diselesaikan hari ini sekarang tetap muncul di grup "Selesai" pada tampilan Hari Ini, gak ngilang gitu aja',
            'Tab Task: benerin render pas pertama buka tab (dulu kadang harus pencet filter dulu biar tugas kelihatan)',
            '"Kecualikan dari Budget" dihapus dari form Tambah Transaksi — cukup diatur & ditandai di Riwayat/Edit transaksi'
        ]},
        { version: 'v8.7', date: 'September 2026', items: [
            'Tab Kuliah (jadwal, absensi/kehadiran, tugas kuliah) sekarang ikut sinkron ke akun — sebelumnya cuma tersimpan di HP masing-masing',
            'Backup Manual (.json) sekarang lengkap: transfer, utang/piutang, template cepat, dan data Kuliah ikut ke-backup & ke-restore',
            'Perbaikan bug Tugas Pro: tugas berulang yang ditandai selesai lewat halaman edit sekarang ikut maju ke jadwal berikutnya, sama seperti lewat checklist',
            'Tugas (Pro & Kuliah) yang sudah selesai sekarang nampilin kapan tepatnya diselesaikan',
            'Popup "Jadwal Kamu Hari Ini" sekarang gabungin tugas Tugas Pro & deadline tugas Kuliah dalam satu tampilan'
        ]},
        { version: 'v8.6', date: 'September 2026', items: [
            'Filter Riwayat sekarang bisa per sub-dompet spesifik (SeaBank, KromBank, GoPay, DANA, ShopeePay) atau semua Saldo',
            '2 tema baru: Biru Abu (slate) & Kuning Abu (stone/amber)',
            'Alokasi: Laporan Akhir Bulan per pos lengkap sisa/lebihnya',
            'Laporan: bisa geser bulan/minggu pakai tombol ◀ ▶',
            'Bersihin beberapa kalimat deskripsi yang dianggap gak perlu',
            'Footer versi dirapikan + halaman arsip update (ini!) ditambahkan'
        ]},
        { version: 'v8.5', date: 'Agustus 2026', items: [
            'Tab baru "Laporan": filter Bulanan/Mingguan/Custom, grafik pengeluaran harian (nunjukin tanggal paling boros), breakdown per kategori, export PDF proper (kop, tanggal terbit, tabel kategori & transaksi)',
            'Riwayat Penyesuaian Saldo dipisah jadi tombol mengambang di tab Riwayat, sekarang bisa diedit & dihapus',
            'Tab Alokasi: ringkasan total gabungan, donut chart pembagian pos, saran jatah harian sisa bulan berjalan',
            'Pemetaan kategori bisa dikecualikan total dari Alokasi ("Di Luar Budget")',
            'Kategori custom sekarang langsung kepake begitu app kebuka, gak perlu nambah transaksi dulu'
        ]},
        { version: 'v8.4', date: 'Agustus 2026', items: [
            'Tambah KromBank sebagai sub-dompet',
            'Hapus kategori Sekolah',
            'Notifikasi budget/transaksi otomatis: ada opsi "Jangan tampilkan lagi hari ini"',
            'Transfer antar sub-dompet Saldo (misal SeaBank ke GoPay) sekarang bisa',
            'Ikon sub-dompet disesuaikan sama logo aslinya (SeaBank, ShopeePay)'
        ]},
        { version: 'v8.3', date: 'Agustus 2026', items: [
            'Tab Alokasi Budget baru: pembagian 50/20/30 (Kebutuhan Pokok, Kuliah & Transport, Fleksibel & Hiburan)',
            'Transaksi bisa ditandai "Kecualikan dari Budget"'
        ]},
        { version: 'v8.2', date: 'Agustus 2026', items: [
            'Sub-dompet e-wallet (GoPay, DANA, ShopeePay, SeaBank) buat akun Saldo, rincian per dompet di Dashboard',
            'Transfer prioritas Saldo → Cash sebagai default',
            'Fitur Quick Respons: template transaksi cepat, sekali tap tinggal isi nominal',
            'Fitur Sinkronkan Saldo: rekonsiliasi saldo di app vs kenyataan',
            'Fitur Target Impian dihapus'
        ]},
        { version: 'v8.1', date: 'Juli 2026', items: [
            'Popup "Perlu Perhatian" pas buka app: alert budget hampir habis + konfirmasi transaksi otomatis sebelum beneran tercatat',
            'Transaksi otomatis (recurring) sekarang fleksibel: interval custom (misal tiap 3 bulan), tanggal mulai & berakhir'
        ]},
        { version: 'v8.0', date: 'Juli 2026', items: [
            'Detail transaksi di Riwayat nunjukin sisa saldo saat itu (cash & saldo terpisah, ada tombol rincian)',
            'Perbaikan bug perhitungan saldo yang gak sinkron sama transfer'
        ]},
        { version: 'v7.x', date: 'Juli 2026', items: [
            'Fitur Input Cepat dari Screenshot: baca mutasi otomatis dari galeri (OCR), bisa banyak sekaligus',
            'Perbaikan bug Tugas Pro: render crash pas data sync, drag-handle bikin tap gak kebaca di HP',
            'Sistem antrian notifikasi: popup gantian gak numpuk, 1x tampil per reload'
        ]},
        { version: 'v6.x', date: 'Juni 2026', items: [
            'Tugas Pro digabung jadi satu file sama Keuangan Pro',
            'Sistem tema custom: 6 preset (Klasik, Midnight, Sunset, Forest, Mono, Aurora)',
            'Fitur premium & sistem notifikasi push dihapus total, semua fitur gratis buat semua orang',
            'Intro video dihapus'
        ]}
    ],
    FreeLimits: { budget: 3, recurring: 3, historyMonths: 3 }
};
