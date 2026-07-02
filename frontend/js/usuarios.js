document.addEventListener('DOMContentLoaded', () => {
    const usuariosGrid = document.getElementById('usuariosGrid');
    const rolesList = document.getElementById('rolesList');
    const permisosBody = document.getElementById('permisosBody');
    const modal = document.getElementById('modalUsuario');
    let usuarios = [];
    let roles = {};
    let usuarioEditando = null;
    let modoPerfil = false;
    const PERMISOS_STORAGE_KEY = 'goldcontinent_role_permissions';

    const MODULOS = [
        ['dashboard', 'Dashboard'],
        ['productos', 'Catalogo'],
        ['importacion', 'Importacion de productos'],
        ['consulta_precios', 'Consulta de precios'],
        ['cotizaciones', 'Cotizaciones'],
        ['recomendaciones', 'Recomendaciones IA'],
        ['pdf', 'Generacion de PDF'],
        ['usuarios', 'Usuarios y roles']
    ];

    function iniciales(nombre) {
        return String(nombre || 'US').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function rolTexto(rol) {
        const labels = {
            admin: 'Administrador',
            gerente: 'Gerente',
            vendedor: 'Asesora de ventas'
        };
        return labels[rol] || rol;
    }

    function rolPerfil(rol) {
        const labels = {
            admin: 'Administrador',
            gerente: 'Gerente General',
            vendedor: 'Asesora de ventas'
        };
        return labels[rol] || rol;
    }

    function pintarPerfil() {
        const usuario = Auth.obtenerUsuario();
        document.getElementById('perfilAvatar').textContent = iniciales(usuario.nombre);
        document.getElementById('perfilNombre').textContent = usuario.nombre;
        document.getElementById('perfilRol').textContent = rolPerfil(usuario.rol);
        document.getElementById('perfilEmail').textContent = usuario.email;
    }

    function pintarUsuarios() {
        const q = document.getElementById('inputBuscarUsuario').value.trim().toLowerCase();
        const filtrados = usuarios.filter((u) => u.nombre.toLowerCase().includes(q));

        if (!filtrados.length) {
            usuariosGrid.innerHTML = '<p>No se encontraron usuarios.</p>';
            return;
        }

        usuariosGrid.innerHTML = filtrados.map((usuario) => `
            <article class="user-card">
                <span class="user-status ${usuario.activo ? '' : 'off'}"></span>
                <div class="user-avatar-card">${escapeHtml(iniciales(usuario.nombre))}</div>
                <strong>${escapeHtml(usuario.nombre)}</strong>
                <small>${escapeHtml(usuario.email)}</small><br>
                <span class="role-pill">${rolTexto(usuario.rol)}</span>
                <div class="user-actions">
                    <button data-edit="${usuario.id_usuario}"><i data-lucide="pencil"></i> Editar</button>
                    <button data-toggle="${usuario.id_usuario}"><i data-lucide="ban"></i> ${usuario.activo ? 'Deshabilitar' : 'Habilitar'}</button>
                </div>
            </article>
        `).join('');
        lucide.createIcons();
    }

    function pintarRoles(rolActivo = 'admin') {
        rolesList.innerHTML = Object.entries(roles).map(([key, rol]) => `
            <button class="role-option ${key === rolActivo ? 'active' : ''}" data-role="${key}">
                <strong>${escapeHtml(rol.nombre)}</strong>
                <span>${escapeHtml(rol.descripcion)}</span>
            </button>
        `).join('');
        pintarPermisos(rolActivo);
    }

    function pintarPermisos(rolKey) {
        const rol = roles[rolKey];
        document.getElementById('rolTitulo').textContent = `Permisos: ${rol.nombre}`;
        document.getElementById('rolDescripcion').textContent = rol.descripcion;

        permisosBody.innerHTML = MODULOS.map(([key, label]) => {
            const permiso = rol.permisos[key] || 'sin_acceso';
            return `
                <tr>
                    <td>${escapeHtml(label)}</td>
                    <td><input class="permission-check" name="${key}" value="sin_acceso" type="radio" ${permiso === 'sin_acceso' ? 'checked' : ''}></td>
                    <td><input class="permission-check" name="${key}" value="lectura" type="radio" ${permiso === 'lectura' ? 'checked' : ''}></td>
                    <td><input class="permission-check" name="${key}" value="edicion" type="radio" ${permiso === 'edicion' ? 'checked' : ''}></td>
                </tr>
            `;
        }).join('');
    }

    function cargarPermisosLocales() {
        try {
            const guardados = JSON.parse(localStorage.getItem(PERMISOS_STORAGE_KEY)) || {};
            Object.entries(guardados).forEach(([rolKey, permisos]) => {
                if (roles[rolKey]) roles[rolKey].permisos = { ...roles[rolKey].permisos, ...permisos };
            });
        } catch (_error) {
            localStorage.removeItem(PERMISOS_STORAGE_KEY);
        }
    }

    function guardarPermisosLocales() {
        const permisos = Object.fromEntries(
            Object.entries(roles).map(([rolKey, rol]) => [rolKey, rol.permisos])
        );
        localStorage.setItem(PERMISOS_STORAGE_KEY, JSON.stringify(permisos));
    }

    async function cargarDatos() {
        const [usuariosRes, rolesRes] = await Promise.all([
            Auth.fetchSeguro('/api/usuarios'),
            Auth.fetchSeguro('/api/usuarios/roles')
        ]);
        const usuariosJson = await usuariosRes.json();
        const rolesJson = await rolesRes.json();

        usuarios = usuariosJson.data || [];
        roles = rolesJson.data || {};
        cargarPermisosLocales();
        pintarPerfil();
        pintarUsuarios();
        pintarRoles();
    }

    function abrirModal(usuario = null, perfil = false) {
        usuarioEditando = usuario;
        modoPerfil = perfil;
        document.getElementById('modalUsuarioTitulo').textContent = perfil ? 'Editar Perfil' : (usuario ? 'Editar Usuario' : 'Agregar Usuario');
        document.getElementById('modalNombre').value = usuario?.nombre || '';
        document.getElementById('modalEmail').value = usuario?.email || '';
        document.getElementById('modalPassword').value = '';
        document.getElementById('modalPassword').placeholder = usuario ? 'Dejar vacio para mantener la actual' : 'Minimo 6 caracteres';
        document.getElementById('modalRol').value = usuario?.rol || 'vendedor';
        document.getElementById('modalActivo').checked = usuario?.activo ?? true;
        document.getElementById('passwordGroup').classList.toggle('hidden', perfil);
        document.getElementById('modalRol').parentElement.classList.toggle('hidden', perfil);
        document.getElementById('modalActivo').parentElement.classList.toggle('hidden', perfil);
        modal.classList.remove('hidden');
        lucide.createIcons();
    }

    function cerrarModal() {
        modal.classList.add('hidden');
        usuarioEditando = null;
        modoPerfil = false;
    }

    async function guardarUsuario() {
        const payload = {
            nombre: document.getElementById('modalNombre').value.trim(),
            email: document.getElementById('modalEmail').value.trim(),
            rol: document.getElementById('modalRol').value,
            activo: document.getElementById('modalActivo').checked
        };

        const password = document.getElementById('modalPassword').value.trim();
        if (password) payload.password = password;

        const url = modoPerfil
            ? '/api/usuarios/perfil'
            : usuarioEditando
                ? `/api/usuarios/${usuarioEditando.id_usuario}`
                : '/api/usuarios';
        const method = usuarioEditando || modoPerfil ? 'PUT' : 'POST';
        const res = await Auth.fetchSeguro(url, { method, body: JSON.stringify(payload) });
        const json = await res.json();

        if (!res.ok || !json.success) {
            alert(json.message || 'No se pudo guardar.');
            return;
        }

        if (modoPerfil) {
            const sesion = Auth.obtenerSesion();
            sesion.usuario = json.data;
            Auth.guardarSesion(sesion);
            Auth.pintarUsuario();
        }

        cerrarModal();
        await cargarDatos();
    }

    async function cambiarActivo(idUsuario) {
        const usuario = usuarios.find((u) => u.id_usuario === Number(idUsuario));
        if (!usuario) return;

        await Auth.fetchSeguro(`/api/usuarios/${idUsuario}`, {
            method: 'PUT',
            body: JSON.stringify({ ...usuario, activo: !usuario.activo })
        });
        await cargarDatos();
    }

    document.querySelectorAll('.tab-btn').forEach((button) => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach((item) => item.classList.remove('active'));
            button.classList.add('active');
            document.getElementById('tabUsuarios').classList.toggle('hidden', button.dataset.tab !== 'usuarios');
            document.getElementById('tabRoles').classList.toggle('hidden', button.dataset.tab !== 'roles');
        });
    });

    document.getElementById('btnEditarPerfil').addEventListener('click', () => abrirModal(Auth.obtenerUsuario(), true));
    document.getElementById('btnAgregarUsuario').addEventListener('click', () => abrirModal());
    document.getElementById('inputBuscarUsuario').addEventListener('input', pintarUsuarios);
    document.getElementById('cerrarModalUsuario').addEventListener('click', cerrarModal);
    document.getElementById('cancelarModalUsuario').addEventListener('click', cerrarModal);
    document.getElementById('guardarModalUsuario').addEventListener('click', guardarUsuario);
    usuariosGrid.addEventListener('click', (event) => {
        const edit = event.target.closest('[data-edit]');
        const toggle = event.target.closest('[data-toggle]');
        if (edit) abrirModal(usuarios.find((u) => u.id_usuario === Number(edit.dataset.edit)));
        if (toggle) cambiarActivo(toggle.dataset.toggle);
    });
    rolesList.addEventListener('click', (event) => {
        const roleButton = event.target.closest('[data-role]');
        if (!roleButton) return;
        document.querySelectorAll('.role-option').forEach((item) => item.classList.remove('active'));
        roleButton.classList.add('active');
        pintarPermisos(roleButton.dataset.role);
    });
    permisosBody.addEventListener('change', (event) => {
        const input = event.target.closest('.permission-check');
        const roleButton = document.querySelector('.role-option.active');
        if (!input || !roleButton) return;
        roles[roleButton.dataset.role].permisos[input.name] = input.value;
        guardarPermisosLocales();
    });

    cargarDatos().catch((error) => alert(error.message));
});
