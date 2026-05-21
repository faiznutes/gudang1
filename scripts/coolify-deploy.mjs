const requiredEnv = [
  'COOLIFY_API_URL',
  'COOLIFY_API_TOKEN',
  'COOLIFY_FRONTEND_APP_UUID',
  'PROD_BASE_URL',
]

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
}

const coolifyBase = new URL('/api/v1/', process.env.COOLIFY_API_URL)
const prodBase = new URL(process.env.PROD_BASE_URL)
const apiToken = process.env.COOLIFY_API_TOKEN
const backendUuid = process.env.COOLIFY_BACKEND_APP_UUID
const frontendUuid = process.env.COOLIFY_FRONTEND_APP_UUID
const pollIntervalMs = Number(process.env.DEPLOY_POLL_INTERVAL_MS ?? 15000)
const timeoutMs = Number(process.env.DEPLOY_TIMEOUT_MS ?? 20 * 60 * 1000)

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithTimeout(url, init = {}, timeout = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

async function triggerDeploy(resourceUuid, label) {
  const url = new URL('deploy', coolifyBase)
  url.searchParams.set('uuid', resourceUuid)
  url.searchParams.set('force', 'true')

  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      Accept: 'application/json',
    },
  }, 15000)

  const payloadText = await response.text()
  if (!response.ok) {
    throw new Error(`Failed to trigger ${label} deploy: ${response.status} ${payloadText}`)
  }

  const payload = JSON.parse(payloadText)
  const deployments = Array.isArray(payload.deployments) ? payload.deployments : []
  const deploymentUuids = deployments
    .map(deployment => deployment.deployment_uuid)
    .filter(Boolean)

  if (deploymentUuids.length === 0) {
    throw new Error(`Coolify did not return a deployment UUID for ${label}: ${payloadText}`)
  }

  console.log(`[deploy] triggered ${label}: ${deploymentUuids.join(', ')}`)
  return deploymentUuids.map(deploymentUuid => ({ deploymentUuid, label }))
}

function isFinishedStatus(status) {
  return ['finished', 'success', 'successful'].includes(String(status).toLowerCase())
}

function isFailedStatus(status) {
  const normalized = String(status).toLowerCase()
  return ['failed', 'error', 'cancelled', 'canceled'].includes(normalized) || normalized.includes('failed')
}

async function waitForDeployment(deploymentUuid, label, deadline) {
  let attempt = 0
  while (Date.now() < deadline) {
    attempt += 1
    const response = await fetchWithTimeout(new URL(`deployments/${deploymentUuid}`, coolifyBase), {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: 'application/json',
      },
    }, 15000)

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(`Failed to inspect ${label} deployment ${deploymentUuid}: ${response.status}`)
    }

    if (isFinishedStatus(payload.status)) {
      console.log(`[deploy] ${label} deployment ${deploymentUuid} finished on attempt ${attempt}`)
      return
    }

    if (isFailedStatus(payload.status)) {
      throw new Error(`${label} deployment ${deploymentUuid} failed with status ${payload.status}`)
    }

    console.log(`[deploy] waiting for ${label} deployment ${deploymentUuid} (attempt ${attempt}, status: ${payload.status ?? 'unknown'})`)
    await sleep(pollIntervalMs)
  }

  throw new Error(`Timed out waiting for ${label} deployment ${deploymentUuid}`)
}

async function verifyProductionHealth() {
  const [healthRes, appRes, rootRes, manifestRes, swRes] = await Promise.all([
    fetchWithTimeout(new URL('/api/health', prodBase)),
    fetchWithTimeout(new URL('/app', prodBase)),
    fetchWithTimeout(new URL('/', prodBase)),
    fetchWithTimeout(new URL('/manifest.json', prodBase)),
    fetchWithTimeout(new URL('/sw.js', prodBase)),
  ])

  if (!healthRes.ok) {
    throw new Error(`Backend health returned ${healthRes.status}`)
  }
  const health = await healthRes.json()
  if (!health?.ok) {
    throw new Error(`Backend health payload not ready: ${JSON.stringify(health)}`)
  }

  if (!appRes.ok) {
    throw new Error(`Tenant shell returned ${appRes.status}`)
  }
  const appHtml = await appRes.text()
  if (!appHtml.includes('/assets/')) {
    throw new Error('Tenant shell does not reference built assets yet')
  }

  if (!rootRes.ok) {
    throw new Error(`Landing page returned ${rootRes.status}`)
  }

  if (!manifestRes.ok) {
    throw new Error(`Manifest returned ${manifestRes.status}`)
  }

  if (!swRes.ok) {
    throw new Error(`Service worker returned ${swRes.status}`)
  }

  return true
}

async function waitForHealthyDeployment(deadline) {
  let attempt = 0
  while (Date.now() < deadline) {
    attempt += 1
    try {
      await verifyProductionHealth()
      console.log(`[deploy] production is healthy on attempt ${attempt}`)
      return
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`[deploy] waiting for healthy deployment (attempt ${attempt}): ${message}`)
      await sleep(pollIntervalMs)
    }
  }

  throw new Error('Timed out waiting for production health checks to pass')
}

async function main() {
  const deadline = Date.now() + timeoutMs

  const deployTargets = new Map([
    [frontendUuid, 'frontend'],
  ])
  if (backendUuid && backendUuid !== frontendUuid) {
    deployTargets.set(backendUuid, 'backend')
  }

  for (const [resourceUuid, label] of deployTargets) {
    const deployments = await triggerDeploy(resourceUuid, label)
    for (const deployment of deployments) {
      await waitForDeployment(deployment.deploymentUuid, deployment.label, deadline)
    }
  }
  await waitForHealthyDeployment(deadline)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
