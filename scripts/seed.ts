import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: `${__dirname}/.env.local` })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ============================================================================
// Seed Data Generators
// ============================================================================

const labs = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Programming Lab',
    location: 'Building A, Room 101',
    layout_metadata: { rows: 4, columns: 6 },
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Networking Lab',
    location: 'Building B, Room 202',
    layout_metadata: { rows: 3, columns: 5 },
  },
]

const cpus = [
  'Intel Core i7-12700K',
  'Intel Core i5-12600K',
  'AMD Ryzen 7 5800X',
  'AMD Ryzen 5 5600X',
  'Intel Core i7-11700',
  'AMD Ryzen 9 3900X',
]

const osOptions = ['Windows 11 Pro', 'Windows 10 Pro', 'Ubuntu 22.04 LTS', 'CentOS 7']

const software = [
  { name: 'Visual Studio Code', version: '1.85.1' },
  { name: 'Python', version: '3.11.0' },
  { name: 'Git', version: '2.42.0' },
  { name: 'Docker', version: '24.0.0' },
  { name: 'Node.js', version: '20.10.0' },
  { name: 'PostgreSQL', version: '15.1' },
  { name: 'Chrome', version: '119.0.0' },
  { name: 'Firefox', version: '120.0' },
]

function generateComputersForLab(
  labId: string,
  labIndex: number,
  count: number,
  layout: { rows?: number; columns?: number }
) {
  const computers = []
  const startAssetId = labIndex * 100 + 1
  const columns = Math.max(1, layout.columns ?? 6)
  const rows = Math.max(1, layout.rows ?? 4)

  for (let i = 0; i < count; i++) {
    const assetId = startAssetId + i
    const row = Math.min(Math.floor(i / columns), rows - 1)
    const col = i % columns

    computers.push({
      id: `550e8400-e29b-41d4-a716-44665544${String(labIndex).padStart(2, '0')}${String(i).padStart(2, '0')}`,
      lab_id: labId,
      name: `PC-${String(assetId).padStart(3, '0')}`,
      asset_id: `PC-${String(assetId).padStart(3, '0')}`,
      os: osOptions[Math.floor(Math.random() * osOptions.length)],
      cpu: cpus[Math.floor(Math.random() * cpus.length)],
      ram_gb: [16, 32, 64][Math.floor(Math.random() * 3)],
      storage_gb: [256, 512, 1024][Math.floor(Math.random() * 3)],
      ip_address: `192.168.${100 + labIndex}.${100 + i}`,
      mac_address: generateMacAddress(),
      position_x: col * 220,
      position_y: row * 180,
      rotation: 0,
      status: 'online',
      purchase_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      warranty_date: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
    })
  }

  return computers
}

function generateMacAddress(): string {
  return Array.from({ length: 6 })
    .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0'))
    .join(':')
    .toUpperCase()
}

// Global counter for unique IDs
let metricIdCounter = 0

function generateMetricsHistory(computerId: string) {
  const metrics = []
  const now = Date.now()
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

  // Generate hourly metrics for the last 7 days
  for (let i = 0; i < 168; i++) {
    const timestamp = new Date(sevenDaysAgo + i * 60 * 60 * 1000)
    metricIdCounter++
    metrics.push({
      id: `550e8400-e29b-41d4-a716-${String(metricIdCounter).padStart(12, '0')}`,
      computer_id: computerId,
      cpu_usage: Math.random() * 80 + 10,
      ram_usage: Math.random() * 60 + 20,
      disk_usage: Math.random() * 40 + 30,
      network_upload: Math.random() * 50,
      network_download: Math.random() * 100,
      temperature: Math.random() * 20 + 45,
      uptime: Math.floor((now - sevenDaysAgo) / 1000 + Math.random() * 1000),
      running_processes: Math.floor(Math.random() * 200 + 50),
      health_score: Math.floor(Math.random() * 50 + 50),
      timestamp: timestamp.toISOString(),
    })
  }

  return metrics
}

