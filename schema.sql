-- ============================================================================
-- TwinLab Database Schema
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- User Management & RBAC
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'technician', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_auth_id ON user_profiles(auth_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- ============================================================================
-- Labs & Computers
-- ============================================================================

CREATE TABLE IF NOT EXISTS labs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT,
  layout_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_labs_name ON labs(name);

CREATE TABLE IF NOT EXISTS computers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lab_id UUID NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  asset_id TEXT NOT NULL UNIQUE,
  os TEXT,
  cpu TEXT,
  ram_gb INTEGER,
  storage_gb INTEGER,
  ip_address TEXT,
  mac_address TEXT,
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  rotation FLOAT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'maintenance')),
  purchase_date DATE,
  warranty_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_computers_lab_id ON computers(lab_id);
CREATE INDEX idx_computers_asset_id ON computers(asset_id);
CREATE INDEX idx_computers_status ON computers(status);
CREATE INDEX idx_computers_ip_address ON computers(ip_address);

-- ============================================================================
-- Metrics & Monitoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS computer_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  computer_id UUID NOT NULL REFERENCES computers(id) ON DELETE CASCADE,
  cpu_usage FLOAT NOT NULL DEFAULT 0,
  ram_usage FLOAT NOT NULL DEFAULT 0,
  disk_usage FLOAT NOT NULL DEFAULT 0,
  network_upload FLOAT NOT NULL DEFAULT 0,
  network_download FLOAT NOT NULL DEFAULT 0,
  temperature FLOAT NOT NULL DEFAULT 0,
  uptime BIGINT NOT NULL DEFAULT 0,
  running_processes INTEGER NOT NULL DEFAULT 0,
  health_score INTEGER NOT NULL DEFAULT 100,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_computer_metrics_computer_id ON computer_metrics(computer_id);
CREATE INDEX idx_computer_metrics_timestamp ON computer_metrics(timestamp DESC);
CREATE INDEX idx_computer_metrics_computer_timestamp ON computer_metrics(computer_id, timestamp DESC);

-- Retention policy: keep only last 30 days of metrics
-- Can be enforced via trigger or external cleanup job

