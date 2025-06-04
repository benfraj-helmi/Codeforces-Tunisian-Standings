// Gestion de l'ajout de handles
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('add-handle-btn').addEventListener('click', async () => {
        const handleInput = document.getElementById('new-handle');
        const messageDiv = document.getElementById('handle-message');
        const newHandle = handleInput.value.trim();

        if (!newHandle) return;

        const result = await verifyAndAddHandle(newHandle);
        handleInput.value = '';

        switch (result.status) {
            case "added":
                messageDiv.textContent = `✅ ${newHandle} ajouté avec succès !`;
                messageDiv.style.color = 'green';
                if (typeof refreshStandings === 'function') refreshStandings();
                if (typeof refreshProblemStats === 'function') refreshProblemStats();
                break;

            case "exists":
                messageDiv.textContent = `⚠️ Le handle ${newHandle} existe déjà dans la liste.`;
                messageDiv.style.color = 'orange';
                break;

            case "not_tunisian":
                messageDiv.textContent = `❌ ${newHandle} est valide mais n'est pas un utilisateur tunisien.`;
                messageDiv.style.color = 'red';
                break;

            case "invalid":
            default:
                messageDiv.textContent = `❌ ${newHandle} est un handle invalide ou introuvable sur Codeforces.`;
                messageDiv.style.color = 'red';
                break;
        }

        setTimeout(() => {
            messageDiv.textContent = '';
        }, 4000);
    });
});

// Fonction pour obtenir la classe de rating
function getRatingClass(rating) {
    if (!rating) return 'user-gray';
    if (rating < 1200) return 'user-gray';
    if (rating < 1400) return 'user-green';
    if (rating < 1600) return 'user-cyan';
    if (rating < 1900) return 'user-blue';
    if (rating < 2100) return 'user-violet';
    if (rating < 2400) return 'user-orange';
    if (rating < 3500) return 'user-red';
    return 'user-black';
}
