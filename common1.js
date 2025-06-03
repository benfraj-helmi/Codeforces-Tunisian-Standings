// Gestion de l'ajout de handles
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('add-handle-btn').addEventListener('click', async () => {
        const handleInput = document.getElementById('new-handle');
        const messageDiv = document.getElementById('handle-message');
        const newHandle = handleInput.value.trim();
        
        if (!newHandle) return;
        
        const success = await verifyAndAddHandle(newHandle);
        if (success) {
            messageDiv.textContent = `✅ ${newHandle} ajouté avec succès!`;
            messageDiv.style.color = 'green';
            handleInput.value = '';
            
            // Recharger les données si nécessaire
            if (typeof refreshStandings === 'function') refreshStandings();
            if (typeof refreshProblemStats === 'function') refreshProblemStats();
        } else {
            messageDiv.textContent = "❌ Handle invalide ou non tunisien";
            messageDiv.style.color = 'red';
        }
        
        setTimeout(() => {
            messageDiv.textContent = '';
        }, 3000);
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