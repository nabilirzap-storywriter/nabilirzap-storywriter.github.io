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
    updateTotalUI(globalNames.length); 
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

        // 7 NEW PUBLISH (Diperbaiki: Sortir berdasarkan waktu stempel dibuat, yang paling baru di atas)
        const newlyAdded = [...globalNames]
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            .slice(0, 7);
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

// 5. SISTEM PUBLISH (ANTI-REFRESH & TIMESTAMP)
let isProcessing = false;
let timerInterval;

function startOrResumeTimer() {
    const pendingName = localStorage.getItem('vaultPendingName');
    const startTime = localStorage.getItem('vaultStartTime');
    
    if (!pendingName || !startTime) return;

    isProcessing = true;
    document.getElementById('progress-container').style.display = 'block';
    
    const totalPublishTime = 5 * 60; 
    const totalTopTime = 10 * 60;    

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(async () => {
        const elapsed = Math.floor((Date.now() - parseInt(startTime)) / 1000);
        
        let pubLeft = totalPublishTime - elapsed;
        let topLeft = totalTopTime - elapsed;

        const timePublishEl = document.getElementById('time-publish');
        const fillPublishEl = document.getElementById('fill-publish');
        const timeTopEl = document.getElementById('time-top');
        const fillTopEl = document.getElementById('fill-top');

        if (pubLeft > 0) {
            timePublishEl.innerText = `${Math.floor(pubLeft/60)}:${(pubLeft%60).toString().padStart(2,'0')}`;
            fillPublishEl.style.width = `${(elapsed / totalPublishTime) * 100}%`;
        } else {
            timePublishEl.innerText = "SELESAI";
            timePublishEl.style.color = "#00f5ff";
            fillPublishEl.style.width = `100%`;
            
            if (!localStorage.getItem('vaultHasPublished')) {
                localStorage.setItem('vaultHasPublished', 'true'); 
                try {
                    // UPDATE: Stempel waktu ditambahkan di sini
                    await addDoc(collection(db, "names"), { name: pendingName, votes: 0, createdAt: Date.now() });
                    showToast(`✅ ${pendingName} berhasil masuk Vault Utama!`);
                } catch(e) { console.error(e); }
            }
        }

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
            
            localStorage.removeItem('vaultPendingName');
            localStorage.removeItem('vaultStartTime');
            localStorage.removeItem('vaultHasPublished');
            
            document.getElementById('waiting-msg').innerText = "✅ Semua Proses Sinkronisasi Selesai.";
        }

    }, 1000);
}

startOrResumeTimer();

document.getElementById('submit-btn').addEventListener('click', async () => {
    if(isProcessing) return showToast("⚠️ Protokol masih berjalan!");
    
    const input = document.getElementById('new-name-input');
    const nameValue = input.value.trim();
    if(!nameValue) return showToast("⚠️ Isi nama!");

    if(isAdmin) {
        try {
            // UPDATE: Stempel waktu ditambahkan di sini untuk Admin
            await addDoc(collection(db, "names"), { name: nameValue, votes: 0, createdAt: Date.now() });
            showToast(`⚡ ADMIN BYPASS: ${nameValue} dipublikasi!`);
            input.value = ""; 
        } catch(e) { showToast("❌ Error database."); }
        return;
    }

    localStorage.setItem('vaultPendingName', nameValue);
    localStorage.setItem('vaultStartTime', Date.now().toString());
    localStorage.removeItem('vaultHasPublished'); 
    
    input.value = "";
    showToast("⏳ Menambahkan ke antrean server...");
    
    startOrResumeTimer();
});
