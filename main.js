import { db, collection, addDoc, doc, updateDoc, onSnapshot, query, orderBy } from './preload.js';
import { showToast, switchTab, renderNamesList, updateTotalUI } from './renderer.js';

let globalNames = [];
let isAdmin = false;
let secretClicks = 0;
let secretTimeout;

// 1. NAVIGATION
document.querySelectorAll('.nav-btn, .mob-nav-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if(btn && btn.dataset.target) {
            switchTab(btn.dataset.target);
            updateView();
        }
    });
});

// 2. REALTIME DATABASE LISTENER
const namesRef = collection(db, "names");
const q = query(namesRef, orderBy("name"));

onSnapshot(q, (snapshot) => {
    globalNames = [];
    snapshot.forEach((doc) => {
        globalNames.push({ id: doc.id, ...doc.data() });
    });
    updateTotalUI(globalNames.length); // Update Total Nama
    updateView();
});

function updateView() {
    const activeSection = document.querySelector('.section.active').id;
    const searchVal = document.getElementById('search-input').value.toLowerCase();

    if (activeSection === 'all-section') {
        const filtered = globalNames.filter(item => item.name.toLowerCase().includes(searchVal));
        renderNamesList(filtered, 'all-list', false);
    } 
    else if (activeSection === 'top-section') {
        const top50 = [...globalNames].sort((a, b) => b.votes - a.votes).slice(0, 50);
        renderNamesList(top50, 'top-list', true);
    } 
    else if (activeSection === 'release-section') {
        // TOP 5 RECOMMENDED
        const recommended = [...globalNames].sort((a, b) => b.votes - a.votes).slice(0, 5);
        renderNamesList(recommended, 'recommended-list', true);

        // 7 NEW PUBLISH 
        const newlyAdded = [...globalNames].slice(-7).reverse();
        renderNamesList(newlyAdded, 'newly-added-list', false);
    }
}

// 3. SEARCH & VOTE
document.getElementById('search-input').addEventListener('input', updateView);

document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('vote-btn')) {
        const btn = e.target;
        try {
            await updateDoc(doc(db, "names", btn.dataset.id), { 
                votes: parseInt(btn.dataset.votes) + 1 
            });
            showToast(`✨ Appreciated: ${btn.dataset.name}`);
        } catch (err) { showToast("❌ Gagal update server."); }
    }
});

// 4. ADMIN MODE RAHASIA
document.getElementById('admin-trigger').addEventListener('click', () => {
    secretClicks++;
    clearTimeout(secretTimeout);
    if(secretClicks >= 4) { isAdmin = true; showToast("🔐 Admin Mode Engaged."); secretClicks = 0; }
    else { secretTimeout = setTimeout(() => { secretClicks = 0; }, 400); }
});

// 5. SISTEM PUBLISH (ANTI-REFRESH & PERSISTENT TIMER)
let isProcessing = false;
let timerInterval;

// Fungsi ini akan mengecek apakah ada timer yang berjalan sebelum web di-refresh
function startOrResumeTimer() {
    const pendingName = localStorage.getItem('vaultPendingName');
    const startTime = localStorage.getItem('vaultStartTime');
    
    // Kalau tidak ada data antrean, abaikan
    if (!pendingName || !startTime) return;

    isProcessing = true;
    document.getElementById('progress-container').style.display = 'block';
    
    const totalPublishTime = 5 * 60; // 5 menit (300 detik)
    const totalTopTime = 10 * 60;    // 10 menit (600 detik)

    // Bersihkan interval sebelumnya jika ada agar tidak bentrok
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(async () => {
        // Hitung berapa detik yang sudah berlalu sejak tombol diklik pertama kali
        const elapsed = Math.floor((Date.now() - parseInt(startTime)) / 1000);
        
        let pubLeft = totalPublishTime - elapsed;
        let topLeft = totalTopTime - elapsed;

        const timePublishEl = document.getElementById('time-publish');
        const fillPublishEl = document.getElementById('fill-publish');
        const timeTopEl = document.getElementById('time-top');
        const fillTopEl = document.getElementById('fill-top');

        // --- UPDATE PUBLISH TIMER (5 MENIT) ---
        if (pubLeft > 0) {
            timePublishEl.innerText = `${Math.floor(pubLeft/60)}:${(pubLeft%60).toString().padStart(2,'0')}`;
            fillPublishEl.style.width = `${(elapsed / totalPublishTime) * 100}%`;
        } else {
            timePublishEl.innerText = "SELESAI";
            timePublishEl.style.color = "#00f5ff";
            fillPublishEl.style.width = `100%`;
            
            // Mencegah duplicate push jika sudah dipublish
            if (!localStorage.getItem('vaultHasPublished')) {
                localStorage.setItem('vaultHasPublished', 'true'); // Kunci agar tidak dikirim 2x
                try {
                    await addDoc(collection(db, "names"), { name: pendingName, votes: 0 });
                    showToast(`✅ ${pendingName} berhasil masuk Vault Utama!`);
                } catch(e) { console.error(e); }
            }
        }

        // --- UPDATE TOP TIMER (10 MENIT) ---
        if (topLeft > 0) {
            timeTopEl.innerText = `${Math.floor(topLeft/60)}:${(topLeft%60).toString().padStart(2,'0')}`;
            fillTopEl.style.width = `${(elapsed / totalTopTime) * 100}%`;
        } else {
            timeTopEl.innerText = "SELESAI";
            timeTopEl.style.color = "#00f5ff";
            fillTopEl.style.width = `100%`;
            
            showToast(`🏆 ${pendingName} sinkronisasi papan peringkat selesai!`);
            clearInterval(timerInterval);
            isProcessing = false;
            
            // Bersihkan data storage setelah semua proses (10 menit) benar-benar selesai
            localStorage.removeItem('vaultPendingName');
            localStorage.removeItem('vaultStartTime');
            localStorage.removeItem('vaultHasPublished');
            
            document.getElementById('waiting-msg').innerText = "✅ Semua Proses Sinkronisasi Selesai.";
        }

    }, 1000);
}

// Jalankan pengecekan otomatis saat web pertama kali dibuka
startOrResumeTimer();

// TRIGGER TOMBOL PUBLISH
document.getElementById('submit-btn').addEventListener('click', async () => {
    if(isProcessing) return showToast("⚠️ Protokol masih berjalan!");
    
    const input = document.getElementById('new-name-input');
    const nameValue = input.value.trim();
    if(!nameValue) return showToast("⚠️ Isi nama!");

    // JIKA ADMIN (Langsung masuk)
    if(isAdmin) {
        try {
            await addDoc(collection(db, "names"), { name: nameValue, votes: 0 });
            showToast(`⚡ ADMIN BYPASS: ${nameValue} dipublikasi!`);
            input.value = ""; 
        } catch(e) { showToast("❌ Error database."); }
        return;
    }

    // JIKA USER BIASA (Simpan data ke storage dan mulai timer)
    localStorage.setItem('vaultPendingName', nameValue);
    localStorage.setItem('vaultStartTime', Date.now().toString());
    localStorage.removeItem('vaultHasPublished'); 
    
    input.value = "";
    showToast("⏳ Menambahkan ke antrean server...");
    
    startOrResumeTimer();
});
