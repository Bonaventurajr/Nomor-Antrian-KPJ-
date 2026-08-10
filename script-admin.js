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
let highlightedNipAdmin = null;
let currentPageAdmin = 1;
const itemsPerPageAdmin = 10;
let isSyncing = false;

// ============================================================
// JADWAL OPERASIONAL
// ============================================================
let jadwalOperasional = {
    aktif: true,
    tanggalMulai: new Date().toISOString().split('T')[0],
    tanggalSelesai: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
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
// FORMAT TANGGAL
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
// JADWAL FUNCTIONS (DIPERBAIKI)
// ============================================================
function loadJadwalFromFirebase() {
    if (!firebaseEnabled || !database) {
        renderJadwalUI();
        return;
    }
    
    console.log('📥 Memuat jadwal dari Firebase...');
    
    // 🔥 Ambil data dari Firebase
    database.ref('jadwalOperasional').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            jadwalOperasional = data;
            console.log('📦 Jadwal dari Firebase:', jadwalOperasional);
        } else {
            console.log('⚠️ Firebase kosong, simpan default...');
            saveJadwalToFirebase();
        }
        renderJadwalUI();
    }).catch((error) => {
        console.error('Error load jadwal:', error);
        renderJadwalUI();
    });
    
    // 🔥 Listener real-time (update jika ada perubahan dari device lain)
    database.ref('jadwalOperasional').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            jadwalOperasional = data;
            renderJadwalUI();
            console.log('📦 Jadwal diupdate (real-time)');
        }
    });
}

// ============================================================
// CEK JAM OPERASIONAL (DENGAN SERVER TIMESTAMP)
// ============================================================
function cekJamOperasional() {
    if (!jadwalOperasional.aktif) {
        return { boleh: false, pesan: '📢 Sistem pengambilan antrian sedang ditutup oleh admin.' };
    }
    
    // Gunakan waktu dari Firebase (server time)
    if (firebaseEnabled && database) {
        return new Promise((resolve) => {
            database.ref('.info/serverTimeOffset').once('value')
                .then(snap => {
                    const offset = snap.val() || 0;
                    const now = Date.now() + offset;
                    const date = new Date(now);
                    
                    const result = validateWaktuAdmin(date);
                    resolve(result);
                })
                .catch(() => {
                    // Fallback ke waktu lokal jika gagal
                    const result = validateWaktuAdmin(new Date());
                    resolve(result);
                });
        });
    } else {
        // Fallback ke waktu lokal
        return validateWaktuAdmin(new Date());
    }
}

// ============================================================
// VALIDASI WAKTU (FUNGSI PEMBANTU - ADMIN)
// ============================================================
function validateWaktuAdmin(now) {
    const today = now.toISOString().split('T')[0];
    
    if (today < jadwalOperasional.tanggalMulai || today > jadwalOperasional.tanggalSelesai) {
        return { 
            boleh: false, 
            pesan: `📢 Pengambilan antrian hanya ${formatTanggalIndonesia(jadwalOperasional.tanggalMulai)} - ${formatTanggalIndonesia(jadwalOperasional.tanggalSelesai)}.` 
        };
    }
    
    const hariIni = now.getDay();
    let hariKerja = hariIni === 0 ? 7 : hariIni;
    if (!jadwalOperasional.hariKerja.includes(hariKerja)) {
        return { boleh: false, pesan: '📢 Hari ini bukan hari kerja.' };
    }
    
    const jamSekarang = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    if (jamSekarang < jadwalOperasional.jamMulai || jamSekarang > jadwalOperasional.jamSelesai) {
        return { 
            boleh: false, 
            pesan: `📢 Pengambilan nomor antrian hanya ${jadwalOperasional.jamMulai} - ${jadwalOperasional.jamSelesai}.` 
        };
    }
    
    return { boleh: true, pesan: '✅ Sistem buka.' };
}

