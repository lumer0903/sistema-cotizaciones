'use client';

import React, { createContext, useContext, useId } from 'react';
import { cn } from '@/lib/cn';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
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
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
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
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex h-10 items-center bg-zinc-50/80 border border-zinc-200 rounded-xl p-1', className)}
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
  const { value: currentValue, onValueChange } = useTabsContext();
  const isActive = currentValue === value;
  const id = useId();

  return (
    <button
      role="tab"
      id={id}
      aria-selected={isActive}
      aria-controls={`${id}-panel`}
      disabled={disabled}
      onClick={() => !disabled && onValueChange(value)}
      type="button"
      className={cn(
        'flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 py-1 text-sm font-medium transition-[background-color,color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.96]',
        isActive
          ? 'bg-white shadow-sm text-brand-primary'
          : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/50',
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
  const { value: currentValue } = useTabsContext();
  const id = useId();

  if (currentValue !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${id}-panel`}
      aria-labelledby={id}
      className={cn('mt-2 animate-in fade-in-0 duration-200', className)}
    >
      {children}
    </div>
  );
}