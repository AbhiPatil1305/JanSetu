import { z } from 'zod';

export const GrievanceSummarySchema = z.object({
  output_language: z.enum(['en', 'kn']).default('en'),
  short_summary: z.string().min(1, 'Short summary is required'),
  detailed_summary: z.string().min(1, 'Detailed summary is required'),
  requested_action: z.string().default(''),
  key_points: z.array(z.string()).default([]),
  confidence_score: z.number().min(0).max(1).default(0.85),
});

export type GrievanceSummary = z.infer<typeof GrievanceSummarySchema>;

