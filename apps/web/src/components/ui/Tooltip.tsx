'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export function Tooltip({ content, children, position = 'top', delay = 200 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const childRef = useRef<HTMLElement>(null);

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const childWithHandlers = React.cloneElement(children, {
    ref: childRef,
    onMouseEnter: showTooltip,
    onMouseLeave: hideTooltip,
    onFocus: showTooltip,
    onBlur: hideTooltip,
  } as Record<string, unknown>);

  if (!isVisible || !childRef.current) {
    return childWithHandlers;
  }

  const rect = childRef.current.getBoundingClientRect();
  const tooltipWidth = 280;
  const gap = 8;

  let top = 0;
  let left = 0;

  switch (position) {
    case 'top':
      top = rect.top - gap;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      break;
    case 'bottom':
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - 20;
      left = rect.left - tooltipWidth - gap;
      break;
    case 'right':
      top = rect.top + rect.height / 2 - 20;
      left = rect.right + gap;
      break;
  }

  const portal = createPortal(
    <div
      className="fixed z-50 pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150"
      style={{ top: `${top}px`, left: `${left}px`, width: `${tooltipWidth}px` }}
      role="tooltip"
    >
      <div className="bg-brand-subtitle text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-normal">
        {content}
      </div>
      <div
        className="absolute w-0 h-0 border-5 border-transparent"
        style={{
          ...(position === 'top' && { bottom: '-10px', left: '50%', marginLeft: '-5px', borderTopColor: '#414141' }),
          ...(position === 'bottom' && { top: '-10px', left: '50%', marginLeft: '-5px', borderBottomColor: '#414141' }),
          ...(position === 'left' && { right: '-10px', top: '50%', marginTop: '-5px', borderLeftColor: '#414141' }),
          ...(position === 'right' && { left: '-10px', top: '50%', marginTop: '-5px', borderRightColor: '#414141' }),
        }}
      />
    </div>,
    document.body
  );

  return (
    <>
      {childWithHandlers}
      {portal}
    </>
  );
}