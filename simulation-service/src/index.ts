import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import { SimulationEngine } from './services/SimulationEngine.js'
import { serverConfig, supabaseConfig, defaultConfig } from './config/index.js'

const app = express()
app.use(express.json())

// CORS must come first so browser preflight (OPTIONS) is answered with 204
// before auth is checked — preflight requests cannot carry an Authorization header.
app.use((req, res, next) => {
  const origin = req.headers.origin
  res.setHeader('Access-Control-Allow-Origin', origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

// Optional shared-secret auth for the /simulation control endpoints.
// Enabled when SIM_API_TOKEN is set (recommended for public deployments).
// The frontend sends this as `Authorization: Bearer <token>` via
// NEXT_PUBLIC_SIMULATION_SERVICE_TOKEN. /health stays open for liveness checks.
const apiToken = process.env.SIM_API_TOKEN || ''

app.use('/simulation', (req, res, next) => {
  if (!apiToken) return next()
  const provided = req.headers.authorization
  if (provided !== `Bearer ${apiToken}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
})

// Initialize Supabase client
const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey)

// Initialize simulation engine
let engine: SimulationEngine | null = null

/**
 * Initialize the engine
 */
async function initializeEngine(): Promise<void> {
  try {
    engine = new SimulationEngine(supabase, defaultConfig)
    await engine.initialize()
    console.log('[Server] Simulation engine initialized')
  } catch (error) {
    console.error('[Server] Failed to initialize engine:', error)
    process.exit(1)
  }
}

// ============================================================================
// API Routes
// ============================================================================

/**
 * Health check endpoint
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

/**
 * Get simulation status
 */
app.get('/simulation/status', (_req, res) => {
  if (!engine) {
    return res.status(500).json({ error: 'Engine not initialized' })
  }

  const status = engine.getStatus()
  res.json(status)
})

/**
 * Start simulation
 */
app.post('/simulation/start', async (_req, res) => {
  if (!engine) {
    return res.status(500).json({ error: 'Engine not initialized' })
  }

  try {
    await engine.start()
    res.json({ message: 'Simulation started', status: engine.getStatus() })
  } catch (error) {
    console.error('Error starting simulation:', error)
    res.status(500).json({ error: 'Failed to start simulation' })
  }
})

/**
 * Stop simulation
 */
app.post('/simulation/stop', (_req, res) => {
  if (!engine) {
    return res.status(500).json({ error: 'Engine not initialized' })
  }

  engine.stop()
  res.json({ message: 'Simulation stopped', status: engine.getStatus() })
})

/**
 * Pause simulation
 */
app.post('/simulation/pause', (_req, res) => {
  if (!engine) {
    return res.status(500).json({ error: 'Engine not initialized' })
  }

  engine.pause()
  res.json({ message: 'Simulation paused', status: engine.getStatus() })
})

/**
 * Resume simulation
 */
app.post('/simulation/resume', (_req, res) => {
  if (!engine) {
    return res.status(500).json({ error: 'Engine not initialized' })
  }

  engine.resume()
  res.json({ message: 'Simulation resumed', status: engine.getStatus() })
})

/**
 * Update simulation config
 */
app.patch('/simulation/config', (req, res) => {
  if (!engine) {
    return res.status(500).json({ error: 'Engine not initialized' })
  }

  try {
    engine.updateConfig(req.body)
    res.json({ message: 'Config updated', status: engine.getStatus() })
  } catch (error) {
    console.error('Error updating config:', error)
    res.status(500).json({ error: 'Failed to update config' })
  }
})

// ============================================================================
// Error handling
// ============================================================================

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server] Error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// ============================================================================
// Server startup
// ============================================================================

async function start(): Promise<void> {
  try {
    console.log('[Server] Starting TwinLab Simulation Service...')
    console.log(`[Server] Environment: ${serverConfig.env}`)
    console.log(`[Server] Port: ${serverConfig.port}`)

    // Initialize engine
    await initializeEngine()

    // Start server
    app.listen(serverConfig.port, () => {
      console.log(
        `[Server] Listening on http://localhost:${serverConfig.port}`
      )
      console.log('[Server] Ready to accept commands')
      console.log('[Server] POST /simulation/start - Start the simulation')
      console.log('[Server] POST /simulation/stop - Stop the simulation')
      console.log('[Server] POST /simulation/pause - Pause the simulation')
      console.log('[Server] POST /simulation/resume - Resume the simulation')
      console.log('[Server] GET /simulation/status - Get simulation status')
    })
  } catch (error) {
    console.error('[Server] Fatal error:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...')
  if (engine) {
    engine.stop()
  }
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down...')
  if (engine) {
    engine.stop()
  }
  process.exit(0)
})

// Start the service
start()
