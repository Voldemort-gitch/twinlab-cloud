import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: new URL('../scripts/.env.local', import.meta.url).pathname })

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const adminPassword = process.env.ADMIN_PASSWORD || 'password'

console.log('SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
console.log('ADMIN_PASSWORD:', adminPassword === 'password' ? '⚠ default (set ADMIN_PASSWORD)' : '✓')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
console.log('Connected to Supabase')

async function resetAdminUser() {
  console.log('\nFinding admin user...')

  const { data: users } = await supabase.auth.admin.listUsers()
  const adminUser = users.users.find(u => u.email === 'admin@twinlab.local')

  if (adminUser) {
    console.log('Found admin user:', adminUser.id)
    console.log('Deleting user...')
    await supabase.auth.admin.deleteUser(adminUser.id)
    console.log('✓ User deleted')
  } else {
    console.log('No admin user found')
  }

  console.log('\nCreating new admin user...')
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@twinlab.local',
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Admin User' },
  })

  if (error) {
    console.error('Error creating user:', error)
    process.exit(1)
  }

  console.log('✓ User created:', data.user?.id)

  console.log('\nCreating user profile...')
  const { error: profileError } = await supabase.from('user_profiles').insert([{
    id: '550e8400-e29b-41d4-a716-446655440501',
    auth_id: data.user?.id,
    email: 'admin@twinlab.local',
    full_name: 'Admin User',
    role: 'admin',
  }])

  if (profileError) {
    console.error('Profile error:', profileError)
    process.exit(1)
  }
  console.log('✓ User profile created')

  console.log('\n✅ Admin user reset successfully!')
  console.log('Email: admin@twinlab.local')
  console.log(`Password: ${adminPassword === 'password' ? 'password (DEFAULT — change it!)' : 'from ADMIN_PASSWORD'}`)
}

resetAdminUser().catch(console.error)
