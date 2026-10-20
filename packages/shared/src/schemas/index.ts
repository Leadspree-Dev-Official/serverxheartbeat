import { z } from 'zod';

export const cronExpressionRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/[0-9]+)\s+(\*|([0-9]|1[0-9]|2[0-3])|\*\/[0-9]+)\s+(\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/[0-9]+)\s+(\*|([1-9]|1[0-2])|\*\/[0-9]+)\s+(\*|([0-7])|[A-Za-z]{3}|\*\/[0-9]+)$/;

export const safeUrlSchema = z.string().url().refine((url) => {
  try {
    const parsed = new URL(url);
    // Enforce HTTPS or allow HTTP only in explicit development test
    return ['https:', 'http:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}, { message: 'URL must have a valid http or https protocol' });

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  provider: z.enum(['supabase', 'appwrite', 'generic']),
  environment: z.enum(['development', 'staging', 'production']).default('production'),
  base_url: safeUrlSchema,
  endpoint_path: z.string().default(''),
  http_method: z.enum(['GET', 'POST', 'HEAD']).default('GET'),
  auth_type: z.enum(['none', 'bearer', 'api_key', 'basic']).default('none'),
  secret_ref: z.string().optional().nullable(),
  auth_value: z.string().optional(), // In-transit only for creation/update
  custom_headers: z.record(z.string()).default({}),
  expected_status_codes: z.array(z.number().int()).min(1).default([200, 204]),
  timeout_ms: z.number().int().min(1000).max(60000).default(10000),
  retry_count: z.number().int().min(0).max(5).default(2),
  schedule_id: z.string().uuid().optional().nullable(),
  enabled: z.boolean().default(true),
});

export const updateProjectSchema = createProjectSchema.partial();

export const endpointTestSchema = z.object({
  provider: z.enum(['supabase', 'appwrite', 'generic']),
  base_url: safeUrlSchema,
  endpoint_path: z.string().default(''),
  http_method: z.enum(['GET', 'POST', 'HEAD']).default('GET'),
  auth_type: z.enum(['none', 'bearer', 'api_key', 'basic']).default('none'),
  auth_value: z.string().optional(),
  custom_headers: z.record(z.string()).optional(),
  expected_status_codes: z.array(z.number().int()).default([200]),
  timeout_ms: z.number().int().min(1000).max(60000).default(10000),
});

export const scheduleUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  cron_expression: z.string().min(9).max(50),
  timezone: z.string().min(1).default('Asia/Kolkata'),
  enabled: z.boolean().optional(),
});
