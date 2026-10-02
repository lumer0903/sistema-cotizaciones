"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui";

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
                <span className="justify-center text-brand-ink text-sm font-bold font-sans">
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
            <div className="mt-1 -mx-4 px-4 sm:-mx-5 sm:px-5">
                <Table
                    className="text-xs text-center"
                    scrollLabel="Historial de precios"
                >
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-left whitespace-nowrap">CAMPO MODIFICADO</TableHead>
                            <TableHead className="whitespace-nowrap">FECHA DE CAMBIO</TableHead>
                            <TableHead className="whitespace-nowrap">USUARIO</TableHead>
                            <TableHead className="whitespace-nowrap">VALOR ANTERIOR</TableHead>
                            <TableHead className="whitespace-nowrap">VALOR NUEVO</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="text-stone-600">
                        {historial.length > 0 ? (
                            historial.map((item) => {
                                const valorAnterior = Number(item.valorAnterior ?? 0);
                                const valorNuevo = Number(item.valorNuevo ?? 0);
                                const campo = item.campoModificado ?? '—';
                                const esAumento = valorNuevo > valorAnterior;
                                const esDistrib = campo.toLowerCase().includes("distrib");

                                return (
                                    <TableRow key={item.id}>
                                        <TableCell className={`text-left font-medium ${esDistrib ? "text-distribuidor" : "text-stone-800"}`}>
                                            {campo}
                                        </TableCell>
                                        <TableCell>{item.fechaCambio ?? '—'}</TableCell>
                                        <TableCell>{item.usuario ?? '—'}</TableCell>
                                        <TableCell className="font-medium">
                                            S/ {valorAnterior.toFixed(2)}
                                        </TableCell>
                                        <TableCell className={`font-semibold ${esAumento ? "text-estado-aprobado-text" : "text-estado-rechazado"}`}>
                                            S/ {valorNuevo.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="py-12 text-stone-500 font-medium text-center">
                                    No hay cambios registrados para este producto.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </Modal>
    );
}