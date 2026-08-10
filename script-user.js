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
        console.log('🔥 Firebase Connected');
    }
} catch (e) {
    console.log('⚠️ Firebase not configured:', e.message);
}

// ============================================================
// DATA
// ============================================================
let masterPeserta = [];
let antrian = [];
let currentPage = 1;
const itemsPerPage = 10;

// ============================================================
// JADWAL
// ============================================================
let jadwalOperasional = {
    aktif: true,
    tanggalMulai: new Date().toISOString().split('T')[0],
    tanggalSelesai: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
    jamMulai: '08:00',
    jamSelesai: '16:00',
    hariKerja: [1, 2, 3, 4, 5]
};

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    const el = document.getElementById('toastMessage');
    if (!toast || !el) { alert(msg); return; }
    toast.className = 'toast ' + type;
    el.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================================================
// FORMAT
// ============================================================
function formatTanggalIndonesia(t) {
    if (!t) return '-';
    const p = t.split('-');
    const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    return `${parseInt(p[2])} ${bulan[parseInt(p[1])-1]} ${p[0]}`;
}

// ============================================================
// CEK JADWAL
// ============================================================
function cekJamOperasional() {
    if (!jadwalOperasional.aktif) {
        return { boleh: false, pesan: 'Sistem ditutup admin.' };
    }
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (today < jadwalOperasional.tanggalMulai || today > jadwalOperasional.tanggalSelesai) {
        return { boleh: false, pesan: `Tanggal: ${formatTanggalIndonesia(jadwalOperasional.tanggalMulai)} - ${formatTanggalIndonesia(jadwalOperasional.tanggalSelesai)}` };
    }
    
    const hari = now.getDay();
    const hariKerja = hari === 0 ? 7 : hari;
    if (!jadwalOperasional.hariKerja.includes(hariKerja)) {
        return { boleh: false, pesan: 'Hari ini libur.' };
    }
    
    const jam = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    if (jam < jadwalOperasional.jamMulai || jam > jadwalOperasional.jamSelesai) {
        return { boleh: false, pesan: `Jam: ${jadwalOperasional.jamMulai} - ${jadwalOperasional.jamSelesai}` };
    }
    
    return { boleh: true, pesan: 'Sistem buka.' };
}

// ============================================================
// AUTOCOMPLETE SEDERHANA
// ============================================================
let selectedData = null;

function filterNama(q) {
    const list = document.getElementById('listNama');
    if (!q || q.trim().length < 2) {
        list.classList.remove('show');
        return;
    }
    
    const query = q.toLowerCase().trim();
    const results = masterPeserta.filter(p => 
        p.nama && p.nama.toLowerCase().includes(query)
    ).slice(0, 10);
    
    if (results.length === 0) {
        list.classList.remove('show');
        return;
    }
    
    let html = '';
    results.forEach((p, idx) => {
        html += `<div class="autocomplete-item" onclick="pilihNama(${idx})">
            <div><div class="main">${p.nama}</div><div class="sub">NIP: ${p.nip} · ${p.bagian}</div></div>
        </div>`;
    });
    list.innerHTML = html;
    list.classList.add('show');
    selectedData = results;
}

function pilihNama(idx) {
    const p = selectedData[idx];
    if (!p) return;
    document.getElementById('inputNama').value = p.nama;
    document.getElementById('inputNip').value = p.nip;
    document.getElementById('inputBagian').value = p.bagian;
    document.getElementById('listNama').classList.remove('show');
    ambilAntrian();
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.autocomplete-container')) {
        document.getElementById('listNama').classList.remove('show');
    }
});

// ============================================================
// AMBIL ANTRIAN
// ============================================================
async function ambilAntrian() {
    const cek = cekJamOperasional();
    if (!cek.boleh) {
        showToast('⚠️ ' + cek.pesan, 'error');
        return;
    }
    
    const nip = document.getElementById('inputNip').value.trim();
    const nama = document.getElementById('inputNama').value.trim();
    const bagian = document.getElementById('inputBagian').value.trim();
    
    if (!nip || !nama || !bagian) {
        showToast('⚠️ Lengkapi data!', 'error');
        return;
    }
    
    // Cek di master
    const peserta = masterPeserta.find(p => p.nip === nip);
    if (!peserta) {
        showToast('❌ NIP tidak terdaftar!', 'error');
        return;
    }
    
    // Cek duplikat NIP
    if (antrian.some(a => a.nip === nip)) {
        showToast(`⚠️ NIP ${nip} sudah terdaftar!`, 'error');
        return;
    }
    
    // Simpan lokal dulu
    const data = { nip, nama, bagian, status: 'Menunggu', timestamp: Date.now() };
    antrian.push(data);
    renderTabel();
    localStorage.setItem('antrianSembako', JSON.stringify(antrian));
    
    // Simpan ke Firebase
    if (firebaseEnabled && database) {
        try {
            const ref = database.ref('antrianData/nomorTerakhir');
            const snap = await ref.transaction((current) => (current || 0) + 1);
            const nomorBaru = String(snap.snapshot.val()).padStart(3, '0');
            
            const updates = {};
            updates[`antrianData/antrian/${nomorBaru}`] = { nip, nama, bagian, status: 'Menunggu', timestamp: Date.now() };
            updates['antrianData/nomorTerakhir'] = parseInt(nomorBaru, 10);
            updates['antrianData/lastUpdated'] = Date.now();
            await database.ref().update(updates);
            
            // Update lokal
            const item = antrian.find(a => a.nip === nip);
            if (item) item.nomor = nomorBaru;
            renderTabel();
            localStorage.setItem('antrianSembako', JSON.stringify(antrian));
            
            showTicket(nomorBaru, nama, bagian);
            showToast(`🎫 Nomor ${nomorBaru} untuk ${nama}`, 'success');
        } catch (err) {
            showToast('⚠️ Gagal: ' + err.message, 'error');
            antrian = antrian.filter(a => a.nip !== nip);
            renderTabel();
            localStorage.setItem('antrianSembako', JSON.stringify(antrian));
        }
    } else {
        // Offline mode
        const nomorBaru = String(antrian.length).padStart(3, '0');
        const item = antrian.find(a => a.nip === nip);
        if (item) item.nomor = nomorBaru;
        renderTabel();
        localStorage.setItem('antrianSembako', JSON.stringify(antrian));
        showTicket(nomorBaru, nama, bagian);
        showToast(`🎫 Nomor ${nomorBaru} untuk ${nama}`, 'success');
    }
    
    clearForm();
}

