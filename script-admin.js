// ============================================================
// FIREBASE INIT
// ============================================================
let database = null;
let firebaseEnabled = false;

try {
    if (typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey) {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        firebaseEnabled = true;
        console.log('🔥 Firebase Connected (Admin Mode)');
    }
} catch (e) {
    console.log('⚠️ Firebase not configured:', e.message);
}

// ============================================================
// DATA VARIABLES
// ============================================================
let masterPeserta = [];
let antrian = [];
let nomorTerakhir = 0;
let selectedIndex = { nip: -1, nama: -1, bagian: -1 };
let filteredData = { nip: [], nama: [], bagian: [] };

// ============================================================
// JADWAL OPERASIONAL
// ============================================================
let jadwalOperasional = {
    aktif: true,
    tanggalMulai: '2026-07-21',
    tanggalSelesai: '2026-07-25',
    jamMulai: '08:00',
    jamSelesai: '16:00',
    hariKerja: [1, 2, 3, 4, 5],
    pesanOff: '📢 Sistem sedang tutup.'
};

// ============================================================
// TOAST
// ============================================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toastMessage');
    toast.className = 'toast ' + type;
    msg.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================================================
// FORMAT TANGGAL & WAKTU
// ============================================================
function formatTanggalWaktu() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const tanggal = now.toLocaleDateString('id-ID', options);
    const waktu = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return { tanggal, waktu };
}

function formatTanggalIndonesia(tanggal) {
    if (!tanggal) return '-';
    const parts = tanggal.split('-');
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                   'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${parseInt(parts[2])} ${bulan[parseInt(parts[1]) - 1]} ${parts[0]}`;
}

// ============================================================
// DATABASE STATUS
// ============================================================
function updateDatabaseStatus() {
    const dbCount = document.getElementById('dbCount');
    const dbInfo = document.getElementById('dbInfo');
    if (dbCount) dbCount.textContent = masterPeserta.length;
    if (dbInfo) {
        if (masterPeserta.length > 0) {
            dbInfo.textContent = '✅ Siap digunakan';
            dbInfo.style.color = '#059669';
        } else {
            dbInfo.textContent = '⚠️ Import data terlebih dahulu!';
            dbInfo.style.color = '#dc2626';
        }
    }
}

// ============================================================
// JADWAL FUNCTIONS
// ============================================================
function loadJadwalFromFirebase() {
    // 🔥 TAMPILKAN DEFAULT DULU
    updateJadwalUI();
    
    if (!firebaseEnabled || !database) {
        console.log('⚠️ Firebase tidak terhubung, pakai default');
        return;
    }
    
    database.ref('jadwalOperasional').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            jadwalOperasional = data;
            updateJadwalUI();
            console.log('✅ Jadwal di-load dari Firebase');
        } else {
            // Simpan default ke Firebase
            saveJadwalToFirebase();
            console.log('📦 Data kosong, simpan default ke Firebase');
        }
    });
}

function saveJadwalToFirebase() {
    if (!firebaseEnabled || !database) return;
    database.ref('jadwalOperasional').set(jadwalOperasional)
        .then(() => {
            showToast('✅ Jadwal berhasil disimpan!', 'success');
            updateJadwalUI();
        })
        .catch((error) => {
            showToast('⚠️ Gagal menyimpan jadwal: ' + error.message, 'error');
        });
}

