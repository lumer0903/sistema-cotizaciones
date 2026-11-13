'use client';

import { useState, useCallback, useRef } from 'react';
import type { ColSpan, RowSpan } from '../types/dashboard';

export const ALLOWED_COLS: ColSpan[] = [2, 3, 4, 6, 8, 12];
export const ALLOWED_ROWS: RowSpan[] = [1, 2, 3, 4];

export const COL_SPAN_CLASSES: Record<ColSpan, string> = {
  2: 'col-span-1 md:col-span-2 xl:col-span-2',
  3: 'col-span-1 md:col-span-3 xl:col-span-3',
  4: 'col-span-1 md:col-span-3 xl:col-span-4',
  6: 'col-span-1 md:col-span-6 xl:col-span-6',
  8: 'col-span-1 md:col-span-6 xl:col-span-8',
  12: 'col-span-1 md:col-span-6 xl:col-span-12',
};

export const ROW_SPAN_CLASSES: Record<RowSpan, string> = {
  1: 'row-span-1 min-h-[132px]',
  2: 'row-span-2 min-h-[280px]',
  3: 'row-span-3 min-h-[428px]',
  4: 'row-span-4 min-h-[576px]',
};

export function useCardResize({
  colSpan = 4,
  rowSpan = 1,
  onResize,
}: {
  colSpan?: ColSpan;
  rowSpan?: RowSpan;
  onResize: (colSpan: ColSpan, rowSpan: RowSpan) => void;
}) {
  const [isResizing, setIsResizing] = useState(false);
  const [previewCol, setPreviewCol] = useState<ColSpan>(colSpan);
  const [previewRow, setPreviewRow] = useState<RowSpan>(rowSpan);

  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    startCol: ColSpan;
    startRow: RowSpan;
    colWidth: number;
  }>({ startX: 0, startY: 0, startCol: colSpan, startRow: rowSpan, colWidth: 100 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      e.stopPropagation();
      e.preventDefault();

      const card = e.currentTarget.closest('[data-bento-card]') as HTMLElement | null;
      const grid = card?.parentElement as HTMLElement | null;
      const gridWidth = grid ? grid.clientWidth : 1200;
      // En grilla de 12 columnas con gap-4 (16px), 11 gaps = 176px
      const colWidth = Math.max(60, (gridWidth - 176) / 12);

      dragStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startCol: colSpan,
        startRow: rowSpan,
        colWidth,
      };

      setIsResizing(true);
      setPreviewCol(colSpan);
      setPreviewRow(rowSpan);

      const handlePointerMove = (ev: PointerEvent) => {
        const { startX, startY, startCol, startRow, colWidth } = dragStartRef.current;
        const deltaX = ev.clientX - startX;
        const deltaY = ev.clientY - startY;

        // Ajuste horizontal de columnas
        const colSteps = Math.round(deltaX / colWidth);
        const rawCol = startCol + colSteps;
        const snappedCol = ALLOWED_COLS.reduce((prev, curr) =>
          Math.abs(curr - rawCol) < Math.abs(prev - rawCol) ? curr : prev
        );

        // Ajuste vertical de filas (132px altura base + 16px gap = 148px)
        const rowSteps = Math.round(deltaY / 148);
        const rawRow = Math.max(1, Math.min(4, startRow + rowSteps)) as RowSpan;

        setPreviewCol(snappedCol);
        setPreviewRow(rawRow);
      };

      const handlePointerUp = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);

        const { startX, startY, startCol, startRow, colWidth } = dragStartRef.current;
        const deltaX = ev.clientX - startX;
        const deltaY = ev.clientY - startY;

        const colSteps = Math.round(deltaX / colWidth);
        const rawCol = startCol + colSteps;
        const finalCol = ALLOWED_COLS.reduce((prev, curr) =>
          Math.abs(curr - rawCol) < Math.abs(prev - rawCol) ? curr : prev
        );

        const rowSteps = Math.round(deltaY / 148);
        const finalRow = Math.max(1, Math.min(4, startRow + rowSteps)) as RowSpan;

        setIsResizing(false);
        onResize(finalCol, finalRow);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [colSpan, rowSpan, onResize]
  );

  const stepSize = useCallback(
    (direction: 'smaller' | 'larger') => {
      const colIdx = ALLOWED_COLS.indexOf(colSpan);
      const rowIdx = ALLOWED_ROWS.indexOf(rowSpan);

      if (direction === 'smaller') {
        const nextCol = colIdx > 0 ? ALLOWED_COLS[colIdx - 1] : colSpan;
        const nextRow = rowIdx > 0 ? ALLOWED_ROWS[rowIdx - 1] : rowSpan;
        onResize(nextCol, nextRow);
      } else {
        const nextCol = colIdx < ALLOWED_COLS.length - 1 ? ALLOWED_COLS[colIdx + 1] : colSpan;
        const nextRow = rowIdx < ALLOWED_ROWS.length - 1 ? ALLOWED_ROWS[rowIdx + 1] : rowSpan;
        onResize(nextCol, nextRow);
      }
    },
    [colSpan, rowSpan, onResize]
  );

  const stepWidth = useCallback(
    (direction: 'smaller' | 'larger') => {
      const colIdx = ALLOWED_COLS.indexOf(colSpan);
      if (direction === 'smaller') {
        const nextCol = colIdx > 0 ? ALLOWED_COLS[colIdx - 1] : colSpan;
        onResize(nextCol, rowSpan);
      } else {
        const nextCol = colIdx < ALLOWED_COLS.length - 1 ? ALLOWED_COLS[colIdx + 1] : colSpan;
        onResize(nextCol, rowSpan);
      }
    },
    [colSpan, rowSpan, onResize]
  );

  const stepHeight = useCallback(
    (direction: 'smaller' | 'larger') => {
      const rowIdx = ALLOWED_ROWS.indexOf(rowSpan);
      if (direction === 'smaller') {
        const nextRow = rowIdx > 0 ? ALLOWED_ROWS[rowIdx - 1] : rowSpan;
        onResize(colSpan, nextRow);
      } else {
        const nextRow = rowIdx < ALLOWED_ROWS.length - 1 ? ALLOWED_ROWS[rowIdx + 1] : rowSpan;
        onResize(colSpan, nextRow);
      }
    },
    [colSpan, rowSpan, onResize]
  );

  return {
    isResizing,
    activeColSpan: isResizing ? previewCol : colSpan,
    activeRowSpan: isResizing ? previewRow : rowSpan,
    handlePointerDown,
    stepSize,
    stepWidth,
    stepHeight,
  };
}

