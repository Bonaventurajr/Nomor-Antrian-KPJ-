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
        showToast('❌ NIP tidak terdaftar!', 'error');
        clearForm();
        return;
    }

    if (!/^\d{11}$/.test(nip)) {
        showToast('⚠️ Format NIP salah! Harus 11 digit.', 'error');
        clearForm();
        return;
    }

    // CEK DUPLIKAT NAMA
    //const existingName = antrian.find(a => a.nama.toLowerCase() === nama.toLowerCase());
    //if (existingName) {
    //    showToast(`⚠️ Nama "${nama}" sudah terdaftar dengan nomor ${existingName.nomor}`, 'error');
    //    clearForm();
    //    return;
    //}

    // 🔥 CEK DUPLIKAT NIP
    const existingNip = antrian.find(a => a.nip === nip);
    if (existingNip) {
        showToast(`⚠️ NIP "${nip}" sudah terdaftar untuk ${existingNip.nama} (Nomor: ${existingNip.nomor})`, 'error');
        clearForm();
        return;
    }

    if (firebaseEnabled && database) {
        database.ref('antrianData/antrian').once('value', (snapshot) => {
            const data = snapshot.val() || [];
            
            // 🔥 CEK DUPLIKAT NIP DI FIREBASE
            const fbExisting = data.find(a => a.nip === nip);
            if (fbExisting) {
                showToast(`⚠️ NIP "${nip}" sudah terdaftar di sistem dengan nomor ${fbExisting.nomor}!`, 'error');
                clearForm();
                return;
            }
            
            // 🔥 CEK NOMOR TERAKHIR DI FIREBASE
            database.ref('antrianData/nomorTerakhir').once('value', (snap) => {
                const fbLast = snap.val() || 0;
                // Ambil yang paling besar antara lokal dan Firebase
                const maxLast = Math.max(nomorTerakhir, fbLast);
                nomorTerakhir = maxLast;
                prosesAmbilAntrian(nip, nama, bagian);
            }).catch(() => {
                prosesAmbilAntrian(nip, nama, bagian);
            });
        }).catch(() => {
            prosesAmbilAntrian(nip, nama, bagian);
        });
    } else {
        prosesAmbilAntrian(nip, nama, bagian);
    }
}

// ============================================================
// AUTO SYNC (OTOMATIS TANPA TOMBOL)
// ============================================================
function autoSync() {
    if (!firebaseEnabled || !database || isSyncing) return;
    isSyncing = true;
    
    console.log('🔄 Auto sync started...');
    
    // 1. Bersihkan duplikat dulu
    const seen = new Set();
    const cleanData = [];
    antrian.forEach(a => {
        const key = a.nip + '|' + (a.nama || '').toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            cleanData.push(a);
        }
    });
    if (cleanData.length !== antrian.length) {
        antrian = cleanData;
        antrian.forEach((a, idx) => {
            a.nomor = String(idx + 1).padStart(3, '0');
        });
        nomorTerakhir = antrian.length;
        renderTabel();
        simpanKeLocalStorage();
        console.log('🧹 Duplikat dibersihkan di autoSync');
    }
    
    // 2. Sync ke Firebase
    database.ref('antrianData').once('value')
        .then(snap => {
            const fbData = snap.val();
            const fbAntrian = (fbData && fbData.antrian) || [];
            const fbTime = (fbData && fbData.lastUpdated) || 0;
            const localTime = parseInt(localStorage.getItem('antrianLastUpdated')) || 0;
            
            // 🔥 GABUNGKAN DATA (JANGAN TIMPA)
            if (fbAntrian.length > 0 || antrian.length > 0) {
                let merged = [...fbAntrian];
                
                // Tambahkan data lokal yang belum ada di Firebase
                antrian.forEach(localItem => {
                    const exists = merged.some(fbItem =>
                        fbItem.nip === localItem.nip ||
                        fbItem.nama.toLowerCase() === localItem.nama.toLowerCase()
                    );
                    if (!exists) {
                        merged.push(JSON.parse(JSON.stringify(localItem)));
                    }
                });
                
                // Reset nomor urut
                merged.forEach((a, idx) => {
                    a.nomor = String(idx + 1).padStart(3, '0');
                });
                
                // Update data
                antrian = merged;
                nomorTerakhir = antrian.length;
                
                // Simpan ke Firebase
                const updates = {};
                updates['antrianData/antrian'] = antrian;
                updates['antrianData/nomorTerakhir'] = nomorTerakhir;
                updates['antrianData/masterPeserta'] = masterPeserta;
                updates['antrianData/lastUpdated'] = Date.now();
                
                database.ref().update(updates)
                    .then(() => {
                        renderTabel();
                        simpanKeLocalStorage();
                        localStorage.setItem('antrianLastUpdated', Date.now());
                        console.log(`✅ Auto sync selesai! ${antrian.length} antrian`);
                    })
                    .catch(err => console.error('Auto sync error:', err))
                    .finally(() => { isSyncing = false; });
            } else {
                isSyncing = false;
            }
        })
        .catch(() => { isSyncing = false; });
}