CREATE TABLE IF NOT EXISTS health_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lab_id UUID NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL DEFAULT 100,
  cpu_component INTEGER NOT NULL DEFAULT 100,
  ram_component INTEGER NOT NULL DEFAULT 100,
  disk_component INTEGER NOT NULL DEFAULT 100,
  maintenance_component INTEGER NOT NULL DEFAULT 100,
  alert_component INTEGER NOT NULL DEFAULT 100,
  trend TEXT NOT NULL DEFAULT 'stable' CHECK (trend IN ('improving', 'declining', 'stable')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_health_scores_lab_id ON health_scores(lab_id);
CREATE INDEX idx_health_scores_timestamp ON health_scores(timestamp DESC);

-- ============================================================================
-- Software Inventory
-- ============================================================================

CREATE TABLE IF NOT EXISTS software_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  computer_id UUID NOT NULL REFERENCES computers(id) ON DELETE CASCADE,
  software_name TEXT NOT NULL,
  version TEXT,
  installed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_software_inventory_computer_id ON software_inventory(computer_id);
CREATE INDEX idx_software_inventory_software_name ON software_inventory(software_name);

-- ============================================================================
-- Alerts & Incidents
-- ============================================================================

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  computer_id UUID NOT NULL REFERENCES computers(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alerts_computer_id ON alerts(computer_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX idx_alerts_resolved_at ON alerts(resolved_at);

-- ============================================================================
-- Maintenance Tickets
-- ============================================================================

CREATE TABLE IF NOT EXISTS maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  computer_id UUID NOT NULL REFERENCES computers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  category TEXT,
  assigned_technician_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_by_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

CREATE INDEX idx_maintenance_tickets_computer_id ON maintenance_tickets(computer_id);
CREATE INDEX idx_maintenance_tickets_status ON maintenance_tickets(status);
CREATE INDEX idx_maintenance_tickets_priority ON maintenance_tickets(priority);
CREATE INDEX idx_maintenance_tickets_assigned_technician ON maintenance_tickets(assigned_technician_id);
CREATE INDEX idx_maintenance_tickets_created_at ON maintenance_tickets(created_at DESC);

CREATE TABLE IF NOT EXISTS ticket_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES maintenance_tickets(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  changed_by_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ticket_history_ticket_id ON ticket_history(ticket_id);
CREATE INDEX idx_ticket_history_created_at ON ticket_history(created_at DESC);

-- ============================================================================
-- Attachments (Schema only, no file storage in v1)
-- ============================================================================

CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES maintenance_tickets(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_attachments_ticket_id ON attachments(ticket_id);

-- ============================================================================
-- Row-Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE computers ENABLE ROW LEVEL SECURITY;
ALTER TABLE computer_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is an admin (SECURITY DEFINER avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE auth_id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- User can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = auth_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (public.is_admin());

-- Admins can update profiles
CREATE POLICY "Admins can update profiles" ON user_profiles
  FOR UPDATE USING (public.is_admin());

-- Admins can insert new user profiles
CREATE POLICY "Admins can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (public.is_admin());

-- All authenticated users can view labs
CREATE POLICY "Authenticated users can view labs" ON labs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Admins can manage labs
CREATE POLICY "Admins can manage labs" ON labs
  FOR ALL USING (public.is_admin());

-- All authenticated users can view computers
CREATE POLICY "Authenticated users can view computers" ON computers
  FOR SELECT USING (auth.role() = 'authenticated');

-- Admins can manage computers
CREATE POLICY "Admins can manage computers" ON computers
  FOR ALL USING (public.is_admin());

-- All authenticated users can view metrics
CREATE POLICY "Authenticated users can view metrics" ON computer_metrics
  FOR SELECT USING (auth.role() = 'authenticated');

-- All authenticated users can view health scores
CREATE POLICY "Authenticated users can view health scores" ON health_scores
  FOR SELECT USING (auth.role() = 'authenticated');

-- All authenticated users can view software inventory
CREATE POLICY "Authenticated users can view software" ON software_inventory
  FOR SELECT USING (auth.role() = 'authenticated');

-- All authenticated users can view alerts
CREATE POLICY "Authenticated users can view alerts" ON alerts
  FOR SELECT USING (auth.role() = 'authenticated');

-- All authenticated users can view maintenance tickets
CREATE POLICY "Authenticated users can view tickets" ON maintenance_tickets
  FOR SELECT USING (auth.role() = 'authenticated');

-- Technicians can update tickets assigned to them
CREATE POLICY "Technicians can update assigned tickets" ON maintenance_tickets
  FOR UPDATE USING (
    assigned_technician_id = (
      SELECT id FROM user_profiles WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    -- The technician must remain the assigned technician on the new row.
    -- Prevents reassigning the ticket to someone else or changing ownership.
    assigned_technician_id = (
      SELECT id FROM user_profiles WHERE auth_id = auth.uid()
    )
  );

-- Admins can manage all tickets
CREATE POLICY "Admins can manage tickets" ON maintenance_tickets
  FOR ALL USING (public.is_admin());

-- All authenticated users can view ticket history
CREATE POLICY "Authenticated users can view ticket history" ON ticket_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- Admins can record ticket history
CREATE POLICY "Admins can insert ticket history" ON ticket_history
  FOR INSERT WITH CHECK (public.is_admin());

-- Technicians can record history for tickets assigned to them
CREATE POLICY "Technicians can insert history for assigned tickets" ON ticket_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM maintenance_tickets
      WHERE maintenance_tickets.id = ticket_id
        AND maintenance_tickets.assigned_technician_id = (
          SELECT id FROM user_profiles WHERE auth_id = auth.uid()
        )
    )
  );

-- All authenticated users can view attachments
CREATE POLICY "Authenticated users can view attachments" ON attachments
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- Triggers for audit logging
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_labs_updated_at BEFORE UPDATE ON labs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_computers_updated_at BEFORE UPDATE ON computers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_tickets_updated_at BEFORE UPDATE ON maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Realtime Configuration
-- ============================================================================

-- Enable Realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE computer_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE computers;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE health_scores;
