import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16).default('dev-access-secret-change-me'),
  REFRESH_TOKEN_SECRET: z.string().min(16).default('dev-refresh-secret-change-me'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.string().default('development'),
})

export const env = envSchema.parse(process.env)