function prosesAmbilAntrian(nip, nama, bagian) {
    const data = { nip, nama, bagian };
    antrian.push(data);
    antrian.forEach((a, idx) => {
        a.nomor = String(idx + 1).padStart(3, '0');
    });
    nomorTerakhir = antrian.length;
    renderTabel();
    simpanKeLocalStorage();
    
    if (firebaseEnabled && database) {
        database.ref('antrianData/nomorTerakhir').once('value', (snap) => {
            const fbLast = snap.val() || 0;
            nomorTerakhir = Math.max(nomorTerakhir, fbLast);
            
            // Tambah 1
            nomorTerakhir++;
            const nomorBaru = String(nomorTerakhir).padStart(3, '0');
            
            // Simpan data
            const data = { nip, nama, bagian, nomor: nomorBaru };
            antrian.push(data);
            
            // Reset nomor urut
            antrian.forEach((a, idx) => {
                a.nomor = String(idx + 1).padStart(3, '0');
            });
            nomorTerakhir = antrian.length;
            
            renderTabel();
            simpanKeLocalStorage();
            
            // 🔥 SIMPAN KE FIREBASE
            database.ref('antrianData/antrian').once('value', (snapshot) => {
                let antrianData = snapshot.val() || [];
                // Cek duplikat
                if (antrianData.some(a => a.nip === nip)) {
                    antrian = antrian.filter(a => a.nip !== nip);
                    renderTabel();
                    showToast('⚠️ NIP sudah terdaftar di sistem!', 'error');
                    return;
                }
                antrianData.push({ nip, nama, bagian, nomor: nomorBaru });
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
                        showToast('⚠️ Gagal simpan ke Firebase', 'error');
                        console.error(err);
                    });
            });
        }).catch(() => {
            // Fallback jika Firebase error
            prosesAmbilAntrianLokal(nip, nama, bagian);
        });
    } else {
        prosesAmbilAntrianLokal(nip, nama, bagian);
    }
}

// ============================================================
// AMBIL ANTRIAN LOKAL (FALLBACK)
// ============================================================
function prosesAmbilAntrianLokal(nip, nama, bagian) {
    nomorTerakhir++;
    const nomorBaru = String(nomorTerakhir).padStart(3, '0');
    antrian.push({ nip, nama, bagian, nomor: nomorBaru });
    antrian.forEach((a, idx) => {
        a.nomor = String(idx + 1).padStart(3, '0');
    });
    nomorTerakhir = antrian.length;
    renderTabel();
    simpanKeLocalStorage();
    syncToFirebase();
    
    document.getElementById('nomorAntrian').textContent = nomorBaru;
    document.getElementById('detailAntrian').innerHTML = `<strong>${nama}</strong> · ${bagian}`;
    const { tanggal, waktu } = formatTanggalWaktu();
    document.getElementById('tanggalAmbil').textContent = tanggal;
    document.getElementById('waktuAmbil').textContent = waktu;
    document.getElementById('ticket').classList.add('show');
    clearForm();
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
// RENDER TABEL - AUTO CLEAN + AUTO RESET + AUTO REPAIR
// ============================================================
function renderTabel() {
    // ============================================================
    // 🔥 AUTO CLEAN DUPLIKAT
    // ============================================================
    if (antrian.length > 1) {
    const seenNip = new Set();
    const cleanData = [];
    antrian.forEach(a => {
        const nipKey = a.nip || '';
        if (!seenNip.has(nipKey)) {
            seenNip.add(nipKey);
            cleanData.push(a);
        }
    });
    if (cleanData.length !== antrian.length) {
        antrian = cleanData;
        console.log('🧹 Duplikat NIP dibersihkan!');
    }
}
    
    // ============================================================
    // 🔥 AUTO REPAIR - Perbaiki jika nomor tidak sesuai
    // ============================================================
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
            console.log('🔧 Auto repair nomor antrian...');
            antrian.forEach((a, idx) => {
                a.nomor = String(idx + 1).padStart(3, '0');
            });
            nomorTerakhir = antrian.length;
            simpanKeLocalStorage();
            if (typeof syncToFirebase === 'function') {
                syncToFirebase();
            }
            console.log(`✅ Auto repair selesai! ${nomorTerakhir} antrian`);
        }
    }

    // ============================================================
    // RENDER TABEL
    // ============================================================
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
                
                // AUTO REPAIR SAAT LOAD
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
    
    // AUTO REPAIR SEBELUM SYNC
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
    
    // AUTO CLEAN DUPLIKAT
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