// ============================================================
// RENDER JADWAL UI (ASYNC - DIPERBAIKI)
// ============================================================
async function renderJadwalUI() {
    const container = document.getElementById('jadwalContainer');
    if (!container) return;
    
    const status = jadwalOperasional.aktif ? '🟢 Aktif' : '🔴 Ditutup';
    const warnaStatus = jadwalOperasional.aktif ? '#059669' : '#dc2626';
    const hariMap = {1:'Senin',2:'Selasa',3:'Rabu',4:'Kamis',5:'Jumat',6:'Sabtu',7:'Minggu'};
    const hariKerja = jadwalOperasional.hariKerja.map(h => hariMap[h] || h).join(', ');
    const tglMulai = formatTanggalIndonesia(jadwalOperasional.tanggalMulai);
    const tglSelesai = formatTanggalIndonesia(jadwalOperasional.tanggalSelesai);
    
    // Cek status operasional
    let statusSistem = '';
    let warnaSistem = '#059669';
    try {
        const cek = await cekJamOperasional();
        if (cek.boleh) {
            statusSistem = '🟢 Buka';
            warnaSistem = '#059669';
        } else {
            statusSistem = '🔴 Tutup';
            warnaSistem = '#dc2626';
        }
    } catch (error) {
        statusSistem = '⚠️ Error';
        warnaSistem = '#f59e0b';
    }
    
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
                        return `<label style="font-size:12px; display:flex; align-items:center; gap:4px; background:#f1f5f9; padding:4px 10px; border-radius:8px; cursor:pointer;">
                            <input type="checkbox" class="hariKerjaCheck" value="${h}" ${checked} />${namaHari}
                        </label>`;
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
            <button class="btn btn-outline btn-sm" onclick="refreshJadwal()">
                <i class="fas fa-sync-alt"></i> Refresh
            </button>
        </div>
        <div style="margin-top:10px; padding:10px 14px; background:#f1f5f9; border-radius:8px; font-size:13px; color:#1a2a4a; display:grid; grid-template-columns:1fr 1fr; gap:4px 16px;">
            <div><strong>Status:</strong> <span style="color:${warnaStatus};">${status}</span></div>
            <div><strong>Sistem:</strong> <span style="color:${warnaSistem};">${statusSistem}</span></div>
            <div><strong>Tanggal:</strong> ${tglMulai} - ${tglSelesai}</div>
            <div><strong>Jam:</strong> ${jadwalOperasional.jamMulai} - ${jadwalOperasional.jamSelesai}</div>
            <div><strong>Hari:</strong> ${hariKerja}</div>
        </div>
    `;
}

// 🔥 LOAD JADWAL DARI FIREBASE (DENGAN PRIORITAS)
function loadJadwalFromFirebase() {
    if (!firebaseEnabled || !database) {
        renderJadwalUI();
        return;
    }
    
    console.log('📥 Memuat jadwal dari Firebase...');
    
    // 🔥 Ambil data dari Firebase
    database.ref('jadwalOperasional').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            jadwalOperasional = data;
            console.log('📦 Jadwal dari Firebase:', jadwalOperasional);
        } else {
            console.log('⚠️ Firebase kosong, simpan default...');
            saveJadwalToFirebase();
        }
        renderJadwalUI();
    }).catch((error) => {
        console.error('Error load jadwal:', error);
        renderJadwalUI();
    });
    
    // 🔥 Listener real-time (update jika ada perubahan dari device lain)
    database.ref('jadwalOperasional').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            jadwalOperasional = data;
            renderJadwalUI();
            console.log('📦 Jadwal diupdate (real-time)');
        }
    });
}

// 🔥 SAVE JADWAL KE FIREBASE
function saveJadwalToFirebase() {
    if (!firebaseEnabled || !database) return;
    
    database.ref('jadwalOperasional').set(jadwalOperasional)
        .then(() => {
            console.log('✅ Jadwal berhasil disimpan ke Firebase');
            renderJadwalUI();
        })
        .catch((error) => {
            console.error('❌ Gagal menyimpan jadwal:', error);
            showToast('⚠️ Gagal menyimpan jadwal: ' + error.message, 'error');
        });
}

// 🔥 SIMPAN JADWAL (DARI FORM)
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
    
    // Validasi
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
    
    // Update data
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
    showToast('✅ Jadwal berhasil disimpan!', 'success');
}

// 🔥 REFRESH JADWAL (MANUAL)
function refreshJadwal() {
    if (!firebaseEnabled || !database) {
        showToast('⚠️ Firebase tidak terhubung!', 'error');
        return;
    }
    
    showToast('🔄 Memuat jadwal terbaru...', 'info');
    
    database.ref('jadwalOperasional').once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                jadwalOperasional = data;
                renderJadwalUI();
                showToast('✅ Jadwal terbaru dimuat!', 'success');
                console.log('📦 Jadwal terbaru:', jadwalOperasional);
            } else {
                showToast('⚠️ Tidak ada jadwal di Firebase', 'info');
            }
        })
        .catch((err) => {
            showToast('⚠️ Gagal load jadwal: ' + err.message, 'error');
            console.error(err);
        });
}

// 🔥 RESET JADWAL KE DEFAULT
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
        hariKerja: [1,2,3,4,5], 
        pesanOff: '📢 Pengambilan nomor antrian hanya 08:00 - 16:00 (Senin-Jumat)' 
    };
    saveJadwalToFirebase();
    renderJadwalUI();
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
    if (data.length === 0) {
        list.classList.remove('show');
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
        } else if (field === 'nama') {
            display = p.nama;
            sub = p.nip || '-';
            badge = p.bagian || 'Karyawan';
        } else {
            display = p.bagian;
            sub = 'Klik untuk memilih';
            badge = '';
        }
        html += `<div class="autocomplete-item" data-index="${idx}" onclick="selectPeserta('${field}', ${idx})"><div><div class="main">${display}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>${badge ? `<span class="badge-info">${badge}</span>` : ''}</div>`;
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
    } else if (field === 'nama') {
        document.getElementById('inputNip').value = p.nip || '';
        document.getElementById('inputNama').value = p.nama;
        document.getElementById('inputBagian').value = p.bagian || '';
    } else if (field === 'bagian') {
        document.getElementById('inputBagian').value = p.bagian;
        document.getElementById('inputNip').focus();
    }
    closeAllLists();
    document.querySelectorAll('.autocomplete-input').forEach(el => el.classList.remove('highlight'));
    ambilAntrian();
}

function handleKeydown(field, e) {
    const listMap = { nip: 'listNip', nama: 'listNama', bagian: 'listBagian' };
    const list = document.getElementById(listMap[field]);
    const items = list.querySelectorAll('.autocomplete-item');
    if (!list.classList.contains('show')) {
        if (e.key === 'Enter') { e.preventDefault(); ambilAntrian(); }
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
// AMBIL ANTRIAN - DENGAN VALIDASI OTOMATIS
// ============================================================
async function ambilAntrian() {
    const cek = await cekJamOperasional();
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

    const peserta = masterPeserta.find(p => p.nip === nip);
    if (!peserta) {
        showToast('❌ NIP tidak terdaftar!', 'error');
        clearForm();
        return;
    }

    if (!/^\d{11}$/.test(nip)) {
        showToast('⚠️ Format NIP salah! Harus 11 digit.', 'error');
        clearForm();
        return;
    }

    //const existingName = antrian.find(a => a.nama.toLowerCase() === nama.toLowerCase());
    //if (existingName) {
        //showToast(`⚠️ Nama "${nama}" sudah terdaftar dengan nomor ${existingName.nomor}`, 'error');
        //clearForm();
        //return;
    //}

    const existingNip = antrian.find(a => a.nip === nip);
    if (existingNip) {
        showToast(`⚠️ NIP "${nip}" sudah terdaftar untuk ${existingNip.nama}`, 'error');
        clearForm();
        return;
    }

    if (firebaseEnabled && database) {
        database.ref('antrianData/antrian').once('value', (snapshot) => {
            const data = snapshot.val() || [];
            //if (data.some(a => a.nama.toLowerCase() === nama.toLowerCase())) {
                //showToast(`⚠️ Nama "${nama}" sudah terdaftar di sistem!`, 'error');
                //clearForm();
                //return;
            //}
            if (data.some(a => a.nip === nip)) {
                showToast(`⚠️ NIP "${nip}" sudah terdaftar di sistem!`, 'error');
                clearForm();
                return;
            }
            prosesAmbilAntrian(nip, nama, bagian);
        }).catch(() => {
            prosesAmbilAntrian(nip, nama, bagian);
        });
    } else {
        prosesAmbilAntrian(nip, nama, bagian);
    }
}


// ============================================================
// PROSES AMBIL ANTRIAN (ADMIN) - HANYA CEK NIP
// ============================================================
function prosesAmbilAntrian(nip, nama, bagian) {
    // Tambahkan ke lokal dulu
    const data = { nip, nama, bagian, status: 'Menunggu', timestamp: Date.now() };
    antrian.push(data);
    renderTabel();
    simpanKeLocalStorage();
    
    if (firebaseEnabled && database) {
        const ref = database.ref('antrianData/nomorTerakhir');
        
        ref.transaction((current) => {
            return (current || 0) + 1;
        }, (error, committed, snapshot) => {
            if (error || !committed) {
                showToast('⚠️ Gagal mengambil nomor antrian', 'error');
                antrian = antrian.filter(a => a.nip !== nip);
                renderTabel();
                simpanKeLocalStorage();
                return;
            }
            
            const nomorBaru = String(snapshot.val()).padStart(3, '0');
            // Update nomor di lokal
            const localItem = antrian.find(a => a.nip === nip);
            if (localItem) localItem.nomor = nomorBaru;
            renderTabel();
            simpanKeLocalStorage();
            
            simpanAntrianKeFirebase(nip, nama, bagian, nomorBaru);
        }, false);
    } else {
        nomorTerakhir++;
        const nomorBaru = String(nomorTerakhir).padStart(3, '0');
        const localItem = antrian.find(a => a.nip === nip);
        if (localItem) localItem.nomor = nomorBaru;
        renderTabel();
        simpanKeLocalStorage();
        showToast(`🎫 Nomor ${nomorBaru} untuk ${nama}`, 'success');
    }
}

function clearForm() {
    document.getElementById('inputNip').value = '';
    document.getElementById('inputNama').value = '';
    document.getElementById('inputBagian').value = '';
    closeAllLists();
    document.getElementById('inputNip').focus();
}

// ============================================================
// RENDER TABEL - AUTO CLEAN + AUTO RESET + AUTO REPAIR
// ============================================================
function renderTabel() {
    // 🔥 AUTO REPAIR: Perbaiki jika nomor tidak sesuai jumlah data
    if (antrian.length > 0) {
        let perluRepair = false;
        antrian.forEach((a, idx) => {
            const expected = String(idx + 1).padStart(3, '0');
            if (a.nomor !== expected) {
                perluRepair = true;
            }
        });
        if (nomorTerakhir !== antrian.length) {
            perluRepair = true;
            console.log(`⚠️ nomorTerakhir=${nomorTerakhir}, antrian.length=${antrian.length}`);
        }
        
        if (perluRepair) {
            console.log('🔧 Auto repair: Reset nomor antrian...');
            antrian.forEach((a, idx) => {
                a.nomor = String(idx + 1).padStart(3, '0');
            });
            nomorTerakhir = antrian.length;
            simpanKeLocalStorage();
            syncToFirebase();
            console.log(`✅ Auto repair selesai! ${nomorTerakhir} antrian`);
        }
    }

    // ============================================================
    // 🔥 AUTO CLEAN DUPLIKAT (HANYA NIP)
    // ============================================================
    if (antrian.length > 1) {
        const seenNip = new Set();
        const cleanData = [];
        antrian.forEach(a => {
            if (!seenNip.has(a.nip)) {
                seenNip.add(a.nip);
                cleanData.push(a);
            }
        });
        if (cleanData.length !== antrian.length) {
            antrian = cleanData;
            console.log('🧹 Duplikat NIP dibersihkan!');
            // Reset nomor setelah clean
            antrian.forEach((a, idx) => {
                a.nomor = String(idx + 1).padStart(3, '0');
            });
            nomorTerakhir = antrian.length;
            simpanKeLocalStorage();
        }
    }


    const tbody = document.getElementById('tbodyAntrian');
    const count = document.getElementById('countAntrian');
    const info = document.getElementById('infoAntrianAdmin');

    const totalItems = antrian.length;
    const totalPages = Math.ceil(totalItems / itemsPerPageAdmin) || 1;
    if (currentPageAdmin > totalPages) currentPageAdmin = totalPages;
    if (currentPageAdmin < 1) currentPageAdmin = 1;

    const start = (currentPageAdmin - 1) * itemsPerPageAdmin;
    const end = Math.min(start + itemsPerPageAdmin, totalItems);
    const pageData = antrian.slice(start, end);

    count.textContent = totalItems + ' antrian';
    if (info) info.textContent = `Menampilkan ${totalItems === 0 ? 0 : start+1} - ${end} dari ${totalItems} antrian`;

    document.getElementById('prevPageAdminBtn').disabled = (currentPageAdmin === 1 || totalItems === 0);
    document.getElementById('nextPageAdminBtn').disabled = (currentPageAdmin === totalPages || totalItems === 0);

    if (totalItems === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-inbox"></i>Belum ada antrian</div></td></tr>`;
        return;
    }

    let html = '';
    pageData.forEach((a) => {
        const isHighlighted = (highlightedNipAdmin === a.nip);
        html += `<tr id="row-admin-${a.nip}" onclick="klikAntrianAdmin('${a.nip}')" style="cursor:pointer; ${isHighlighted ? 'background-color: #fef08a !important;' : ''}">
            <td>${a.nomor}</td>
            <td>${a.nip}</td>
            <td>${a.nama}</td>
            <td>${a.bagian}</td>
            <td class="nomor-cell">${a.nomor}</td>
            <td><button class="btn-delete" onclick="event.stopPropagation(); hapusAntrian('${a.nip}')" title="Hapus"><i class="fas fa-trash-alt"></i></button></td>
        </tr>`;
    });
    tbody.innerHTML = html;
    simpanKeLocalStorage();
}

