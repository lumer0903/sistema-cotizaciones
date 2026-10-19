'use client';

import React, { createContext, useContext, useId, useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';

interface TabsContextValue {
  baseId: string;
  value: string;
  onValueChange: (value: string) => void;
  registerTrigger: (value: string, element: HTMLButtonElement | null) => void;
  unregisterTrigger: (value: string) => void;
  focusNext: (currentValue: string) => void;
  focusPrev: (currentValue: string) => void;
  focusFirst: () => void;
  focusLast: () => void;
  orientation?: 'horizontal' | 'vertical';
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs compounds must be used within a Tabs component');
  }
  return context;
}

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function Tabs({ value, onValueChange, children, className, orientation = 'horizontal' }: TabsProps) {
  const baseId = useId();
  const triggersRef = useRef<Map<string, HTMLButtonElement>>(new Map());

  const registerTrigger = (triggerValue: string, element: HTMLButtonElement | null) => {
    if (element) {
      triggersRef.current.set(triggerValue, element);
    } else {
      triggersRef.current.delete(triggerValue);
    }
  };

  const unregisterTrigger = (triggerValue: string) => {
    triggersRef.current.delete(triggerValue);
  };

  const focusFirst = () => {
    const first = Array.from(triggersRef.current.values()).find(el => !el.disabled);
    first?.focus();
  };

  const focusLast = () => {
    const values = Array.from(triggersRef.current.values()).filter(el => !el.disabled);
    values[values.length - 1]?.focus();
  };

  const focusNext = (currentValue: string) => {
    const values = Array.from(triggersRef.current.entries()).filter(([, el]) => !el.disabled);
    const index = values.findIndex(([v]) => v === currentValue);
    if (index !== -1 && index < values.length - 1) {
      values[index + 1][1].focus();
    } else {
      focusFirst();
    }
  };

  const focusPrev = (currentValue: string) => {
    const values = Array.from(triggersRef.current.entries()).filter(([, el]) => !el.disabled);
    const index = values.findIndex(([v]) => v === currentValue);
    if (index > 0) {
      values[index - 1][1].focus();
    } else {
      focusLast();
    }
  };

  return (
    <TabsContext.Provider value={{ baseId, value, onValueChange, registerTrigger, unregisterTrigger, focusNext, focusPrev, focusFirst, focusLast, orientation }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}

export function TabsList({ children, className, 'aria-label': ariaLabel }: TabsListProps) {
  const { orientation } = useTabsContext();
  return (
    <div
      role="tablist"
      aria-orientation={orientation}
      aria-label={ariaLabel}
      className={cn('flex h-10 items-center bg-surface-muted/80 border border-border-default rounded-xl p-1', className)}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function TabsTrigger({ value, children, className, disabled }: TabsTriggerProps) {
  const { baseId, value: currentValue, onValueChange, registerTrigger, unregisterTrigger, focusNext, focusPrev, focusFirst, focusLast, orientation = 'horizontal' } = useTabsContext();
  const isActive = currentValue === value;
  const id = `${baseId}-${encodeURIComponent(value)}`;
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    registerTrigger(value, buttonRef.current);
    return () => unregisterTrigger(value);
  }, [value, registerTrigger, unregisterTrigger]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        onValueChange(value);
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal') {
          e.preventDefault();
          focusNext(value);
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal') {
          e.preventDefault();
          focusPrev(value);
        }
        break;
      case 'ArrowDown':
        if (orientation === 'vertical') {
          e.preventDefault();
          focusNext(value);
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical') {
          e.preventDefault();
          focusPrev(value);
        }
        break;
      case 'Home':
        e.preventDefault();
        focusFirst();
        break;
      case 'End':
        e.preventDefault();
        focusLast();
        break;
    }
  };

  return (
    <button
      ref={buttonRef}
      role="tab"
      id={`${id}-tab`}
      aria-selected={isActive}
      aria-controls={`${id}-panel`}
      disabled={disabled}
      onClick={() => !disabled && onValueChange(value)}
      onKeyDown={handleKeyDown}
      type="button"
      tabIndex={isActive ? 0 : -1}
      className={cn(
        'flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 py-1 text-sm font-medium transition-[background-color,color,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.96]',
        isActive
          ? 'bg-surface shadow-sm text-accent-ink'
          : 'text-brand-options hover:text-brand-subtitle hover:bg-surface-muted/50',
        className,
      )}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { baseId, value: currentValue } = useTabsContext();
  const id = `${baseId}-${encodeURIComponent(value)}`;

  if (currentValue !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${id}-panel`}
      aria-labelledby={`${id}-tab`}
      className={cn('mt-2 animate-in fade-in-0 duration-200', className)}
    >
      {children}
    </div>
  );
}