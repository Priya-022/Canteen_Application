import { withSupabase } from 'npm:@supabase/server@1.9.1'

const invalidCredentials = () =>
  Response.json({ error: 'Invalid user ID or password.' }, { status: 401 })

const unavailable = () =>
  Response.json({ error: 'Admin sign-in is temporarily unavailable. Please try again.' }, { status: 500 })

const handleAdminLogin = withSupabase(
  { auth: 'publishable' },
  async (request, { supabase, supabaseAdmin }) => {
    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed.' }, { status: 405 })
    }

    let payload: unknown
    try {
      payload = await request.json()
    } catch {
      return Response.json({ error: 'Enter a valid user ID and password.' }, { status: 400 })
    }

    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      return Response.json({ error: 'Enter a valid user ID and password.' }, { status: 400 })
    }

    const { username, password } = payload as Record<string, unknown>
    if (
      typeof username !== 'string'
      || typeof password !== 'string'
      || password.length === 0
      || password.length > 1024
    ) {
      return Response.json({ error: 'Enter a valid user ID and password.' }, { status: 400 })
    }

    const normalizedUsername = username.trim().toLowerCase()
    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(normalizedUsername)) {
      return invalidCredentials()
    }

    try {
      const { data: mapping, error: mappingError } = await supabaseAdmin
        .from('admin_login_users')
        .select('user_id')
        .eq('username', normalizedUsername)
        .maybeSingle()

      if (mappingError) {
        console.error('Could not look up the admin user ID.', mappingError)
        return unavailable()
      }
      if (!mapping) return invalidCredentials()

      const { data: accountData, error: accountError } = await supabaseAdmin.auth.admin
        .getUserById(mapping.user_id)
      if (accountError) {
        console.error('Could not verify the mapped admin account.', accountError)
        return unavailable()
      }

      const account = accountData.user
      if (!account.email || account.app_metadata.role !== 'admin') {
        return invalidCredentials()
      }

      const { data: authData, error: authError } = await supabase.auth
        .signInWithPassword({ email: account.email, password })
      if (authError) {
        if (authError.status === 429) {
          return Response.json(
            { error: 'Too many sign-in attempts. Wait a moment and try again.' },
            { status: 429 },
          )
        }
        return invalidCredentials()
      }

      if (
        !authData.session
        || authData.user.id !== account.id
        || authData.user.app_metadata.role !== 'admin'
      ) {
        return invalidCredentials()
      }

      return Response.json({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      })
    } catch (error: unknown) {
      console.error('Admin username sign-in failed unexpectedly.', error)
      return unavailable()
    }
  },
)

export default {
  fetch: handleAdminLogin,
}