function cekJamOperasional() {
    if (!jadwalOperasional.aktif) {
        return { boleh: false, pesan: '📢 Sistem pengambilan antrian sedang ditutup oleh admin.' };
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (today < jadwalOperasional.tanggalMulai || today > jadwalOperasional.tanggalSelesai) {
        const tglMulai = formatTanggalIndonesia(jadwalOperasional.tanggalMulai);
        const tglSelesai = formatTanggalIndonesia(jadwalOperasional.tanggalSelesai);
        return { boleh: false, pesan: `📢 Pengambilan antrian hanya ${tglMulai} - ${tglSelesai}.` };
    }

    const hariIni = now.getDay();
    let hariKerja = hariIni === 0 ? 7 : hariIni;
    if (!jadwalOperasional.hariKerja.includes(hariKerja)) {
        return { boleh: false, pesan: '📢 Hari ini bukan hari kerja. Cek jadwal operasional.' };
    }

    const jamSekarang = now.getHours().toString().padStart(2, '0') + ':' + 
                        now.getMinutes().toString().padStart(2, '0');
    
    if (jamSekarang < jadwalOperasional.jamMulai || jamSekarang > jadwalOperasional.jamSelesai) {
        return { boleh: false, pesan: `📢 Pengambilan nomor antrian hanya ${jadwalOperasional.jamMulai} - ${jadwalOperasional.jamSelesai}.` };
    }

    return { boleh: true, pesan: '✅ Sistem buka. Silakan ambil nomor antrian.' };
}

function updateJadwalUI() {
    const container = document.getElementById('jadwalContainer');
    if (!container) return;
    
    const status = jadwalOperasional.aktif ? '🟢 Aktif' : '🔴 Ditutup';
    const warnaStatus = jadwalOperasional.aktif ? '#059669' : '#dc2626';
    const hariMap = {1:'Senin',2:'Selasa',3:'Rabu',4:'Kamis',5:'Jumat',6:'Sabtu',7:'Minggu'};
    const hariKerja = jadwalOperasional.hariKerja.map(h => hariMap[h] || h).join(', ');
    const tglMulai = formatTanggalIndonesia(jadwalOperasional.tanggalMulai);
    const tglSelesai = formatTanggalIndonesia(jadwalOperasional.tanggalSelesai);
    
    container.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
            <div>
                <label style="font-weight:600; font-size:13px; color:#1a2a4a;">
                    <i class="fas fa-calendar-alt"></i> Tanggal Mulai
                </label>
                <input type="date" id="tanggalMulaiInput" value="${jadwalOperasional.tanggalMulai}" 
                       style="width:100%; padding:8px 12px; border:2px solid #e8edf5; border-radius:10px; font-size:14px;"/>
            </div>
            <div>
                <label style="font-weight:600; font-size:13px; color:#1a2a4a;">
                    <i class="fas fa-calendar-alt"></i> Tanggal Selesai
                </label>
                <input type="date" id="tanggalSelesaiInput" value="${jadwalOperasional.tanggalSelesai}" 
                       style="width:100%; padding:8px 12px; border:2px solid #e8edf5; border-radius:10px; font-size:14px;"/>
            </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
            <div>
                <label style="font-weight:600; font-size:13px; color:#1a2a4a;">
                    <i class="fas fa-clock"></i> Jam Mulai
                </label>
                <input type="time" id="jamMulaiInput" value="${jadwalOperasional.jamMulai}" 
                       style="width:100%; padding:8px 12px; border:2px solid #e8edf5; border-radius:10px; font-size:14px;"/>
            </div>
            <div>
                <label style="font-weight:600; font-size:13px; color:#1a2a4a;">
                    <i class="fas fa-clock"></i> Jam Selesai
                </label>
                <input type="time" id="jamSelesaiInput" value="${jadwalOperasional.jamSelesai}" 
                       style="width:100%; padding:8px 12px; border:2px solid #e8edf5; border-radius:10px; font-size:14px;"/>
            </div>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
            <div style="flex:1; min-width:150px;">
                <label style="font-weight:600; font-size:13px; color:#1a2a4a;">
                    <i class="fas fa-calendar-day"></i> Hari Kerja
                </label>
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;">
                    ${[1,2,3,4,5,6,7].map(h => {
                        const namaHari = {1:'Sen',2:'Sel',3:'Rab',4:'Kam',5:'Jum',6:'Sab',7:'Min'}[h];
                        const checked = jadwalOperasional.hariKerja.includes(h) ? 'checked' : '';
                        return `
                            <label style="font-size:12px; display:flex; align-items:center; gap:4px; background:#f1f5f9; padding:4px 10px; border-radius:8px; cursor:pointer;">
                                <input type="checkbox" class="hariKerjaCheck" value="${h}" ${checked} />
                                ${namaHari}
                            </label>
                        `;
                    })}
                </div>
            </div>
            <div style="display:flex; align-items:flex-end; gap:8px;">
                <label style="font-weight:600; font-size:13px; color:#1a2a4a; display:flex; align-items:center; gap:6px;">
                    <input type="checkbox" id="statusAktif" ${jadwalOperasional.aktif ? 'checked' : ''} />
                    <i class="fas fa-power-off"></i> Sistem Aktif
                </label>
            </div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="simpanJadwal()">
                <i class="fas fa-save"></i> Simpan Jadwal
            </button>
            <button class="btn btn-outline btn-sm" onclick="resetJadwalDefault()">
                <i class="fas fa-undo"></i> Reset Default
            </button>
        </div>
        <div style="margin-top:10px; padding:10px 14px; background:#f1f5f9; border-radius:8px; font-size:13px; color:#1a2a4a; display:grid; grid-template-columns:1fr 1fr; gap:4px 16px;">
            <div><strong>Status:</strong> <span style="color:${warnaStatus};">${status}</span></div>
            <div><strong>Tanggal:</strong> ${tglMulai} - ${tglSelesai}</div>
            <div><strong>Jam:</strong> ${jadwalOperasional.jamMulai} - ${jadwalOperasional.jamSelesai}</div>
            <div><strong>Hari:</strong> ${hariKerja}</div>
        </div>
    `;
}

function simpanJadwal() {
    const tanggalMulai = document.getElementById('tanggalMulaiInput').value;
    const tanggalSelesai = document.getElementById('tanggalSelesaiInput').value;
    const jamMulai = document.getElementById('jamMulaiInput').value;
    const jamSelesai = document.getElementById('jamSelesaiInput').value;
    const statusAktif = document.getElementById('statusAktif').checked;
    
    const hariKerja = [];
    document.querySelectorAll('.hariKerjaCheck:checked').forEach(cb => {
        hariKerja.push(parseInt(cb.value));
    });
    
    if (!tanggalMulai || !tanggalSelesai) {
        showToast('⚠️ Tanggal mulai dan selesai harus diisi!', 'error');
        return;
    }
    
    if (tanggalMulai > tanggalSelesai) {
        showToast('⚠️ Tanggal mulai harus lebih awal dari tanggal selesai!', 'error');
        return;
    }
    
    if (!jamMulai || !jamSelesai) {
        showToast('⚠️ Jam mulai dan selesai harus diisi!', 'error');
        return;
    }
    
    if (jamMulai >= jamSelesai) {
        showToast('⚠️ Jam mulai harus lebih awal dari jam selesai!', 'error');
        return;
    }
    
    if (hariKerja.length === 0) {
        showToast('⚠️ Pilih minimal 1 hari kerja!', 'error');
        return;
    }
    
    jadwalOperasional = {
        aktif: statusAktif,
        tanggalMulai: tanggalMulai,
        tanggalSelesai: tanggalSelesai,
        jamMulai: jamMulai,
        jamSelesai: jamSelesai,
        hariKerja: hariKerja,
        pesanOff: `📢 Pengambilan nomor antrian hanya ${formatTanggalIndonesia(tanggalMulai)} - ${formatTanggalIndonesia(tanggalSelesai)} (${jamMulai} - ${jamSelesai})`
    };
    
    saveJadwalToFirebase();
}

function resetJadwalDefault() {
    if (!confirm('Reset jadwal ke default?')) return;
    
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    jadwalOperasional = {
        aktif: true,
        tanggalMulai: today.toISOString().split('T')[0],
        tanggalSelesai: nextWeek.toISOString().split('T')[0],
        jamMulai: '08:00',
        jamSelesai: '16:00',
        hariKerja: [1, 2, 3, 4, 5],
        pesanOff: '📢 Pengambilan nomor antrian hanya 08:00 - 16:00 (Senin-Jumat)'
    };
    
    saveJadwalToFirebase();
    updateJadwalUI();
    showToast('🔄 Jadwal direset ke default', 'info');
}

// ============================================================
// AUTOCOMPLETE
// ============================================================
function filterAutocomplete(field, query) {
    const listMap = { nip: 'listNip', nama: 'listNama', bagian: 'listBagian' };
    const list = document.getElementById(listMap[field]);
    const inputId = 'input' + field.charAt(0).toUpperCase() + field.slice(1);
    const input = document.getElementById(inputId);

    if (!query || query.trim().length === 0) {
        list.classList.remove('show');
        list.innerHTML = '';
        if (input) input.classList.remove('highlight');
        filteredData[field] = [];
        selectedIndex[field] = -1;
        return;
    }

    const q = query.toLowerCase().trim();
    let data = [];

    if (field === 'nip') {
        data = masterPeserta.filter(p => p.nip && p.nip.toLowerCase().includes(q));
    } else if (field === 'nama') {
        data = masterPeserta.filter(p => p.nama && p.nama.toLowerCase().includes(q));
    } else if (field === 'bagian') {
        const uniqueBagian = [...new Set(masterPeserta.map(p => p.bagian).filter(b => b && b.toLowerCase().includes(q)))];
        data = uniqueBagian.map(b => ({ bagian: b }));
    }

    if (data.length === 0 && masterPeserta.length === 0) {
        list.innerHTML = `<div class="autocomplete-empty">📂 Belum ada data database</div>`;
        list.classList.add('show');
        return;
    }

    if (data.length === 0) {
        list.innerHTML = `<div class="autocomplete-empty">😕 Tidak ditemukan di database</div>`;
        list.classList.add('show');
        return;
    }

    data = data.slice(0, 10);
    filteredData[field] = data;
    selectedIndex[field] = -1;

    let html = '';
    data.forEach((p, idx) => {
        let display = '', sub = '', badge = '';

        if (field === 'nip') {
            display = p.nip;
            sub = p.nama || '-';
            badge = p.bagian || 'Karyawan';
            const qLower = q.toLowerCase();
            if (p.nip.toLowerCase().includes(qLower)) {
                const start = p.nip.toLowerCase().indexOf(qLower);
                const end = start + q.length;
                display = p.nip.substring(0, start) +
                    `<span class="highlight">${p.nip.substring(start, end)}</span>` +
                    p.nip.substring(end);
            }
        } else if (field === 'nama') {
            display = p.nama;
            sub = p.nip || '-';
            badge = p.bagian || 'Karyawan';
            const qLower = q.toLowerCase();
            if (p.nama.toLowerCase().includes(qLower)) {
                const start = p.nama.toLowerCase().indexOf(qLower);
                const end = start + q.length;
                display = p.nama.substring(0, start) +
                    `<span class="highlight">${p.nama.substring(start, end)}</span>` +
                    p.nama.substring(end);
            }
        } else if (field === 'bagian') {
            display = p.bagian;
            sub = 'Klik untuk memilih';
            badge = '';
            const qLower = q.toLowerCase();
            if (p.bagian.toLowerCase().includes(qLower)) {
                const start = p.bagian.toLowerCase().indexOf(qLower);
                const end = start + q.length;
                display = p.bagian.substring(0, start) +
                    `<span class="highlight">${p.bagian.substring(start, end)}</span>` +
                    p.bagian.substring(end);
            }
        }

        html += `
            <div class="autocomplete-item" data-index="${idx}" onclick="selectPeserta('${field}', ${idx})">
                <div>
                    <div class="main">${display}</div>
                    ${sub ? `<div class="sub">${sub}</div>` : ''}
                </div>
                ${badge ? `<span class="badge-info">${badge}</span>` : ''}
            </div>
        `;
    });

    list.innerHTML = html;
    list.classList.add('show');
    if (input) input.classList.add('highlight');
}

function selectPeserta(field, index) {
    const data = filteredData[field];
    if (!data || !data[index]) return;
    const p = data[index];

    if (field === 'nip') {
        document.getElementById('inputNip').value = p.nip;
        document.getElementById('inputNama').value = p.nama || '';
        document.getElementById('inputBagian').value = p.bagian || '';
        closeAllLists();
        
    } else if (field === 'nama') {
        document.getElementById('inputNip').value = p.nip || '';
        document.getElementById('inputNama').value = p.nama;
        document.getElementById('inputBagian').value = p.bagian || '';
        closeAllLists();
    
    } else if (field === 'bagian') {
        document.getElementById('inputBagian').value = p.bagian;
        closeAllLists();
        document.getElementById('inputNip').focus();
    }
    document.querySelectorAll('.autocomplete-input').forEach(el => el.classList.remove('highlight'));
}

function handleKeydown(field, e) {
    const listMap = { nip: 'listNip', nama: 'listNama', bagian: 'listBagian' };
    const list = document.getElementById(listMap[field]);
    const items = list.querySelectorAll('.autocomplete-item');

    if (!list.classList.contains('show')) {
        if (e.key === 'Enter') {
            e.preventDefault();
            ambilAntrian();
        }
        return;
    }

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (items.length > 0) {
            selectedIndex[field] = (selectedIndex[field] + 1) % items.length;
            highlightItem(items, selectedIndex[field]);
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (items.length > 0) {
            selectedIndex[field] = (selectedIndex[field] - 1 + items.length) % items.length;
            highlightItem(items, selectedIndex[field]);
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex[field] >= 0 && selectedIndex[field] < items.length) {
            items[selectedIndex[field]].click();
        } else if (filteredData[field] && filteredData[field].length === 1) {
            selectPeserta(field, 0);
        } else {
            ambilAntrian();
        }
    } else if (e.key === 'Escape') {
        list.classList.remove('show');
        list.innerHTML = '';
        document.querySelectorAll('.autocomplete-input').forEach(el => el.classList.remove('highlight'));
        filteredData[field] = [];
        selectedIndex[field] = -1;
    }
}

function highlightItem(items, index) {
    items.forEach((item, idx) => {
        item.style.background = idx === index ? '#dbeafe' : '';
    });
    if (index >= 0 && index < items.length) {
        items[index].scrollIntoView({ block: 'nearest' });
    }
}

function closeAllLists() {
    document.querySelectorAll('.autocomplete-list').forEach(el => {
        el.classList.remove('show');
        el.innerHTML = '';
    });
    document.querySelectorAll('.autocomplete-input').forEach(el => el.classList.remove('highlight'));
    filteredData = { nip: [], nama: [], bagian: [] };
    selectedIndex = { nip: -1, nama: -1, bagian: -1 };
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.autocomplete-container')) {
        closeAllLists();
    }
});

// ============================================================
// AMBIL ANTRIAN (ADMIN)
// ============================================================
function ambilAntrian() {
    // Cek jadwal
    const cek = cekJamOperasional();
    if (!cek.boleh) {
        showToast(cek.pesan, 'error');
        return;
    }

    const nip = document.getElementById('inputNip').value.trim();
    const nama = document.getElementById('inputNama').value.trim();
    const bagian = document.getElementById('inputBagian').value.trim();

    if (!nip || !nama || !bagian) {
        showToast('⚠️ NIP, Nama, dan Bagian harus diisi!', 'error');
        return;
    }

    // 1. CEK APAKAH NIP TERDAFTAR DI MASTER PESERTA
    const peserta = masterPeserta.find(p => p.nip === nip);
    if (!peserta) {
        showToast('❌ NIP tidak terdaftar! Silakan hubungi admin.', 'error');
        clearForm();
        return;
    }

    // 2. (OPSIONAL) CEK FORMAT NIP - 11 DIGIT ANGKA
    if (!/^\d{11}$/.test(nip)) {
        showToast('⚠️ Format NIP salah! Harus 11 digit angka.', 'error');
        clearForm();
        return;
    }


    // 🔥 CEK DUPLIKAT NIP (di antrian lokal)
    const cekAntrian = antrian.find(a => a.nip === nip);
    if (cekAntrian) {
        showToast(`⚠️ "${nama}" sudah terdaftar dengan nomor ${cekAntrian.nomor}`, 'error');
        clearForm();
        return;
    }

    // 🔥 CEK DUPLIKAT NIP (di Firebase, untuk multi-user)
    if (firebaseEnabled && database) {
        // Cek di Firebase apakah NIP sudah ada
        const nipRef = database.ref('antrianData/antrian');
        nipRef.once('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const exists = data.some(a => a.nip === nip);
                if (exists) {
                    showToast(`⚠️ NIP "${nip}" sudah terdaftar di sistem!`, 'error');
                    clearForm();
                    return;
                }
            }
            // Lanjutkan proses ambil antrian
            prosesAmbilAntrian(nip, nama, bagian);
        }).catch(() => {
            // Jika Firebase error, lanjutkan dengan data lokal
            prosesAmbilAntrian(nip, nama, bagian);
        });
    } else {
        // Tanpa Firebase, langsung proses
        prosesAmbilAntrian(nip, nama, bagian);
    }
}

// ============================================================
// PROSES AMBIL ANTRIAN (DENGAN ATOMIC INCREMENT)
// ============================================================
function prosesAmbilAntrian(nip, nama, bagian) {
    // 🔥 Gunakan Firebase Transaction untuk nomor unik
    if (firebaseEnabled && database) {
        const ref = database.ref('antrianData/nomorTerakhir');
        ref.transaction((current) => {
            // Jika current null, set ke 0
            return (current || 0) + 1;
        }, (error, committed, snapshot) => {
            if (error) {
                showToast('⚠️ Gagal mengambil nomor antrian', 'error');
                return;
            }
            if (committed) {
                const nomorBaru = String(snapshot.val()).padStart(3, '0');
                // Simpan antrian dengan nomor baru
                simpanAntrianKeFirebase(nip, nama, bagian, nomorBaru);
            } else {
                showToast('⚠️ Gagal mendapatkan nomor antrian', 'error');
            }
        }, false);
    } else {
        // Tanpa Firebase, gunakan localStorage
        nomorTerakhir++;
        const nomorBaru = String(nomorTerakhir).padStart(3, '0');
        simpanAntrianLokal(nip, nama, bagian, nomorBaru);
    }
}

// ============================================================
// SIMPAN ANTRIAN KE FIREBASE
// ============================================================
function simpanAntrianKeFirebase(nip, nama, bagian, nomorBaru) {
    const data = {
        nip, nama, bagian, nomor: nomorBaru
    };

    // Ambil data antrian saat ini dari Firebase
    database.ref('antrianData/antrian').once('value', (snapshot) => {
        let antrianData = snapshot.val() || [];
        // Cek duplikat lagi untuk jaga-jaga
        const exists = antrianData.some(a => a.nip === nip);
        if (exists) {
            showToast(`⚠️ NIP "${nama}" sudah terdaftar!`, 'error');
            clearForm();
            return;
        }
        antrianData.push(data);
        // Simpan kembali ke Firebase
        database.ref('antrianData/antrian').set(antrianData)
            .then(() => {
                // Tambahkan ke array lokal
                antrian.push(data);
                renderTabel();
                document.getElementById('nomorAntrian').textContent = nomorBaru;
                document.getElementById('detailAntrian').innerHTML = `<strong>${nama}</strong> · ${bagian}`;
                const { tanggal, waktu } = formatTanggalWaktu();
                document.getElementById('tanggalAmbil').textContent = tanggal;
                document.getElementById('waktuAmbil').textContent = waktu;
                document.getElementById('ticket').classList.add('show');
                clearForm();
                simpanKeLocalStorage(); // backup ke localStorage
                showToast(`🎫 Nomor ${nomorBaru} untuk ${nama}`, 'success');
            })
            .catch((err) => {
                showToast('⚠️ Gagal menyimpan ke Firebase', 'error');
                console.error(err);
            });
    });
}

// ============================================================
// SIMPAN ANTRIAN LOKAL (tanpa Firebase)
// ============================================================
function simpanAntrianLokal(nip, nama, bagian, nomorBaru) {
    antrian.push({ nip, nama, bagian, nomor: nomorBaru });
    renderTabel();
    document.getElementById('nomorAntrian').textContent = nomorBaru;
    document.getElementById('detailAntrian').innerHTML = `<strong>${nama}</strong> · ${bagian}`;
    const { tanggal, waktu } = formatTanggalWaktu();
    document.getElementById('tanggalAmbil').textContent = tanggal;
    document.getElementById('waktuAmbil').textContent = waktu;
    document.getElementById('ticket').classList.add('show');
    clearForm();
    simpanKeLocalStorage();
    syncToFirebase(); // sync jika ada Firebase
    showToast(`🎫 Nomor ${nomorBaru} untuk ${nama}`, 'success');
}

// ============================================================
// CLEAR FORM
// ============================================================
function clearForm() {
    document.getElementById('inputNip').value = '';
    document.getElementById('inputNama').value = '';
    document.getElementById('inputBagian').value = '';
    closeAllLists();
    document.getElementById('inputNip').focus();
}

// ============================================================
// HIGHLIGHT ADMIN (KUNING BERTAHAN 15 DETIK)
// ============================================================
function highlightRowAdmin(nip) {
    highlightedNipAdmin = nip;
    renderTabel();

    setTimeout(() => {
        const row = document.getElementById(`row-admin-${nip}`);
        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 300);

    clearTimeout(window._highlightTimerAdmin);
    window._highlightTimerAdmin = setTimeout(() => {
        highlightedNipAdmin = null;
        renderTabel();
    }, 15000);
}

// ============================================================
// KLIK BARIS TABEL ADMIN → TAMPILKAN NOMOR
// ============================================================
function klikAntrianAdmin(nip) {
    const data = antrian.find(a => a.nip === nip);
    if (data) {
        document.getElementById('nomorAntrian').textContent = data.nomor;
        document.getElementById('detailAntrian').innerHTML = `<strong>${data.nama}</strong> · ${data.bagian}`;
        const { tanggal, waktu } = formatTanggalWaktu();
        document.getElementById('tanggalAmbil').textContent = tanggal;
        document.getElementById('waktuAmbil').textContent = waktu;
        document.getElementById('ticket').classList.add('show');

        highlightRowAdmin(nip);
        showToast(`🎫 Menampilkan nomor ${data.nomor} untuk ${data.nama}`, 'info');
    }
}

// ============================================================
// DOWNLOAD GAMBAR TIKET (ADMIN) - SAMA SEPERTI USER
// ============================================================
function downloadTicketImageAdmin() {
    const ticket = document.getElementById('ticket');
    if (!ticket.classList.contains('show')) {
        showToast('⚠️ Belum ada nomor antrian untuk diunduh!', 'error');
        return;
    }

    showToast('⏳ Sedang memproses gambar...', 'info');

    html2canvas(ticket, {
        scale: 4,
        backgroundColor: '#ffffff',
        allowTaint: false,
        useCORS: true,
        logging: false
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Tiket_Antrian_${document.getElementById('nomorAntrian').textContent}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
        showToast('📥 Tiket berhasil diunduh!', 'success');
    }).catch(err => {
        console.error(err);
        showToast('⚠️ Gagal mengunduh gambar', 'error');
    });
}

// ============================================================
// CEK ANTRIAN SAYA
// ============================================================
function lihatAntrianSaya() {
    const nip = prompt('Masukkan NIP Anda:');
    if (!nip) return;
    const data = antrian.find(a => a.nip === nip.trim());
    if (data) {
        document.getElementById('nomorAntrian').textContent = data.nomor;
        document.getElementById('detailAntrian').innerHTML = `<strong>${data.nama}</strong> · ${data.bagian}`;
        const { tanggal, waktu } = formatTanggalWaktu();
        document.getElementById('tanggalAmbil').textContent = tanggal;
        document.getElementById('waktuAmbil').textContent = waktu;
        document.getElementById('ticket').classList.add('show');

        const index = antrian.findIndex(a => a.nip === nip.trim());
        if (index !== -1) {
            const page = Math.floor(index / itemsPerPageAdmin) + 1;
            if (currentPageAdmin !== page) {
                currentPageAdmin = page;
                renderTabel();
            }
        }

        setTimeout(() => {
            highlightRowAdmin(nip.trim());
        }, 200);
        showToast(`🎫 Nomor antrian Anda: ${data.nomor} (${data.nama})`, 'success');
    } else {
        showToast('😕 NIP tidak ditemukan dalam antrian', 'info');
    }
}
// ============================================================
// TAMBAH PESERTA (ADMIN ONLY)
// ============================================================
function tambahPeserta() {
    const nip = prompt('Masukkan NIP:');
    if (nip === null) return;
    if (!nip.trim()) {
        showToast('⚠️ NIP harus diisi!', 'error');
        return;
    }
    const nama = prompt('Masukkan Nama:');
    if (nama === null) return;
    if (!nama.trim()) {
        showToast('⚠️ Nama harus diisi!', 'error');
        return;
    }
    const bagian = prompt('Masukkan Bagian:', 'Karyawan') || 'Karyawan';

    if (masterPeserta.some(p => p.nip === nip.trim())) {
        showToast('⚠️ NIP sudah terdaftar!', 'error');
        return;
    }

    masterPeserta.push({ nip: nip.trim(), nama: nama.trim(), bagian: bagian.trim() });
    simpanSuggestionKeLocalStorage();
    syncToFirebase();
    updateDatabaseStatus();
    showToast(`✅ Peserta "${nama.trim()}" ditambahkan`, 'success');
}

// ============================================================
// IMPORT DATA (ADMIN ONLY)
// ============================================================
function importData(event) {
    const file = event.target.files[0];
    if (!file) {
        showToast('⚠️ Pilih file terlebih dahulu!', 'error');
        return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
        showToast('⚠️ Format file harus .xlsx, .xls, atau .csv', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

            let headerRowIndex = -1, dataStartIndex = -1;
            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;
                const rowStr = row.join(' ').toUpperCase();
                if (rowStr.includes('NO NIP') || rowStr.includes('NIP') || rowStr.includes('NAMA')) {
                    headerRowIndex = i;
                    dataStartIndex = i + 1;
                    break;
                }
            }

            if (headerRowIndex === -1 || dataStartIndex === -1) {
                showToast('⚠️ Tidak menemukan header (NO NIP / NAMA / BAGIAN)', 'error');
                return;
            }

            const headerRow = jsonData[headerRowIndex];
            const headerMap = {};
            headerRow.forEach((col, idx) => {
                const colStr = String(col).toUpperCase().trim();
                if (colStr.includes('NIP') || colStr.includes('NO')) headerMap['nip'] = idx;
                else if (colStr.includes('NAMA')) headerMap['nama'] = idx;
                else if (colStr.includes('BAGIAN') || colStr.includes('DEPART')) headerMap['bagian'] = idx;
            });

            const dataRows = jsonData.slice(dataStartIndex);
            const validRows = dataRows.filter(row => {
                const nip = row[headerMap['nip']] || '';
                const nama = row[headerMap['nama']] || '';
                return String(nip).trim() && String(nama).trim();
            });

            if (validRows.length === 0) {
                showToast('⚠️ Tidak ada data valid di Excel!', 'error');
                return;
            }

            let preview = `📊 ${validRows.length} data ditemukan\n\n`;
            preview += `📌 Header: ${headerRow.join(' | ')}\n\n`;
            preview += `📌 3 Data Pertama:\n`;
            validRows.slice(0, 3).forEach((row, i) => {
                const nip = row[headerMap['nip']] || '';
                const nama = row[headerMap['nama']] || '';
                const bagian = row[headerMap['bagian']] || 'Karyawan';
                preview += `${i+1}. ${nip} | ${nama} | ${bagian}\n`;
            });

            if (!confirm(`${preview}\n\nLanjutkan import?`)) {
                event.target.value = '';
                return;
            }

            let imported = 0, duplicate = 0;
            validRows.forEach(row => {
                const nip = String(row[headerMap['nip']] || '').trim();
                const nama = String(row[headerMap['nama']] || '').trim();
                const bagian = String(row[headerMap['bagian']] || 'Karyawan').trim();
                if (nip && nama) {
                    if (!masterPeserta.some(p => p.nip === nip)) {
                        masterPeserta.push({ nip, nama, bagian: bagian || 'Karyawan' });
                        imported++;
                    } else {
                        duplicate++;
                    }
                }
            });

            simpanSuggestionKeLocalStorage();
            syncToFirebase();
            updateDatabaseStatus();
            renderTabel();
            event.target.value = '';

            let message = `✅ Import ${imported} peserta`;
            if (duplicate > 0) message += `, ${duplicate} duplikat diabaikan`;
            showToast(message, imported > 0 ? 'success' : 'info');

        } catch (error) {
            showToast('⚠️ Gagal membaca file: ' + error.message, 'error');
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}

// ============================================================
// LIHAT DATABASE (ADMIN) - DENGAN MODAL RESPONSIF
// ============================================================
function lihatDatabase() {
    if (masterPeserta.length === 0) {
        showToast('📂 Belum ada database', 'info');
        return;
    }

    // Buat modal container
    const modal = document.createElement('div');
    modal.id = 'modalDatabase';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        padding: 16px;
        animation: fadeIn 0.3s ease;
        -webkit-overflow-scrolling: touch;
    `;

    // Konten modal
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 20px 16px;
        max-width: 600px;
        width: 100%;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease;
        position: relative;
    `;

    // ===== HEADER =====
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 2px solid #e8edf5;
        flex-shrink: 0;
    `;
    header.innerHTML = `
        <h3 style="margin:0; color:#1a2a4a; font-size:16px;">
            <i class="fas fa-database" style="color:#2a5298;"></i> 
            Database Peserta (${masterPeserta.length})
        </h3>
    `;

    // ===== TOMBOL TUTUP (di header) =====
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 28px;
        color: #94a3b8;
        cursor: pointer;
        padding: 0 8px;
        line-height: 1;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
    `;
    closeBtn.setAttribute('aria-label', 'Tutup');
    closeBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        modal.remove();
    };
    // 🔥 Tambahkan event touch untuk HP
    closeBtn.ontouchstart = function(e) {
        e.preventDefault();
        modal.remove();
    };
    header.appendChild(closeBtn);

    // ===== BODY (SCROLLABLE) =====
    const body = document.createElement('div');
    body.style.cssText = `
        overflow-y: auto;
        flex: 1;
        padding-right: 4px;
        -webkit-overflow-scrolling: touch;
    `;

    // Buat tabel
    let tableHtml = `
        <table style="
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        ">
            <thead>
                <tr style="background: #f1f5f9; position: sticky; top: 0; z-index: 2;">
                    <th style="padding: 6px 8px; text-align: left; border-bottom: 2px solid #e8edf5;">#</th>
                    <th style="padding: 6px 8px; text-align: left; border-bottom: 2px solid #e8edf5;">NIP</th>
                    <th style="padding: 6px 8px; text-align: left; border-bottom: 2px solid #e8edf5;">Nama</th>
                    <th style="padding: 6px 8px; text-align: left; border-bottom: 2px solid #e8edf5;">Bagian</th>
                </tr>
            </thead>
            <tbody>
    `;

    masterPeserta.forEach((p, i) => {
        tableHtml += `
            <tr>
                <td style="padding: 5px 8px; border-bottom: 1px solid #f0f4fa;">${i + 1}</td>
                <td style="padding: 5px 8px; border-bottom: 1px solid #f0f4fa;">${p.nip}</td>
                <td style="padding: 5px 8px; border-bottom: 1px solid #f0f4fa;">${p.nama}</td>
                <td style="padding: 5px 8px; border-bottom: 1px solid #f0f4fa;">${p.bagian}</td>
            </tr>
        `;
    });

    tableHtml += `
            </tbody>
        </table>
    `;
    body.innerHTML = tableHtml;

    // ===== FOOTER =====
    const footer = document.createElement('div');
    footer.style.cssText = `
        margin-top: 12px;
        padding-top: 12px;
        border-top: 2px solid #e8edf5;
        text-align: center;
        flex-shrink: 0;
    `;

    const closeFooterBtn = document.createElement('button');
    closeFooterBtn.className = 'btn btn-primary';
    closeFooterBtn.style.cssText = `
        width: 100%;
        padding: 12px;
        border: none;
        border-radius: 12px;
        background: linear-gradient(135deg, #1e3c72, #2a5298);
        color: white;
        font-weight: 600;
        font-size: 15px;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
    `;
    closeFooterBtn.innerHTML = '<i class="fas fa-times"></i> Tutup';
    closeFooterBtn.onclick = function(e) {
        e.preventDefault();
        modal.remove();
    };
    closeFooterBtn.ontouchstart = function(e) {
        e.preventDefault();
        modal.remove();
    };
    footer.appendChild(closeFooterBtn);

    // ===== GABUNGKAN =====
    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    modal.appendChild(content);

    // ===== TUTUP MODAL SAAT KLIK DI LUAR =====
    modal.onclick = function(e) {
        if (e.target === this) {
            this.remove();
        }
    };
    // 🔥 Untuk HP (touch)
    modal.ontouchstart = function(e) {
        if (e.target === this) {
            this.remove();
        }
    };

    document.body.appendChild(modal);
}

// ============================================================
// RESET DATABASE (ADMIN ONLY)
// ============================================================
function resetDatabase() {
    if (masterPeserta.length === 0) {
        showToast('⚠️ Database kosong', 'info');
        return;
    }
    if (!confirm(`Hapus database (${masterPeserta.length} peserta)?`)) return;
    masterPeserta = [];
    localStorage.removeItem('masterPeserta');
    syncToFirebase();
    updateDatabaseStatus();
    showToast('🗑️ Database direset', 'info');
}

// ============================================================
// ADMIN REFRESH
// ============================================================
function adminRefresh() {
    loadFromFirebase();
    showToast('🔄 Data diperbarui', 'info');
}


// ============================================================
// RENDER TABEL (ADMIN - Dengan Aksi Hapus)
// ============================================================
let highlightedNipAdmin = null; // Untuk menyimpan NIP yang sedang di-highlight
function renderTabel() {
    const tbody = document.getElementById('tbodyAntrian');
    const count = document.getElementById('countAntrian');
    const info = document.getElementById('infoAntrianAdmin');

    const data = antrian;
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / itemsPerPageAdmin) || 1;

    if (currentPageAdmin > totalPages) currentPageAdmin = totalPages;
    if (currentPageAdmin < 1) currentPageAdmin = 1;

    const start = (currentPageAdmin - 1) * itemsPerPageAdmin;
    const end = Math.min(start + itemsPerPageAdmin, totalItems);
    const pageData = data.slice(start, end);

    count.textContent = totalItems + ' antrian';
    if (info) info.textContent = `Menampilkan ${totalItems === 0 ? 0 : start+1} - ${end} dari ${totalItems} antrian`;

    // Update tombol pagination
    const prevBtn = document.getElementById('prevPageAdminBtn');
    const nextBtn = document.getElementById('nextPageAdminBtn');
    if (prevBtn) prevBtn.disabled = (currentPageAdmin === 1 || totalItems === 0);
    if (nextBtn) nextBtn.disabled = (currentPageAdmin === totalPages || totalItems === 0);

    if (totalItems === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-inbox"></i>Belum ada antrian</div></td></tr>`;
        return;
    }

    let html = '';
    pageData.forEach((a, idx) => {
        const rowId = `row-admin-${a.nip}`;
        // 🔥 Jika nip ini sedang di-highlight, tambahkan style langsung
        const isHighlighted = (highlightedNipAdmin === a.nip);
        html += `
            <tr id="${rowId}" onclick="klikAntrianAdmin('${a.nip}')" style="cursor:pointer; ${isHighlighted ? 'background-color: #fef08a !important;' : ''}">
                <td>${start + idx + 1}</td>
                <td>${a.nip}</td>
                <td>${a.nama}</td>
                <td>${a.bagian}</td>
                <td class="nomor-cell">${a.nomor}</td>
                <td>
                    <button class="btn-delete" onclick="event.stopPropagation(); hapusAntrian('${a.nip}')" title="Hapus antrian">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ============================================================
// HAPUS ANTRIAN (ADMIN ONLY)
// ============================================================
function hapusAntrian(nip) {
    const peserta = antrian.find(a => a.nip === nip);
    if (!peserta) return;
    if (!confirm(`Hapus antrian "${peserta.nama}"?`)) return;

    antrian = antrian.filter(a => a.nip !== nip);
    antrian.forEach((a, idx) => a.nomor = String(idx + 1).padStart(3, '0'));
    nomorTerakhir = antrian.length;

    renderTabel();
    if (antrian.length === 0) document.getElementById('ticket').classList.remove('show');
    simpanKeLocalStorage();
    syncToFirebase();
    showToast(`🗑️ Antrian "${peserta.nama}" dihapus`, 'info');
}

// ============================================================
// RESET ALL ANTRIAN (ADMIN ONLY)
// ============================================================
function resetAll() {
    if (antrian.length === 0) {
        showToast('⚠️ Tidak ada antrian', 'info');
        return;
    }
    if (!confirm('Hapus semua antrian?')) return;
    antrian = [];
    nomorTerakhir = 0;
    renderTabel();
    document.getElementById('ticket').classList.remove('show');
    localStorage.removeItem('antrianSembako');
    syncToFirebase();
    showToast('🔄 Semua antrian direset', 'info');
}

// ============================================================
// SAVE EXCEL (ADMIN ONLY)
// ============================================================
function saveExcel() {
    if (antrian.length === 0) {
        showToast('⚠️ Belum ada data antrian', 'error');
        return;
    }
    const dataForExcel = [['#', 'NIP', 'Nama', 'Bagian', 'Nomor Antrian']];
    antrian.forEach((a, i) => dataForExcel.push([i + 1, a.nip, a.nama, a.bagian, a.nomor]));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(dataForExcel);
    ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, "Antrian");
    XLSX.writeFile(wb, `Antrian_KPJ_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('📥 File Excel berhasil didownload!', 'success');
}

// ============================================================
// LOCAL STORAGE
// ============================================================
function simpanKeLocalStorage() {
    localStorage.setItem('antrianSembako', JSON.stringify({ antrian, nomorTerakhir }));
}

function loadDariLocalStorage() {
    const data = localStorage.getItem('antrianSembako');
    if (data) {
        try {
            const parsed = JSON.parse(data);
            antrian = parsed.antrian || [];
            nomorTerakhir = parsed.nomorTerakhir || 0;
            renderTabel();
            if (antrian.length > 0) {
                const last = antrian[antrian.length - 1];
                document.getElementById('nomorAntrian').textContent = last.nomor;
                document.getElementById('detailAntrian').innerHTML = `<strong>${last.nama}</strong> · ${last.bagian}`;
                const { tanggal, waktu } = formatTanggalWaktu();
                document.getElementById('tanggalAmbil').textContent = tanggal;
                document.getElementById('waktuAmbil').textContent = waktu;
                document.getElementById('ticket').classList.add('show');
            }
        } catch (e) {}
    }
}

function simpanSuggestionKeLocalStorage() {
    localStorage.setItem('masterPeserta', JSON.stringify(masterPeserta));
}

function loadSuggestionDariLocalStorage() {
    const data = localStorage.getItem('masterPeserta');
    if (data) {
        try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed) && parsed.length > 0) {
                masterPeserta = parsed;
                return true;
            }
        } catch (e) {}
    }
    return false;
}

