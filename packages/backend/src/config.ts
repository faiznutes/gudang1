import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default('postgresql://stockpilot:stockpilot@localhost:5432/stockpilot?schema=public'),
  JWT_SECRET: z.string().min(16).default('dev-access-secret-change-me'),
  REFRESH_TOKEN_SECRET: z.string().min(16).default('dev-refresh-secret-change-me'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.string().default('development'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(3).default(0),
})

export type Env = z.infer<typeof envSchema>
export const env = envSchema.parse(process.env)

const insecureProductionSecrets = new Set([
  'dev-access-secret-change-me',
  'dev-refresh-secret-change-me',
  'replace-with-production-access-secret',
  'replace-with-production-refresh-secret',
])

export function assertProductionSecretsAreSafe(currentEnv: Env = env) {
  if (currentEnv.NODE_ENV !== 'production') return

  const problems: string[] = []
  if (insecureProductionSecrets.has(currentEnv.JWT_SECRET)) problems.push('JWT_SECRET')
  if (insecureProductionSecrets.has(currentEnv.REFRESH_TOKEN_SECRET)) problems.push('REFRESH_TOKEN_SECRET')

  try {
    const databaseUrl = new URL(currentEnv.DATABASE_URL)
    if (databaseUrl.password === 'stockpilot') problems.push('DATABASE_URL password')
  } catch {
    problems.push('DATABASE_URL')
  }

  const allowedProductionOrigins = currentEnv.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
  if (allowedProductionOrigins.length === 0) {
    problems.push('CORS_ORIGIN')
  }
  if (allowedProductionOrigins.some(origin => /localhost|127\.0\.0\.1/i.test(origin))) {
    problems.push('CORS_ORIGIN localhost')
  }

  if (problems.length > 0) {
    throw new Error(`Production configuration is using unsafe default secrets: ${problems.join(', ')}`)
  }
}

assertProductionSecretsAreSafe(env)
