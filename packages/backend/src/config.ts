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

const insecureProductionSecrets = new Set([
  'dev-access-secret-change-me',
  'dev-refresh-secret-change-me',
  'replace-with-production-access-secret',
  'replace-with-production-refresh-secret',
])

function assertProductionSecretsAreSafe() {
  if (env.NODE_ENV !== 'production') return

  const problems: string[] = []
  if (insecureProductionSecrets.has(env.JWT_SECRET)) problems.push('JWT_SECRET')
  if (insecureProductionSecrets.has(env.REFRESH_TOKEN_SECRET)) problems.push('REFRESH_TOKEN_SECRET')

  try {
    const databaseUrl = new URL(env.DATABASE_URL)
    if (databaseUrl.password === 'stockpilot') problems.push('DATABASE_URL password')
  } catch {
    problems.push('DATABASE_URL')
  }

  if (problems.length > 0) {
    throw new Error(`Production configuration is using unsafe default secrets: ${problems.join(', ')}`)
  }
}

assertProductionSecretsAreSafe()
