import { describe, expect, it } from 'vitest'
import { assertProductionSecretsAreSafe, type Env } from './config.js'

function baseEnv(overrides: Partial<Env> = {}): Env {
  return {
    DATABASE_URL: 'postgres://postgres:secure-password@db:5432/stockpilot',
    JWT_SECRET: 'a'.repeat(16),
    REFRESH_TOKEN_SECRET: 'b'.repeat(16),
    CORS_ORIGIN: 'https://app.stockpilot.test',
    PORT: 4000,
    NODE_ENV: 'production',
    TRUST_PROXY_HOPS: 1,
    ...overrides,
  }
}

describe('production config guard', () => {
  it('accepts safe production values', () => {
    expect(() => assertProductionSecretsAreSafe(baseEnv())).not.toThrow()
  })

  it('rejects localhost cors origins in production', () => {
    expect(() => assertProductionSecretsAreSafe(baseEnv({
      CORS_ORIGIN: 'https://app.stockpilot.test,http://localhost:3000',
    }))).toThrow(/CORS_ORIGIN localhost/)
  })

  it('rejects placeholder secrets in production', () => {
    expect(() => assertProductionSecretsAreSafe(baseEnv({
      JWT_SECRET: 'dev-access-secret-change-me',
    }))).toThrow(/JWT_SECRET/)
  })
})
