document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('.login-form');
    const emailInput = document.querySelector('#email');
    const passwordInput = document.querySelector('#password');
    const btnSubmit = document.querySelector('.btn-submit');
    const togglePassword = document.querySelector('#togglePassword');
    const eyeIcon = document.querySelector('#eyeIcon');

    let intentosFallidos = 0;
    const MAX_INTENTOS = 3;

    if (localStorage.getItem('goldcontinent_auth')) {
        window.location.href = 'dashboard.html';
        return;
    }

    if (togglePassword && passwordInput && eyeIcon) {
        togglePassword.addEventListener('click', () => {
            const esPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', esPassword ? 'text' : 'password');
            eyeIcon.src = esPassword ? '../assets/eye.png' : '../assets/eye-off.png';
        });
    }

    async function autenticarUsuario(email, password) {
        try {
            const respuesta = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const resultado = await respuesta.json();

            if (!respuesta.ok || !resultado.success) {
                return {
                    success: false,
                    message: resultado.message || 'Credenciales incorrectas.'
                };
            }

            return {
                success: true,
                data: resultado.data
            };
        } catch (error) {
            console.error('Error de conexion con el servidor:', error);
            return {
                success: false,
                message: 'No se pudo conectar con el servidor.'
            };
        }
    }

    if (!loginForm) return;

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const emailValue = emailInput.value.trim().toLowerCase();
        const passwordValue = passwordInput.value.trim();

        if (!emailValue || !passwordValue) {
            alert('Por favor, complete todos los campos obligatorios.');
            return;
        }

        if (intentosFallidos >= MAX_INTENTOS) {
            alert('Acceso bloqueado. Por seguridad, comuniquese con administracion.');
            return;
        }

        btnSubmit.disabled = true;
        btnSubmit.innerText = 'VALIDANDO...';

        const resultadoLogin = await autenticarUsuario(emailValue, passwordValue);

        if (resultadoLogin.success) {
            intentosFallidos = 0;
            localStorage.setItem('goldcontinent_auth', JSON.stringify(resultadoLogin.data));
            window.location.href = 'dashboard.html';
            return;
        }

        intentosFallidos++;
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'INGRESAR';

        if (intentosFallidos >= MAX_INTENTOS) {
            btnSubmit.disabled = true;
            btnSubmit.classList.add('is-blocked');
            btnSubmit.innerText = 'BLOQUEADO';
            alert('Has superado el limite de 3 intentos. Tu cuenta ha sido bloqueada temporalmente.');
            return;
        }

        const intentosRestantes = MAX_INTENTOS - intentosFallidos;
        alert(`${resultadoLogin.message} Te quedan ${intentosRestantes} ${intentosRestantes === 1 ? 'intento' : 'intentos'}.`);
    });
});
