const AUTH_STORAGE_KEY = 'goldcontinent_auth';

const Auth = {
    guardarSesion(data) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
    },

    obtenerSesion() {
        try {
            return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY));
        } catch (_error) {
            return null;
        }
    },

    obtenerToken() {
        return this.obtenerSesion()?.token || null;
    },

    obtenerUsuario() {
        return this.obtenerSesion()?.usuario || null;
    },

    estaAutenticado() {
        return Boolean(this.obtenerToken());
    },

    cerrarSesion() {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        window.location.href = '/pages/login.html';
    },

    async fetchSeguro(url, options = {}) {
        const token = this.obtenerToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const respuesta = await fetch(url, {
            ...options,
            headers
        });

        if (respuesta.status === 401) {
            this.cerrarSesion();
        }

        return respuesta;
    },

    protegerPagina(rolesPermitidos = []) {
        const sesion = this.obtenerSesion();

        if (!sesion?.token || !sesion?.usuario) {
            window.location.href = '/pages/login.html';
            return;
        }

        if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(sesion.usuario.rol)) {
            window.location.href = '/pages/dashboard.html';
        }
    },

    pintarUsuario() {
        const usuario = this.obtenerUsuario();
        if (!usuario) return;
        const roles = {
            admin: 'Administrador',
            gerente: 'Gerente',
            vendedor: 'Asesora de ventas'
        };

        document.querySelectorAll('.nav-role, .user-role, #userRole').forEach((elemento) => {
            elemento.textContent = roles[usuario.rol] || usuario.rol;
        });

        document.querySelectorAll('#userName').forEach((elemento) => {
            elemento.textContent = usuario.nombre;
        });

        document.querySelectorAll('#userAvatar').forEach((elemento) => {
            elemento.textContent = usuario.nombre
                .split(' ')
                .map((parte) => parte[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
        });

        if (!['admin', 'gerente'].includes(usuario.rol)) {
            document.querySelectorAll('a[href$="usuarios.html"]').forEach((elemento) => {
                elemento.style.display = 'none';
            });
        }
    },

    prepararLogout() {
        document.querySelectorAll('.logout-link, .logout-btn').forEach((elemento) => {
            elemento.addEventListener('click', (event) => {
                event.preventDefault();
                this.cerrarSesion();
            });
        });
    }
};

window.Auth = Auth;
window.cerrarSesion = () => Auth.cerrarSesion();
