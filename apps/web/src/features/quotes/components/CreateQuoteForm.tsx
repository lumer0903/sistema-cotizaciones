'use client';

import { useQuoteStore } from '../store/useQuoteStore';
import { createQuote } from '../api/create-quote';

export function CreateQuoteForm() {
  const { idCliente, items, subtotal, igv, total, reset } = useQuoteStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCliente || items.length === 0) {
      alert('Debe seleccionar cliente y agregar items.');
      return;
    }

    try {
      await createQuote({ id_cliente: idCliente, items, subtotal, igv, total });
      alert('Cotización enviada!');
      reset();
    } catch (error: any) {
      console.error(error);
      alert('Error enviando cotización: ' + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4 border rounded">
      <h2 className="text-xl font-bold">Nueva Cotización</h2>
      <div>
        <p>Cliente ID: {idCliente || 'Ninguno'}</p>
        <p>Items: {items.length}</p>
        <p>Total: S/ {total.toFixed(2)}</p>
      </div>
      <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
        Enviar Cotización Asíncrona
      </button>
    </form>
  );
}
