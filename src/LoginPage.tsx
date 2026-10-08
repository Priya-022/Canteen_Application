import { useState, type FormEvent } from 'react'

type LoginPageProps = {
  configured: boolean
  error: string
  busy: boolean
  onBack: () => void
  onAdminLogin: (userId: string, password: string) => void
}

function LoginPage({ configured, error, busy, onBack, onAdminLogin }: LoginPageProps) {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')

  function submitAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onAdminLogin(userId.trim(), password)
  }

  return (
    <main className="login-page">
      <a className="login-brand" href="#login" aria-label="CanteenPulse home">
        <span className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></span>
        <span className="brand-name">Canteen<span>Pulse</span></span>
      </a>

      <section className="login-content">
        <div className="login-heading">
          <span className="login-eyebrow">CANTEEN MANAGEMENT</span>
          <h1>Admin sign in<span>.</span></h1>
          <p>Sign in with your assigned admin account to manage the canteen menu.</p>
        </div>

        <div className="login-options">
          <article className="login-card admin-login-card">
            <span className="login-card-icon admin-icon" aria-hidden="true">⌘</span>
            <span className="login-card-label">CANTEEN MANAGEMENT</span>
            <h2>Admin sign in</h2>
            <p>Manage menu items, prices, and what’s available today.</p>
            <form className="admin-login-form" onSubmit={submitAdmin}>
              <label htmlFor="admin-user-id">User ID</label>
              <input
                id="admin-user-id"
                type="text"
                autoComplete="username"
                placeholder="admin"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                required
              />
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button className="login-primary-button admin-submit-button" type="submit" disabled={!configured || busy}>
                {busy ? 'Signing in…' : 'Sign in to admin'} <span aria-hidden="true">→</span>
              </button>
            </form>
            <span className="login-note">Admin accounts are set up by your project administrator.</span>
          </article>
        </div>

        {!configured && (
          <div className="login-message setup-message" role="status">
            <strong>Supabase setup needed</strong>
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env.local</code>, then restart the dev server.
            See the setup steps in README.md.
          </div>
        )}
        {error && <div className="login-message error-message" role="alert">{error}</div>}
        <button className="top-signout" type="button" onClick={onBack}>Back to guest view</button>
      </section>

      <footer className="login-footer"><span>Made for better campus breaks.</span><span>© CanteenPulse</span></footer>
    </main>
  )
}

export default LoginPage
