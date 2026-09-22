interface CardRecomendacionProps {
    tag: string;
    badgeColor: string;
    codigo: string;
    descripcion: string;
    estante: string;
    stock: number;
    precio: number;
}

export default function CardRecomendacion({
    tag,
    badgeColor,
    codigo,
    descripcion,
    estante,
    stock,
    precio,
}: CardRecomendacionProps) {
    return (
        <div className="border border-gray-100 rounded-lg p-2.5 space-y-2 bg-stone-50/50">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badgeColor}`}>
                {tag}
            </span>
            <div className="flex gap-2.5">
                <div className="size-14 bg-zinc-200 rounded-md shrink-0" />
                <div className="space-y-1 text-xs">
                    <span className="font-bold border border-gray-200 px-1 rounded bg-white text-zinc-700">
                        {codigo}
                    </span>
                    <p className="text-zinc-500 text-xs leading-tight">{descripcion}</p>
                    <div className="flex gap-1.5 text-[10px] text-zinc-500 pt-0.5">
                        <span className="bg-white border border-gray-200 px-1 rounded">
                            {estante}
                        </span>
                        <span className="bg-brand-selection text-brand-subtitle border border-brand-primary/40 px-1 rounded">
                            {stock}
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 rounded">
                            S/ {precio}
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex gap-1.5 pt-1">
                <button className="flex-1 h-7 text-[11px] font-bold border border-gray-300 rounded bg-white hover:bg-gray-50 transition-colors">
                    AGREGAR
                </button>
                <button className="flex-1 h-7 text-[11px] font-bold border border-brand-primary text-brand-primary rounded bg-brand-selection hover:bg-brand-primary/10 transition-colors">
                    REEMPLAZAR
                </button>
            </div>
        </div>
    );
}