// ============================================================
// SHOW TICKET
// ============================================================
function showTicket(nomor, nama, bagian) {
    document.getElementById('nomorAntrian').textContent = nomor;
    document.getElementById('detailAntrian').innerHTML = `<strong>${nama}</strong> · ${bagian}`;
    const now = new Date();
    document.getElementById('tanggalAmbil').textContent = now.toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    document.getElementById('waktuAmbil').textContent = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
    document.getElementById('ticket').classList.add('show');
}

function clearForm() {
    document.getElementById('inputNip').value = '';
    document.getElementById('inputNama').value = '';
    document.getElementById('inputBagian').value = '';
    document.getElementById('listNama').classList.remove('show');
    document.getElementById('inputNama').focus();
}

// ============================================================
// RENDER TABEL
// ============================================================
function renderTabel() {
    // Bersihkan duplikat
    const seen = new Set();
    const clean = [];
    antrian.forEach(a => {
        if (a.nip && !seen.has(a.nip)) {
            seen.add(a.nip);
            clean.push(a);
        }
    });
    if (clean.length !== antrian.length) {
        antrian = clean;
        localStorage.setItem('antrianSembako', JSON.stringify(antrian));
    }
    
    // Reset nomor
    antrian.forEach((a, idx) => {
        a.nomor = String(idx + 1).padStart(3, '0');
    });
    
    const tbody = document.getElementById('tbodyAntrian');
    const count = document.getElementById('countAntrian');
    
    const total = antrian.length;
    const totalPages = Math.ceil(total / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, total);
    const pageData = antrian.slice(start, end);
    
    count.textContent = total + ' antrian';
    document.getElementById('prevPageBtn').disabled = (currentPage <= 1 || total === 0);
    document.getElementById('nextPageBtn').disabled = (currentPage >= totalPages || total === 0);
    
    if (total === 0) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-inbox"></i>Belum ada antrian</div></td></tr>`;
        return;
    }
    
    let html = '';
    pageData.forEach(a => {
        html += `<tr onclick="klikAntrian('${a.nip}')" style="cursor:pointer;">
            <td>${a.nomor}</td>
            <td>${a.nip}</td>
            <td>${a.nama}</td>
            <td>${a.bagian}</td>
            <td class="nomor-cell">${a.nomor}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function klikAntrian(nip) {
    const data = antrian.find(a => a.nip === nip);
    if (data) {
        showTicket(data.nomor, data.nama, data.bagian);
        showToast(`🎫 Nomor ${data.nomor} untuk ${data.nama}`, 'info');
    }
}

function nextPage() { currentPage++; renderTabel(); }
function prevPage() { currentPage--; renderTabel(); }

// ============================================================
// LOAD DATA
// ============================================================
function loadData() {
    // Load master peserta
    const saved = localStorage.getItem('masterPeserta');
    if (saved) {
        try { masterPeserta = JSON.parse(saved); } catch(e) {}
    }
    
    // Load antrian
    const antrianData = localStorage.getItem('antrianSembako');
    if (antrianData) {
        try {
            const parsed = JSON.parse(antrianData);
            if (Array.isArray(parsed)) {
                antrian = parsed;
            } else if (parsed.antrian) {
                antrian = parsed.antrian;
            }
        } catch(e) {}
    }
    
    renderTabel();
    updateDatabaseStatus();
}

function updateDatabaseStatus() {
    const el = document.getElementById('dbCount');
    if (el) el.textContent = masterPeserta.length;
}

// ============================================================
// LOAD FROM FIREBASE
// ============================================================
function loadFromFirebase() {
    if (!firebaseEnabled || !database) return;
    
    database.ref('antrianData').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        const fbAntrian = data.antrian || {};
        const fbTimestamp = data.lastUpdated || 0;
        const localTimestamp = parseInt(localStorage.getItem('antrianLastUpdated')) || 0;
        
        if (fbTimestamp <= localTimestamp) return;
        
        const entries = Object.values(fbAntrian).filter(a => a && a.nip);
        if (entries.length === 0) return;
        
        // Merge
        const merged = [...antrian];
        entries.forEach(item => {
            const existing = merged.find(a => a.nip === item.nip);
            if (!existing) {
                merged.push(item);
            } else if (item.timestamp > existing.timestamp) {
                // Ganti dengan yang lebih baru
                const idx = merged.indexOf(existing);
                merged[idx] = item;
            }
        });
        
        antrian = merged;
        localStorage.setItem('antrianSembako', JSON.stringify(antrian));
        localStorage.setItem('antrianLastUpdated', fbTimestamp);
        renderTabel();
        console.log('✅ Sync dari Firebase:', antrian.length);
    });
}

// ============================================================
// LOAD JADWAL
// ============================================================
function loadJadwal() {
    if (!firebaseEnabled || !database) return;
    database.ref('jadwalOperasional').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            jadwalOperasional = data;
            updateJadwalStatus();
        }
    });
}

function updateJadwalStatus() {
    const el = document.getElementById('jadwalStatusText');
    if (!el) return;
    const cek = cekJamOperasional();
    if (cek.boleh) {
        el.innerHTML = `🟢 <strong>Sistem Buka</strong> <span style="font-size:12px;color:#64748b;">${formatTanggalIndonesia(jadwalOperasional.tanggalMulai)} - ${formatTanggalIndonesia(jadwalOperasional.tanggalSelesai)} | ${jadwalOperasional.jamMulai} - ${jadwalOperasional.jamSelesai}</span>`;
        el.parentElement.style.borderLeftColor = '#059669';
        el.parentElement.style.background = '#ecfdf5';
    } else {
        el.innerHTML = `🔴 <strong>${cek.pesan}</strong>`;
        el.parentElement.style.borderLeftColor = '#dc2626';
        el.parentElement.style.background = '#fef2f2';
    }
}

// ============================================================
// DOWNLOAD TICKET
// ============================================================
function downloadTicketImage() {
    const ticket = document.getElementById('ticket');
    if (!ticket.classList.contains('show')) {
        showToast('⚠️ Belum ada tiket', 'error');
        return;
    }
    if (typeof html2canvas === 'undefined') {
        showToast('⚠️ html2canvas belum dimuat', 'error');
        return;
    }
    html2canvas(ticket, { scale: 4, backgroundColor: '#ffffff' })
        .then(canvas => {
            const link = document.createElement('a');
            link.download = `Tiket_${document.getElementById('nomorAntrian').textContent}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast('📥 Tiket diunduh!', 'success');
        })
        .catch(err => {
            showToast('⚠️ Gagal unduh', 'error');
            console.error(err);
        });
}

