'use client';
import { useState,useEffect,useCallback,useRef } from 'react';
import { inventarioApi,AlertaStockResponse } from '../api/inventario.api';
import { apiErrorMessage } from '@/lib/apiClient';
import { showToast } from '@/lib/toast';
import { Modal,Button,TableBadge,Select,ConfirmModal,Pagination,Table,TableHeader,TableBody,TableRow,TableHead,TableCell } from '@/components/ui';
import { formatCode,formatText } from '@/lib/formatters';
type Estado='abiertas'|'activa'|'reconocida'|'resuelta'|'todas';
export function AlertasStockTable({open,onClose,onSuccess}:{open:boolean;onClose:()=>void;onSuccess?:()=>void}) {
  const [alertas,setAlertas]=useState<AlertaStockResponse[]>([]);
  const [estado,setEstado]=useState<Estado>('abiertas');
  const [page,setPage]=useState(1),[limit,setLimit]=useState(20),[total,setTotal]=useState(0);
  const [loading,setLoading]=useState(false),[error,setError]=useState<string|null>(null);
  const [confirmId,setConfirmId]=useState<number|null>(null),[saving,setSaving]=useState(false);
  const request=useRef<AbortController|null>(null);
  const fetchAlertas=useCallback(async()=>{
    request.current?.abort();const controller=new AbortController();request.current=controller;
    setLoading(true);setError(null);setAlertas([]);
    try {
      const res=await inventarioApi.obtenerAlertasStock(estado,page,limit,controller.signal);
      if(!controller.signal.aborted){setAlertas(res.data);setTotal(res.total);}
    } catch(err){if(!controller.signal.aborted){setError(apiErrorMessage(err));setTotal(0);}}
    finally{if(!controller.signal.aborted)setLoading(false);}
  },[estado,page,limit]);
  useEffect(()=>{
    if(!open)return;
    const timer=window.setTimeout(()=>void fetchAlertas(),0);
    return()=>{window.clearTimeout(timer);request.current?.abort();};
  },[open,fetchAlertas]);
  const reconocer=async()=>{
    if(confirmId==null)return;setSaving(true);
    try{await inventarioApi.reconocerAlerta(confirmId);setConfirmId(null);await fetchAlertas();onSuccess?.();}
    catch(err){showToast.error(apiErrorMessage(err));}finally{setSaving(false);}
  };
  if(!open)return null;
  return <>
    <Modal open={open} onClose={onClose} title="Alertas de stock" maxWidth="xl">
      <div className="space-y-4">
        <div className="flex gap-3 items-end">
          <Select label="Estado" value={estado} onChange={e=>{setEstado(e.target.value as Estado);setPage(1);}}
            options={[{label:'Abiertas',value:'abiertas'},{label:'Activas',value:'activa'},
              {label:'Reconocidas',value:'reconocida'},{label:'Resueltas',value:'resuelta'},{label:'Todas',value:'todas'}]} />
          <Button onClick={fetchAlertas} disabled={loading} variant="outline">Actualiza</Button>
        </div>
        {loading?<p role="status">Cargando alertas...</p>:error?
          <div role="alert">{error}<Button onClick={fetchAlertas}>Reintenta</Button></div>:
          alertas.length===0?<p>No hay alertas con estos filtros.</p>:
          <Table
            scrollLabel="Alertas de stock"
            footer={
              <Pagination
                currentPage={page}
                totalPages={Math.max(1, Math.ceil(total / limit))}
                totalItems={total}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={(n) => {
                  setLimit(n);
                  setPage(1);
                }}
                loading={loading}
                itemLabel="alertas"
              />
            }
          >
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Almacén</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alertas.map((a) => (
                <TableRow key={a.id_alerta}>
                  <TableCell>
                    <span className="font-normal text-[#575757]">{formatCode(a.producto?.codigo || '')}</span> — {formatText(a.producto?.descripcion || '')}
                  </TableCell>
                  <TableCell>{a.almacen?.codigo} — {a.almacen?.nombre}</TableCell>
                  <TableCell className="tabular-nums">{a.stock_actual}</TableCell>
                  <TableCell className="tabular-nums">{a.stock_minimo}</TableCell>
                  <TableCell className="text-center">
                    <TableBadge variant={a.estado === 'activa' ? 'danger' : a.estado === 'reconocida' ? 'neutral' : 'success'}>
                      {a.estado}
                    </TableBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    {a.estado === 'activa' && (
                      <Button onClick={() => setConfirmId(a.id_alerta)} variant="ghost" size="sm">
                        Reconoce
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
      </div>
    </Modal>
    <ConfirmModal open={confirmId!=null} onClose={()=>{if(!saving)setConfirmId(null);}} onConfirm={reconocer}
      title="Reconoce alerta" message="La alerta cambiará a estado revisado y permanecerá abierta hasta que se registre la reposición de stock." confirmLabel="Reconoce" loading={saving} />
  </>;
}
