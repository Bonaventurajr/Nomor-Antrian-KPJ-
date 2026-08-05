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
// JADWAL FUNCTIONS
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
        return { boleh: false, pesan: `📢 Pengambilan antrian hanya ${formatTanggalIndonesia(jadwalOperasional.tanggalMulai)} - ${formatTanggalIndonesia(jadwalOperasional.tanggalSelesai)}.` };
    }
    const hariIni = now.getDay();
    let hariKerja = hariIni === 0 ? 7 : hariIni;
    if (!jadwalOperasional.hariKerja.includes(hariKerja)) {
        return { boleh: false, pesan: '📢 Hari ini bukan hari kerja.' };
    }
    const jamSekarang = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    if (jamSekarang < jadwalOperasional.jamMulai || jamSekarang > jadwalOperasional.jamSelesai) {
        return { boleh: false, pesan: `📢 Pengambilan nomor antrian hanya ${jadwalOperasional.jamMulai} - ${jadwalOperasional.jamSelesai}.` };
    }
    return { boleh: true, pesan: '✅ Sistem buka.' };
}

function updateJadwalStatusUser() {
    const statusDiv = document.getElementById('jadwalStatus');
    const statusText = document.getElementById('jadwalStatusText');
    if (!statusDiv || !statusText) return;
    const cek = cekJamOperasional();
    if (cek.boleh) {
        statusDiv.style.borderLeftColor = '#059669';
        statusDiv.style.background = '#ecfdf5';
        statusText.innerHTML = `🟢 <strong>Sistem Buka</strong> <span style="font-size:12px; color:#64748b; margin-left:6px;">${formatTanggalIndonesia(jadwalOperasional.tanggalMulai)} - ${formatTanggalIndonesia(jadwalOperasional.tanggalSelesai)} | ${jadwalOperasional.jamMulai} - ${jadwalOperasional.jamSelesai}</span>`;
    } else {
        statusDiv.style.borderLeftColor = '#dc2626';
        statusDiv.style.background = '#fef2f2';
        statusText.innerHTML = `🔴 <strong>${cek.pesan}</strong>`;
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
    if (data.length === 0) {
        list.innerHTML = `<div class="autocomplete-empty">😕 Tidak ditemukan</div>`;
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
    // 🔥 LANGSUNG AMBIL NOMOR (Enter otomatis)
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
// AMBIL ANTRIAN (DENGAN VALIDASI NAMA + NIP)
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

    // 🔥 1. CEK NIP TERDAFTAR DI MASTER
    const peserta = masterPeserta.find(p => p.nip === nip);
    if (!peserta) {
        showToast('❌ NIP tidak terdaftar! Hubungi admin.', 'error');
        clearForm();
        return;
    }

    // 🔥 2. CEK FORMAT NIP (11 digit)
    if (!/^\d{11}$/.test(nip)) {
        showToast('⚠️ Format NIP salah! Harus 11 digit angka.', 'error');
        clearForm();
        return;
    }

    // 🔥 3. CEK DUPLIKAT NAMA (case-insensitive) - CEGAH NAMA DOUBLE
    const existingName = antrian.find(a => a.nama.toLowerCase() === nama.toLowerCase());
    if (existingName) {
        showToast(`⚠️ Nama "${nama}" sudah terdaftar dengan nomor ${existingName.nomor} (NIP: ${existingName.nip})`, 'error');
        clearForm();
        return;
    }

    // 🔥 4. CEK DUPLIKAT NIP (CEGAH NIP DOUBLE)
    const existingNip = antrian.find(a => a.nip === nip);
    if (existingNip) {
        showToast(`⚠️ NIP "${nip}" sudah terdaftar untuk ${existingNip.nama} (Nomor: ${existingNip.nomor})`, 'error');
        clearForm();
        return;
    }

    // 🔥 5. CEK DI FIREBASE (untuk multi-user)
    if (firebaseEnabled && database) {
        database.ref('antrianData/antrian').once('value', (snapshot) => {
            const data = snapshot.val() || [];
            // Cek nama di Firebase
            const fbNameExists = data.some(a => a.nama.toLowerCase() === nama.toLowerCase());
            if (fbNameExists) {
                showToast(`⚠️ Nama "${nama}" sudah terdaftar di sistem!`, 'error');
                clearForm();
                return;
            }
            // Cek NIP di Firebase
            const fbNipExists = data.some(a => a.nip === nip);
            if (fbNipExists) {
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
    // 🔥 TAMBAHKAN KE LOKAL DULU
    const data = { nip, nama, bagian };
    antrian.push(data);
    
    // 🔥 AUTO RESET NOMOR (OTOMATIS URUT)
    antrian.forEach((a, idx) => {
        a.nomor = String(idx + 1).padStart(3, '0');
    });
    nomorTerakhir = antrian.length;
    
    renderTabel();
    simpanKeLocalStorage();
    
    // 🔥 SIMPAN KE FIREBASE
    if (firebaseEnabled && database) {
        database.ref('antrianData/antrian').once('value', (snapshot) => {
            let antrianData = snapshot.val() || [];
            
            // Cek duplikat lagi (jaga-jaga)
            const nameExists = antrianData.some(a => a.nama.toLowerCase() === nama.toLowerCase());
            const nipExists = antrianData.some(a => a.nip === nip);
            
            if (nameExists || nipExists) {
                // Hapus dari lokal jika ternyata duplikat
                antrian = antrian.filter(a => a.nip !== nip);
                renderTabel();
                simpanKeLocalStorage();
                showToast('⚠️ Data duplikat terdeteksi!', 'error');
                return;
            }
            
            antrianData.push({ nip, nama, bagian, nomor: String(antrianData.length + 1).padStart(3, '0') });
            
            // Reset nomor di Firebase
            antrianData.forEach((a, idx) => {
                a.nomor = String(idx + 1).padStart(3, '0');
            });
            
            database.ref('antrianData/antrian').set(antrianData)
                .then(() => {
                    return database.ref('antrianData/nomorTerakhir').set(antrianData.length);
                })
                .then(() => {
                    return database.ref('antrianData/lastUpdated').set(Date.now());
                })
                .then(() => {
                    const nomorBaru = String(antrianData.length).padStart(3, '0');
                    document.getElementById('nomorAntrian').textContent = nomorBaru;
                    document.getElementById('detailAntrian').innerHTML = `<strong>${nama}</strong> · ${bagian}`;
                    const { tanggal, waktu } = formatTanggalWaktu();
                    document.getElementById('tanggalAmbil').textContent = tanggal;
                    document.getElementById('waktuAmbil').textContent = waktu;
                    document.getElementById('ticket').classList.add('show');
                    clearForm();
                    showToast(`🎫 Nomor ${nomorBaru} untuk ${nama}`, 'success');
                })
                .catch((err) => {
                    showToast('⚠️ Gagal menyimpan ke Firebase', 'error');
                    console.error(err);
                });
        }).catch((err) => {
            showToast('⚠️ Gagal koneksi ke Firebase', 'error');
            console.error(err);
        });
    } else {
        // Tanpa Firebase
        const nomorBaru = String(antrian.length).padStart(3, '0');
        document.getElementById('nomorAntrian').textContent = nomorBaru;
        document.getElementById('detailAntrian').innerHTML = `<strong>${nama}</strong> · ${bagian}`;
        const { tanggal, waktu } = formatTanggalWaktu();
        document.getElementById('tanggalAmbil').textContent = tanggal;
        document.getElementById('waktuAmbil').textContent = waktu;
        document.getElementById('ticket').classList.add('show');
        clearForm();
        showToast(`🎫 Nomor ${nomorBaru} untuk ${nama}`, 'success');
    }
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
    const nama = prompt('Masukkan NAMA Anda:');
    if (!nama) return;
    const data = antrian.find(a => a.nama.toLowerCase() === nama.trim().toLowerCase());
    if (data) {
        document.getElementById('nomorAntrian').textContent = data.nomor;
        document.getElementById('detailAntrian').innerHTML = `<strong>${data.nama}</strong> · ${data.bagian}`;
        const { tanggal, waktu } = formatTanggalWaktu();
        document.getElementById('tanggalAmbil').textContent = tanggal;
        document.getElementById('waktuAmbil').textContent = waktu;
        document.getElementById('ticket').classList.add('show');
        const index = antrian.findIndex(a => a.nip === data.nip);
        if (index !== -1) {
            const page = Math.floor(index / itemsPerPage) + 1;
            if (currentPage !== page) {
                currentPage = page;
                renderTabel();
            }
        }
        setTimeout(() => highlightRow(data.nip), 200);
        showToast(`🎫 Nomor antrian Anda: ${data.nomor} (${data.nama})`, 'success');
    } else {
        showToast('😕 Nama tidak ditemukan dalam antrian', 'info');
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
                nomorTerakhir = parsed.nomorTerakhir || antrian.length;
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
// FIREBASE SYNC (AMAN - GABUNG DATA)
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
                
                // 🔥 JIKA FIREBASE LEBIH BARU, AMBIL DARI FIREBASE
                if (fbAntrian.length > 0 && fbTimestamp > localTimestamp) {
                    antrian = JSON.parse(JSON.stringify(fbAntrian));
                    nomorTerakhir = fbData.nomorTerakhir || antrian.length;
                    if (fbData.masterPeserta && fbData.masterPeserta.length > 0) {
                        masterPeserta = fbData.masterPeserta;
                        simpanSuggestionKeLocalStorage();
                        updateDatabaseStatus();
                    }
                    renderTabel();
                    simpanKeLocalStorage();
                    localStorage.setItem('antrianLastUpdated', fbTimestamp);
                    isSyncing = false;
                    return;
                }
                
                // 🔥 JIKA LOKAL LEBIH BARU ATAU FIREBASE KOSONG
                if (antrian.length > 0) {
                    // Gabungkan data (jangan timpa)
                    let mergedData = [...fbAntrian];
                    
                    // Tambahkan data lokal yang belum ada di Firebase (cek NIP & Nama)
                    antrian.forEach(localItem => {
                        const exists = mergedData.some(fbItem => 
                            fbItem.nip === localItem.nip || 
                            fbItem.nama.toLowerCase() === localItem.nama.toLowerCase()
                        );
                        if (!exists) {
                            mergedData.push(JSON.parse(JSON.stringify(localItem)));
                        }
                    });
                    
                    // Reset nomor
                    mergedData.forEach((a, idx) => {
                        a.nomor = String(idx + 1).padStart(3, '0');
                    });
                    
                    antrian = mergedData;
                    nomorTerakhir = antrian.length;
                    
                    const updates = {};
                    updates['antrianData/antrian'] = antrian;
                    updates['antrianData/nomorTerakhir'] = nomorTerakhir;
                    updates['antrianData/masterPeserta'] = masterPeserta;
                    updates['antrianData/lastUpdated'] = Date.now();
                    
                    database.ref().update(updates)
                        .then(() => {
                            localStorage.setItem('antrianLastUpdated', Date.now());
                            renderTabel();
                            simpanKeLocalStorage();
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
                const fbAntrian = data.antrian || [];
                let mergedData = [...antrian];
                
                fbAntrian.forEach(fbItem => {
                    const exists = mergedData.some(localItem => 
                        localItem.nip === fbItem.nip || 
                        localItem.nama.toLowerCase() === fbItem.nama.toLowerCase()
                    );
                    if (!exists) {
                        mergedData.push(JSON.parse(JSON.stringify(fbItem)));
                    }
                });
                
                mergedData.forEach((a, idx) => {
                    a.nomor = String(idx + 1).padStart(3, '0');
                });
                
                antrian = mergedData;
                nomorTerakhir = antrian.length;
                
                if (data.masterPeserta && data.masterPeserta.length > 0) {
                    masterPeserta = data.masterPeserta;
                    simpanSuggestionKeLocalStorage();
                    updateDatabaseStatus();
                }
                
                renderTabel();
                simpanKeLocalStorage();
                localStorage.setItem('antrianLastUpdated', fbTimestamp);
            }
        }
    }, (error) => {
        console.error('Firebase error:', error);
    });
}

// ============================================================
// HAPUS DUPLIKAT
// ============================================================
function hapusDuplikat() {
    if (antrian.length === 0) {
        showToast('⚠️ Tidak ada antrian', 'info');
        return;
    }
    
    const totalAwal = antrian.length;
    const seenName = new Set();
    const seenNip = new Set();
    const baru = [];
    let duplikat = 0;
    
    antrian.forEach(a => {
        const nameKey = a.nama.toLowerCase();
        if (seenName.has(nameKey) || seenNip.has(a.nip)) {
            duplikat++;
        } else {
            seenName.add(nameKey);
            seenNip.add(a.nip);
            baru.push(a);
        }
    });
    
    if (duplikat === 0) {
        showToast('✅ Tidak ada duplikat ditemukan', 'success');
        return;
    }
    
    if (!confirm(`Ditemukan ${duplikat} data duplikat (nama/NIP sama). Hapus?`)) return;
    
    antrian = baru;
    antrian.forEach((a, idx) => {
        a.nomor = String(idx + 1).padStart(3, '0');
    });
    nomorTerakhir = antrian.length;
    
    renderTabel();
    simpanKeLocalStorage();
    syncToFirebase();
    showToast(`✅ ${duplikat} duplikat dihapus! (${antrian.length} antrian tersisa)`, 'success');
}

// ============================================================
// INIT
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
};

function nextPage() {
    currentPage++;
    renderTabel();
}

function prevPage() {
    currentPage--;
    renderTabel();
}