function generateSoftwareInventory(computerId: string) {
  const installed = []
  const softwareToInstall = Math.floor(Math.random() * 4) + 3

  for (let i = 0; i < softwareToInstall; i++) {
    const soft = software[Math.floor(Math.random() * software.length)]
    installed.push({
      id: `550e8400-e29b-41d4-a716-${String(Math.floor(Math.random() * 1000000)).padStart(12, '0')}`,
      computer_id: computerId,
      software_name: soft.name,
      version: soft.version,
      installed_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
    })
  }

  return installed
}

function generateAlerts() {
  const alertTypes = [
    'High CPU Usage',
    'High RAM Usage',
    'Disk Space Low',
    'Temperature Warning',
    'Network Timeout',
    'Service Down',
  ]

  return [
    {
      id: '550e8400-e29b-41d4-a716-446655440101',
      computer_id: '550e8400-e29b-41d4-a716-446655440100',
      alert_type: 'High CPU Usage',
      severity: 'warning',
      message: 'CPU usage exceeded 90%',
      resolved_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440102',
      computer_id: '550e8400-e29b-41d4-a716-446655440101',
      alert_type: 'Disk Space Low',
      severity: 'critical',
      message: 'Disk usage at 95%',
      resolved_at: null,
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440103',
      computer_id: '550e8400-e29b-41d4-a716-446655440102',
      alert_type: 'Temperature Warning',
      severity: 'warning',
      message: 'Temperature above 80°C',
      resolved_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ]
}

function generateMaintenanceTickets(computerIds: string[], createdById: string) {
  const categories = ['Hardware', 'Software', 'Network', 'OS']
  const statuses = ['open', 'assigned', 'in_progress', 'resolved']

  return [
    {
      id: '550e8400-e29b-41d4-a716-446655440201',
      computer_id: computerIds[0],
      title: 'Replace faulty RAM module',
      description: 'One RAM stick is failing diagnostics',
      status: 'assigned',
      priority: 'high',
      category: 'Hardware',
      assigned_technician_id: null,
      created_by_id: createdById,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      resolved_at: null,
      notes: 'Ordered replacement RAM',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440202',
      computer_id: computerIds[1],
      title: 'Update antivirus definitions',
      description: 'Antivirus software needs latest updates',
      status: 'open',
      priority: 'medium',
      category: 'Software',
      assigned_technician_id: null,
      created_by_id: createdById,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      resolved_at: null,
      notes: null,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440203',
      computer_id: computerIds[2],
      title: 'Network connectivity issues',
      description: 'Intermittent network drops',
      status: 'in_progress',
      priority: 'critical',
      category: 'Network',
      assigned_technician_id: null,
      created_by_id: '550e8400-e29b-41d4-a716-446655440501',
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      resolved_at: null,
      notes: 'Waiting for network admin feedback',
    },
  ]
}

// ============================================================================
// Main Seeding Function
// ============================================================================

async function seed() {
  try {
    console.log('🌱 Starting database seeding...\n')

    // 1. Clear existing data (in reverse dependency order)
    console.log('🧹 Clearing existing data...')
    await supabase.from('attachments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('ticket_history').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('maintenance_tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('software_inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('computer_metrics').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('health_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('computers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('labs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    console.log('✓ Cleared existing data\n')

    // 2. Insert labs
    console.log('📚 Seeding labs...')
    const { error: labError } = await supabase.from('labs').insert(labs)
    if (labError) throw labError
    console.log(`✓ Created ${labs.length} labs\n`)

    // 3. Generate and insert computers
    console.log('💻 Seeding computers...')
    let allComputers: ReturnType<typeof generateComputersForLab> = []
    for (let i = 0; i < labs.length; i++) {
      const computerCount = i === 0 ? 14 : 12
      allComputers = allComputers.concat(
        generateComputersForLab(labs[i].id, i, computerCount, labs[i].layout_metadata)
      )
    }

    const { error: computerError } = await supabase.from('computers').insert(allComputers)
    if (computerError) throw computerError
    console.log(`✓ Created ${allComputers.length} computers\n`)

    // 4. Insert metrics history
    console.log('📊 Seeding metrics history...')
    let allMetrics: ReturnType<typeof generateMetricsHistory> = []
    for (const computer of allComputers) {
      allMetrics = allMetrics.concat(generateMetricsHistory(computer.id))
    }

    // Insert in batches to avoid payload size limits
    const batchSize = 500
    for (let i = 0; i < allMetrics.length; i += batchSize) {
      const batch = allMetrics.slice(i, i + batchSize)
      const { error: metricsError } = await supabase.from('computer_metrics').insert(batch)
      if (metricsError) throw metricsError
    }
    console.log(`✓ Created ${allMetrics.length} metric records\n`)

    // 5. Insert software inventory
    console.log('📦 Seeding software inventory...')
    let allSoftware: ReturnType<typeof generateSoftwareInventory> = []
    for (const computer of allComputers.slice(0, 10)) {
      allSoftware = allSoftware.concat(generateSoftwareInventory(computer.id))
    }

    const { error: softwareError } = await supabase.from('software_inventory').insert(allSoftware)
    if (softwareError) throw softwareError
    console.log(`✓ Created ${allSoftware.length} software records\n`)

    // 6. Insert alerts
    console.log('🚨 Seeding alerts...')
    const alerts = generateAlerts()
    const { error: alertError } = await supabase.from('alerts').insert(alerts)
    if (alertError) throw alertError
    console.log(`✓ Created ${alerts.length} alerts\n`)

    // 7. Create admin user profile (for maintenance tickets)
    // First create an auth user, then create the profile
    console.log('👤 Creating admin user...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@twinlab.local',
      password: 'password',
      email_confirm: true,
      user_metadata: {
        full_name: 'Admin User',
      },
    })
    
    // If user already exists, get their ID from auth.users
    let adminAuthId: string | undefined = authData.user?.id
    
    if (authError && authError.code === 'email_exists') {
      console.log('  User already exists, getting existing user...')
      const { data: existingUser } = await supabase.auth.admin.listUsers()
      adminAuthId = existingUser.users.find((u) => u.email === 'admin@twinlab.local')?.id
      console.log(`  Found user ID: ${adminAuthId}`)
    } else if (authError) {
      throw authError
    }
    
    // Create user profile if it doesn't exist
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_id', adminAuthId)
      .single()
    
    if (!existingProfile) {
      const { error: profileError } = await supabase.from('user_profiles').insert([{
        id: '550e8400-e29b-41d4-a716-446655440501',
        auth_id: adminAuthId,
        email: 'admin@twinlab.local',
        full_name: 'Admin User',
        role: 'admin',
      }])
      
      if (profileError) throw profileError
      console.log(`✓ Created admin user profile\n`)
    } else {
      console.log('✓ Admin user profile already exists\n')
    }

    // 8. Insert maintenance tickets
    console.log('🔧 Seeding maintenance tickets...')
    const computerIds = allComputers.slice(0, 5).map((c) => c.id)
    const tickets = generateMaintenanceTickets(computerIds, '550e8400-e29b-41d4-a716-446655440501')
    const { error: ticketError } = await supabase.from('maintenance_tickets').insert(tickets)
    if (ticketError) throw ticketError
    console.log(`✓ Created ${tickets.length} maintenance tickets\n`)

    console.log('✅ Database seeding completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`  - Labs: ${labs.length}`)
    console.log(`  - Computers: ${allComputers.length}`)
    console.log(`  - Metrics: ${allMetrics.length}`)
    console.log(`  - Software: ${allSoftware.length}`)
    console.log(`  - Alerts: ${alerts.length}`)
    console.log(`  - Tickets: ${tickets.length}`)
    console.log('\n🔑 Demo Credentials:')
    console.log('  Email: admin@twinlab.local')
    console.log('  Password: (check Supabase Auth)')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seed()
