import { z } from 'zod';

export const metricaQuerySchema = z.object({
  fechaInicio: z.string().datetime().optional(),
  fechaFin: z.string().datetime().optional(),
  vendedorId: z.coerce.number().int().positive().optional(),
});

export type MetricaQueryInput = z.infer<typeof metricaQuerySchema>;

export const kpiMensualesSchema = z.object({
  año: z.coerce.number().int().min(2020).max(2030).optional(),
  mes: z.coerce.number().int().min(1).max(12).optional(),
});

export type KpiMensualesInput = z.infer<typeof kpiMensualesSchema>;