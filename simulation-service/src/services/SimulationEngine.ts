import { SupabaseClient } from '@supabase/supabase-js'
import { SimulationState, SimulationConfig } from '../types/index.js'
import { MetricGenerationService } from './MetricGenerationService.js'
import { defaultConfig } from '../config/index.js'

export class SimulationEngine {
  private supabase: SupabaseClient
  private metricService: MetricGenerationService
  private state: SimulationState = SimulationState.IDLE
  private config: SimulationConfig
  private intervalId: NodeJS.Timeout | null = null
  private computers: Array<{ id: string; lab_id: string; status: string }> = []

  constructor(supabase: SupabaseClient, config: SimulationConfig = defaultConfig) {
    this.supabase = supabase
    this.config = config
    this.metricService = new MetricGenerationService(config)
  }

  /**
   * Initialize the simulation engine
   */
  async initialize(): Promise<void> {
    try {
      console.log('[Simulation] Initializing...')
      await this.loadComputers()
      console.log(`[Simulation] Loaded ${this.computers.length} computers`)
    } catch (error) {
      console.error('[Simulation] Initialization error:', error)
      throw error
    }
  }

  /**
   * Load all computers from database
   */
  private async loadComputers(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('computers')
        .select('id, lab_id, status')

      if (error) throw error

      this.computers = data || []
    } catch (error) {
      console.error('[Simulation] Error loading computers:', error)
      this.computers = []
    }
  }

  /**
   * Start the simulation
   */
  async start(): Promise<void> {
    if (this.state === SimulationState.RUNNING) {
      console.log('[Simulation] Already running')
      return
    }

    console.log('[Simulation] Starting simulation engine...')
    this.state = SimulationState.RUNNING

    // Load computers on start
    await this.loadComputers()

    // Start the tick loop
    this.intervalId = setInterval(() => {
      this.tick().catch((error) => {
        console.error('[Simulation] Tick error:', error)
      })
    }, this.config.interval)

    console.log(
      `[Simulation] Running with ${this.config.interval}ms interval`
    )
  }

  /**
   * Stop the simulation
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.state = SimulationState.STOPPED
    console.log('[Simulation] Stopped')
  }

  /**
   * Pause the simulation (can be resumed)
   */
  pause(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.state = SimulationState.PAUSED
    console.log('[Simulation] Paused')
  }

  /**
   * Resume the simulation
   */
  resume(): void {
    if (this.state !== SimulationState.PAUSED) {
      console.log('[Simulation] Not paused')
      return
    }

    this.state = SimulationState.RUNNING
    this.intervalId = setInterval(() => {
      this.tick().catch((error) => {
        console.error('[Simulation] Tick error:', error)
      })
    }, this.config.interval)

    console.log('[Simulation] Resumed')
  }

  /**
   * Main simulation tick
   */
  private async tick(): Promise<void> {
    try {
      // Generate metrics for all computers
      const updates = this.computers.map((computer) => {
        const metrics = this.metricService.generateMetricsForComputer(
          computer.id,
          computer.status
        )

        // Check for status mutations
        const mutation = this.metricService.shouldMutateStatus(computer.status)
        const newStatus = mutation.newStatus || computer.status

        return {
          ...metrics,
          timestamp: new Date().toISOString(),
          newStatus,
          computerId: computer.id,
        }
      })

      // Upsert metrics and update statuses
      await this.persistMetrics(updates)

      // Update computer statuses if changed
      const statusUpdates = updates
        .filter((u) => u.newStatus !== this.computers.find((c) => c.id === u.computerId)?.status)
        .map((u) => ({ id: u.computerId, status: u.newStatus }))

      if (statusUpdates.length > 0) {
        await this.updateComputerStatuses(statusUpdates)
      }
    } catch (error) {
      console.error('[Simulation] Tick processing error:', error)
    }
  }

  /**
   * Persist metrics to database
   */
  private async persistMetrics(
    updates: Array<Record<string, unknown>>
  ): Promise<void> {
    try {
      if (updates.length === 0) return

      const rows = updates.map((u) => ({
        computer_id: u.computer_id,
        cpu_usage: u.cpu_usage,
        ram_usage: u.ram_usage,
        disk_usage: u.disk_usage,
        network_upload: u.network_upload,
        network_download: u.network_download,
        temperature: u.temperature,
        uptime: u.uptime,
        running_processes: u.running_processes,
        health_score: u.health_score,
        timestamp: u.timestamp,
      }))

      const { error } = await this.supabase
        .from('computer_metrics')
        .insert(rows)

      if (error) {
        console.error('[Simulation] Error persisting metrics:', error)
      }
    } catch (error) {
      console.error('[Simulation] Persist metrics error:', error)
    }
  }

  /**
   * Update computer statuses
   */
  private async updateComputerStatuses(
    updates: Array<{ id: string; status: string }>
  ): Promise<void> {
    try {
      for (const update of updates) {
        const { error } = await this.supabase
          .from('computers')
          .update({ status: update.status, updated_at: new Date().toISOString() })
          .eq('id', update.id)

        if (error) {
          console.error(
            `[Simulation] Error updating computer ${update.id}:`,
            error
          )
        } else {
          console.log(
            `[Simulation] Updated computer ${update.id} status to ${update.status}`
          )
        }

        // Update local cache
        const computer = this.computers.find((c) => c.id === update.id)
        if (computer) {
          computer.status = update.status
        }
      }
    } catch (error) {
      console.error('[Simulation] Update statuses error:', error)
    }
  }

  /**
   * Get simulation status
   */
  getStatus(): {
    state: SimulationState
    config: SimulationConfig
    computerCount: number
  } {
    return {
      state: this.state,
      config: this.config,
      computerCount: this.computers.length,
    }
  }

  /**
   * Update configuration
   */
  updateConfig(partialConfig: Partial<SimulationConfig>): void {
    const wasRunning = this.state === SimulationState.RUNNING
    this.config = { ...this.config, ...partialConfig }
    console.log('[Simulation] Config updated:', this.config)

    // Restart the tick loop if the interval changed while running
    if (wasRunning && partialConfig.interval && this.config.interval > 0) {
      if (this.intervalId) {
        clearInterval(this.intervalId)
      }
      this.intervalId = setInterval(() => {
        this.tick().catch((error) => {
          console.error('[Simulation] Tick error:', error)
        })
      }, this.config.interval)
    }
  }
}
