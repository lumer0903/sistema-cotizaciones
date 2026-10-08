'use client';

import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  ReactNode,
  ReactElement,
  SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  FIELD_BORDER,
  FIELD_DISABLED,
  FIELD_ERROR,
  FIELD_ERROR_TEXT,
  FIELD_FOCUS,
  FIELD_HEIGHT,
  FIELD_LABEL,
  FIELD_TEXT,
  FIELD_TRANSITION,
} from './fieldStyles';

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size'> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  options?: SelectOption[];
  /** Legacy: estilo variante (afecta focus visual en modales). */
  variant?: 'default' | 'modal';
  sizeVariant?: 'sm' | 'md';
  placeholder?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: { target: { value: string | number; name?: string } }) => void;
}

/** Extrae <option> hijos tipados (compatibilidad con children). */
function parseChildrenOptions(children: ReactNode): SelectOption[] {
  const out: SelectOption[] = [];
  const walk = (nodes: ReactNode): void => {
    if (nodes == null || typeof nodes === 'boolean') return;
    if (Array.isArray(nodes)) {
      nodes.forEach(walk);
      return;
    }
    if (typeof nodes === 'string' || typeof nodes === 'number') return;
    if (typeof nodes === 'object' && (nodes as ReactElement).type) {
      const el = nodes as ReactElement<{ value?: string | number; children?: ReactNode }>;
      if (el.type === 'option') {
        const child = el.props.children;
        out.push({
          label: typeof child === 'string' || typeof child === 'number' ? String(child) : '',
          value: el.props.value ?? '',
        });
        return;
      }
      walk(el.props.children);
    }
  };
  walk(children);
  return out;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      icon,
      options = [],
      className,
      disabled,
      variant: _variant = 'default',
      sizeVariant: _sizeVariant = 'md',
      placeholder = 'Seleccionar',
      value: propValue,
      defaultValue,
      onChange,
      name,
      id,
      children,
      required,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState<string | number>(
      propValue !== undefined ? propValue : defaultValue ?? ''
    );
    const [activeIndex, setActiveIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(
      null
    );

    const listboxId = useId();
    const triggerId = id ?? listboxId;

    const parsedOptions: SelectOption[] =
      options.length > 0 ? [...options] : parseChildrenOptions(children);

    useEffect(() => {
      if (propValue !== undefined) setSelectedValue(propValue);
    }, [propValue]);

    // Click fuera → cierra (contenedor o menú portal)
    useEffect(() => {
      if (!isOpen) return;
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        if (containerRef.current?.contains(target)) return;
        if (menuRef.current?.contains(target)) return;
        setIsOpen(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Posicionamiento del portal (flip vertical + scroll/resize)
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

    const close = useCallback((refocus = true) => {
      setIsOpen(false);
      setActiveIndex(-1);
      if (refocus) triggerRef.current?.focus();
    }, []);

    const handleSelect = useCallback(
      (optValue: string | number) => {
        setSelectedValue(optValue);
        close();
        onChange?.({ target: { value: optValue, name } });
      },
      [close, onChange, name]
    );

    // Teclado en el trigger (patrón select-only combobox del APG)
    const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsOpen(true);
          const idx = parsedOptions.findIndex(
            (o) => String(o.value) === String(selectedValue)
          );
          setActiveIndex(idx >= 0 ? idx : 0);
        }
        return;
      }
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, parsedOptions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Home':
          e.preventDefault();
          setActiveIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setActiveIndex(parsedOptions.length - 1);
          break;
        case 'Enter':
        case ' ': {
          e.preventDefault();
          const opt = parsedOptions[activeIndex];
          if (opt) handleSelect(opt.value);
          break;
        }
        case 'Tab':
          close(false);
          break;
      }
    };

    const selectedOption = parsedOptions.find(
      (opt) => String(opt.value) === String(selectedValue)
    );
    const hasValue = selectedOption !== undefined && selectedOption.value !== '';
    const heightClass = cn(FIELD_HEIGHT, 'text-sm');

    return (
      <div className="w-full space-y-1.5" ref={containerRef}>
        {/* select nativo real: mantiene RHF/submit y valor accesible */}
        <select
          ref={ref}
          name={name}
          value={selectedValue}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={() => {}}
          required={required}
          {...props}
        >
          {parsedOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {label && (
          <label htmlFor={triggerId} className={FIELD_LABEL}>
            {label}
            {required && <span className="text-danger ml-1" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative">
          <button
            type="button"
            id={triggerId}
            ref={triggerRef}
            disabled={disabled}
            role="combobox"
            aria-haspopup="listbox"
            aria-label={ariaLabel}
            aria-expanded={isOpen}
            aria-controls={isOpen ? listboxId : undefined}
            aria-invalid={error ? true : undefined}
            aria-activedescendant={
              isOpen && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
            }
            onClick={() => !disabled && setIsOpen((prev) => !prev)}
            onKeyDown={onTriggerKeyDown}
            className={cn(
              'relative w-full flex items-center justify-between text-left pr-8',
              heightClass,
              FIELD_BORDER,
              FIELD_TEXT,
              FIELD_TRANSITION,
              FIELD_DISABLED,
              icon ? 'pl-9' : 'px-3.5',
              isOpen
                ? 'border-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring'
                : FIELD_FOCUS,
              error && FIELD_ERROR,
              className
            )}
          >
            {icon && (
              <div
                className="absolute left-3 pointer-events-none flex items-center justify-center text-brand-options"
                aria-hidden="true"
              >
                {icon}
              </div>
            )}

            <span className={cn('block truncate', !hasValue && 'text-brand-options')}>
              {selectedOption && hasValue ? selectedOption.label : placeholder}
            </span>

            <ChevronDown
              className={cn(
                'absolute right-2.5 size-4 text-brand-options transition-transform duration-200 pointer-events-none',
                isOpen && 'rotate-180 text-brand-primary'
              )}
              aria-hidden="true"
            />
          </button>

          {isOpen &&
            menuPos &&
            typeof document !== 'undefined' &&
            createPortal(
              <div
                ref={menuRef}
                id={listboxId}
                role="listbox"
                aria-label={typeof label === 'string' ? label : placeholder}
                className="fixed z-select bg-white border border-border-default rounded-2xl shadow-popover py-1 max-h-56 overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-100"
                style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {parsedOptions.length > 0 ? (
                  parsedOptions.map((opt, index) => {
                    const isSelected = String(opt.value) === String(selectedValue);
                    return (
                      <div
                        key={opt.value}
                        id={`${listboxId}-opt-${index}`}
                        role="option"
                        aria-selected={isSelected}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(opt.value);
                        }}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={cn(
                          'w-full text-left px-3.5 py-2 text-xs font-medium transition-colors flex items-center justify-between cursor-pointer',
                          index === activeIndex && 'bg-zinc-100',
                          isSelected
                            ? 'text-brand-ink font-bold'
                            : 'text-brand-subtitle'
                        )}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-brand-primary shrink-0 ml-2" />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="px-3 py-2 text-xs text-brand-options text-center">
                    No hay opciones
                  </div>
                )}
              </div>,
              document.body
            )}
        </div>

        {error && (
          <p className={FIELD_ERROR_TEXT} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
