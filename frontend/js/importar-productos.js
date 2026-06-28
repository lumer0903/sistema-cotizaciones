document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('csvFileInput');
    const dropZoneTitle = document.getElementById('dropZoneTitle');
    const btnImportar = document.getElementById('btnImportar');
    const resultado = document.getElementById('resultadoImportacion');

    let archivoSeleccionado = null;

    function pintarArchivo(file) {
        archivoSeleccionado = file;
        dropZoneTitle.textContent = file ? file.name : 'Arrastra o selecciona el archivo';
        btnImportar.disabled = !file;
        dropZone.classList.toggle('has-file', Boolean(file));
    }

    function pintarResultado(data) {
        const errores = data.errores || [];
        resultado.className = errores.length ? 'result-box has-warning' : 'result-box has-success';
        resultado.innerHTML = `
            <div class="result-stats">
                <div><strong>${data.agregados}</strong><span>Agregados</span></div>
                <div><strong>${data.actualizados}</strong><span>Actualizados</span></div>
                <div><strong>${data.omitidos}</strong><span>Omitidos</span></div>
            </div>
            ${errores.length ? `
                <ul class="result-errors">
                    ${errores.slice(0, 5).map((error) => `<li>${error}</li>`).join('')}
                </ul>
            ` : '<p>Importacion completada correctamente.</p>'}
        `;
    }

    function pintarError(message) {
        resultado.className = 'result-box has-error';
        resultado.innerHTML = `<p>${message}</p>`;
    }

    fileInput.addEventListener('change', (event) => {
        pintarArchivo(event.target.files[0] || null);
    });

    dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropZone.classList.add('is-dragging');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('is-dragging');
    });

    dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropZone.classList.remove('is-dragging');

        const file = event.dataTransfer.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.csv')) {
            pintarError('Selecciona un archivo con extension .csv.');
            pintarArchivo(null);
            return;
        }

        pintarArchivo(file);
    });

    btnImportar.addEventListener('click', async () => {
        if (!archivoSeleccionado) return;

        btnImportar.disabled = true;
        btnImportar.textContent = 'Importando...';
        resultado.className = 'result-box is-empty';
        resultado.innerHTML = '<p>Procesando archivo...</p>';

        const formData = new FormData();
        formData.append('archivo', archivoSeleccionado);

        try {
            const respuesta = await fetch('/api/productos/importar', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${Auth.obtenerToken()}`
                },
                body: formData
            });
            const json = await respuesta.json();

            if (!respuesta.ok || !json.success) {
                pintarError(json.message || 'No se pudo importar el archivo.');
                return;
            }

            pintarResultado(json.data);
        } catch (error) {
            pintarError(error.message || 'No se pudo conectar con el servidor.');
        } finally {
            btnImportar.disabled = false;
            btnImportar.textContent = 'Importar';
        }
    });
});
