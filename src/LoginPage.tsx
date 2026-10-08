import { useState, type FormEvent } from 'react'

type LoginPageProps = {
  configured: boolean
  error: string
  busy: boolean
  onGuestLogin: () => void
  onAdminLogin: (email: string, password: string) => void
}

function LoginPage({ configured, error, busy, onGuestLogin, onAdminLogin }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function submitAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onAdminLogin(email.trim(), password)
  }

  return (
    <main className="login-page">
      <a className="login-brand" href="#login" aria-label="CanteenPulse home">
        <span className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></span>
        <span className="brand-name">Canteen<span>Pulse</span></span>
      </a>

      <section className="login-content">
        <div className="login-heading">
          <span className="login-eyebrow">A BETTER LUNCH BREAK STARTS HERE</span>
          <h1>Welcome to your<br />campus canteen<span>.</span></h1>
          <p>Check the crowd, find a quieter time, and see what’s on the menu.</p>
        </div>

        <div className="login-options">
          <article className="login-card guest-login-card">
            <span className="login-card-icon guest-icon" aria-hidden="true">♧</span>
            <span className="login-card-label">FOR STUDENTS & VISITORS</span>
            <h2>Continue as a guest</h2>
            <p>No account needed. Check crowd predictions and see today’s menu.</p>
            <button className="login-primary-button" type="button" disabled={!configured || busy} onClick={onGuestLogin}>
              {busy ? 'Connecting…' : 'Continue as guest'} <span aria-hidden="true">→</span>
            </button>
            <span className="login-note">Quick, private, and no sign-up required.</span>
          </article>

          <article className="login-card admin-login-card">
            <span className="login-card-icon admin-icon" aria-hidden="true">⌘</span>
            <span className="login-card-label">CANTEEN MANAGEMENT</span>
            <h2>Admin sign in</h2>
            <p>Manage menu items, prices, and what’s available today.</p>
            <form className="admin-login-form" onSubmit={submitAdmin}>
              <label htmlFor="admin-email">Email address</label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                placeholder="admin@college.edu"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
        <p className="login-privacy">Your sign-in is handled securely by Supabase. We never show or store admin passwords in the app.</p>
      </section>

      <footer className="login-footer"><span>Made for better campus breaks.</span><span>© CanteenPulse</span></footer>
    </main>
  )
}

export default LoginPage
