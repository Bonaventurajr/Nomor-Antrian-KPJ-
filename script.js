// ============================================================
// DATA
// ============================================================
let masterPeserta = [];
let antrian = [];
let nomorTerakhir = 0;
let selectedIndex = { nip: -1, nama: -1, bagian: -1 };
let filteredData = { nip: [], nama: [], bagian: [] };

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
// AUTOCOMPLETE - FIXED
// ============================================================
function filterAutocomplete(field, query) {
    const listMap = {
        nip: 'listNip',
        nama: 'listNama',
        bagian: 'listBagian'
    };
    const list = document.getElementById(listMap[field]);
    const inputId = 'input' + field.charAt(0).toUpperCase() + field.slice(1);
    const input = document.getElementById(inputId);

    // 🔥 FIX: Jika query kosong, sembunyikan list dan hapus highlight
    if (!query || query.trim().length === 0) {
        list.classList.remove('show');
        list.innerHTML = ''; // Kosongkan list
        if (input) input.classList.remove('highlight');
        filteredData[field] = [];
        selectedIndex[field] = -1;
        return;
    }

    const q = query.toLowerCase().trim();
    let data = [];

    // Cari data berdasarkan field
    if (field === 'nip') {
        data = masterPeserta.filter(p => p.nip && p.nip.toLowerCase().includes(q));
    } else if (field === 'nama') {
        data = masterPeserta.filter(p => p.nama && p.nama.toLowerCase().includes(q));
    } else if (field === 'bagian') {
        const uniqueBagian = [...new Set(
            masterPeserta
                .map(p => p.bagian)
                .filter(b => b && b.toLowerCase().includes(q))
        )];
        data = uniqueBagian.map(b => ({ bagian: b }));
        
        // Jika user mengetik bagian baru, tambahkan sebagai opsi
        const exists = data.some(d => d.bagian.toLowerCase() === q);
        if (!exists && q.length > 0) {
            data.push({ bagian: q, isNew: true });
        }
    }

    // 🔥 FIX: Jika tidak ada data, sembunyikan list
    if (data.length === 0) {
        list.classList.remove('show');
        list.innerHTML = '';
        if (input) input.classList.remove('highlight');
        filteredData[field] = [];
        selectedIndex[field] = -1;
        return;
    }

    // Batasi data maksimal 10
    data = data.slice(0, 10);
    filteredData[field] = data;
    selectedIndex[field] = -1;

    let html = '';
    data.forEach((p, idx) => {
        let display = '';
        let sub = '';
        let badge = '';
        let isNewClass = '';

        if (field === 'nip') {
            display = p.nip;
            sub = p.nama || '-';
            badge = p.bagian || 'Karyawan';
            // Highlight matching text
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
            badge = p.bagian || '';
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
            sub = p.isNew ? '' : 'Klik untuk memilih bagian';
            badge = p.isNew ? 'Baru' : '';
            isNewClass = p.isNew ? 'is-new' : '';
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
            <div class="autocomplete-item ${isNewClass}" data-index="${idx}" onclick="selectPeserta('${field}', ${idx})">
                <div>
                    <div class="main">${display}</div>
                    ${sub ? `<div class="sub">${sub}</div>` : ''}
                </div>
                ${badge ? `<span class="badge-info" style="${p.isNew ? 'background:#059669;color:white;' : ''}">${badge}</span>` : ''}
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
        ambilAntrian();
    } else if (field === 'nama') {
        document.getElementById('inputNip').value = p.nip || '';
        document.getElementById('inputNama').value = p.nama;
        document.getElementById('inputBagian').value = p.bagian || '';
        closeAllLists();
        ambilAntrian();
    } else if (field === 'bagian') {
        document.getElementById('inputBagian').value = p.bagian;
        closeAllLists();
        document.getElementById('inputNip').focus();
    }

    document.querySelectorAll('.autocomplete-input').forEach(el => el.classList.remove('highlight'));
}

function handleKeydown(field, e) {
    const listMap = {
        nip: 'listNip',
        nama: 'listNama',
        bagian: 'listBagian'
    };
    const list = document.getElementById(listMap[field]);
    const items = list.querySelectorAll('.autocomplete-item');

    // Jika list tidak terlihat
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
        el.innerHTML = ''; // 🔥 FIX: Kosongkan list
    });
    document.querySelectorAll('.autocomplete-input').forEach(el => el.classList.remove('highlight'));
    // Reset filtered data
    filteredData = { nip: [], nama: [], bagian: [] };
    selectedIndex = { nip: -1, nama: -1, bagian: -1 };
}

// 🔥 FIX: Tambahkan event listener untuk klik di luar
document.addEventListener('click', function(e) {
    if (!e.target.closest('.autocomplete-container')) {
        closeAllLists();
    }
});

// 🔥 FIX: Tambahkan event listener untuk blur (ketika input kehilangan fokus)
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.autocomplete-input').forEach(input => {
        input.addEventListener('blur', function(e) {
            // Delay agar klik pada item autocomplete masih bekerja
            setTimeout(() => {
                const container = this.closest('.autocomplete-container');
                const list = container.querySelector('.autocomplete-list');
                if (list) {
                    list.classList.remove('show');
                    list.innerHTML = '';
                }
                this.classList.remove('highlight');
            }, 200);
        });
    });
});

