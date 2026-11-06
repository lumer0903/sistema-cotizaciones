'use client';

import { useEffect, useRef } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';

const layers: symbol[] = [];
const focusable = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** One keyboard owner per overlay stack, shared by dialogs and drawers. */
export function useDialogLayer(open: boolean, onClose: () => void, closeDisabled = false) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const disabledRef = useRef(closeDisabled);
  useEffect(() => { closeRef.current = onClose; disabledRef.current = closeDisabled; });
  useEffect(() => {
    if (!open) return;
    const token = Symbol();
    const previous = document.activeElement as HTMLElement | null;
    layers.push(token);
    const element = ref.current;
    const originalZ = element?.style.zIndex ?? '';
    if (element) element.style.zIndex = String(60 + layers.length * 2);
    lockBodyScroll();
    const candidates = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(focusable) ?? [])
      .filter(el => !el.closest('[inert], [hidden], [aria-hidden="true"]') && el.getAttribute('tabindex') !== '-1'
        && el.getAttribute('type') !== 'hidden' && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden');
    const focus = () => (candidates()[0] ?? ref.current)?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(focus);
    const onKeyDown = (event: KeyboardEvent) => {
      if (layers[layers.length - 1] !== token || event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!disabledRef.current) closeRef.current();
      }
      if (event.key === 'Tab') {
        const items = candidates();
        const first = items[0];
        const last = items[items.length - 1];
        if (!first) { event.preventDefault(); ref.current?.focus(); return; }
        if (!ref.current?.contains(document.activeElement) ||
            (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus({ preventScroll: true });
        }
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (layers[layers.length - 1] !== token) return;
      const target = event.target as Node;
      if (!ref.current?.contains(target)) focus();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      cancelAnimationFrame(frame);
      const wasTop = layers[layers.length - 1] === token;
      layers.splice(layers.indexOf(token), 1);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
      unlockBodyScroll();
      if (element) element.style.zIndex = originalZ;
      if (wasTop && previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);
  return ref;
}
