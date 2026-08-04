// Enums
export enum UserRole {
  ADMIN = 'admin',
  TECHNICIAN = 'technician',
  VIEWER = 'viewer',
}

export enum ComputerStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance',
}

export enum TicketStatus {
  OPEN = 'open',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

// Database Models
export interface UserProfile {
  id: string;
  auth_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Lab {
  id: string;
  name: string;
  location: string;
  layout_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Computer {
  id: string;
  lab_id: string;
  name: string;
  asset_id: string;
  os: string;
  cpu: string;
  ram_gb: number;
  storage_gb: number;
  ip_address: string;
  mac_address: string;
  position_x: number;
  position_y: number;
  rotation: number;
  status: ComputerStatus;
  purchase_date?: string;
  warranty_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ComputerMetrics {
  id: string;
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

export interface HealthScore {
  id: string;
  lab_id: string;
  overall_score: number;
  cpu_component: number;
  ram_component: number;
  disk_component: number;
  maintenance_component: number;
  alert_component: number;
  trend: 'improving' | 'declining' | 'stable';
  timestamp: string;
}

export interface SoftwareInventory {
  id: string;
  computer_id: string;
  software_name: string;
  version: string;
  installed_date: string;
}

export interface Alert {
  id: string;
  computer_id: string;
  alert_type: string;
  severity: AlertSeverity;
  message: string;
  resolved_at?: string;
  created_at: string;
}

export interface MaintenanceTicket {
  id: string;
  computer_id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  assigned_technician_id?: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  notes?: string;
}

export interface TicketHistory {
  id: string;
  ticket_id: string;
  action: string;
  changed_by_id: string;
  old_value?: unknown;
  new_value?: unknown;
  created_at: string;
}

export interface Attachment {
  id: string;
  ticket_id: string;
  filename: string;
  file_url: string;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
