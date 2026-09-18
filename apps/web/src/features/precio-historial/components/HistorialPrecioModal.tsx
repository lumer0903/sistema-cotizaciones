"use client";

import { X } from "lucide-react";

export interface HistorialPrecioItem {
    id: string | number;
    campoModificado: string;
    fechaCambio: string;
    usuario: string;
    valorAnterior: number;
    valorNuevo: number;
}

interface HistorialPrecioModalProps {
    open: boolean;
    onClose: () => void;
    codigoProducto?: string;
    historial?: HistorialPrecioItem[];
}

export function HistorialPrecioModal({
    open,
    onClose,
    codigoProducto = "RYG5-B",
    historial = [],
}: HistorialPrecioModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl bg-white rounded-2xl p-6 shadow-2xl space-y-5">

                {/* ENCABEZADO */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-800">Historial de precio</h2>
                        <span className="w-2 h-2 rounded-full bg-gray-300" />
                        <div className="px-3 py-1 bg-amber-50/80 border border-amber-200/60 rounded-lg">
                            <span className="text-amber-500 font-bold text-lg">{codigoProducto}</span>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* TABLA DE HISTORIAL */}
                <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <div className="max-h-72 overflow-y-auto">
                        <table className="w-full text-sm text-center">
                            <thead className="bg-gray-200/60 sticky top-0 font-extrabold text-neutral-700 uppercase text-xs">
                                <tr>
                                    <th className="py-3 px-4 text-left">CAMPO MODIFICADO</th>
                                    <th className="py-3 px-4">FECHA DE CAMBIO</th>
                                    <th className="py-3 px-4">USUARIO</th>
                                    <th className="py-3 px-4">VALOR ANTERIOR</th>
                                    <th className="py-3 px-4">VALOR NUEVO</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {historial.length > 0 ? (
                                    historial.map((item) => {
                                        const esAumento = item.valorNuevo > item.valorAnterior;
                                        const esDistrib = item.campoModificado.toLowerCase().includes("distrib");

                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                                                <td className={`py-2.5 px-4 text-left font-light ${esDistrib ? "text-amber-800" : "text-blue-800"}`}>
                                                    {item.campoModificado}
                                                </td>
                                                <td className="py-2.5 px-4 text-neutral-700 font-light">{item.fechaCambio}</td>
                                                <td className="py-2.5 px-4 text-neutral-700 font-light">{item.usuario}</td>
                                                <td className="py-2.5 px-4 text-neutral-700 font-light">
                                                    S/{item.valorAnterior.toFixed(2)}
                                                </td>
                                                <td className={`py-2.5 px-4 font-light ${esAumento ? "text-red-900" : "text-green-600"}`}>
                                                    S/{item.valorNuevo.toFixed(2)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-gray-400 text-center">
                                            No hay cambios registrados para este producto.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}