// ============================================================
// AMBIL ANTRIAN
// ============================================================
function ambilAntrian() {
    const nip = document.getElementById('inputNip').value.trim();
    const nama = document.getElementById('inputNama').value.trim();
    const bagian = document.getElementById('inputBagian').value.trim();

    if (!nip || !nama || !bagian) {
        showToast('⚠️ NIP, Nama, dan Bagian harus diisi!', 'error');
        return;
    }

    const cek = antrian.find(a => a.nip === nip);
    if (cek) {
        showToast(`⚠️ "${nama}" sudah terdaftar dengan nomor ${cek.nomor}`, 'error');
        clearForm();
        return;
    }

    const found = masterPeserta.find(p => p.nip === nip);
    if (found) {
        found.nama = nama;
        found.bagian = bagian;
    } else {
        masterPeserta.push({ nip, nama, bagian });
    }
    simpanSuggestionKeLocalStorage();

    nomorTerakhir++;
    const nomorBaru = String(nomorTerakhir).padStart(3, '0');

    antrian.push({ nip, nama, bagian, nomor: nomorBaru });
    renderTabel();

    document.getElementById('nomorAntrian').textContent = nomorBaru;
    document.getElementById('detailAntrian').innerHTML = `<strong>${nama}</strong> · ${bagian}`;
    document.getElementById('ticket').classList.add('show');

    clearForm();
    simpanKeLocalStorage();
    showToast(`🎫 Nomor ${nomorBaru} untuk ${nama}`, 'success');
}

// ============================================================
// CLEAR FORM - FIXED
// ============================================================
function clearForm() {
    document.getElementById('inputNip').value = '';
    document.getElementById('inputNama').value = '';
    document.getElementById('inputBagian').value = '';
    closeAllLists();
    document.getElementById('inputNip').focus();
}

// ============================================================
// TAMBAH PESERTA
// ============================================================
function tambahPeserta() {
    const nip = prompt('Masukkan NIP:', '');
    if (nip === null) return;
    if (!nip.trim()) {
        showToast('⚠️ NIP harus diisi!', 'error');
        return;
    }
    
    const nama = prompt('Masukkan Nama:', '');
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

    masterPeserta.push({ 
        nip: nip.trim(), 
        nama: nama.trim(), 
        bagian: bagian.trim() 
    });
    
    simpanSuggestionKeLocalStorage();
    showToast(`✅ Peserta "${nama.trim()}" ditambahkan`, 'success');
}

// ============================================================
// RENDER TABEL
// ============================================================
function renderTabel() {
    const tbody = document.getElementById('tbodyAntrian');
    const count = document.getElementById('countAntrian');
    count.textContent = antrian.length + ' antrian';

    if (antrian.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6"><div class="empty-state"><i class="fas fa-inbox"></i>Belum ada antrian</div></td></tr>
        `;
        return;
    }

    let html = '';
    antrian.forEach((a, idx) => {
        html += `
            <tr>
                <td>${idx + 1}</td>
                <td>${a.nip}</td>
                <td>${a.nama}</td>
                <td>${a.bagian}</td>
                <td class="nomor-cell">${a.nomor}</td>
                <td>
                    <button class="btn-delete" onclick="hapusAntrian('${a.nip}')" title="Hapus antrian ini">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ============================================================
// HAPUS SATU ANTRIAN
// ============================================================
function hapusAntrian(nip) {
    const peserta = antrian.find(a => a.nip === nip);
    if (!peserta) return;

    if (!confirm(`Hapus antrian untuk "${peserta.nama}" (NIP: ${nip})?`)) return;

    antrian = antrian.filter(a => a.nip !== nip);

    // Reset nomor urut
    antrian.forEach((a, idx) => {
        a.nomor = String(idx + 1).padStart(3, '0');
    });
    nomorTerakhir = antrian.length;

    renderTabel();

    if (antrian.length === 0) {
        document.getElementById('ticket').classList.remove('show');
    }

    simpanKeLocalStorage();
    showToast(`🗑️ Antrian "${peserta.nama}" dihapus`, 'info');
}

// ============================================================
// SAVE EXCEL
// ============================================================
function saveExcel() {
    if (antrian.length === 0) {
        showToast('⚠️ Belum ada data untuk disimpan', 'error');
        return;
    }

    const dataForExcel = [
        ['No', 'NIP', 'Nama', 'Bagian', 'Antrian']
    ];

    antrian.forEach((a, index) => {
        dataForExcel.push([index + 1, a.nip, a.nama, a.bagian, a.nomor]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(dataForExcel);

    ws['!cols'] = [
        { wch: 5 },
        { wch: 15 },
        { wch: 30 },
        { wch: 20 },
        { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Antrian");
    const fileName = `Antrian_KPJ_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast(`📥 File "${fileName}" berhasil di-download!`, 'success');
}

// ============================================================
// RESET
// ============================================================
function resetAll() {
    if (antrian.length === 0) {
        showToast('⚠️ Tidak ada data untuk direset', 'info');
        return;
    }
    if (!confirm('Yakin ingin menghapus semua data antrian?')) return;

    antrian = [];
    nomorTerakhir = 0;
    renderTabel();
    document.getElementById('ticket').classList.remove('show');
    localStorage.removeItem('antrianSembako');
    showToast('🔄 Semua data antrian direset', 'info');
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
            }
        } catch (e) {}
    }
}

// ============================================================
// INIT
// ============================================================
window.onload = function() {
    loadSuggestionDariLocalStorage();
    loadDariLocalStorage();
    if (antrian.length === 0) {
        document.getElementById('inputNip').focus();
    }
};