import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, type Match, type Profile, type ProfilePatch, type Stats } from './api'
import { currentMatch } from './rules'

interface Toast { text: string; kind: 'ok' | 'error' }

interface AppState {
  profile: Profile
  matches: Match[]
  match: Match | null
  stats: Stats
  /** Ændres hver gang point kan have ændret sig, så skærme kan genindlæse. */
  pointsVersion: number
  refreshStats(): Promise<void>
  refreshMatches(): Promise<void>
  updateProfile(patch: ProfilePatch): Promise<void>
  toast(text: string, kind?: Toast['kind']): void
}

const Ctx = createContext<AppState | null>(null)

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp uden AppProvider')
  return v
}

export function AppProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [stats, setStats] = useState<Stats>({ earned: 0, balance: 0, streak: 0 })
  const [pointsVersion, setPointsVersion] = useState(0)
  const [toastState, setToast] = useState<Toast | null>(null)
  const [fatal, setFatal] = useState<string | null>(null)
  const toastTimer = useRef<number>(undefined)
  const [now, setNow] = useState(() => Date.now())

  const refreshStats = useCallback(async () => {
    setStats(await api.myStats())
    setPointsVersion((v) => v + 1)
  }, [])
  const refreshMatches = useCallback(async () => setMatches(await api.listMatches()), [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await api.ensureSession()
        const [p, m, s] = await Promise.all([api.getProfile(), api.listMatches(), api.myStats()])
        if (!alive) return
        setProfile(p)
        setMatches(m)
        setStats(s)
      } catch (e) {
        console.error(e)
        if (alive) setFatal('Appen kunne ikke forbinde. Tjek din internetforbindelse og prøv igen.')
      }
    })()
    const off = api.subscribeMatches((m) =>
      setMatches((list) => (list.some((x) => x.id === m.id) ? list.map((x) => (x.id === m.id ? m : x)) : [...list, m])))
    // Kampstatus afhænger af tiden (check-in åbner, tip-off), så vi tikker hvert halve minut.
    const t = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => { alive = false; off(); window.clearInterval(t) }
  }, [])

  const toast = useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    setToast({ text, kind })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])

  const updateProfile = useCallback(async (patch: ProfilePatch) => {
    setProfile(await api.updateProfile(patch))
  }, [])

  const match = useMemo(() => currentMatch(matches, now), [matches, now])

  if (fatal) {
    return (
      <div className="screen center" style={{ justifyContent: 'center' }}>
        <p className="h-section">Ingen forbindelse</p>
        <p className="muted">{fatal}</p>
        <button className="btn btn--primary" onClick={() => window.location.reload()}>Prøv igen</button>
      </div>
    )
  }
  if (!profile) return <>{fallback}</>

  return (
    <Ctx.Provider value={{ profile, matches, match, stats, pointsVersion, refreshStats, refreshMatches, updateProfile, toast }}>
      {children}
      {toastState && (
        <div role="status" className={`toast ${toastState.kind === 'error' ? 'toast--error' : ''}`}>{toastState.text}</div>
      )}
    </Ctx.Provider>
  )
}
