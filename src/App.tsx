import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import './App.css'
import AdminPanel from './AdminPanel'
import LoginPage from './LoginPage'
import type { CanteenMenuItem } from './menuTypes'
import { supabase } from './supabase'

type CrowdLevel = 'Quiet' | 'Moderate' | 'Busy'
type FeedbackLevel = 'quiet' | 'moderate' | 'busy'
type FeedbackStore = Record<string, Record<FeedbackLevel, number>>

const timeSlots = [
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '1:00 PM',
  '1:30 PM',
  '2:00 PM',
  '2:30 PM',
  '3:00 PM',
  '3:30 PM',
  '4:00 PM',
]

const crowdByTime = [28, 43, 76, 91, 96, 86, 73, 59, 41, 27, 17]
const peakHours = [
  { time: '11 AM', value: 28 },
  { time: '12 PM', value: 83 },
  { time: '1 PM', value: 96 },
  { time: '2 PM', value: 69 },
  { time: '3 PM', value: 39 },
  { time: '4 PM', value: 18 },
]

function localDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function readFeedback(): { value: FeedbackStore; error: boolean } {
  try {
    const stored = localStorage.getItem('canteenpulse-feedback')
    return { value: stored ? (JSON.parse(stored) as FeedbackStore) : {}, error: false }
  } catch (error) {
    console.error('Could not read saved feedback.', error)
    return { value: {}, error: true }
  }
}

