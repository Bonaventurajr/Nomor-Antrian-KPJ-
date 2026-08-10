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
            dbInfo.textContent = '⚠️ Belum ada data!';
            dbInfo.style.color = '#dc2626';
        }
    }
}

// ============================================================
// JADWAL FUNCTIONS (DIPERBAIKI)
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
                    
                    const result = validateWaktu(date);
                    resolve(result);
                })
                .catch(() => {
                    // Fallback ke waktu lokal jika gagal
                    const result = validateWaktu(new Date());
                    resolve(result);
                });
        });
    } else {
        // Fallback ke waktu lokal
        return validateWaktu(new Date());
    }
}

// ============================================================
// VALIDASI WAKTU (FUNGSI PEMBANTU)
// ============================================================
function validateWaktu(now) {
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
// UPDATE JADWAL STATUS USER (ASYNC - DIPERBAIKI)
// ============================================================
async function updateJadwalStatusUser() {
    const statusDiv = document.getElementById('jadwalStatus');
    const statusText = document.getElementById('jadwalStatusText');
    if (!statusDiv || !statusText) return;
    
    try {
        const cek = await cekJamOperasional();
        
        if (cek.boleh) {
            statusDiv.style.borderLeftColor = '#059669';
            statusDiv.style.background = '#ecfdf5';
            statusText.innerHTML = `🟢 <strong>Sistem Buka</strong> <span style="font-size:12px; color:#64748b; margin-left:6px;">${formatTanggalIndonesia(jadwalOperasional.tanggalMulai)} - ${formatTanggalIndonesia(jadwalOperasional.tanggalSelesai)} | ${jadwalOperasional.jamMulai} - ${jadwalOperasional.jamSelesai}</span>`;
        } else {
            statusDiv.style.borderLeftColor = '#dc2626';
            statusDiv.style.background = '#fef2f2';
            statusText.innerHTML = `🔴 <strong>${cek.pesan}</strong>`;
        }
    } catch (error) {
        console.error('Error update jadwal status:', error);
        statusDiv.style.borderLeftColor = '#dc2626';
        statusDiv.style.background = '#fef2f2';
        statusText.innerHTML = '🔴 <strong>Gagal memuat status jadwal</strong>';
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
// AMBIL ANTRIAN (ASYNC - DIPERBAIKI)
// ============================================================
async function ambilAntrian() {
    try {
        const cek = await cekJamOperasional();
        if (!cek.boleh) {
            showToast(cek.pesan, 'error');
            return;
        }
    } catch (error) {
        showToast('⚠️ Gagal cek jadwal: ' + error.message, 'error');
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

    // ✅ Validasi NIP duplikat
    const existingNip = antrian.find(a => a.nip === nip);
    if (existingNip) {
        showToast(`⚠️ NIP "${nip}" sudah terdaftar untuk ${existingNip.nama}`, 'error');
        clearForm();
        return;
    }

    if (firebaseEnabled && database) {
        try {
            const snapshot = await database.ref('antrianData/antrian').once('value');
            const data = snapshot.val() || {};
            const existingEntries = Array.isArray(data) ? data : Object.values(data);
            if (existingEntries.some(a => a && a.nip === nip)) {
                showToast(`⚠️ NIP "${nip}" sudah terdaftar di sistem!`, 'error');
                clearForm();
                return;
            }
            prosesAmbilAntrian(nip, nama, bagian);
        } catch (error) {
            console.error('Error cek duplikat:', error);
            prosesAmbilAntrian(nip, nama, bagian);
        }
    } else {
        prosesAmbilAntrian(nip, nama, bagian);
    }
}

// ============================================================
// PROSES AMBIL ANTRIAN - HANYA CEK NIP (TANPA CEK NAMA)
// ============================================================
function prosesAmbilAntrian(nip, nama, bagian) {
    // 🔥 Step 1: TAMBAHKAN KE LOKAL DULU (untuk UI cepat)
    const data = { nip, nama, bagian, status: 'Menunggu', timestamp: Date.now() };
    antrian.push(data);
    renderTabel();
    simpanKeLocalStorage();

    // 🔥 Step 2: GUNAKAN FIREBASE TRANSACTION UNTUK NOMOR UNIK
    if (firebaseEnabled && database) {
        const ref = database.ref('antrianData/nomorTerakhir');

        ref.transaction((current) => {
            return (current || 0) + 1;
        }, (error, committed, snapshot) => {
            if (error) {
                showToast('⚠️ Gagal mengambil nomor antrian: ' + error.message, 'error');
                // Rollback: hapus dari lokal jika gagal
                antrian = antrian.filter(a => a.nip !== nip);
                renderTabel();
                simpanKeLocalStorage();
                return;
            }

            if (committed) {
                const nomorBaru = String(snapshot.val()).padStart(3, '0');
                // 🔥 Step 3: Simpan antrian dengan nomor yang sudah di-transaction
                simpanAntrianKeFirebase(nip, nama, bagian, nomorBaru);
            } else {
                showToast('⚠️ Gagal mendapatkan nomor antrian (aborted)', 'error');
                // Rollback: hapus dari lokal
                antrian = antrian.filter(a => a.nip !== nip);
                renderTabel();
                simpanKeLocalStorage();
            }
        }, false);
    } else {
        // Fallback jika Firebase offline (tanpa transaction)
        nomorTerakhir++;
        const nomorBaru = String(nomorTerakhir).padStart(3, '0');
        simpanAntrianLokal(nip, nama, bagian, nomorBaru);
    }
    
    // 🔥 AUTO SYNC SETELAH PROSES
    setTimeout(() => {
        if (!isSyncing) autoSync();
    }, 500);
}

// ============================================================
// SIMPAN ANTRIAN KE FIREBASE (DENGAN KEY NUMERIC - DIPERBAIKI)
// ============================================================
function simpanAntrianKeFirebase(nip, nama, bagian, nomorBaru) {
    const data = {
        nip, nama, bagian,
        status: 'Menunggu',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    const updates = {};
    updates[`antrianData/antrian/${nomorBaru}`] = data;
    updates['antrianData/nomorTerakhir'] = parseInt(nomorBaru, 10);
    updates['antrianData/lastUpdated'] = firebase.database.ServerValue.TIMESTAMP;
    
    database.ref().update(updates)
        .then(() => {
            const localItem = antrian.find(a => a.nip === nip);
            if (localItem) localItem.nomor = nomorBaru;
            renderTabel();
            simpanKeLocalStorage();
            
            document.getElementById('nomorAntrian').textContent = nomorBaru;
            document.getElementById('detailAntrian').innerHTML = `<strong>${nama}</strong> · ${bagian}`;
            const { tanggal, waktu } = formatTanggalWaktu();
            document.getElementById('tanggalAmbil').textContent = tanggal;
            document.getElementById('waktuAmbil').textContent = waktu;
            document.getElementById('ticket').classList.add('show');
            clearForm();
            showToast(`🎫 Nomor ${nomorBaru} untuk ${nama}`, 'success');
        })
        .catch(err => {
            showToast('⚠️ Gagal menyimpan: ' + err.message, 'error');
            antrian = antrian.filter(a => a.nip !== nip);
            renderTabel();
            simpanKeLocalStorage();
        });
}

// ============================================================
// SIMPAN ANTRIAN LOKAL (FALLBACK)
// ============================================================
function simpanAntrianLokal(nip, nama, bagian, nomorBaru) {
    const existing = antrian.find(a => a.nip === nip);
    if (existing) {
        existing.nomor = nomorBaru;
        existing.status = 'Menunggu';
    } else {
        antrian.push({ nip, nama, bagian, nomor: nomorBaru, status: 'Menunggu', timestamp: Date.now() });
    }
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

function clearForm() {
    document.getElementById('inputNip').value = '';
    document.getElementById('inputNama').value = '';
    document.getElementById('inputBagian').value = '';
    closeAllLists();
    document.getElementById('inputNip').focus();
}

// ============================================================
// RENDER TABEL (DENGAN AUTO REPAIR & CLEAN DUPLIKAT)
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

    const tbody = document.getElementById('tbodyAntrian');
    const count = document.getElementById('countAntrian');
    const info = document.getElementById('infoAntrian');

    const totalItems = antrian.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, totalItems);
    const pageData = antrian.slice(start, end);

    count.textContent = totalItems + ' antrian';
    if (info) info.textContent = `Menampilkan ${totalItems === 0 ? 0 : start+1} - ${end} dari ${totalItems} antrian`;

    document.getElementById('prevPageBtn').disabled = (currentPage === 1 || totalItems === 0);
    document.getElementById('nextPageBtn').disabled = (currentPage === totalPages || totalItems === 0);

    if (totalItems === 0) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-inbox"></i>Belum ada antrian</div></td></tr>`;
        return;
    }

    let html = '';
    pageData.forEach((a) => {
        const isHighlighted = (highlightedNip === a.nip);
        html += `<tr id="row-${a.nip}" onclick="klikAntrian('${a.nip}')" style="cursor:pointer; ${isHighlighted ? 'background-color: #fef08a !important;' : ''}">
            <td>${a.nomor}</td>
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
// FUNGSI LAINNYA
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
        highlightedNip = nip;
        renderTabel();
        setTimeout(() => {
            const row = document.getElementById(`row-${nip}`);
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
    if (/^\d{11}$/.test(input)) {
        data = antrian.find(a => a.nip === input);
    } else {
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

function downloadTicketImage() {
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

// ============================================================
// AUTO SYNC (DIPERBAIKI DENGAN MERGE BIJAK)
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

// ============================================================
// LOCAL STORAGE & FIREBASE
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
                const maxLocalNomor = antrian.reduce((max, item) => {
                    const num = parseInt(item.nomor || '0', 10);
                    return Number.isFinite(num) ? Math.max(max, num) : max;
                }, 0);
                nomorTerakhir = Math.max(parsed.nomorTerakhir || 0, maxLocalNomor, antrian.length);
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
    // Tidak digunakan lagi untuk normal flow. Jika dipanggil, hanya sinkronisasi data yang ada.
    if (!firebaseEnabled || !database || isSyncing) return;
    if (antrian.length === 0) return;

    isSyncing = true;
    database.ref('antrianData').once('value')
        .then(snapshot => {
            const data = snapshot.val() || {};
            const remoteEntries = Object.values(data.antrian || {}).filter(item => item && item.nip && item.nama);
            const remoteNip = new Set(remoteEntries.map(item => item.nip));
            const toPush = antrian.filter(item => !remoteNip.has(item.nip));

            const pushes = toPush.map(item => database.ref('antrianData/antrian').push(item));
            return Promise.all(pushes);
        })
        .then(() => {
            if (nomorTerakhir > 0) {
                database.ref('antrianData/nomorTerakhir').set(nomorTerakhir);
                database.ref('antrianData/lastUpdated').set(Date.now());
            }
        })
        .catch(err => console.error('Sync error:', err))
        .finally(() => { isSyncing = false; });
}

// ============================================================
// LOAD FROM FIREBASE (DIPERBAIKI UNTUK STRUKTUR BARU)
// ============================================================
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
    currentPage = 1;
    renderTabel();
    if (firebaseEnabled) {
        loadFromFirebase();
        loadJadwalFromFirebase();
        setTimeout(() => {
            updateJadwalStatusUser();
        }, 500);
        setInterval(() => { if (!isSyncing) autoSync(); }, 30000);
        setTimeout(() => { if (!isSyncing) autoSync(); }, 5000);
    }
    if (antrian.length === 0) document.getElementById('inputNip').focus();
};

function nextPage() { currentPage++; renderTabel(); }
function prevPage() { currentPage--; renderTabel(); }