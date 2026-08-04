import { ComputerMetricsUpdate, ComputerStateCache, SimulationConfig } from '../types/index.js'

export class MetricGenerationService {
  private computerStateCache: Map<string, ComputerStateCache> = new Map()
  private config: SimulationConfig

  constructor(config: SimulationConfig) {
    this.config = config
  }

  /**
   * Initialize cache for a computer with realistic starting values
   */
  private initializeComputerState(computerId: string): ComputerStateCache {
    const state: ComputerStateCache = {
      cpu: Math.random() * 40 + 10, // 10-50%
      ram: Math.random() * 30 + 20, // 20-50%
      disk: Math.random() * 20 + 30, // 30-50%
      temperature: Math.random() * 15 + 45, // 45-60°C
      uptime: Math.random() * 1000000, // Random uptime in seconds
      processes: Math.floor(Math.random() * 200 + 50), // 50-250 processes
    }
    this.computerStateCache.set(computerId, state)
    return state
  }

  /**
   * Get or initialize computer state
   */
  private getComputerState(computerId: string): ComputerStateCache {
    if (!this.computerStateCache.has(computerId)) {
      return this.initializeComputerState(computerId)
    }
    return this.computerStateCache.get(computerId)!
  }

  /**
   * Apply realistic drift to a metric
   */
  private applyDrift(
    currentValue: number,
    maxDrift: number,
    min: number,
    max: number
  ): number {
    const drift = (Math.random() - 0.5) * 2 * maxDrift
    const newValue = currentValue + drift
    return Math.max(min, Math.min(max, newValue))
  }

  /**
   * Generate metrics for a single computer
   */
  generateMetricsForComputer(
    computerId: string,
    status: string
  ): Omit<ComputerMetricsUpdate, 'timestamp'> {
    const state = this.getComputerState(computerId)

    // Apply drift to metrics
    state.cpu = this.applyDrift(state.cpu, this.config.cpuDrift, 5, 95)
    state.ram = this.applyDrift(state.ram, this.config.ramDrift, 20, 90)
    state.disk = this.applyDrift(state.disk, this.config.diskDrift, 0, 100)
    state.temperature = this.applyDrift(
      state.temperature,
      this.config.temperatureDrift,
      35,
      85
    )

    // Update uptime (accumulate seconds)
    if (status === 'online') {
      state.uptime += this.config.interval / 1000 // Add seconds
    } else {
      state.uptime = 0 // Reset on offline
    }

    // Update processes based on CPU load
    const baseProcCount = Math.floor(50 + state.cpu * 2)
    state.processes = baseProcCount + Math.floor(Math.random() * 50)

    // Calculate health score
    const cpuHealth = Math.max(0, 100 - state.cpu * 1.2)
    const ramHealth = Math.max(0, 100 - state.ram * 1.2)
    const diskHealth = Math.max(0, 100 - state.disk * 1.1)
    const tempHealth = Math.max(0, 100 - (state.temperature - 35) * 2)
    const healthScore =
      (cpuHealth * 0.3 + ramHealth * 0.3 + diskHealth * 0.2 + tempHealth * 0.2) / 100

    return {
      computer_id: computerId,
      cpu_usage: Math.round(state.cpu * 100) / 100,
      ram_usage: Math.round(state.ram * 100) / 100,
      disk_usage: Math.round(state.disk * 100) / 100,
      network_upload: Math.random() * 50, // 0-50 MB/s
      network_download: Math.random() * 100, // 0-100 MB/s
      temperature: Math.round(state.temperature * 10) / 10,
      uptime: Math.floor(state.uptime),
      running_processes: state.processes,
      health_score: Math.round(healthScore * 100),
    }
  }

  /**
   * Determine if status should mutate
   */
  shouldMutateStatus(currentStatus: string): {
    shouldChange: boolean
    newStatus?: string
  } {
    const rand = Math.random()

    if (currentStatus === 'online') {
      if (rand < this.config.offlineMutationRate) {
        return { shouldChange: true, newStatus: 'offline' }
      }
      if (rand < this.config.offlineMutationRate + this.config.maintenanceMutationRate) {
        return { shouldChange: true, newStatus: 'maintenance' }
      }
    }

    if (currentStatus === 'offline') {
      if (rand < this.config.statusMutationRate) {
        // Recovery probability driven by the configurable statusMutationRate
        return { shouldChange: true, newStatus: 'online' }
      }
    }

    if (currentStatus === 'maintenance') {
      if (rand < this.config.statusMutationRate) {
        // Recovery probability driven by the configurable statusMutationRate
        return { shouldChange: true, newStatus: 'online' }
      }
    }

    return { shouldChange: false }
  }

  /**
   * Clear cache for testing/reset
   */
  clearCache(): void {
    this.computerStateCache.clear()
  }
}
