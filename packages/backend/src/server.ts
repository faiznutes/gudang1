import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { PrismaClient } from '@prisma/client'
import { env } from './config.js'
import { installErrorHandler } from './lib/errors.js'
import { healthRoutes } from './routes/health.js'
import { authRoutes } from './routes/auth.js'
import { entitlementRoutes } from './routes/entitlements.js'
import { inventoryRoutes } from './routes/inventory.js'
import { supplierRoutes } from './routes/suppliers.js'
import { activityRoutes } from './routes/activities.js'
import { analyticsRoutes } from './routes/analytics.js'
import { adminRoutes } from './routes/admin.js'
import { billingRoutes } from './routes/billing.js'
import { notificationRoutes } from './routes/notifications.js'
import { importExportRoutes } from './routes/importExport.js'
import { adminManagementRoutes } from './routes/adminManagement.js'
import { adminMonetizationRoutes } from './routes/adminMonetization.js'
import { installSubscriptionLifecycle } from './lib/subscriptionLifecycle.js'

export function createApp() {
  const app = Fastify({
    logger: env.NODE_ENV === 'test' ? false : true,
    trustProxy: env.TRUST_PROXY_HOPS > 0 ? env.TRUST_PROXY_HOPS : false,
  })

  app.decorate('prisma', new PrismaClient())

  app.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true,
  })
  app.register(cookie)
  app.register(jwt, {
    secret: env.JWT_SECRET,
  })
  app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: '1 minute',
    ban: 0,
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    errorResponseBuilder: () => ({
      statusCode: 429,
      code: 'rate_limited',
      message: 'Terlalu banyak percobaan. Coba lagi sebentar.',
    }),
  })

  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
    return payload
  })

  installErrorHandler(app)

  app.register(healthRoutes, { prefix: '/api' })
  app.register(authRoutes, { prefix: '/api/auth' })
  app.register(entitlementRoutes, { prefix: '/api/me' })
  app.register(inventoryRoutes, { prefix: '/api' })
  app.register(supplierRoutes, { prefix: '/api' })
  app.register(activityRoutes, { prefix: '/api' })
  app.register(analyticsRoutes, { prefix: '/api' })
  app.register(billingRoutes, { prefix: '/api' })
  app.register(notificationRoutes, { prefix: '/api' })
  app.register(importExportRoutes, { prefix: '/api' })
  app.register(adminRoutes, { prefix: '/api/admin' })
  app.register(adminManagementRoutes, { prefix: '/api/admin' })
  app.register(adminMonetizationRoutes, { prefix: '/api/admin' })
  installSubscriptionLifecycle(app)

  app.addHook('onClose', async () => {
    await app.prisma.$disconnect()
  })

  return app
}