// ============================================================
// FUNGSI LAINNYA
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
        highlightedNipAdmin = nip;
        renderTabel();
        setTimeout(() => {
            const row = document.getElementById(`row-admin-${nip}`);
            if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
        showToast(`🎫 Nomor ${data.nomor} untuk ${data.nama}`, 'info');
    }
}

function lihatAntrianSaya() {
    const nama = prompt('🔍 Masukkan NAMA Anda (atau NIP):');
    if (!nama) return;
    
    const input = nama.trim();
    let data;
    
    // Cek apakah input berupa NIP (angka 11 digit)
    if (/^\d{11}$/.test(input)) {
        data = antrian.find(a => a.nip === input);
    } else {
        // Cari berdasarkan nama (case insensitive)
        data = antrian.find(a => a.nama.toLowerCase() === input.toLowerCase());
    }
    
    if (data) {
        document.getElementById('nomorAntrian').textContent = data.nomor;
        document.getElementById('detailAntrian').innerHTML = `<strong>${data.nama}</strong> · ${data.bagian}`;
        const { tanggal, waktu } = formatTanggalWaktu();
        document.getElementById('tanggalAmbil').textContent = tanggal;
        document.getElementById('waktuAmbil').textContent = waktu;
        document.getElementById('ticket').classList.add('show');
        highlightedNip = data.nip;
        renderTabel();
        setTimeout(() => {
            const row = document.getElementById(`row-${data.nip}`);
            if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
        showToast(`🎫 Nomor antrian Anda: ${data.nomor} (${data.nama})`, 'success');
    } else {
        showToast('😕 Nama/NIP tidak ditemukan dalam antrian', 'info');
    }
}

function hapusAntrian(nip) {
    const items = antrian.filter(a => a.nip === nip);
    if (items.length === 0) { showToast('⚠️ Data tidak ditemukan', 'error'); return; }
    if (items.length > 1) {
        let msg = '⚠️ Ada ' + items.length + ' data dengan NIP yang sama:\n\n';
        items.forEach((a, idx) => { msg += `${idx+1}. ${a.nama} - ${a.bagian} (${a.nomor})\n`; });
        msg += '\nMasukkan nomor urut yang ingin dihapus (0=batal):';
        const pilihan = prompt(msg);
        if (pilihan === null || pilihan === '0') return;
        const idx = parseInt(pilihan) - 1;
        if (isNaN(idx) || idx < 0 || idx >= items.length) {
            showToast('⚠️ Pilihan tidak valid!', 'error');
            return;
        }
        const globalIndex = antrian.indexOf(items[idx]);
        if (globalIndex !== -1) {
            const namaPeserta = antrian[globalIndex].nama;
            antrian.splice(globalIndex, 1);
            renderTabel();
            simpanKeLocalStorage();
            syncToFirebase();
            showToast(`🗑️ Antrian "${namaPeserta}" dihapus`, 'info');
        }
        return;
    }
    const peserta = items[0];
    if (!confirm(`Hapus antrian "${peserta.nama}"?`)) return;
    antrian = antrian.filter(a => a.nip !== nip);
    renderTabel();
    if (antrian.length === 0) document.getElementById('ticket').classList.remove('show');
    simpanKeLocalStorage();
    syncToFirebase();
    showToast(`🗑️ Antrian "${peserta.nama}" dihapus`, 'info');
}

function tambahPeserta() {
    const nip = prompt('Masukkan NIP:');
    if (nip === null) return;
    if (!nip.trim()) { showToast('⚠️ NIP harus diisi!', 'error'); return; }
    const nama = prompt('Masukkan Nama:');
    if (nama === null) return;
    if (!nama.trim()) { showToast('⚠️ Nama harus diisi!', 'error'); return; }
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

function downloadTicketImageAdmin() {
    const ticket = document.getElementById('ticket');
    if (!ticket.classList.contains('show')) {
        showToast('⚠️ Belum ada tiket', 'error');
        return;
    }
    showToast('⏳ Memproses...', 'info');
    html2canvas(ticket, { scale: 4, backgroundColor: '#ffffff' })
        .then(canvas => {
            const link = document.createElement('a');
            link.download = `Tiket_${document.getElementById('nomorAntrian').textContent}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            showToast('📥 Tiket diunduh!', 'success');
        })
        .catch(err => {
            showToast('⚠️ Gagal unduh', 'error');
            console.error(err);
        });
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) { showToast('⚠️ Pilih file!', 'error'); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const workbook = XLSX.read(e.target.result, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);
            let imported = 0;
            json.forEach(row => {
                const nip = String(row['NO NIP'] || row['NIP'] || '').trim();
                const nama = String(row['NAMA'] || row['Nama'] || '').trim();
                const bagian = String(row['BAGIAN'] || row['Bagian'] || 'Karyawan').trim();
                if (nip && nama && !masterPeserta.some(p => p.nip === nip)) {
                    masterPeserta.push({ nip, nama, bagian });
                    imported++;
                }
            });
            simpanSuggestionKeLocalStorage();
            syncToFirebase();
            updateDatabaseStatus();
            showToast(`✅ Import ${imported} peserta`, 'success');
        } catch (err) {
            showToast('⚠️ Gagal import: ' + err.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

function lihatDatabase() {
    if (masterPeserta.length === 0) {
        showToast('📂 Belum ada database', 'info');
        return;
    }
    
    // Modal container
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top:0; left:0; width:100%; height:100%;
        background: rgba(0,0,0,0.5); display:flex; justify-content:center;
        align-items:center; z-index:9999; padding:20px;
        animation: fadeIn 0.3s ease; backdrop-filter: blur(4px);
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white; border-radius:20px; padding:24px 20px;
        max-width: 750px; width:100%; max-height:85vh;
        display:flex; flex-direction:column;
        box-shadow: 0 30px 80px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease;
    `;
    
    // HEADER dengan tombol close
    const header = document.createElement('div');
    header.style.cssText = `
        display:flex; justify-content:space-between; align-items:center;
        margin-bottom:12px; padding-bottom:12px;
        border-bottom:2px solid #e8edf5; flex-shrink:0;
    `;
    header.innerHTML = `
        <h3 style="margin:0; font-size:17px; color:#1a2a4a;">
            <i class="fas fa-database" style="color:#2a5298;"></i>
            Database Peserta <span style="font-weight:400; color:#94a3b8; font-size:14px;">(${masterPeserta.length})</span>
        </h3>
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
        background: none; border: none; font-size:24px; color:#94a3b8;
        cursor:pointer; padding:0 6px; line-height:1;
        transition: all 0.3s ease;
    `;
    closeBtn.onmouseover = () => closeBtn.style.color = '#1a2a4a';
    closeBtn.onmouseout = () => closeBtn.style.color = '#94a3b8';
    closeBtn.onclick = () => modal.remove();
    header.appendChild(closeBtn);
    
    // BODY SCROLLABLE
    const body = document.createElement('div');
    body.style.cssText = `
        overflow-y: auto; flex:1; padding-right:4px;
        max-height: 55vh;
    `;
    
    // Search box di dalam modal (opsional)
    const searchBox = document.createElement('div');
    searchBox.style.cssText = `
        margin-bottom: 12px;
        position: sticky; top:0; z-index:3;
        background: white; padding: 6px 0;
    `;
    searchBox.innerHTML = `
        <input type="text" id="searchDb" placeholder="🔍 Cari NIP atau Nama..."
            style="width:100%; padding:8px 14px; border:2px solid #e8edf5;
            border-radius:10px; font-size:14px; outline:none; transition:0.3s;"
            oninput="filterDatabase(this.value)"
            onfocus="this.style.borderColor='#2a5298'"
            onblur="this.style.borderColor='#e8edf5'"
        />
    `;
    body.appendChild(searchBox);
    
    // Tabel container
    const tableWrap = document.createElement('div');
    tableWrap.id = 'dbTableWrap';
    tableWrap.style.cssText = `overflow-x: auto;`;
    tableWrap.innerHTML = buildDatabaseTable(masterPeserta);
    body.appendChild(tableWrap);
    
    // FOOTER
    const footer = document.createElement('div');
    footer.style.cssText = `
        margin-top: 12px; padding-top:12px;
        border-top:2px solid #e8edf5; text-align:center; flex-shrink:0;
        display:flex; gap:10px;
    `;
    
    const closeFooterBtn = document.createElement('button');
    closeFooterBtn.style.cssText = `
        flex:1; padding:10px; border:none; border-radius:10px;
        background: linear-gradient(135deg, #1e3c72, #2a5298);
        color:white; font-weight:600; font-size:14px; cursor:pointer;
        transition: all 0.3s ease;
    `;
    closeFooterBtn.innerHTML = '<i class="fas fa-times"></i> Tutup';
    closeFooterBtn.onmouseover = () => closeFooterBtn.style.transform = 'scale(1.02)';
    closeFooterBtn.onmouseout = () => closeFooterBtn.style.transform = 'scale(1)';
    closeFooterBtn.onclick = () => modal.remove();
    footer.appendChild(closeFooterBtn);
    
    // Gabungkan semua
    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    modal.appendChild(content);
    document.body.appendChild(modal);
}

// ============================================================
// BUILD DATABASE TABLE
// ============================================================
function buildDatabaseTable(data) {
    if (!data || data.length === 0) {
        return `<div style="text-align:center; padding:30px; color:#94a3b8;">
            <i class="fas fa-inbox" style="font-size:32px; display:block; margin-bottom:10px;"></i>
            Tidak ada data
        </div>`;
    }
    let html = `
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
                <tr style="background:#f1f5f9; position:sticky; top:0; z-index:2;">
                    <th style="padding:8px 10px; text-align:left; border-bottom:2px solid #e8edf5;">#</th>
                    <th style="padding:8px 10px; text-align:left; border-bottom:2px solid #e8edf5;">NIP</th>
                    <th style="padding:8px 10px; text-align:left; border-bottom:2px solid #e8edf5;">Nama</th>
                    <th style="padding:8px 10px; text-align:left; border-bottom:2px solid #e8edf5;">Bagian</th>
                </tr>
            </thead>
            <tbody>
    `;
    data.forEach((p, i) => {
        html += `
            <tr style="transition:0.2s;" onmouseover="this.style.background='#f8faff'" onmouseout="this.style.background=''">
                <td style="padding:6px 10px; border-bottom:1px solid #f0f4fa;">${i+1}</td>
                <td style="padding:6px 10px; border-bottom:1px solid #f0f4fa;">${p.nip}</td>
                <td style="padding:6px 10px; border-bottom:1px solid #f0f4fa;">${p.nama}</td>
                <td style="padding:6px 10px; border-bottom:1px solid #f0f4fa;">${p.bagian}</td>
            </tr>
        `;
    });
    html += `</tbody></table>`;
    return html;
}

// ============================================================
// FILTER DATABASE
// ============================================================
function filterDatabase(query) {
    const q = query.toLowerCase().trim();
    const filtered = masterPeserta.filter(p =>
        p.nip.includes(q) || p.nama.toLowerCase().includes(q)
    );
    const wrap = document.getElementById('dbTableWrap');
    if (wrap) {
        wrap.innerHTML = buildDatabaseTable(filtered);
    }
}

function resetDatabase() {
    if (masterPeserta.length === 0) { showToast('⚠️ Database kosong', 'info'); return; }
    if (!confirm(`Hapus database (${masterPeserta.length} peserta)?`)) return;
    masterPeserta = [];
    localStorage.removeItem('masterPeserta');
    syncToFirebase();
    updateDatabaseStatus();
    showToast('🗑️ Database direset', 'info');
}

function resetAll() {
    if (antrian.length === 0) { showToast('⚠️ Tidak ada antrian', 'info'); return; }
    if (!confirm('Hapus semua antrian?')) return;
    antrian = [];
    nomorTerakhir = 0;
    renderTabel();
    document.getElementById('ticket').classList.remove('show');
    localStorage.removeItem('antrianSembako');
    syncToFirebase();
    showToast('🔄 Semua antrian direset', 'info');
}

function saveExcel() {
    if (antrian.length === 0) { showToast('⚠️ Belum ada data', 'error'); return; }
    const data = [['#', 'NIP', 'Nama', 'Bagian', 'Nomor']];
    antrian.forEach((a, i) => data.push([i+1, a.nip, a.nama, a.bagian, a.nomor]));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Antrian");
    XLSX.writeFile(wb, `Antrian_KPJ_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast('📥 File Excel diunduh!', 'success');
}

function adminRefresh() {
    loadFromFirebase();
    showToast('🔄 Data diperbarui', 'info');
}

function ubahPasswordAdmin() {
    const oldPass = prompt('🔒 Password lama:');
    if (oldPass === null) return;
    if (oldPass !== adminPassword) {
        showToast('❌ Password salah!', 'error');
        return;
    }
    const newPass = prompt('🔑 Password baru (min 4 karakter):');
    if (newPass === null) return;
    if (newPass.trim().length < 4) {
        showToast('⚠️ Minimal 4 karakter!', 'error');
        return;
    }
    const confirmPass = prompt('🔑 Konfirmasi password:');
    if (newPass !== confirmPass) {
        showToast('❌ Password tidak cocok!', 'error');
        return;
    }
    database.ref('adminPassword').set(newPass.trim())
        .then(() => {
            adminPassword = newPass.trim();
            showToast('✅ Password diubah!', 'success');
        })
        .catch(err => {
            showToast('⚠️ Gagal simpan: ' + err.message, 'error');
        });
}

function repairNomor() {
    if (antrian.length === 0) {
        showToast('⚠️ Tidak ada antrian', 'error');
        return;
    }
    
    if (!confirm(`Perbaiki nomor antrian?\n\nSaat ini:\n- Data antrian: ${antrian.length}\n- Nomor terakhir: ${nomorTerakhir}\n\nAkan disesuaikan menjadi ${antrian.length}?`)) return;
    
    antrian.forEach((a, idx) => {
        a.nomor = String(idx + 1).padStart(3, '0');
    });
    nomorTerakhir = antrian.length;
    renderTabel();
    simpanKeLocalStorage();
    syncToFirebase();
    showToast(`✅ Nomor diperbaiki! ${nomorTerakhir} antrian`, 'success');
}

// ============================================================
// LOCAL STORAGE & FIREBASE SYNC
// ============================================================
function simpanKeLocalStorage() {
    localStorage.setItem('antrianSembako', JSON.stringify({ antrian, nomorTerakhir }));
}

function loadDariLocalStorage() {
    const data = localStorage.getItem('antrianSembako');
    if (data) {
        try {
            const parsed = JSON.parse(data);
            if (parsed.antrian && parsed.antrian.length > 0) {
                antrian = parsed.antrian;
                nomorTerakhir = parsed.nomorTerakhir || antrian.length;
                if (nomorTerakhir !== antrian.length) {
                    nomorTerakhir = antrian.length;
                    antrian.forEach((a, idx) => {
                        a.nomor = String(idx + 1).padStart(3, '0');
                    });
                    simpanKeLocalStorage();
                }
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
                return true;
            }
        } catch (e) {}
    }
    return false;
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

function syncToFirebase() {
    if (!firebaseEnabled || !database || isSyncing) return;
    isSyncing = true;
    
    if (antrian.length > 0) {
        let perluRepair = false;
        antrian.forEach((a, idx) => {
            const expected = String(idx + 1).padStart(3, '0');
            if (a.nomor !== expected) {
                perluRepair = true;
            }
        });
        if (nomorTerakhir !== antrian.length) {
            perluRepair = true;
        }
        if (perluRepair) {
            antrian.forEach((a, idx) => {
                a.nomor = String(idx + 1).padStart(3, '0');
            });
            nomorTerakhir = antrian.length;
            renderTabel();
            simpanKeLocalStorage();
        }
    }
    
    const seen = new Set();
    const clean = [];
    antrian.forEach(a => {
        const key = a.nip + '|' + (a.nama || '').toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            clean.push(a);
        }
    });
    if (clean.length !== antrian.length) {
        antrian = clean;
        antrian.forEach((a, idx) => {
            a.nomor = String(idx + 1).padStart(3, '0');
        });
        nomorTerakhir = antrian.length;
        renderTabel();
        simpanKeLocalStorage();
    }
    
    if (antrian.length === 0) {
        database.ref('antrianData/nomorTerakhir').set(0);
        database.ref('antrianData/antrian').set([]);
        database.ref('antrianData/lastUpdated').set(Date.now());
        isSyncing = false;
        return;
    }
    
    database.ref('antrianData').once('value')
        .then(snap => {
            const fbData = snap.val();
            const fbAntrian = (fbData && fbData.antrian) || [];
            const fbTime = (fbData && fbData.lastUpdated) || 0;
            const localTime = parseInt(localStorage.getItem('antrianLastUpdated')) || 0;
            
            if (fbAntrian.length > antrian.length && fbTime > localTime) {
                let fbClean = fbAntrian;
                const fbSeen = new Set();
                fbClean = [];
                fbAntrian.forEach(a => {
                    const key = a.nip + '|' + (a.nama || '').toLowerCase();
                    if (!fbSeen.has(key)) {
                        fbSeen.add(key);
                        fbClean.push(a);
                    }
                });
                fbClean.forEach((a, idx) => {
                    a.nomor = String(idx + 1).padStart(3, '0');
                });
                antrian = fbClean;
                nomorTerakhir = antrian.length;
                renderTabel();
                simpanKeLocalStorage();
                localStorage.setItem('antrianLastUpdated', fbTime);
                isSyncing = false;
                return;
            }
            
            if (antrian.length > 0) {
                antrian.forEach((a, idx) => {
                    a.nomor = String(idx + 1).padStart(3, '0');
                });
                nomorTerakhir = antrian.length;
                
                database.ref().update({
                    'antrianData/antrian': antrian,
                    'antrianData/nomorTerakhir': nomorTerakhir,
                    'antrianData/masterPeserta': masterPeserta,
                    'antrianData/lastUpdated': Date.now()
                }).then(() => {
                    localStorage.setItem('antrianLastUpdated', Date.now());
                }).catch(err => console.error('Sync error:', err))
                .finally(() => { isSyncing = false; });
            } else {
                isSyncing = false;
            }
        })
        .catch(() => { isSyncing = false; });
}

// ============================================================
// PANGGIL BERIKUTNYA (DENGAN TRANSACTION)
// ============================================================
function panggilBerikutnya() {
    if (!firebaseEnabled || !database) {
        return panggilBerikutnyaLokal();
    }
    
    const ref = database.ref('antrianData/antrian');
    
    ref.transaction((currentData) => {
        if (!currentData) return currentData;
        
        // Cari antrian dengan status "Menunggu" yang paling kecil nomornya
        const keys = Object.keys(currentData).sort((a, b) => parseInt(a) - parseInt(b));
        let foundNomor = null;
        
        for (let key of keys) {
            if (currentData[key].status === 'Menunggu') {
                currentData[key].status = 'Dipanggil';
                currentData[key].waktuPanggil = firebase.database.ServerValue.TIMESTAMP;
                foundNomor = key;
                break;
            }
        }
        
        if (foundNomor) {
            // Update lastUpdated
            currentData._meta = {
                lastUpdated: firebase.database.ServerValue.TIMESTAMP
            };
            return currentData;
        }
        
        return currentData; // Tidak ada yang menunggu
    }, (error, committed, snapshot) => {
        if (error) {
            showToast('⚠️ Gagal memanggil: ' + error.message, 'error');
            return;
        }
        
        if (committed) {
            const data = snapshot.val();
            if (data) {
                // Cari nomor yang baru saja diubah
                for (let key in data) {
                    if (key !== '_meta' && data[key].status === 'Dipanggil' && data[key].waktuPanggil) {
                        showToast(`📢 Panggil nomor ${key} - ${data[key].nama}`, 'success');
                        // Update lokal
                        const existing = antrian.find(a => a.nomor === key);
                        if (existing) {
                            existing.status = 'Dipanggil';
                            existing.waktuPanggil = Date.now();
                        }
                        renderTabel();
                        simpanKeLocalStorage();
                        return;
                    }
                }
            }
            showToast('✅ Tidak ada antrian yang menunggu', 'info');
        } else {
            showToast('⚠️ Gagal memanggil: data berubah', 'error');
        }
    });
}

// ============================================================
// PANGGIL BERIKUTNYA (FALLBACK LOKAL)
// ============================================================
function panggilBerikutnyaLokal() {
    for (let a of antrian) {
        if (a.status === 'Menunggu') {
            a.status = 'Dipanggil';
            a.waktuPanggil = Date.now();
            renderTabel();
            simpanKeLocalStorage();
            showToast(`📢 Panggil nomor ${a.nomor} - ${a.nama}`, 'success');
            return;
        }
    }
    showToast('✅ Tidak ada antrian yang menunggu', 'info');
}

// ============================================================
// AUTO SYNC (OTOMATIS)
// ============================================================
function autoSync() {
    if (!firebaseEnabled || !database || isSyncing) return;
    isSyncing = true;
    
    console.log('🔄 Auto sync started...');
    
    database.ref('antrianData').once('value')
        .then(snap => {
            const fbData = snap.val() || {};
            const fbAntrian = fbData.antrian || {};
            const fbTimestamp = fbData.lastUpdated || 0;
            const localTimestamp = parseInt(localStorage.getItem('antrianLastUpdated')) || 0;
            
            // Jika Firebase lebih baru, gunakan data Firebase
            if (fbTimestamp > localTimestamp) {
                console.log('📥 Firebase lebih baru, sync dari Firebase');
                
                // Konversi object ke array
                const fbEntries = Object.entries(fbAntrian)
                    .filter(([key]) => key !== '_meta')
                    .map(([nomor, data]) => ({
                        nomor: nomor,
                        ...data
                    }));
                
                // Merge dengan lokal: gunakan yang memiliki timestamp lebih baru
                const mergedMap = {};
                
                // Tambahkan dari Firebase
                fbEntries.forEach(item => {
                    mergedMap[item.nomor] = item;
                });
                
                // Tambahkan dari lokal (jika tidak ada di Firebase atau lebih baru)
                antrian.forEach(item => {
                    if (!item.nomor) return;
                    if (!mergedMap[item.nomor]) {
                        mergedMap[item.nomor] = item;
                    } else if (item.timestamp > mergedMap[item.nomor].timestamp) {
                        mergedMap[item.nomor] = item; // Lokal lebih baru
                    }
                });
                
                // Konversi ke array dan urutkan
                antrian = Object.values(mergedMap)
                    .sort((a, b) => parseInt(a.nomor) - parseInt(b.nomor));
                
                // Perbaiki nomor jika ada yang tidak berurutan
                antrian.forEach((item, idx) => {
                    const expected = String(idx + 1).padStart(3, '0');
                    if (item.nomor !== expected) {
                        item.nomor = expected;
                    }
                });
                
                nomorTerakhir = antrian.length;
                renderTabel();
                simpanKeLocalStorage();
                localStorage.setItem('antrianLastUpdated', Date.now());
                
                // Simpan kembali ke Firebase jika ada perubahan
                const newData = {};
                antrian.forEach(item => {
                    newData[item.nomor] = {
                        nip: item.nip,
                        nama: item.nama,
                        bagian: item.bagian,
                        status: item.status || 'Menunggu',
                        timestamp: item.timestamp || Date.now()
                    };
                });
                
                database.ref('antrianData/antrian').set(newData);
                database.ref('antrianData/nomorTerakhir').set(nomorTerakhir);
                database.ref('antrianData/lastUpdated').set(Date.now());
                
                console.log(`✅ Sync selesai: ${nomorTerakhir} antrian`);
            } else {
                console.log('📤 Lokal lebih baru, sync ke Firebase');
                // Kirim data lokal ke Firebase
                const newData = {};
                antrian.forEach(item => {
                    if (!item.nomor) return;
                    newData[item.nomor] = {
                        nip: item.nip,
                        nama: item.nama,
                        bagian: item.bagian,
                        status: item.status || 'Menunggu',
                        timestamp: item.timestamp || Date.now()
                    };
                });
                
                database.ref('antrianData/antrian').set(newData);
                database.ref('antrianData/nomorTerakhir').set(nomorTerakhir);
                database.ref('antrianData/lastUpdated').set(Date.now());
                localStorage.setItem('antrianLastUpdated', Date.now());
                console.log('✅ Data lokal disimpan ke Firebase');
            }
            
            // Sync masterPeserta
            if (masterPeserta.length > 0) {
                database.ref('antrianData/masterPeserta').set(masterPeserta);
            }
        })
        .catch(err => {
            console.error('Auto sync error:', err);
        })
        .finally(() => {
            isSyncing = false;
        });
}

function loadFromFirebase() {
    if (!firebaseEnabled || !database) return;
    
    database.ref('antrianData').on('value', (snapshot) => {
        if (isSyncing) return;
        
        const data = snapshot.val() || {};
        const fbAntrian = data.antrian || {};
        const fbTimestamp = data.lastUpdated || 0;
        const localTimestamp = parseInt(localStorage.getItem('antrianLastUpdated')) || 0;
        
        // Hanya proses jika Firebase lebih baru
        if (fbTimestamp <= localTimestamp) return;
        
        // Konversi object ke array
        const entries = Object.entries(fbAntrian)
            .filter(([key]) => key !== '_meta')
            .map(([nomor, item]) => ({
                nomor: nomor,
                ...item
            }));
        
        if (entries.length === 0) return;
        
        // Urutkan berdasarkan nomor
        entries.sort((a, b) => parseInt(a.nomor) - parseInt(b.nomor));
        
        antrian = entries;
        nomorTerakhir = antrian.length;
        
        // Load masterPeserta jika ada
        if (data.masterPeserta && data.masterPeserta.length > 0) {
            masterPeserta = data.masterPeserta;
            simpanSuggestionKeLocalStorage();
            updateDatabaseStatus();
        }
        
        renderTabel();
        simpanKeLocalStorage();
        localStorage.setItem('antrianLastUpdated', fbTimestamp);
        
        console.log(`📥 Loaded ${antrian.length} antrian dari Firebase`);
    }, (error) => {
        console.error('Firebase error:', error);
    });
}

let adminPassword = 'admin123';

function loadAdminPassword() {
    if (!firebaseEnabled || !database) return;
    database.ref('adminPassword').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) adminPassword = data;
        else database.ref('adminPassword').set(adminPassword);
    });
}


function simpanAntrianKeFirebase(nip, nama, bagian, nomorBaru) {
    const data = {
        nip,
        nama,
        bagian,
        status: 'Menunggu',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Gunakan nomor sebagai key, bukan push()
    const updates = {};
    updates[`antrianData/antrian/${nomorBaru}`] = data;
    updates['antrianData/nomorTerakhir'] = parseInt(nomorBaru, 10);
    updates['antrianData/lastUpdated'] = firebase.database.ServerValue.TIMESTAMP;
    
    database.ref().update(updates)
        .then(() => {
            // Update UI
            document.getElementById('nomorAntrian').textContent = nomorBaru;
            document.getElementById('detailAntrian').innerHTML = `<strong>${nama}</strong> · ${bagian}`;
            const { tanggal, waktu } = formatTanggalWaktu();
            document.getElementById('tanggalAmbil').textContent = tanggal;
            document.getElementById('waktuAmbil').textContent = waktu;
            document.getElementById('ticket').classList.add('show');
            clearForm();
            showToast(`🎫 Nomor ${nomorBaru} untuk ${nama}`, 'success');
            
            // Auto sync
            setTimeout(() => {
                if (!isSyncing) autoSync();
            }, 500);
        })
        .catch(err => {
            showToast('⚠️ Gagal menyimpan ke Firebase: ' + err.message, 'error');
            console.error(err);
            // Rollback
            antrian = antrian.filter(a => a.nip !== nip);
            renderTabel();
            simpanKeLocalStorage();
        });
}

// ============================================================
// INIT
// ============================================================
window.onload = function() {
    const hasData = loadSuggestionDariLocalStorage();
    if (!hasData && typeof DEFAULT_PESERTA !== 'undefined') {
        masterPeserta = DEFAULT_PESERTA;
        simpanSuggestionKeLocalStorage();
    }
    const hasAntrian = loadDariLocalStorage();
    if (!hasAntrian) { antrian = []; nomorTerakhir = 0; }
    updateDatabaseStatus();
    
    // 🔥 LOAD JADWAL DARI FIREBASE
    if (firebaseEnabled) {
        loadJadwalFromFirebase();
    } else {
        renderJadwalUI();
    }
    
    currentPageAdmin = 1;
    renderTabel();
    
    if (firebaseEnabled) {
        loadFromFirebase();
        loadAdminPassword();
        setInterval(() => { if (!isSyncing) autoSync(); }, 30000);
        setTimeout(() => { if (!isSyncing) autoSync(); }, 5000);
    }
    if (antrian.length === 0) document.getElementById('inputNip').focus();
};

function nextPageAdmin() { currentPageAdmin++; renderTabel(); }
function prevPageAdmin() { currentPageAdmin--; renderTabel(); }