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
                <span className="justify-center text-brand-primary text-sm font-bold font-['DM_Sans']">
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
            <div className="max-h-96 overflow-y-auto mt-1">
                <Table className="text-xs text-center">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-left">CAMPO MODIFICADO</TableHead>
                            <TableHead>FECHA DE CAMBIO</TableHead>
                            <TableHead>USUARIO</TableHead>
                            <TableHead>VALOR ANTERIOR</TableHead>
                            <TableHead>VALOR NUEVO</TableHead>
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
                                <TableCell colSpan={5} className="py-12 text-stone-400 font-medium text-center">
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