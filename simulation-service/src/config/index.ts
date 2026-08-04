import { SimulationConfig } from '../types/index.js'

export const defaultConfig: SimulationConfig = {
  interval: 5000, // 5 seconds
  cpuDrift: 8, // ±8%
  ramDrift: 5, // ±5%
  diskDrift: 0.5, // ±0.5%
  temperatureDrift: 2, // ±2°C
  statusMutationRate: 0.005, // 0.5% chance per tick
  maintenanceMutationRate: 0.001, // 0.1% chance per tick
  offlineMutationRate: 0.002, // 0.2% chance per tick
}

export const supabaseConfig = {
  url: process.env.SUPABASE_URL || '',
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
}

export const serverConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  env: process.env.NODE_ENV || 'development',
}