function getCrowd(score: number): CrowdLevel {
  if (score < 40) return 'Quiet'
  if (score < 70) return 'Moderate'
  return 'Busy'
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(supabase === null)
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [date, setDate] = useState(() => localDateString(new Date()))
  const [time, setTime] = useState('12:30 PM')
  const [savedFeedback, setSavedFeedback] = useState(() => readFeedback())
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackLevel | null>(null)
  const [activeNav, setActiveNav] = useState('overview')
  const [menuItems, setMenuItems] = useState<CanteenMenuItem[]>([])
  const [menuLoadedFor, setMenuLoadedFor] = useState<string | null>(null)
  const [menuLoadError, setMenuLoadError] = useState('')
  const isAdmin = session?.user.is_anonymous !== true && session?.user.app_metadata.role === 'admin'
  const isGuest = session?.user.is_anonymous === true
  const viewerMode = isAdmin ? 'admin' : isGuest ? 'guest' : null

  useEffect(() => {
    if (!supabase) return

    let active = true
    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (!active) return
        if (error) setAuthError(error.message)
        setSession(data.session)
        setAuthReady(true)
      } catch (error: unknown) {
        if (!active) return
        console.error('Could not restore the Supabase session.', error)
        setAuthError(error instanceof Error ? error.message : 'Could not restore your session.')
        setAuthReady(true)
      }
    })()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !viewerMode) return

    let active = true
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('canteen_menu')
          .select('id, name, category, price, is_available')
          .order('name')
        if (!active) return
        if (error) {
          console.error('Could not load the canteen menu.', error)
          setMenuLoadError(error.message)
        } else {
          setMenuLoadError('')
          setMenuItems(data)
        }
        setMenuLoadedFor(viewerMode)
      } catch (error: unknown) {
        if (!active) return
        console.error('Could not load the canteen menu.', error)
        setMenuLoadError(error instanceof Error ? error.message : 'Could not load the canteen menu.')
        setMenuLoadedFor(viewerMode)
      }
    })()

    return () => {
      active = false
    }
  }, [viewerMode])

  async function signInAsGuest() {
    if (!supabase) return
    setAuthBusy(true)
    setAuthError('')
    try {
      const { error } = await supabase.auth.signInAnonymously()
      if (error) {
        console.error('Guest sign-in failed.', error)
        setAuthError(error.message)
      }
    } catch (error: unknown) {
      console.error('Guest sign-in failed.', error)
      setAuthError(error instanceof Error ? error.message : 'Guest sign-in failed. Please try again.')
    } finally {
      setAuthBusy(false)
    }
  }

  async function signInAsAdmin(email: string, password: string) {
    if (!supabase) return
    setAuthBusy(true)
    setAuthError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        console.error('Admin sign-in failed.', error)
        setAuthError(error.message)
        return
      }

      if (data.user.app_metadata.role !== 'admin') {
        const { error: signOutError } = await supabase.auth.signOut()
        if (signOutError) console.error('Could not end the unauthorized session.', signOutError)
        setAuthError('This account does not have canteen admin access. Please use an assigned admin account.')
      }
    } catch (error: unknown) {
      console.error('Admin sign-in failed.', error)
      setAuthError(error instanceof Error ? error.message : 'Admin sign-in failed. Please try again.')
    } finally {
      setAuthBusy(false)
    }
  }

  async function signOut() {
    if (!supabase) return
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out failed.', error)
        setAuthError(error.message)
      }
    } catch (error: unknown) {
      console.error('Sign out failed.', error)
      setAuthError(error instanceof Error ? error.message : 'Sign out failed. Please try again.')
    }
  }

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-IN', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(new Date(`${date}T12:00:00`)),
    [date],
  )

  const prediction = useMemo(() => {
    const slotIndex = timeSlots.indexOf(time)
    const weekday = new Date(`${date}T12:00:00`).getDay()
    const weekendFactor = weekday === 0 || weekday === 6 ? 0.58 : 1
    const baseline = Math.round(crowdByTime[Math.max(slotIndex, 0)] * weekendFactor)
    const key = `${date}:${time}`
    const reports = savedFeedback.value[key]
    const reportCount = reports
      ? reports.quiet + reports.moderate + reports.busy
      : 0
    const reportedScore = reports && reportCount > 0
      ? (reports.quiet * 20 + reports.moderate * 55 + reports.busy * 90) / reportCount
      : baseline
    const score = Math.round(reportCount ? baseline * 0.6 + reportedScore * 0.4 : baseline)
    const level = getCrowd(score)
    const wait = score < 40 ? '5–8 min' : score < 70 ? '10–15 min' : '15–20 min'

    return { score, level, wait, reportCount, key }
  }, [date, savedFeedback, time])

  function submitFeedback(level: FeedbackLevel) {
    const next: FeedbackStore = {
      ...savedFeedback.value,
      [prediction.key]: {
        quiet: savedFeedback.value[prediction.key]?.quiet ?? 0,
        moderate: savedFeedback.value[prediction.key]?.moderate ?? 0,
        busy: savedFeedback.value[prediction.key]?.busy ?? 0,
        [level]: (savedFeedback.value[prediction.key]?.[level] ?? 0) + 1,
      },
    }
    setSavedFeedback({ value: next, error: false })
    setSelectedFeedback(level)
    try {
      localStorage.setItem('canteenpulse-feedback', JSON.stringify(next))
    } catch (error) {
      console.error('Could not save feedback.', error)
      setSavedFeedback({ value: next, error: true })
    }
  }

  const statusClass = prediction.level.toLowerCase()
  const menuLoading = Boolean(viewerMode && menuLoadedFor !== viewerMode)

  if (!authReady) {
    return <main className="auth-loading" role="status">Connecting to CanteenPulse…</main>
  }

  if (!viewerMode) {
    return (
      <LoginPage
        configured={supabase !== null}
        error={authError || (session ? 'This account does not have canteen admin access. Please sign in with an assigned admin account.' : '')}
        busy={authBusy}
        onGuestLogin={() => void signInAsGuest()}
        onAdminLogin={(email, password) => void signInAsAdmin(email, password)}
      />
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={() => setActiveNav('overview')}>
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className="brand-name">Canteen<span>Pulse</span></span>
        </a>

        <div className="nav-label">CAMPUS</div>
        <nav className="side-nav" aria-label="Main navigation">
          {isAdmin ? (
            <>
              <a className="nav-link active" href="#overview"><span className="nav-icon">◫</span> Admin overview</a>
              <a className="nav-link" href="#menu-admin"><span className="nav-icon">▤</span> Menu & pricing</a>
            </>
          ) : (
            <>
              <a className={activeNav === 'overview' ? 'nav-link active' : 'nav-link'} href="#overview" onClick={() => setActiveNav('overview')}>
                <span className="nav-icon">◫</span> Overview
              </a>
              <a className={activeNav === 'trends' ? 'nav-link active' : 'nav-link'} href="#trends" onClick={() => setActiveNav('trends')}>
                <span className="nav-icon">⌁</span> Crowd trends
              </a>
              <a className={activeNav === 'menu' ? 'nav-link active' : 'nav-link'} href="#menu" onClick={() => setActiveNav('menu')}>
                <span className="nav-icon">▤</span> Food availability
              </a>
            </>
          )}
        </nav>

        <div className="sidebar-tip">
          <span className="tip-icon">✳</span>
          <p className="tip-title">Beat the lunch rush</p>
          <p className="tip-copy">A little planning makes lunch a lot easier.</p>
          <a href="#trends" onClick={() => setActiveNav('trends')}>Explore trends <span aria-hidden="true">↗</span></a>
        </div>

        <div className="sidebar-bottom">
          <div className="campus-avatar">{isAdmin ? 'AD' : 'GU'}</div>
          <div><strong>{isAdmin ? 'Canteen admin' : 'Campus guest'}</strong><span>{isAdmin ? 'Management view' : 'Guest view'}</span></div>
          <span className="more-icon" aria-hidden="true">···</span>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumb">Campus <span>/</span> Canteen</div>
          <div className="topbar-right">
            <span className="live-indicator"><i /> Canteen overview</span>
            <span className="topbar-divider" />
            <span className="date-chip"><span aria-hidden="true">▦</span> {dateLabel}</span>
            {!isAdmin && <button className="top-signout" type="button" onClick={() => void signOut()}>Sign out</button>}
            <div className="top-avatar" aria-label={isAdmin ? 'Canteen admin' : 'Campus guest'}>{isAdmin ? 'AD' : 'GU'}</div>
          </div>
        </header>

        <div className="page-content">
          {isAdmin ? (
            <AdminPanel
              items={menuItems}
              loading={menuLoading}
              loadError={menuLoadError}
              onItemsChange={setMenuItems}
              onSignOut={() => void signOut()}
            />
          ) : (
            <>
          <section className="page-heading">
            <div>
              <div className="eyebrow">YOUR CAMPUS, AT A GLANCE</div>
              <h1>Know before you go<span>.</span></h1>
              <p>Find your perfect time for a happier lunch break.</p>
            </div>
            <a className="feedback-shortcut" href="#feedback">
              <span aria-hidden="true">✳</span> Share a quick update
            </a>
          </section>

          <section className="prediction-layout" aria-label="Crowd prediction">
            <article className={`prediction-card ${statusClass}`}>
              <div className="prediction-card-top">
                <div className="live-pill"><i /> CROWD FORECAST</div>
                <span className="sparkle" aria-hidden="true">✳</span>
              </div>
              <p className="prediction-date">{dateLabel} <span>·</span> {time}</p>
              <div className="prediction-main">
                <div>
                  <div className="crowd-level">{prediction.level}</div>
                  <p className="crowd-description">
                    {prediction.level === 'Busy'
                      ? 'The lunch rush is in full swing.'
                      : prediction.level === 'Moderate'
                        ? 'A steady crowd, but plenty of room.'
                        : 'A great time to grab a bite.'}
                  </p>
                </div>
                <div className="crowd-meter" aria-label={`Crowd level ${prediction.score} percent`}>
                  <div className="meter-ring"><span>{prediction.score}<small>%</small></span></div>
                  <span>crowd level</span>
                </div>
              </div>
              <div className="prediction-footer">
                <span><b aria-hidden="true">◷</b> Est. wait <strong>{prediction.wait}</strong></span>
                <span className="footer-divider" />
                <span><b aria-hidden="true">♧</b> Based on {prediction.reportCount ? `${prediction.reportCount} student ${prediction.reportCount === 1 ? 'report' : 'reports'}` : 'typical campus patterns'}</span>
              </div>
            </article>

            <article className="time-card">
              <div className="card-heading">
                <div>
                  <div className="eyebrow">PLAN YOUR VISIT</div>
                  <h2>When are you going?</h2>
                </div>
                <span className="heading-icon" aria-hidden="true">◷</span>
              </div>
              <label className="input-label" htmlFor="visit-date">Choose a date</label>
              <input
                id="visit-date"
                className="date-input"
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value || localDateString(new Date()))
                  setSelectedFeedback(null)
                }}
              />
              <div className="input-label time-label">Pick a time</div>
              <div className="time-grid">
                {timeSlots.map((slot) => (
                  <button
                    className={slot === time ? 'time-option selected' : 'time-option'}
                    key={slot}
                    type="button"
                    aria-pressed={slot === time}
                    onClick={() => {
                      setTime(slot)
                      setSelectedFeedback(null)
                    }}
                  >
                    {slot.replace(':00', '').replace(' ', '')}
                  </button>
                ))}
              </div>
              <p className="timezone-note"><span aria-hidden="true">ⓘ</span> Predictions are estimates based on typical campus patterns.</p>
            </article>
          </section>

          <section className="metrics-row" aria-label="Canteen highlights">
            <article className="metric-card">
              <div className="metric-icon mint" aria-hidden="true">◷</div>
              <div><span className="metric-label">BEST TIME TODAY</span><strong>3:30 – 4:00 PM</strong><small><span className="text-green">↓ 68%</span> less crowded than lunch</small></div>
              <span className="metric-arrow" aria-hidden="true">↗</span>
            </article>
            <article className="metric-card">
              <div className="metric-icon peach" aria-hidden="true">♧</div>
              <div><span className="metric-label">PEAK HOUR</span><strong>12:30 – 1:30 PM</strong><small>Usually the busiest window</small></div>
              <span className="metric-arrow" aria-hidden="true">↗</span>
            </article>
            <article className="metric-card">
              <div className="metric-icon lilac" aria-hidden="true">♧</div>
              <div><span className="metric-label">STUDENT CHECK-INS</span><strong>{Object.values(savedFeedback.value).reduce((sum, item) => sum + item.quiet + item.moderate + item.busy, 0)} updates</strong><small>Thanks for keeping it current</small></div>
              <span className="metric-arrow" aria-hidden="true">↗</span>
            </article>
          </section>

          <section className="lower-grid">
            <article className="panel trends-panel" id="trends">
              <div className="panel-heading">
                <div><div className="eyebrow">A TYPICAL WEEKDAY</div><h2>Today’s crowd rhythm</h2></div>
                <span className="small-badge"><i /> Historical pattern</span>
              </div>
              <div className="chart">
                <div className="chart-guides" aria-hidden="true"><span>Busy</span><span>Moderate</span><span>Quiet</span></div>
                <div className="chart-bars">
                  {peakHours.map((item) => {
                    const level = getCrowd(item.value)
                    return (
                      <div className="bar-group" key={item.time}>
                        <div className="bar-track">
                          <div
                            className={`bar-fill ${level.toLowerCase()} ${item.time === '1 PM' ? 'highlighted' : ''}`}
                            style={{ height: `${item.value}%` }}
                            title={`${item.time}: ${level}`}
                          />
                        </div>
                        <span className={item.time === '1 PM' ? 'bar-label current' : 'bar-label'}>{item.time}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="chart-legend"><span><i className="legend-quiet" /> Quiet</span><span><i className="legend-moderate" /> Moderate</span><span><i className="legend-busy" /> Busy</span></div>
            </article>

            <article className="panel menu-panel" id="menu">
              <div className="panel-heading">
                <div><div className="eyebrow">FRESH FROM THE COUNTER</div><h2>Popular right now</h2></div>
                <a className="text-link" href="#menu">See menu <span aria-hidden="true">↗</span></a>
              </div>
              <div className="menu-list">
                {menuLoading && <p className="menu-message">Loading today’s menu…</p>}
                {menuLoadError && <p className="menu-message menu-error" role="alert">Could not load the menu: {menuLoadError}</p>}
                {!menuLoading && !menuLoadError && menuItems.length === 0 && <p className="menu-message">The canteen hasn’t added menu items yet.</p>}
                {menuItems.map((item, index) => (
                  <div className="menu-item" key={item.id}>
                    <div className={`food-illustration food-${index % 3}`} aria-hidden="true">{['◉', '◒', '◍'][index % 3]}</div>
                    <div className="food-copy"><strong>{item.name}</strong><span>{item.category} · ₹{item.price.toFixed(2)}</span></div>
                    <span className={`food-status ${item.is_available ? 'available' : 'unavailable'}`}>{item.is_available ? 'Available' : 'Unavailable'}</span>
                  </div>
                ))}
              </div>
              <p className="menu-footnote"><span aria-hidden="true">ⓘ</span> Menu and availability are managed by the canteen.</p>
            </article>
          </section>

          <section className="feedback-panel" id="feedback">
            <div className="feedback-intro">
              <span className="feedback-icon" aria-hidden="true">✳</span>
              <div><div className="eyebrow">HELP YOUR CAMPUS</div><h2>How’s the crowd right now?</h2><p>Your quick check-in helps everyone plan a better break.</p></div>
            </div>
            <div className="feedback-actions" role="group" aria-label="Report current crowd">
              <button className={selectedFeedback === 'quiet' ? 'feedback-button picked' : 'feedback-button'} type="button" onClick={() => submitFeedback('quiet')}><span>☀</span> Nice & quiet</button>
              <button className={selectedFeedback === 'moderate' ? 'feedback-button picked' : 'feedback-button'} type="button" onClick={() => submitFeedback('moderate')}><span>◉</span> Just right</button>
              <button className={selectedFeedback === 'busy' ? 'feedback-button picked' : 'feedback-button'} type="button" onClick={() => submitFeedback('busy')}><span>♨</span> Pretty busy</button>
            </div>
            {selectedFeedback && <p className="feedback-thanks" role="status">Thanks! Your update is included in this time slot’s estimate.</p>}
          </section>

          {savedFeedback.error && (
            <p className="storage-notice" role="status">
              Your update is visible for this visit, but this browser could not save it for next time.
            </p>
          )}

          <footer className="page-footer"><span>Made for better campus breaks.</span><span>Predictions are estimates, not live sensor data.</span></footer>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
