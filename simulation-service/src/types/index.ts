export enum SimulationState {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

export interface SimulationConfig {
  interval: number; // milliseconds
  cpuDrift: number; // ±percentage per tick
  ramDrift: number;
  diskDrift: number;
  temperatureDrift: number;
  statusMutationRate: number; // 0-1, probability per tick
  maintenanceMutationRate: number;
  offlineMutationRate: number;
}

export interface ComputerMetricsUpdate {
  computer_id: string;
  cpu_usage: number;
  ram_usage: number;
  disk_usage: number;
  network_upload: number;
  network_download: number;
  temperature: number;
  uptime: number;
  running_processes: number;
  health_score: number;
  timestamp: string;
}

export interface ComputerStateCache {
  cpu: number;
  ram: number;
  disk: number;
  temperature: number;
  uptime: number;
  processes: number;
}