function loadFromFirebase() {
    if (!firebaseEnabled || !database) return;
    
    database.ref('antrianData').on('value', (snapshot) => {
        if (isSyncing) return;
        const data = snapshot.val();
        
        // 🔥 CEK: APAKAH DATA FIREBASE VALID?
        if (data && data.antrian && data.antrian.length > 0) {
            const fbTime = data.lastUpdated || 0;
            const localTime = parseInt(localStorage.getItem('antrianLastUpdated')) || 0;
            
            // 🔥 JIKA DATA FIREBASE LEBIH LAMA, TIDAK USAH DIPAKAI
            if (fbTime < localTime) {
                console.log('⚠️ Data Firebase lebih lama, pakai lokal');
                return;
            }
            
            // 🔥 CEK JUMLAH DATA
            const fbCount = data.antrian.length;
            const localCount = antrian.length;
            
            // 🔥 JIKA LOKAL LEBIH BANYAK, PAKAI LOKAL
            if (localCount > fbCount) {
                console.log(`📤 Lokal lebih banyak (${localCount} > ${fbCount}), pakai lokal`);
                return;
            }
            
            // 🔥 JIKA FIREBASE PUNYA DATA (DAN LEBIH BARU ATAU LEBIH BANYAK)
            if (fbCount > 0 && (fbCount > localCount || fbTime > localTime)) {
                const seen = new Set();
                const clean = [];
                data.antrian.forEach(a => {
                    if (!seen.has(a.nip)) {
                        seen.add(a.nip);
                        clean.push(a);
                    }
                });
                
                clean.forEach((a, idx) => {
                    a.nomor = String(idx + 1).padStart(3, '0');
                });
                
                antrian = clean;
                nomorTerakhir = antrian.length;
                
                if (data.masterPeserta && data.masterPeserta.length > 0) {
                    masterPeserta = data.masterPeserta;
                    simpanSuggestionKeLocalStorage();
                    updateDatabaseStatus();
                }
                
                renderTabel();
                simpanKeLocalStorage();
                localStorage.setItem('antrianLastUpdated', fbTime);
                console.log(`📦 Data dari Firebase: ${antrian.length} antrian`);
            }
        } else {
            // 🔥 FIREBASE KOSONG, RESET LOKAL JUGA
            console.log('⚠️ Firebase kosong, reset lokal...');
            antrian = [];
            nomorTerakhir = 0;
            renderTabel();
            document.getElementById('ticket').classList.remove('show');
            localStorage.removeItem('antrianSembako');
            localStorage.removeItem('antrianLastUpdated');
        }
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
        setInterval(() => { if (!isSyncing) autosync(); }, 30000);
        setTimeout(() => { if (!isSyncing) autosync(); }, 5000);  
    }
    if (antrian.length === 0) document.getElementById('inputNip').focus();
};

function nextPage() { currentPage++; renderTabel(); }
function prevPage() { currentPage--; renderTabel(); }