document.addEventListener('DOMContentLoaded', () => {
    function actualizarColorTipoCliente() {
        const select = document.getElementById('nuevoTipoCliente');
        select.classList.toggle('is-store', select.value === 'normal');
        select.classList.toggle('is-distributor', select.value === 'distribuidor');
    }

    async function crearCotizacion() {
        const payload = {
            cliente_nombre: document.getElementById('nuevoCliente').value.trim(),
            email: document.getElementById('nuevoEmail').value.trim(),
            telefono: document.getElementById('nuevoTelefono').value.trim(),
            ruc_dni: document.getElementById('nuevoTipoDocumento').value,
            documento_numero: document.getElementById('nuevoDocumentoNumero').value.trim(),
            tipo_precio: document.getElementById('nuevoTipoCliente').value
        };
        payload.ruc_dni = payload.documento_numero
            ? `${payload.ruc_dni}: ${payload.documento_numero}`
            : '';

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
    }

    document.getElementById('crearNuevaCotizacion').addEventListener('click', crearCotizacion);
    document.getElementById('nuevoTipoCliente').addEventListener('change', actualizarColorTipoCliente);
    actualizarColorTipoCliente();
});
