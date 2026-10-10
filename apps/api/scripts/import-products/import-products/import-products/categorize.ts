export interface CategoryMap {
  id: number;
  name: string;
  presentations: string[];
}

export const CATEGORY_MAP: CategoryMap[] = [
  {
    id: 1,
    name: 'Ramos y Bouquets',
    presentations: ['Ramo', 'Bouquet', 'Ramo con Follaje'],
  },
  {
    id: 2,
    name: 'Varas Sueltas',
    presentations: ['Vara'],
  },
  {
    id: 3,
    name: 'Adornos y Follaje',
    presentations: ['Adorno', 'Corona', 'Guia', 'Planta', 'Reja', 'Panel', 'Rosas', 'Unitario', 'Follaje', '-', ''],
  },
  {
    id: 4,
    name: 'Arreglos Especiales',
    presentations: ['Florero', 'Macetero', 'Pedestal', 'Arbol'],
  },
];

export function getCategoryIdByPresentacion(presentacion: string): number {
  const clean = presentacion?.trim() || '';
  
  for (const cat of CATEGORY_MAP) {
    if (cat.presentations.includes(clean)) {
      return cat.id;
    }
  }
  
  // Default to Adornos y Follaje (3) if not found
  console.warn(`Unknown presentacion "${clean}", defaulting to category 3`);
  return 3;
}

// Test if run directly
if (require.main === module) {
  const tests = ['Ramo', 'Vara', 'Adorno', 'Florero', 'Ramo con Follaje', 'Macetero', '-', '', 'Pedestal', 'Corona', 'Guia', 'Planta', 'Reja', 'Panel', 'Rosas', 'Unitario', 'Follaje', 'Arbol', 'Bouquet', 'Macetero'];
  tests.forEach(p => console.log(`  "${p}" -> ${getCategoryIdByPresentacion(p)}`));
}