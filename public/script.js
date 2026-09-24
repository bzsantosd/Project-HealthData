document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const profileInput = document.getElementById('profile');
    const accessTitle = document.getElementById('accessTitle');
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('passwordToggle');
    const profileTitles = {
        adm: 'Acesso Administrativo',
        amb: 'Acesso do Ambulatório',
        fun: 'Acesso do Funcionário'
    };

    passwordToggle?.addEventListener('click', () => {
        const shouldShowPassword = passwordInput?.type === 'password';
        if (passwordInput) passwordInput.type = shouldShowPassword ? 'text' : 'password';
        passwordToggle.setAttribute('aria-label', shouldShowPassword ? 'Ocultar senha' : 'Mostrar senha');
        passwordToggle.setAttribute('aria-pressed', String(shouldShowPassword));
        passwordToggle.classList.toggle('is-visible', shouldShowPassword);
    });

    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const selectedProfile = tab.dataset.profile;
            if (profileInput) profileInput.value = selectedProfile;
            if (accessTitle) accessTitle.textContent = profileTitles[selectedProfile];

            document.querySelectorAll('.profile-tab').forEach(item => {
                const isActive = item === tab;
                item.classList.toggle('active', isActive);
                item.setAttribute('aria-selected', String(isActive));
            });
        });
    });

    if (!loginForm) return;

    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const username = document.getElementById('username')?.value.trim();
        const password = document.getElementById('password')?.value.trim();
        const profile = profileInput?.value;
        const errorMessage = document.getElementById('errorMessage');

        if (errorMessage) errorMessage.style.display = 'none';

        try {
            const response = await fetch('/api/login', {
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

                const redirectRoutes = {
                    adm: '/admin/',
                    amb: '/ambulatorio/',
                    fun: '/funcionario/'
                };

                const redirectRoute = redirectRoutes[data.profile];
                if (!redirectRoute) {
                    showError('Perfil de acesso inválido.');
                    return;
                }

                window.location.assign(redirectRoute);
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