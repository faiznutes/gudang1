import { env } from './config.js'
import { createApp } from './server.js'

const app = createApp()

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
