const problemStatsCache = {};
const userInfoCache = {};
const MAX_PARALLEL_REQUESTS = 3;
const ITEMS_PER_PAGE = 20;
let currentPage = 1;
let currentData = [];

const requestQueue = {
    queue: [],
    inProgress: 0,
    maxConcurrent: MAX_PARALLEL_REQUESTS,
    delay: 1200,
    async add(request) {
        return new Promise((resolve) => {
            this.queue.push({ request, resolve });
            this.process();
        });
    },
    async process() {
        if (this.inProgress >= this.maxConcurrent || this.queue.length === 0) return;
        this.inProgress++;
        const { request, resolve } = this.queue.shift();
        try {
            const result = await request();
            resolve(result);
        } catch {
            resolve(null);
        } finally {
            this.inProgress--;
            setTimeout(() => this.process(), this.delay);
        }
    }
};

async function fetchWithRetry(url, retries = 3) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url);
            if (response.status === 429) {
                const retryAfter = parseInt(response.headers.get('Retry-After')) || 2;
                await new Promise(r => setTimeout(r, retryAfter * 1000));
                continue;
            }
            if (!response.ok) {
                if (response.status >= 400 && response.status < 500) return { status: "FAILED" };
                throw new Error();
            }
            return await response.json();
        } catch {
            if (attempt === retries) return { status: "FAILED" };
            await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        }
    }
}

async function fetchUserProblems(handle) {
    if (problemStatsCache[handle]) return problemStatsCache[handle];
    const url = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}`;
    const data = await requestQueue.add(() => fetchWithRetry(url));
    if (data && data.status === "OK") {
        problemStatsCache[handle] = data.result;
        return data.result;
    }
    problemStatsCache[handle] = [];
    return [];
}

async function fetchUserInfo(handle) {
    if (userInfoCache[handle]) return userInfoCache[handle];
    const url = `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`;
    const data = await requestQueue.add(() => fetchWithRetry(url));
    if (data && data.status === "OK" && data.result.length > 0) {
        userInfoCache[handle] = data.result[0];
        return data.result[0];
    }
    userInfoCache[handle] = { organization: "N/A", rating: "N/A" };
    return userInfoCache[handle];
}

function filterSubmissionsByPeriod(subs, period) {
    const now = Date.now();
    return subs.filter(sub => {
        const t = sub.creationTimeSeconds * 1000;
        if (period === 'last12months') return t > now - 365 * 24 * 3600 * 1000;
        if (period === 'last30days') return t > now - 30 * 24 * 3600 * 1000;
        if (period === 'today') return t > now - 24 * 3600 * 1000;
        return true;
    });
}

function countUniqueProblems(subs) {
    const set = new Set();
    subs.forEach(s => {
        if (s.verdict === 'OK' && s.problem.contestId)
            set.add(`${s.problem.contestId}-${s.problem.index}`);
    });
    return set.size;
}

function getRatingClass(rating) {
    if (!rating) return "rating-newbie";
    if (rating >= 3000) return "rating-legendary";
    if (rating >= 2600) return "rating-international";
    if (rating >= 2400) return "rating-grandmaster";
    if (rating >= 2300) return "rating-international";
    if (rating >= 2100) return "rating-master";
    if (rating >= 1900) return "rating-candidate";
    if (rating >= 1600) return "rating-expert";
    if (rating >= 1400) return "rating-specialist";
    if (rating >= 1200) return "rating-pupil";
    return "rating-newbie";
}

async function getUserStats(handle, period) {
    const subs = await fetchUserProblems(handle);
    const filtered = filterSubmissionsByPeriod(subs, period);
    const solved = countUniqueProblems(filtered);
    const info = await fetchUserInfo(handle);
    return { handle, solved, organization: info.organization, rating: info.rating };
}

function insertAndSort(newEntry) {
    currentData.push(newEntry);
    currentData.sort((a, b) => b.solved - a.solved);
    renderPage(currentData, currentPage);
    renderPagination(currentData);
}

function renderPage(data, page) {
    const tbody = document.querySelector('#problems-table tbody');
    tbody.innerHTML = '';
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = Math.min(start + ITEMS_PER_PAGE, data.length);
    data.slice(start, end).forEach((user, index) => {
        const rating = user.rating ?? 0;
        const ratingClass = getRatingClass(rating);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>
                    ${start + index === 0 ? '🥇' :
                      start + index === 1 ? '🥈' :
                      start + index === 2 ? '🥉' :
                      start + index + 1}
                </strong>
            </td>
            <td class="user-handle">
                <img src="https://flagcdn.com/w40/tn.png" alt="TN" class="flag-icon">
                <a href="https://codeforces.com/profile/${user.handle}" target="_blank" 
                   rel="noopener noreferrer" class="${ratingClass}">
                    <i class="fas fa-user"></i> ${user.handle}
                </a>
            </td>
            <td>${user.organization || 'N/A'}</td>
            <td>${user.rating}</td>
            <td><strong>${user.solved}</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderPagination(data) {
    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
    const container = document.getElementById('pagination-container');
    container.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = 'pagination-btn' + (i === currentPage ? ' active' : '');
        btn.addEventListener('click', () => {
            currentPage = i;
            renderPage(data, currentPage);
            renderPagination(data);
        });
        container.appendChild(btn);
    }
}

async function refreshProblemStats() {
    document.getElementById('loading-indicator').style.display = 'block';
    document.getElementById('progress-container').style.display = 'block';
    document.getElementById('load-btn').disabled = true;

    const periodMap = {
        "tous": "all",
        "last12months": "last12months",
        "last30days": "last30days",
        "today": "today"
    };
    const periodKey = document.getElementById('period-select').value;
    const period = periodMap[periodKey] || "all";

    const tbody = document.querySelector('#problems-table tbody');
    tbody.innerHTML = '';
    currentData = [];

    const totalHandles = tunisianHandles.length;
    let processed = 0;

    for (const handle of tunisianHandles) {
        try {
            const stat = await getUserStats(handle, period);
            insertAndSort(stat);
        } catch {}
        processed++;
        const progress = Math.min(100, Math.round((processed / totalHandles) * 100));
        document.getElementById('progress-bar').style.width = `${progress}%`;
        document.getElementById('progress-text').textContent = `${progress}%`;
    }

    document.getElementById('loading-indicator').style.display = 'none';
    document.getElementById('progress-container').style.display = 'none';
    document.getElementById('load-btn').disabled = false;
}

// À connecter dans ton HTML : bouton #load-btn
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('load-btn').addEventListener('click', refreshProblemStats);
});
