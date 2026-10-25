'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export function Tooltip({ content, children, position = 'top', delay = 200 }: TooltipProps) {
  const id = useId();
  const trigger = useRef<HTMLSpanElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const hide = () => { if (timer.current) clearTimeout(timer.current); setVisible(false); };
  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(true), delay);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useLayoutEffect(() => {
    if (!visible) return;
    const update = () => {
      if (!trigger.current || !tooltip.current) return;
      const rect = trigger.current.getBoundingClientRect();
      const { width, height } = tooltip.current.getBoundingClientRect();
      const gap = 8;
      let top = rect.top - height - gap;
      let left = rect.left + (rect.width - width) / 2;
      if (position === 'bottom') top = rect.bottom + gap;
      if (position === 'left' || position === 'right') {
        top = rect.top + (rect.height - height) / 2;
        left = position === 'left' ? rect.left - width - gap : rect.right + gap;
      }
      if (position === 'top' && top < gap) top = rect.bottom + gap;
      if (position === 'bottom' && top + height > window.innerHeight - gap) top = rect.top - height - gap;
      tooltip.current.style.top = `${Math.max(gap, Math.min(top, window.innerHeight - height - gap))}px`;
      tooltip.current.style.left = `${Math.max(gap, Math.min(left, window.innerWidth - width - gap))}px`;
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [visible, position, content]);
  const child = children as React.ReactElement<{ 'aria-describedby'?: string }>;
  const description = [child.props['aria-describedby'], visible ? id : undefined].filter(Boolean).join(' ') || undefined;
  return (
    <>
      <span ref={trigger} className="inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}
        onKeyDown={event => { if (event.key === 'Escape' && visible) { event.stopPropagation(); hide(); } }}>
        {React.cloneElement(child, { 'aria-describedby': description })}
      </span>
      {visible && createPortal(
        <div ref={tooltip} id={id} role="tooltip" style={{ maxWidth: 'calc(100vw - 16px)' }}
          className="fixed z-select w-max max-w-70 rounded-xl bg-brand-subtitle px-3 py-2 text-xs text-white shadow-popover pointer-events-none">
          {content}
        </div>, document.body
      )}
    </>
  );
}
