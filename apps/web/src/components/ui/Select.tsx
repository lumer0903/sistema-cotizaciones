'use client';

import { forwardRef, useState, useRef, useEffect, ReactNode, SelectHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
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
            variant: _variant = 'default',
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
        const [isOpen, setIsOpen] = useState(false);
        const [selectedValue, setSelectedValue] = useState<string | number>(
            propValue !== undefined ? propValue : defaultValue || ''
        );
        const containerRef = useRef<HTMLDivElement>(null);
        const triggerRef = useRef<HTMLButtonElement>(null);
        const menuRef = useRef<HTMLDivElement>(null);
        const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);

        const flattenOptionNodes = (nodes: any): any[] => {
            if (nodes == null || typeof nodes === 'boolean') return [];
            if (Array.isArray(nodes)) return nodes.flatMap(flattenOptionNodes);
            if (typeof nodes === 'object' && nodes.props) return [nodes];
            return [];
        };

        const optionLabel = (childrenVal: any): string => {
            if (childrenVal == null) return '';
            if (typeof childrenVal === 'string' || typeof childrenVal === 'number') return String(childrenVal);
            if (Array.isArray(childrenVal)) return childrenVal.map(optionLabel).join('');
            if (typeof childrenVal === 'object' && childrenVal.props) return optionLabel(childrenVal.props.children);
            return '';
        };

        const parsedOptions: SelectOption[] = options.length > 0 ? [...options] : [];
        if (children && options.length === 0) {
            flattenOptionNodes(children).forEach((child: any) => {
                if (child?.props) {
                    parsedOptions.push({
                        label: optionLabel(child.props.children),
                        value: child.props.value ?? '',
                    });
                }
            });
        }

        useEffect(() => {
            if (propValue !== undefined) setSelectedValue(propValue);
        }, [propValue]);

        useEffect(() => {
            const handleClickOutside = (e: MouseEvent) => {
                const target = e.target as Node;
                if (containerRef.current?.contains(target)) return;
                if (menuRef.current?.contains(target)) return;
                setIsOpen(false);
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        useEffect(() => {
            if (!isOpen) return;
            const updatePos = () => {
                const rect = triggerRef.current?.getBoundingClientRect();
                if (!rect) return;
                const width = rect.width;
                const spaceBelow = window.innerHeight - rect.bottom;
                const estHeight = Math.min(parsedOptions.length * 36 + 8, 224);
                const flip = spaceBelow < estHeight && rect.top > estHeight + 8;
                setMenuPos({
                    top: flip ? rect.top - estHeight - 4 : rect.bottom + 4,
                    left: rect.left,
                    width,
                });
            };
            updatePos();
            window.addEventListener('scroll', updatePos, true);
            window.addEventListener('resize', updatePos);
            return () => {
                window.removeEventListener('scroll', updatePos, true);
                window.removeEventListener('resize', updatePos);
            };
        }, [isOpen, parsedOptions.length]);

        const handleSelect = (optValue: string | number) => {
            setSelectedValue(optValue);
            setIsOpen(false);
            if (onChange) onChange({ target: { value: optValue, name } });
        };

        const selectedOption = parsedOptions.find((opt) => String(opt.value) === String(selectedValue));
        const heightClass = sizeVariant === 'sm' ? 'h-10 text-xs' : 'h-11 text-xs sm:text-sm';

        return (
            <div className="w-full space-y-1.5" ref={containerRef}>
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
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                        {label}
                    </label>
                )}

                <div className="relative">
                    <button
                        type="button"
                        ref={triggerRef}
                        disabled={disabled}
                        onClick={() => !disabled && setIsOpen((prev) => !prev)}
                        className={`
              relative w-full ${heightClass} flex items-center justify-between rounded-xl border 
              border-zinc-200 bg-zinc-50/50 font-medium transition-all text-left text-zinc-800
              hover:border-zinc-300 disabled:bg-zinc-100 disabled:cursor-not-allowed pr-8 
              ${icon ? 'pl-9' : 'px-3.5'} 
              ${isOpen ? 'bg-white border-amber-400 ring-2 ring-amber-400/20' : ''}
              ${error ? '!border-red-500 focus:ring-2 focus:ring-red-100' : ''} 
              ${className}
            `.trim()}
                    >
                        {icon && (
                            <div className="absolute left-3 pointer-events-none flex items-center justify-center text-zinc-400">
                                {icon}
                            </div>
                        )}

                        <span className={`block truncate ${!selectedOption?.value ? 'text-zinc-400' : ''}`}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>

                        <ChevronDown
                            className={`absolute right-2.5 size-4 text-zinc-400 transition-transform duration-200 pointer-events-none ${isOpen ? 'rotate-180 text-amber-500' : ''
                                }`}
                        />
                    </button>

                    {isOpen && menuPos && typeof document !== 'undefined' &&
                        createPortal(
                            <div
                                ref={menuRef}
                                className="fixed z-[70] bg-white border border-zinc-200 rounded-xl shadow-xl py-1 max-h-56 overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-100"
                                style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                {parsedOptions.length > 0 ? (
                                    parsedOptions.map((opt) => {
                                        const isSelected = String(opt.value) === String(selectedValue);
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelect(opt.value);
                                                }}
                                                className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors flex items-center justify-between hover:bg-zinc-100/70 ${isSelected ? 'bg-amber-50 text-amber-900 font-bold' : 'text-zinc-700'
                                                    }`}
                                            >
                                                <span className="truncate">{opt.label}</span>
                                                {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0 ml-2" />}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="px-3 py-2 text-xs text-zinc-400 text-center">
                                        No hay opciones
                                    </div>
                                )}
                            </div>,
                            document.body
                        )}
                </div>

                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </div>
        );
    }
);

Select.displayName = 'Select';