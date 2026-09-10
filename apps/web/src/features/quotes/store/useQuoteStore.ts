import { create } from 'zustand';

interface QuoteItem {
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
}

interface QuoteState {
  idCliente: number | null;
  items: QuoteItem[];
  subtotal: number;
  igv: number;
  total: number;
  
  setCliente: (id: number) => void;
  addItem: (item: QuoteItem) => void;
  removeItem: (id_producto: number) => void;
  calculateTotals: () => void;
  reset: () => void;
}

export const useQuoteStore = create<QuoteState>((set, get) => ({
  idCliente: null,
  items: [],
  subtotal: 0,
  igv: 0,
  total: 0,

  setCliente: (id) => set({ idCliente: id }),

  addItem: (item) => {
    set((state) => {
      const existing = state.items.find((i) => i.id_producto === item.id_producto);
      if (existing) {
        return {
          items: state.items.map((i) => 
            i.id_producto === item.id_producto 
              ? { ...i, cantidad: i.cantidad + item.cantidad } 
              : i
          )
        };
      }
      return { items: [...state.items, item] };
    });
    get().calculateTotals();
  },

  removeItem: (id_producto) => {
    set((state) => ({
      items: state.items.filter((i) => i.id_producto !== id_producto)
    }));
    get().calculateTotals();
  },

  calculateTotals: () => {
    set((state) => {
      const subtotal = state.items.reduce((acc, item) => acc + (item.cantidad * item.precio_unitario), 0);
      const igv = subtotal * 0.18;
      const total = subtotal + igv;
      return { subtotal, igv, total };
    });
  },

  reset: () => set({ idCliente: null, items: [], subtotal: 0, igv: 0, total: 0 }),
}));