// ============================================================
// PAGINATION (ADMIN)
// ============================================================
let currentPageAdmin = 1;
const itemsPerPageAdmin = 10;

// ============================================================
// FIREBASE SYNC
// ============================================================
function syncToFirebase() {
    if (!firebaseEnabled || !database) return;
    try {
        // 🔥 Gunakan update, bukan set, agar tidak overwrite data lain
        const updates = {};
        updates['antrianData/antrian'] = antrian;
        updates['antrianData/nomorTerakhir'] = nomorTerakhir;
        updates['antrianData/masterPeserta'] = masterPeserta;
        updates['antrianData/lastUpdated'] = firebase.database.ServerValue.TIMESTAMP;
        
        database.ref().update(updates)
            .then(() => {
                const syncStatus = document.getElementById('syncStatus');
                if (syncStatus) syncStatus.innerHTML = '<i class="fas fa-cloud"></i> Sync OK';
            })
            .catch((err) => {
                console.error('Sync error:', err);
            });
    } catch (e) {
        console.error('Sync error:', e);
    }
}

function loadFromFirebase() {
    if (!firebaseEnabled || !database) return;
    database.ref('antrianData').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // 🔥 Hanya update jika data dari Firebase lebih baru
            const lastUpdated = data.lastUpdated || 0;
            const localLastUpdated = localStorage.getItem('antrianLastUpdated') || 0;
            
            if (lastUpdated > localLastUpdated) {
                antrian = data.antrian || [];
                nomorTerakhir = data.nomorTerakhir || 0;
                if (data.masterPeserta && data.masterPeserta.length > 0) {
                    masterPeserta = data.masterPeserta;
                    simpanSuggestionKeLocalStorage();
                    updateDatabaseStatus();
                }
                renderTabel();
                simpanKeLocalStorage();
                localStorage.setItem('antrianLastUpdated', lastUpdated);
                
                if (antrian.length > 0) {
                    const last = antrian[antrian.length - 1];
                    document.getElementById('nomorAntrian').textContent = last.nomor;
                    document.getElementById('detailAntrian').innerHTML = `<strong>${last.nama}</strong> · ${last.bagian}`;
                    const { tanggal, waktu } = formatTanggalWaktu();
                    document.getElementById('tanggalAmbil').textContent = tanggal;
                    document.getElementById('waktuAmbil').textContent = waktu;
                    document.getElementById('ticket').classList.add('show');
                }
                const syncStatus = document.getElementById('syncStatus');
                if (syncStatus) syncStatus.innerHTML = '<i class="fas fa-cloud"></i> Sync OK';
            }
        }
    }, (error) => {
        console.error('Firebase error:', error);
    });
}

