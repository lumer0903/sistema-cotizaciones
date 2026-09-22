'use client';

import { forwardRef, useState, useRef, useEffect, ReactNode, SelectHTMLAttributes } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
    label: string;
    value: string | number;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    label?: string;
    error?: string;
    icon?: ReactNode;
    options?: SelectOption[];
    variant?: 'default' | 'modal';
    sizeVariant?: 'sm' | 'md';
    placeholder?: string;
    value?: string | number;
    defaultValue?: string | number;
    onChange?: (e: { target: { value: string | number; name?: string } }) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            label,
            error,
            icon,
            options = [],
            className = '',
            disabled,
            variant = 'default',
            sizeVariant = 'md',
            placeholder = 'Seleccionar',
            value: propValue,
            defaultValue,
            onChange,
            name,
            children,
            ...props
        },
        ref
    ) => {
        const isModal = variant === 'modal';
        const borderColor = isModal ? '#8E8E8E' : '#F8B602';
        const focusColor = isModal ? '#C9A962' : '#F8B602';
        const labelIconColor = isModal ? '#8E8E8E' : '#F8B602';
        const chevronColor = isModal ? '#8E8E8E' : '#F8B602';

        const [isOpen, setIsOpen] = useState(false);
        const [selectedValue, setSelectedValue] = useState<string | number>(
            propValue !== undefined ? propValue : defaultValue || ''
        );
        const containerRef = useRef<HTMLDivElement>(null);

        // Extraer opciones si se enviaron como <option> en children
        const parsedOptions: SelectOption[] = options.length > 0 ? options : [];
        if (children && parsedOptions.length === 0) {
            const childrenArray = Array.isArray(children) ? children : [children];
            childrenArray.forEach((child: any) => {
                if (child?.props) {
                    parsedOptions.push({
                        label: child.props.children,
                        value: child.props.value,
                    });
                }
            });
        }

        useEffect(() => {
            if (propValue !== undefined) {
                setSelectedValue(propValue);
            }
        }, [propValue]);

        // Cerrar al hacer clic fuera del componente
        useEffect(() => {
            const handleClickOutside = (e: MouseEvent) => {
                if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                    setIsOpen(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        const handleSelect = (optValue: string | number) => {
            setSelectedValue(optValue);
            setIsOpen(false);
            if (onChange) {
                onChange({ target: { value: optValue, name } });
            }
        };

        const selectedOption = parsedOptions.find((opt) => String(opt.value) === String(selectedValue));
        const heightClass = sizeVariant === 'sm' ? 'h-8 text-xs' : 'h-10 text-xs sm:text-sm';

        return (
            <div className="w-full space-y-1" ref={containerRef}>
                {/* Native select oculto para compatibilidad con React Hook Form */}
                <select
                    ref={ref}
                    name={name}
                    value={selectedValue}
                    className="sr-only"
                    tabIndex={-1}
                    onChange={() => { }}
                    {...props}
                >
                    {parsedOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>

                {label && (
                    <label
                        className="block text-[10px] sm:text-xs font-black uppercase tracking-wider"
                        style={{ color: labelIconColor }}
                    >
                        {label}
                    </label>
                )}

                <div className="relative">
                    {/* Botón activador del desplegable */}
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => !disabled && setIsOpen((prev) => !prev)}
                        className={`w-full ${heightClass} flex items-center justify-between rounded-xl border bg-white font-medium transition-all text-left disabled:bg-gray-100 disabled:cursor-not-allowed pr-8 ${icon ? 'pl-9' : 'px-3'
                            } ${error ? 'border-red-500 focus:ring-2 focus:ring-red-200' : ''
                            } ${className}`}
                        style={{
                            borderColor: error ? undefined : isOpen ? focusColor : borderColor,
                            boxShadow: isOpen && !error ? `0 0 0 2px ${focusColor}33` : 'none',
                            color: '#414141',
                        }}
                    >
                        {icon && (
                            <div
                                className="absolute left-3 pointer-events-none flex items-center justify-center"
                                style={{ color: labelIconColor }}
                            >
                                {icon}
                            </div>
                        )}

                        <span className={`block truncate ${!selectedOption?.value ? 'text-gray-400' : ''}`}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>

                        <ChevronDown
                            className={`absolute right-2.5 size-4 transition-transform duration-200 pointer-events-none ${isOpen ? 'rotate-180' : ''
                                }`}
                            style={{ color: chevronColor }}
                        />
                    </button>

                    {/* Menú Flotante Personalizado */}
                    {isOpen && (
                        <div className="absolute top-full left-0 z-50 w-full min-w-[160px] bg-white border border-stone-200 rounded-xl shadow-lg mt-1 overflow-hidden py-1 max-h-56 overflow-y-auto">
                            {parsedOptions.length > 0 ? (
                                parsedOptions.map((opt) => {
                                    const isSelected = String(opt.value) === String(selectedValue);
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => handleSelect(opt.value)}
                                            className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors flex items-center justify-between hover:bg-stone-50 ${isSelected ? 'bg-stone-50 text-stone-900 font-bold' : 'text-stone-700'
                                                }`}
                                        >
                                            <span className="truncate">{opt.label}</span>
                                            {isSelected && <Check className="w-3.5 h-3.5 text-stone-600 shrink-0 ml-2" />}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="px-3 py-2 text-xs text-stone-400 text-center">
                                    No hay opciones
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </div>
        );
    }
);

Select.displayName = 'Select';
