const API_DELAY = 1000; // Délai entre les requêtes API
let lastRequestTime = 0;

async function fetchContestStandings(contestId, showUnofficial) {
    const now = Date.now();
    if (now - lastRequestTime < API_DELAY) {
        await new Promise(resolve => setTimeout(resolve, API_DELAY - (now - lastRequestTime)));
    }

    try {
        const response = await fetch(
            `https://codeforces.com/api/contest.standings?contestId=${contestId}&showUnofficial=${showUnofficial}`
        );
        lastRequestTime = Date.now();

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        return data.status === "OK" ? data.result : null;
    } catch (error) {
        console.error("Erreur API:", error);
        return null;
    }
}


async function fetchUserInfo(handles) {
    try {
        const response = await fetch(`https://codeforces.com/api/user.info?handles=${handles.join(';')}`);
        const data = await response.json();
        return data.status === "OK" ? data.result : [];
    } catch (error) {
        console.error("Erreur user info:", error);
        return [];
    }
}

function displayStandings(standings, userInfoMap, organizationFilter, participationFilter) {
    const orgFilter = document.getElementById('organization-filter');
    const organizations = new Set();
    filteredRows = []; // Réinitialiser les lignes filtrées

    standings.rows.forEach(row => {
        const mainMember = row.party.members[0];
        if (!tunisianHandles.includes(mainMember.handle)) return;

        const userInfo = userInfoMap[mainMember.handle] || {};
        const isOfficial = row.party.participantType === 'CONTESTANT';

        if (userInfo && userInfo.organization) {
            organizations.add(userInfo.organization);
        }

        // Appliquer les filtres
        if (organizationFilter !== 'all' && userInfo.organization !== organizationFilter) return;
        if (participationFilter === 'official' && !isOfficial) return;
        if (participationFilter === 'unofficial' && isOfficial) return;

        filteredRows.push({ row, userInfo, isOfficial });
    });

    // Mettre à jour les options du filtre si nécessaire
    organizations.forEach(org => {
        if (!Array.from(orgFilter.options).some(option => option.value === org)) {
            const option = document.createElement('option');
            option.value = org;
            option.textContent = org;
            orgFilter.appendChild(option);
        }
    });

    renderPage(1); // Afficher la première page
}
let currentPage = 1;
const rowsPerPage = 25;
let filteredRows = []; // Pour stocker les lignes filtrées après application des filtres

async function refreshStandings() {
    const contestId = document.getElementById('contest-id').value;
    if (!contestId) return;

    const loading = document.getElementById('loading');
    loading.classList.remove('hidden');

    try {
        const participationFilter = document.getElementById('participation-filter').value;

        // ⚠️ Choisir la bonne valeur de showUnofficial
        const showUnofficial = participationFilter !== 'official';

        const standings = await fetchContestStandings(contestId, showUnofficial);
        if (!standings) return;

        const handles = standings.rows
            .map(row => row.party.members[0].handle)
            .filter(handle => tunisianHandles.includes(handle));

        const userInfo = await fetchUserInfo(handles);
        const userInfoMap = {};
        userInfo.forEach(user => {
            userInfoMap[user.handle] = user;
        });

        const orgFilter = document.getElementById('organization-filter').value;

        displayStandings(standings, userInfoMap, orgFilter, participationFilter);
    } catch (error) {
        console.error(error);
    } finally {
        loading.classList.add('hidden');
    }
}

function renderPage(page) {
    currentPage = page;
    const tbody = document.querySelector('#standings-table tbody');
    tbody.innerHTML = '';

    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    filteredRows.slice(start, end).forEach((entry, index) => {
        const { row, userInfo, isOfficial } = entry;
        const mainMember = row.party.members[0];
        const rankClass = row.rank <= 3 ? `rank-${row.rank}` : '';
        const officialRank = isOfficial ? row.rank : '-';
        const ratingClass = getRatingClass(userInfo.rating);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
        <strong>
            ${
                start + index === 0 ? '🥇' :
                start + index === 1 ? '🥈' :
                start + index === 2 ? '🥉' :
                start + index + 1
            }
        </strong>
    </td>
            <td class="${rankClass}">${officialRank}</td>
            <td class="user-handle">
                <img src="https://flagcdn.com/w40/tn.png" alt="Tunisia flag" class="flag-icon">
                <a href="https://codeforces.com/profile/${mainMember.handle}" target="_blank" class="${ratingClass}">
                    <i class="fas fa-user"></i> ${mainMember.handle}
                </a>
            </td>
            <td>${userInfo.organization || 'N/A'}</td>
            <td><strong>${row.points.toFixed(2)}</strong></td>
        `;
        tbody.appendChild(tr);
    });

    renderPagination();
}
function renderPagination() {
    const container = document.getElementById('pagination');
    container.innerHTML = '';

    const totalPages = Math.ceil(filteredRows.length / rowsPerPage);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = 'pagination-btn' + (i === currentPage ? ' active' : '');
        btn.onclick = () => renderPage(i);
        container.appendChild(btn);
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('fetch-standings').addEventListener('click', refreshStandings);
    document.getElementById('organization-filter').addEventListener('change', refreshStandings);
    document.getElementById('participation-filter').addEventListener('change', refreshStandings);
});
