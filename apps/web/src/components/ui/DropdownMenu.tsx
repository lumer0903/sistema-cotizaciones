'use client';

import React, { useEffect, useRef, useState, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface DropdownMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** Indicador numérico opcional (ej. contador de alertas). */
  badge?: number;
  dividerBefore?: boolean;
}

export interface DropdownMenuProps {
  /** Contenido del botón disparador. */
  trigger: ReactNode;
  items: DropdownMenuItem[];
  /** Contenido personalizado opcional (reemplaza la lista por defecto). */
  children?: ReactNode;
  align?: 'left' | 'right';
  /** aria-label del menú. */
  label?: string;
  triggerClassName?: string;
  triggerAriaLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Menú desplegable accesible (patrón menu + menuitem):
 * Escape cierra, ↑/↓ navegan, click fuera cierra, foco vuelve al disparador.
 */
export const DropdownMenu = ({
  trigger,
  items,
  children,
  align = 'right',
  label = 'Menú de opciones',
  triggerClassName,
  triggerAriaLabel,
  open: controlledOpen,
  onOpenChange,
}: DropdownMenuProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const enabledIndexes = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);

  const moveActive = (dir: 1 | -1) => {
    if (enabledIndexes.length === 0) return;
    setActiveIndex((current) => {
      const pos = enabledIndexes.indexOf(current);
      const nextPos =
        pos === -1
          ? dir === 1
            ? 0
            : enabledIndexes.length - 1
          : (pos + dir + enabledIndexes.length) % enabledIndexes.length;
      return enabledIndexes[nextPos];
    });
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveActive(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveActive(-1);
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(enabledIndexes[0] ?? -1);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(enabledIndexes[enabledIndexes.length - 1] ?? -1);
        break;
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const item = items[activeIndex];
        if (item && !item.disabled) {
          item.onClick();
          setOpen(false);
          triggerRef.current?.focus();
        }
        break;
      }
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={triggerAriaLabel}
        onClick={() => setOpen(!isOpen)}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className={cn(
            'absolute mt-2 w-56 bg-white rounded-2xl shadow-popover border border-border-default px-1.5 py-1.5 z-menu',
            'animate-in fade-in zoom-in-95 duration-100',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {children ??
            items.map((item, index) => (
              <React.Fragment key={item.key}>
                {item.dividerBefore && <div role="separator" className="my-1 border-t border-zinc-100" />}
<button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  tabIndex={index === activeIndex || (activeIndex === -1 && index === 0) ? 0 : -1}
                  onClick={() => {
                    item.onClick();
                    setOpen(false);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-[background-color,color] duration-150 text-left active:scale-[0.96]',
                    item.danger
                      ? 'text-danger hover:bg-status-rechazado-soft'
                      : 'text-brand-subtitle hover:bg-zinc-100 hover:text-accent-ink',
                    item.disabled && 'opacity-50 cursor-not-allowed',
                    index === activeIndex && !item.disabled && 'bg-zinc-100'
                  )}
                  >
                  {item.icon && <span aria-hidden="true">{item.icon}</span>}
                  <span className="flex-1 truncate">{item.label}</span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="bg-danger text-white text-[10px] font-bold h-4 min-w-4 px-1.5 rounded-full flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </button>
              </React.Fragment>
            ))}
        </div>
      )}
    </div>
  );
};
