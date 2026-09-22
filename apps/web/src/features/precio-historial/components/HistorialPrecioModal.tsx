"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";

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
    // Variable JSX aplicando el diseño de ayuda
    const badgeCodigo = (
        <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-gray-200/60 rounded-full" />
            <div className="px-3 py-1 bg-gray-200/20 rounded-lg outline outline-1 outline-offset-[-1px] outline-gray-200 inline-flex justify-center items-center gap-2.5">
                <span className="justify-center text-yellow-500 text-sm font-bold font-['DM_Sans']">
                    {codigoProducto}
                </span>
            </div>
        </div>
    );

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Historial de precio"
            headerExtra={badgeCodigo}
            maxWidth="xl"
        >
            <div className="border border-stone-200/80 rounded-2xl overflow-hidden bg-white shadow-sm mt-1">
                <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-xs text-center border-collapse">
                        <thead>
                            <tr className="text-stone-700 font-bold uppercase tracking-wider text-[11px] border-b border-stone-100">
                                <th className="py-4 px-4 text-left font-bold">CAMPO MODIFICADO</th>
                                <th className="py-4 px-4 font-bold">FECHA DE CAMBIO</th>
                                <th className="py-4 px-4 font-bold">USUARIO</th>
                                <th className="py-4 px-4 font-bold">VALOR ANTERIOR</th>
                                <th className="py-4 px-4 font-bold">VALOR NUEVO</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 text-stone-600">
                            {historial.length > 0 ? (
                                historial.map((item) => {
                                    const esAumento = item.valorNuevo > item.valorAnterior;
                                    const esDistrib = item.campoModificado.toLowerCase().includes("distrib");

                                    return (
                                        <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                                            <td className={`py-3 px-4 text-left font-medium ${esDistrib ? "text-orange-600" : "text-stone-800"}`}>
                                                {item.campoModificado}
                                            </td>
                                            <td className="py-3 px-4">{item.fechaCambio}</td>
                                            <td className="py-3 px-4">{item.usuario}</td>
                                            <td className="py-3 px-4 font-medium">
                                                S/ {item.valorAnterior.toFixed(2)}
                                            </td>
                                            <td className={`py-3 px-4 font-semibold ${esAumento ? "text-emerald-600" : "text-rose-600"}`}>
                                                S/ {item.valorNuevo.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-12 text-stone-400 font-medium text-center">
                                        No hay cambios registrados para este producto.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
    );
}