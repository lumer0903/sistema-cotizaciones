document.addEventListener('DOMContentLoaded', () => {
    const tipoCliente = document.getElementById('nuevoTipoCliente');
    const crearBtn = document.getElementById('crearNuevaCotizacion');

    function actualizarColorTipoCliente() {
        tipoCliente.classList.toggle('is-store', tipoCliente.value === 'normal');
        tipoCliente.classList.toggle('is-distributor', tipoCliente.value === 'distribuidor');
    }

    function validarRequeridos() {
        const campos = [
            document.getElementById('nuevoCliente'),
            document.getElementById('nuevoEmail'),
            document.getElementById('nuevoTelefono'),
            document.getElementById('nuevoDocumentoNumero')
        ];
        let valido = true;

        campos.forEach((campo) => {
            const vacio = !campo.value.trim();
            campo.classList.toggle('input-error', vacio);
            if (vacio) valido = false;
        });

        if (!valido) {
            alert('Completa todos los campos requeridos antes de continuar.');
        }

        return valido;
    }

    async function crearCotizacion() {
        if (!validarRequeridos()) return;

        const tipoDocumento = document.getElementById('nuevoTipoDocumento').value;
        const numeroDocumento = document.getElementById('nuevoDocumentoNumero').value.trim();
        const payload = {
            cliente_nombre: document.getElementById('nuevoCliente').value.trim(),
            email: document.getElementById('nuevoEmail').value.trim(),
            telefono: document.getElementById('nuevoTelefono').value.trim(),
            ruc_dni: numeroDocumento ? `${tipoDocumento}: ${numeroDocumento}` : '',
            tipo_precio: tipoCliente.value
        };

        crearBtn.disabled = true;
        crearBtn.textContent = 'Creando...';

        try {
            const respuesta = await Auth.fetchSeguro('/api/cotizaciones', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const json = await respuesta.json();

            if (!respuesta.ok || !json.success) {
                alert(json.message || 'No se pudo crear la cotizacion.');
                return;
            }

            window.location.href = `/pages/cotizacion-detalle.html?id=${json.data.id_cotizacion}`;
        } finally {
            crearBtn.disabled = false;
            crearBtn.innerHTML = '<i data-lucide="arrow-right"></i>Continuar';
            lucide.createIcons();
        }
    }

    tipoCliente.addEventListener('change', actualizarColorTipoCliente);
    document.querySelectorAll('#nuevoCliente, #nuevoEmail, #nuevoTelefono, #nuevoDocumentoNumero').forEach((campo) => {
        campo.addEventListener('input', () => campo.classList.remove('input-error'));
    });
    crearBtn.addEventListener('click', crearCotizacion);
    actualizarColorTipoCliente();
});