// ============================================================
// LIHAT ANTRIAN SAYA
// ============================================================
function lihatAntrianSaya() {
    const input = prompt('🔍 Masukkan NIP atau NAMA:');
    if (!input) return;
    const query = input.trim();
    
    let results = [];
    if (/^\d{11}$/.test(query)) {
        const found = antrian.find(a => a.nip === query);
        if (found) results = [found];
    } else {
        results = antrian.filter(a => a.nama.toLowerCase() === query.toLowerCase());
    }
    
    if (results.length === 0) {
        showToast('😕 Tidak ditemukan', 'info');
        return;
    }
    
    if (results.length === 1) {
        const data = results[0];
        showTicket(data.nomor, data.nama, data.bagian);
        showToast(`🎫 Nomor ${data.nomor} untuk ${data.nama}`, 'success');
        return;
    }
    
    // Banyak hasil
    let msg = '⚠️ Ditemukan ' + results.length + ' data:\n\n';
    results.forEach((a, idx) => {
        msg += `${idx+1}. ${a.nama} (${a.nip}) - No. ${a.nomor}\n`;
    });
    msg += '\nMasukkan nomor urut (0=batal):';
    const pilih = prompt(msg);
    if (!pilih || pilih === '0') return;
    const idx = parseInt(pilih) - 1;
    if (isNaN(idx) || idx < 0 || idx >= results.length) {
        showToast('⚠️ Pilihan tidak valid', 'error');
        return;
    }
    const data = results[idx];
    showTicket(data.nomor, data.nama, data.bagian);
    showToast(`🎫 Nomor ${data.nomor} untuk ${data.nama}`, 'success');
}

// ============================================================
// INIT
// ============================================================
window.onload = function() {
    loadData();
    
    if (firebaseEnabled) {
        loadFromFirebase();
        loadJadwal();
        setTimeout(updateJadwalStatus, 1000);
    }
    
    // Auto sync setiap 30 detik
    setInterval(() => {
        if (firebaseEnabled && database) {
            loadFromFirebase();
        }
    }, 30000);
    
    document.getElementById('inputNama').focus();
};

function nextPage() { currentPage++; renderTabel(); }
function prevPage() { currentPage--; renderTabel(); }