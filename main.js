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
        // TOP 5 RECOMMENDED (Berdasarkan Vote Tertinggi)
        const recommended = [...globalNames].sort((a, b) => b.votes - a.votes).slice(0, 5);
        renderNamesList(recommended, 'recommended-list', true);

        // 7 NEW PUBLISH (Berdasarkan urutan masuk/index terakhir)
        // Karena Firestore tidak ada timestamp default, kita ambil 7 terakhir dari array
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

// 4. ADMIN & SUBMIT (LOGIC SAMA)
document.getElementById('admin-trigger').addEventListener('click', () => {
    secretClicks++;
    clearTimeout(secretTimeout);
    if(secretClicks >= 4) { isAdmin = true; showToast("🔐 Admin Mode Engaged."); secretClicks = 0; }
    else { secretTimeout = setTimeout(() => { secretClicks = 0; }, 400); }
});

let isProcessing = false;
document.getElementById('submit-btn').addEventListener('click', async () => {
    if(isProcessing) return;
    const input = document.getElementById('new-name-input');
    const name = input.value.trim();
    if(!name) return showToast("⚠️ Isi nama!");

    if(isAdmin) {
        await addDoc(collection(db, "names"), { name, votes: 0 });
        showToast(`⚡ Published: ${name}`);
        input.value = ""; return;
    }

    isProcessing = true;
    document.getElementById('progress-container').style.display = 'block';
    let t = 300;
    const interval = setInterval(async () => {
        t--;
        if(t >= 0) {
            document.getElementById('time-publish').innerText = `${Math.floor(t/60)}:${(t%60).toString().padStart(2,'0')}`;
            document.getElementById('fill-publish').style.width = `${((300-t)/300)*100}%`;
        } else {
            clearInterval(interval);
            await addDoc(collection(db, "names"), { name, votes: 0 });
            showToast("✅ Berhasil masuk Vault!");
            isProcessing = false; input.value = "";
        }
    }, 1000);
});
