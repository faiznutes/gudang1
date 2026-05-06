import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
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

export function createApp() {
  const app = Fastify({
    logger: env.NODE_ENV === 'test' ? false : true,
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

  installErrorHandler(app)

  app.register(healthRoutes, { prefix: '/api' })
  app.register(authRoutes, { prefix: '/api/auth' })
  app.register(entitlementRoutes, { prefix: '/api/me' })
  app.register(inventoryRoutes, { prefix: '/api' })
  app.register(supplierRoutes, { prefix: '/api' })
  app.register(activityRoutes, { prefix: '/api' })
  app.register(analyticsRoutes, { prefix: '/api' })
  app.register(billingRoutes, { prefix: '/api' })
  app.register(adminRoutes, { prefix: '/api/admin' })

  app.addHook('onClose', async () => {
    await app.prisma.$disconnect()
  })

  return app
}