// ============================================================
// PASSWORD ADMIN (Disimpan di Firebase)
// ============================================================
let adminPassword = 'admin123'; // Default password

// ============================================================
// LOAD PASSWORD DARI FIREBASE
// ============================================================
function loadAdminPassword() {
    if (!firebaseEnabled || !database) return;
    database.ref('adminPassword').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            adminPassword = data;
            console.log('🔑 Password admin di-load dari Firebase');
        } else {
            // Jika belum ada, simpan default
            database.ref('adminPassword').set(adminPassword);
            console.log('🔑 Password default disimpan ke Firebase');
        }
    });
}

// ============================================================
// UBAH PASSWORD ADMIN
// ============================================================
function ubahPasswordAdmin() {
    // Tampilkan dialog untuk ubah password
    const oldPassword = prompt('🔒 Masukkan password lama:');
    if (oldPassword === null) return;
    
    if (oldPassword !== adminPassword) {
        showToast('❌ Password lama salah!', 'error');
        return;
    }
    
    const newPassword = prompt('🔑 Masukkan password baru (minimal 4 karakter):');
    if (newPassword === null) return;
    if (newPassword.trim().length < 4) {
        showToast('⚠️ Password minimal 4 karakter!', 'error');
        return;
    }
    
    const confirmPassword = prompt('🔑 Konfirmasi password baru:');
    if (confirmPassword === null) return;
    
    if (newPassword !== confirmPassword) {
        showToast('❌ Password tidak cocok!', 'error');
        return;
    }
    
    // Simpan ke Firebase
    if (!firebaseEnabled || !database) {
        showToast('⚠️ Firebase tidak terhubung!', 'error');
        return;
    }
    
    database.ref('adminPassword').set(newPassword.trim())
        .then(() => {
            adminPassword = newPassword.trim();
            showToast('✅ Password berhasil diubah!', 'success');
            console.log('🔑 Password admin diubah');
        })
        .catch((error) => {
            showToast('⚠️ Gagal menyimpan password: ' + error.message, 'error');
        });
}

// ============================================================
// INIT (ADMIN)
// ============================================================
window.onload = function() {
    const hasData = loadSuggestionDariLocalStorage();
    if (!hasData) {
        masterPeserta = DEFAULT_PESERTA;
        simpanSuggestionKeLocalStorage();
    }

    loadDariLocalStorage();
    updateDatabaseStatus();

    // 🔥 TAMPILKAN JADWAL DEFAULT DULU
    updateJadwalUI();

    // 🔥 PAGINATION: Set halaman awal ke 1
    currentPageAdmin = 1;
    renderTabel();

    if (firebaseEnabled) {
        loadFromFirebase();
        loadJadwalFromFirebase();
        loadAdminPassword();
    }

    if (antrian.length === 0) {
        document.getElementById('inputNip').focus();
    }

    if (firebaseEnabled) {
        setInterval(syncToFirebase, 30000);
    }
};

function nextPageAdmin() {
    currentPageAdmin++;
    renderTabel();
}

function prevPageAdmin() {
    currentPageAdmin--;
    renderTabel();
}