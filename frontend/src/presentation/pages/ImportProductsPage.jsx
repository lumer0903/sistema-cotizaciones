import { useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, FileCheck2, UploadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiJson } from '../../infrastructure/http/apiClient';
import { AppLayout } from '../components/AppLayout';

export function ImportProductsPage() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  function select(selectedFile) {
    setError('');
    setResult(null);
    if (!selectedFile) return;
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      return setError('El archivo seleccionado debe tener formato CSV.');
    }
    setFile(selectedFile);
  }

  async function upload() {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/productos/importar', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al procesar la importación.');
      setResult(data);
      setFile(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout title="Importar productos">
      <div className="max-w-4xl mx-auto space-y-6 select-none animate-in">
        {/* Card Contenedor */}
        <div className="bg-white border border-[#d9d9d9] rounded-2xl p-8 shadow-xs">
          {/* Cabecera */}
          <div className="flex items-start justify-between border-b border-[#d9d9d9] pb-6 mb-8">
            <div>
              <h2 className="text-base font-bold text-[#414141] tracking-tight">Importación masiva</h2>
              <p className="text-xs text-neutral-455 mt-1 leading-relaxed">
                Sube un archivo CSV con la información de tus productos para actualizarlos o agregarlos
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Sección de Carga */}
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase block">
                  Subir archivo
                </span>
                <label 
                  className={`
                    flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-150
                    ${file 
                      ? 'border-[#7b1c1c] bg-[#fdf2f2]' 
                      : dragging 
                        ? 'border-[#7b1c1c] bg-[#fdf2f2]/60' 
                        : 'border-[#d9d9d9] hover:border-[#7b1c1c] hover:bg-[#fdf2f2]/25'}
                  `}
                  onDragOver={event => { event.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={event => { event.preventDefault(); setDragging(false); select(event.dataTransfer.files[0]); }}
                >
                  <input type="file" accept=".csv,text/csv" hidden onChange={event => select(event.target.files[0])} />
                  <UploadCloud className={`h-8 w-8 ${file ? 'text-[#7b1c1c]' : 'text-neutral-400'}`} />
                  <div className="space-y-1">
                    <strong className="text-xs font-semibold text-[#414141] block">
                      {file?.name || 'Selecciona un archivo'}
                    </strong>
                    <span className="text-[10px] text-neutral-450 block">
                      Solo formato de hoja de cálculo .csv
                    </span>
                  </div>
                </label>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center gap-3">
                <Link
                  to="/productos"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#d9d9d9] bg-white px-4 py-2.5 text-xs font-semibold text-[#414141] hover:bg-[#f8fafc] transition-all shadow-2xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Volver</span>
                </Link>
                <button
                  disabled={!file || loading}
                  onClick={upload}
                  className="flex-1 rounded-xl bg-[#7b1c1c] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#601414] transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Procesando archivo...' : 'Importar catálogo'}
                </button>
              </div>
            </div>

            {/* Sección de Resultados */}
            <div className="space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase block">
                  Auditoría de Importación
                </span>

                {/* Caja de Estado */}
                <div className={`
                  rounded-2xl border p-5 text-xs min-h-[160px] flex flex-col justify-center
                  ${error 
                    ? 'bg-red-50/50 border-red-100 text-red-700' 
                    : result?.errores?.length 
                      ? 'bg-amber-50/50 border-amber-100 text-amber-700' 
                      : result 
                        ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700' 
                        : 'bg-[#f8fafc] border-[#d9d9d9] text-neutral-450'}
                `}>
                  {error ? (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <p>{error}</p>
                    </div>
                  ) : result ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="flex flex-col gap-0.5">
                          <strong className="text-xl font-bold text-[#414141]">{result.agregados}</strong>
                          <span className="text-[9px] text-neutral-455 font-bold uppercase">Agregados</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <strong className="text-xl font-bold text-[#414141]">{result.actualizados}</strong>
                          <span className="text-[9px] text-neutral-455 font-bold uppercase">Actualizados</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <strong className="text-xl font-bold text-[#414141]">{result.omitidos}</strong>
                          <span className="text-[9px] text-neutral-455 font-bold uppercase">Omitidos</span>
                        </div>
                      </div>

                      {result.errores?.length ? (
                        <div className="border-t border-amber-200/50 pt-3 space-y-1">
                          <span className="font-semibold block text-[10px]">Omitidos por errores de validación:</span>
                          <ul className="list-disc pl-4 text-[10px] space-y-0.5 max-h-24 overflow-y-auto">
                            {result.errores.slice(0, 5).map((item, index) => (
                              <li key={index}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 justify-center text-emerald-700 font-semibold pt-1">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Importación realizada de forma exitosa.</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 flex flex-col items-center gap-2">
                      <FileCheck2 className="h-5 w-5 text-neutral-300" />
                      <p className="max-w-[200px] leading-relaxed">
                        Adjunta un archivo CSV para visualizar el reporte del procesamiento
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ayuda Columnas */}
              <div className="rounded-xl bg-[#f8fafc] border border-[#d9d9d9] p-4 space-y-1.5 text-[10px] text-neutral-500">
                <strong className="font-bold text-[#414141] block">Columnas requeridas recomendadas:</strong>
                <p className="font-mono leading-relaxed">
                  codigo, descripcion, stock_total, categoria, precio_unidad_normal, precio_unidad_dist
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
