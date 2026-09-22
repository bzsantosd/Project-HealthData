document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    if (!loginForm) return;

    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const username = document.getElementById('username')?.value.trim();
        const password = document.getElementById('password')?.value.trim();
        const profile = document.getElementById('profile')?.value;
        const errorMessage = document.getElementById('errorMessage');

        if (errorMessage) errorMessage.style.display = 'none';

        try {
            // Requisição com a URL completa apontando para a porta 3000 do Node
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, profile })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                sessionStorage.setItem('userProfile', data.profile);
                sessionStorage.setItem('username', username);

                // Redirecionamento forçado para a porta 3000 do Node.js
                const redirectRoutes = {
                    'adm': 'http://localhost:3000/admin',
                    'amb': 'http://localhost:3000/ambulatorio',
                    'fun': 'http://localhost:3000/funcionario'
                };

                window.location.href = redirectRoutes[data.profile] || 'http://localhost:3000/';
            } else {
                showError(data.message || 'Credenciais inválidas.');
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
            showError('Não foi possível conectar ao servidor. Verifique se o Node.js está a rodar.');
        }
    });

    function showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        } else {
            alert(message);
        }
    }
});