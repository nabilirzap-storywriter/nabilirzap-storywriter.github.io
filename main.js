import { db, collection, addDoc, doc, updateDoc, onSnapshot, query, orderBy } from './preload.js';
import { showToast, switchTab, renderNamesList } from './renderer.js';

// Global Data
let globalNames = [];
let isAdmin = false;
let secretClicks = 0;
let secretTimeout;

// 1. SISTEM NAVIGASI (Merespon klik di PC & HP)
document.querySelectorAll('.nav-btn, .mob-nav-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        // Tombol submit jangan ikut pindah tab
        if(e.target.id === 'submit-btn') return; 
        
        // Cari parent button jika icon yang terklik
        const btn = e.target.closest('button');
        if(btn && btn.dataset.target) {
            switchTab(btn.dataset.target);
            updateView(); // Refresh list saat tab berubah
        }
    });
});

// 2. SISTEM LISTENER DATABASE REALTIME
const namesRef = collection(db, "names");
const q = query(namesRef, orderBy("name"));

onSnapshot(q, (snapshot) => {
    globalNames = [];
    snapshot.forEach((doc) => {
        globalNames.push({ id: doc.id, ...doc.data() });
    });
    updateView();
});

// Fungsi untuk menyortir dan menampilkan data sesuai tab aktif
function updateView() {
    const isTopTab = document.getElementById('top-section').classList.contains('active');
    const searchVal = document.getElementById('search-input').value.toLowerCase();

    if (isTopTab) {
        const topData = [...globalNames].sort((a, b) => b.votes - a.votes).slice(0, 50);
        renderNamesList(topData, 'top-list', true);
    } else {
        const filteredData = globalNames.filter(item => item.name.toLowerCase().includes(searchVal));
        renderNamesList(filteredData, 'all-list', false);
    }
}

// 3. SISTEM PENCARIAN
document.getElementById('search-input').addEventListener('input', updateView);

// 4. SISTEM APRESIASI (VOTE) - Menggunakan Event Delegation
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('vote-btn')) {
        const id = e.target.dataset.id;
        const currentVotes = parseInt(e.target.dataset.votes);
        const name = e.target.dataset.name;

        try {
            await updateDoc(doc(db, "names", id), { votes: currentVotes + 1 });
            showToast(`✨ Appreciated: ${name}`);
        } catch (error) {
            showToast("❌ Gagal menghubungi server.");
        }
    }
});

// 5. SISTEM ADMIN RAHASIA (4 Klik)
document.getElementById('admin-trigger').addEventListener('click', () => {
    secretClicks++;
    clearTimeout(secretTimeout);
    
    if(secretClicks >= 4) {
        isAdmin = true;
        showToast("🔐 SYSTEM OVERRIDE: Admin Mode Engaged.");
        secretClicks = 0;
    } else {
        secretTimeout = setTimeout(() => { secretClicks = 0; }, 400);
    }
});

// 6. SISTEM PUBLISH NAMA (Dengan Animasi Progress)
let isProcessing = false;

document.getElementById('submit-btn').addEventListener('click', async () => {
    if(isProcessing) return showToast("⚠️ Protokol sedang berjalan!");
    
    const inputEl = document.getElementById('new-name-input');
    const nameValue = inputEl.value.trim();
    if (!nameValue) return showToast("⚠️ Identitas tidak boleh kosong!");

    // ADMIN BYPASS
    if (isAdmin) {
        try {
            await addDoc(collection(db, "names"), { name: nameValue, votes: 0 });
            showToast(`⚡ ADMIN BYPASS: ${nameValue} dipublikasi!`);
            inputEl.value = "";
        } catch(e) { showToast("❌ Error database."); }
        return;
    }

    // USER BIASA (PROGRESS BAR 5 MENIT)
    isProcessing = true;
    document.getElementById('progress-container').style.display = 'block';
    
    let time = 5 * 60;
    const timeEl = document.getElementById('time-publish');
    const fillEl = document.getElementById('fill-publish');
    showToast("⏳ Menambahkan ke antrean server...");

    const interval = setInterval(async () => {
        time--;
        if (time >= 0) {
            timeEl.innerText = `${Math.floor(time/60)}:${(time%60).toString().padStart(2, '0')}`;
            fillEl.style.width = `${((300 - time) / 300) * 100}%`;
        } else {
            clearInterval(interval);
            try {
                await addDoc(collection(db, "names"), { name: nameValue, votes: 0 });
                timeEl.innerText = "SELESAI";
                timeEl.style.color = "#00f5ff";
                showToast(`✅ ${nameValue} resmi masuk ke Vault!`);
            } catch(e) { showToast("❌ Gagal terhubung ke server."); }
            isProcessing = false;
            inputEl.value = "";
        }
    }, 1000);
});
