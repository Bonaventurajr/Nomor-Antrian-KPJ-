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
        console.log('🔥 Firebase Connected (User Mode)');
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
let highlightedNip = null;
let currentPage = 1;
const itemsPerPage = 10;
let isSyncing = false;

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
            dbInfo.textContent = '⚠️ Belum ada data!';
            dbInfo.style.color = '#dc2626';
        }
    }
}

// ============================================================
// JADWAL FUNCTIONS (USER)
// ============================================================
function loadJadwalFromFirebase() {
    if (!firebaseEnabled || !database) return;
    database.ref('jadwalOperasional').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            jadwalOperasional = data;
            updateJadwalStatusUser();
        }
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
    const jamSekarang = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    if (jamSekarang < jadwalOperasional.jamMulai || jamSekarang > jadwalOperasional.jamSelesai) {
        return { boleh: false, pesan: `📢 Pengambilan nomor antrian hanya ${jadwalOperasional.jamMulai} - ${jadwalOperasional.jamSelesai}.` };
    }
    return { boleh: true, pesan: '✅ Sistem buka. Silakan ambil nomor antrian.' };
}

function updateJadwalStatusUser() {
    const statusDiv = document.getElementById('jadwalStatus');
    const statusText = document.getElementById('jadwalStatusText');
    if (!statusDiv || !statusText) return;
    const cek = cekJamOperasional();
    const tglMulai = formatTanggalIndonesia(jadwalOperasional.tanggalMulai);
    const tglSelesai = formatTanggalIndonesia(jadwalOperasional.tanggalSelesai);
    const hariMap = {1:'Senin',2:'Selasa',3:'Rabu',4:'Kamis',5:'Jumat',6:'Sabtu',7:'Minggu'};
    const hariKerja = jadwalOperasional.hariKerja.map(h => hariMap[h] || h).join(', ');
    if (cek.boleh) {
        statusDiv.style.borderLeftColor = '#059669';
        statusDiv.style.background = '#ecfdf5';
        statusText.innerHTML = `🟢 <strong>Sistem Buka</strong> <span style="font-size:12px; color:#64748b; margin-left:6px;">${tglMulai} - ${tglSelesai} | ${jadwalOperasional.jamMulai} - ${jadwalOperasional.jamSelesai} | ${hariKerja}</span>`;
    } else {
        statusDiv.style.borderLeftColor = '#dc2626';
        statusDiv.style.background = '#fef2f2';
        statusText.innerHTML = `🔴 <strong>${cek.pesan}</strong> <span style="font-size:12px; color:#64748b; margin-left:6px;">${tglMulai} - ${tglSelesai} | ${jadwalOperasional.jamMulai} - ${jadwalOperasional.jamSelesai} | ${hariKerja}</span>`;
    }
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
                display = p.nip.substring(0, start) + `<span class="highlight">${p.nip.substring(start, end)}</span>` + p.nip.substring(end);
            }
        } else if (field === 'nama') {
            display = p.nama;
            sub = p.nip || '-';
            badge = p.bagian || 'Karyawan';
            const qLower = q.toLowerCase();
            if (p.nama.toLowerCase().includes(qLower)) {
                const start = p.nama.toLowerCase().indexOf(qLower);
                const end = start + q.length;
                display = p.nama.substring(0, start) + `<span class="highlight">${p.nama.substring(start, end)}</span>` + p.nama.substring(end);
            }
        } else if (field === 'bagian') {
            display = p.bagian;
            sub = 'Klik untuk memilih';
            badge = '';
            const qLower = q.toLowerCase();
            if (p.bagian.toLowerCase().includes(qLower)) {
                const start = p.bagian.toLowerCase().indexOf(qLower);
                const end = start + q.length;
                display = p.bagian.substring(0, start) + `<span class="highlight">${p.bagian.substring(start, end)}</span>` + p.bagian.substring(end);
            }
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
// AMBIL ANTRIAN (USER)
// ============================================================
function ambilAntrian() {
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
    const peserta = masterPeserta.find(p => p.nip === nip);
    if (!peserta) {
        showToast('❌ NIP tidak terdaftar! Silakan hubungi admin.', 'error');
        clearForm();
        return;
    }
    if (!/^\d{11}$/.test(nip)) {
        showToast('⚠️ Format NIP salah! Harus 11 digit angka.', 'error');
        clearForm();
        return;
    }
    const existing = antrian.find(a => a.nip === nip);
    if (existing) {
        showToast(`⚠️ NIP "${nama}" sudah terdaftar dengan nomor ${existing.nomor}`, 'error');
        clearForm();
        return;
    }
    if (firebaseEnabled && database) {
        database.ref('antrianData/antrian').once('value', (snapshot) => {
            const data = snapshot.val() || [];
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
// PROSES AMBIL ANTRIAN
// ============================================================
function prosesAmbilAntrian(nip, nama, bagian) {
    if (firebaseEnabled && database) {
        const ref = database.ref('antrianData/nomorTerakhir');
        ref.transaction((current) => {
            return (current || 0) + 1;
        }, (error, committed, snapshot) => {
            if (error) {
                showToast('⚠️ Gagal mengambil nomor antrian', 'error');
                return;
            }
            if (committed) {
                const nomorBaru = String(snapshot.val()).padStart(3, '0');
                simpanAntrianKeFirebase(nip, nama, bagian, nomorBaru);
            } else {
                showToast('⚠️ Gagal mendapatkan nomor antrian', 'error');
            }
        }, false);
    } else {
        nomorTerakhir++;
        const nomorBaru = String(nomorTerakhir).padStart(3, '0');
        simpanAntrianLokal(nip, nama, bagian, nomorBaru);
    }
}

// ============================================================
// SIMPAN ANTRIAN KE FIREBASE
// ============================================================
function simpanAntrianKeFirebase(nip, nama, bagian, nomorBaru) {
    const data = { nip, nama, bagian, nomor: nomorBaru };
    database.ref('antrianData/antrian').once('value', (snapshot) => {
        let antrianData = snapshot.val() || [];
        if (antrianData.some(a => a.nip === nip)) {
            showToast('⚠️ NIP sudah terdaftar!', 'error');
            clearForm();
            return;
        }
        antrianData.push(data);
        database.ref('antrianData/antrian').set(antrianData)
            .then(() => {
                return database.ref('antrianData/nomorTerakhir').set(antrianData.length);
            })
            .then(() => {
                return database.ref('antrianData/lastUpdated').set(Date.now());
            })
            .then(() => {
                antrian.push(data);
                renderTabel();
                document.getElementById('nomorAntrian').textContent = nomorBaru;
                document.getElementById('detailAntrian').innerHTML = `<strong>${nama}</strong> · ${bagian}`;
                const { tanggal, waktu } = formatTanggalWaktu();
                document.getElementById('tanggalAmbil').textContent = tanggal;
                document.getElementById('waktuAmbil').textContent = waktu;
                document.getElementById('ticket').classList.add('show');
                clearForm();
                simpanKeLocalStorage();
                showToast(`🎫 Nomor ${nomorBaru} untuk ${nama}`, 'success');
            })
            .catch((err) => {
                showToast('⚠️ Gagal menyimpan ke Firebase', 'error');
                console.error(err);
            });
    });
}

// ============================================================
// SIMPAN ANTRIAN LOKAL
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
    syncToFirebase();
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
            const page = Math.floor(index / itemsPerPage) + 1;
            if (currentPage !== page) {
                currentPage = page;
                renderTabel();
            }
        }
        setTimeout(() => highlightRow(nip.trim()), 200);
        showToast(`🎫 Menampilkan nomor ${data.nomor} untuk ${data.nama}`, 'success');
    } else {
        showToast('😕 NIP tidak ditemukan dalam antrian', 'info');
    }
}

function highlightRow(nip) {
    highlightedNip = nip;
    renderTabel();
    setTimeout(() => {
        const row = document.getElementById(`row-${nip}`);
        if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    clearTimeout(window._highlightTimer);
    window._highlightTimer = setTimeout(() => {
        highlightedNip = null;
        renderTabel();
    }, 15000);
}

// ============================================================
// KLIK BARIS TABEL
// ============================================================
function klikAntrian(nip) {
    const data = antrian.find(a => a.nip === nip);
    if (data) {
        document.getElementById('nomorAntrian').textContent = data.nomor;
        document.getElementById('detailAntrian').innerHTML = `<strong>${data.nama}</strong> · ${data.bagian}`;
        const { tanggal, waktu } = formatTanggalWaktu();
        document.getElementById('tanggalAmbil').textContent = tanggal;
        document.getElementById('waktuAmbil').textContent = waktu;
        document.getElementById('ticket').classList.add('show');
        highlightRow(nip);
        showToast(`🎫 Menampilkan nomor ${data.nomor} untuk ${data.nama}`, 'info');
    }
}

// ============================================================
// DOWNLOAD GAMBAR TIKET
// ============================================================
function downloadTicketImage() {
    const ticket = document.getElementById('ticket');
    if (!ticket.classList.contains('show')) {
        showToast('⚠️ Belum ada nomor antrian untuk diunduh!', 'error');
        return;
    }
    showToast('⏳ Sedang memproses gambar...', 'info');
    html2canvas(ticket, { scale: 4, backgroundColor: '#ffffff', allowTaint: false, useCORS: true })
        .then(canvas => {
            const link = document.createElement('a');
            link.download = `Tiket_Antrian_${document.getElementById('nomorAntrian').textContent}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            showToast('📥 Tiket berhasil diunduh!', 'success');
        })
        .catch(err => {
            console.error(err);
            showToast('⚠️ Gagal mengunduh gambar', 'error');
        });
}

// ============================================================
// RENDER TABEL
// ============================================================
function renderTabel() {
    // 🔥 AUTO RESET NOMOR - PASTIKAN URUT!
    if (antrian.length > 0) {
        antrian.forEach((a, idx) => {
            a.nomor = String(idx + 1).padStart(3, '0');
        });
        nomorTerakhir = antrian.length;
    }

    const tbody = document.getElementById('tbodyAntrian');
    const count = document.getElementById('countAntrian');
    const info = document.getElementById('infoAntrian');

    const data = antrian;
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, totalItems);
    const pageData = data.slice(start, end);

    count.textContent = totalItems + ' antrian';
    if (info) info.textContent = `Menampilkan ${totalItems === 0 ? 0 : start+1} - ${end} dari ${totalItems} antrian`;

    document.getElementById('prevPageBtn').disabled = (currentPage === 1 || totalItems === 0);
    document.getElementById('nextPageBtn').disabled = (currentPage === totalPages || totalItems === 0);

    if (totalItems === 0) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-inbox"></i>Belum ada antrian</div></td></tr>`;
        return;
    }

    let html = '';
    pageData.forEach((a, idx) => {
        const rowId = `row-${a.nip}`;
        const isHighlighted = (highlightedNip === a.nip);
        html += `<tr id="${rowId}" onclick="klikAntrian('${a.nip}')" style="cursor:pointer; ${isHighlighted ? 'background-color: #fef08a !important;' : ''}">
            <td>${start + idx + 1}</td>
            <td>${a.nip}</td>
            <td>${a.nama}</td>
            <td>${a.bagian}</td>
            <td class="nomor-cell">${a.nomor}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
    simpanKeLocalStorage();
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
            if (parsed.antrian && parsed.antrian.length > 0) {
                antrian = parsed.antrian;
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

// ============================================================
// FIREBASE SYNC (TANPA OVERWRITE)
// ============================================================
function syncToFirebase() {
    if (!firebaseEnabled || !database) return;
    if (isSyncing) return;
    isSyncing = true;
    
    try {
        database.ref('antrianData').once('value')
            .then((snapshot) => {
                const fbData = snapshot.val();
                const fbAntrian = (fbData && fbData.antrian) || [];
                const fbTimestamp = (fbData && fbData.lastUpdated) || 0;
                const localTimestamp = parseInt(localStorage.getItem('antrianLastUpdated')) || 0;
                
                if (fbAntrian.length > 0 && fbTimestamp > localTimestamp) {
                    antrian = fbAntrian;
                    nomorTerakhir = fbData.nomorTerakhir || antrian.length;
                    if (fbData.masterPeserta && fbData.masterPeserta.length > 0) {
                        masterPeserta = fbData.masterPeserta;
                        simpanSuggestionKeLocalStorage();
                        updateDatabaseStatus();
                    }
                    renderTabel();
                    simpanKeLocalStorage();
                    localStorage.setItem('antrianLastUpdated', fbTimestamp);
                    console.log('📦 Firebase lebih baru, sync ke lokal');
                    isSyncing = false;
                    return;
                }
                
                if (antrian.length > 0 && (fbAntrian.length === 0 || localTimestamp >= fbTimestamp)) {
                    const updates = {};
                    updates['antrianData/antrian'] = antrian;
                    updates['antrianData/nomorTerakhir'] = nomorTerakhir;
                    updates['antrianData/masterPeserta'] = masterPeserta;
                    updates['antrianData/lastUpdated'] = Date.now();
                    
                    database.ref().update(updates)
                        .then(() => {
                            localStorage.setItem('antrianLastUpdated', Date.now());
                            console.log('📦 LocalStorage lebih baru, sync ke Firebase');
                        })
                        .catch((err) => console.error('Sync error:', err))
                        .finally(() => { isSyncing = false; });
                } else {
                    isSyncing = false;
                }
            })
            .catch(() => { isSyncing = false; });
    } catch (e) {
        console.error('Sync error:', e);
        isSyncing = false;
    }
}

function loadFromFirebase() {
    if (!firebaseEnabled || !database) return;
    
    database.ref('antrianData').on('value', (snapshot) => {
        if (isSyncing) return;
        
        const data = snapshot.val();
        if (data && data.antrian && data.antrian.length > 0) {
            const fbTimestamp = data.lastUpdated || 0;
            const localTimestamp = parseInt(localStorage.getItem('antrianLastUpdated')) || 0;
            
            if (fbTimestamp > localTimestamp) {
                antrian = data.antrian || [];
                nomorTerakhir = data.nomorTerakhir || 0;
                if (data.masterPeserta && data.masterPeserta.length > 0) {
                    masterPeserta = data.masterPeserta;
                    simpanSuggestionKeLocalStorage();
                    updateDatabaseStatus();
                }
                renderTabel();
                simpanKeLocalStorage();
                localStorage.setItem('antrianLastUpdated', fbTimestamp);
                console.log('📦 Firebase lebih baru, update lokal');
            }
        }
    }, (error) => {
        console.error('Firebase error:', error);
    });
}

// ============================================================
// INIT (USER)
// ============================================================
window.onload = function() {
    const hasData = loadSuggestionDariLocalStorage();
    if (!hasData) {
        if (typeof DEFAULT_PESERTA !== 'undefined') {
            masterPeserta = DEFAULT_PESERTA;
            simpanSuggestionKeLocalStorage();
        }
    }

    const hasAntrian = loadDariLocalStorage();
    if (!hasAntrian) {
        antrian = [];
        nomorTerakhir = 0;
    }
    
    updateDatabaseStatus();
    currentPage = 1;
    renderTabel();

    if (firebaseEnabled) {
        loadFromFirebase();
        loadJadwalFromFirebase();
        setTimeout(updateJadwalStatusUser, 500);
        setInterval(() => {
            if (!isSyncing) {
                syncToFirebase();
            }
        }, 30000);
    }

    if (antrian.length === 0) {
        document.getElementById('inputNip').focus();
    }

    if (firebaseEnabled) {
        setInterval(updateJadwalStatusUser, 60000);
    }
};

function nextPage() {
    currentPage++;
    renderTabel();
}

function prevPage() {
    currentPage--;
    renderTabel();
}