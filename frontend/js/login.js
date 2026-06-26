function togglePassword() {
    const input = document.getElementById('password');
    input.type = input.type === 'password' ? 'text' : 'password';
}

async function iniciarSesion() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const error = document.getElementById('mensajeError');

    error.classList.add('hidden');

    if (!email || !password) {
        error.textContent = 'Completa todos los campos';
        error.classList.remove('hidden');
        return;
    }

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
            window.location.href = '/pages/dashboard.html';
        } else {
            error.textContent = data.error || 'Credenciales incorrectas';
            error.classList.remove('hidden');
        }
    } catch (err) {
        error.textContent = 'Error al conectar con el servidor';
        error.classList.remove('hidden');
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') iniciarSesion();
});