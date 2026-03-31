// Menampilkan Notifikasi
export function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// Mengganti Menu (Bisa dari Sidebar PC atau Bottom Nav HP)
export function switchTab(targetId) {
    // Sembunyikan semua section
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');

    // Update style tombol PC
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === targetId);
    });

    // Update style tombol HP
    document.querySelectorAll('.mob-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === targetId);
    });

    // Bersihkan pencarian jika pindah tab
    if(targetId !== 'all-section') {
        document.getElementById('search-input').value = "";
    }
}

// Merender Daftar Nama ke Layar
export function renderNamesList(dataArray, containerId, isLeaderboard = false) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    dataArray.forEach((item, index) => {
        let prefix = "";
        if (isLeaderboard) {
            let color = "var(--text-muted)";
            if (index === 0) color = "#ffd700";
            else if (index === 1) color = "#c0c0c0";
            else if (index === 2) color = "#cd7f32";
            prefix = `<span style="color:${color}; font-weight:800; margin-right:15px;">#${index + 1}</span>`;
        }

        const card = document.createElement('div');
        card.className = 'name-card';
        card.innerHTML = `
            <div style="font-size: 1.1rem; font-weight: 600;">${prefix}${item.name}</div>
            <button class="vote-btn" data-id="${item.id}" data-votes="${item.votes}" data-name="${item.name}">
                Appreciate (${item.votes})
            </button>
        `;
        container.appendChild(card);
    });
}
