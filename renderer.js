export function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

export function switchTab(targetId) {
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    document.querySelectorAll('.nav-btn, .mob-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === targetId);
    });
}

export function renderNamesList(dataArray, containerId, isLeaderboard = false) {
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = '';

    dataArray.forEach((item, index) => {
        let prefix = "";
        if (isLeaderboard) {
            let color = index === 0 ? "#ffd700" : (index === 1 ? "#c0c0c0" : (index === 2 ? "#cd7f32" : "#8b9bb4"));
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

// Update Angka Total di Header
export function updateTotalUI(count) {
    const el = document.getElementById('total-count');
    if(el) el.innerText = `Total: ${count}`;
}
