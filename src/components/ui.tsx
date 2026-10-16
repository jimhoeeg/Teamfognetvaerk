import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import QRCode from 'qrcode'
import { useApp } from '../lib/store'
import { countdownParts, pad2 } from '../lib/format'
import { errorText } from '../lib/rules'
import { Icon, type IconName } from './Icon'

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Kampdag', icon: 'ball' },
  { to: '/billet', label: 'Billet', icon: 'ticket' },
  { to: '/point', label: 'Point', icon: 'star' },
  { to: '/live', label: 'Live', icon: 'pulse' },
  { to: '/dunk', label: 'Dunk', icon: 'dunk' },
]

export function TabBar({ orange = false }: { orange?: boolean }) {
  const { match } = useApp()
  const isLive = match?.status === 'live'
  return (
    <nav aria-label="Hovedmenu" className={`tabbar ${orange ? 'tabbar--orange' : ''}`}>
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => `${isActive ? 'active' : ''} ${t.to === '/live' ? 'is-live' : ''}`}>
          <Icon name={t.icon} />
          {t.label}
          {t.to === '/live' && isLive && <span className="tabbar__dot" aria-label="Kampen er live" />}
        </NavLink>
      ))}
    </nav>
  )
}

export function TopBar({ title, back }: { title?: string; back?: string }) {
  return (
    <header className="topbar">
      {back ? (
        <div className="row">
          <Link to={back} className="icon-btn" aria-label="Tilbage"><Icon name="back" size={20} /></Link>
          {title && <h1 className="h-section" style={{ fontSize: 26 }}>{title}</h1>}
        </div>
      ) : (
        <Link to="/" className="wordmark">Team <span>FOG</span></Link>
      )}
      <Link to="/profil" className="icon-btn" aria-label="Profil og indstillinger"><Icon name="user" size={20} /></Link>
    </header>
  )
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="row row--between">
          <h2 className="h-section">{title}</h2>
          <button className="icon-btn" aria-label="Luk" onClick={onClose}><Icon name="close" size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Spinner() {
  return <div className="spinner" role="progressbar" aria-label="Indlæser" />
}

export function Segments({ total, filled }: { total: number; filled: number }) {
  return (
    <div className="segments" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }} aria-label={`${filled} af ${total}`}>
      {Array.from({ length: total }, (_, i) => <span key={i} className={i < filled ? 'on' : ''} />)}
    </div>
  )
}

export function Bar({ value, ink = false, label }: { value: number; ink?: boolean; label: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={`bar ${ink ? 'bar--ink' : ''}`} role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  const p = countdownParts(new Date(to).getTime() - now)
  const cells = [
    { v: p.days, l: 'dage' }, { v: p.hours, l: 'timer' }, { v: p.minutes, l: 'min' }, { v: p.seconds, l: 'sek' },
  ]
  return (
    <div className="grid-4" role="timer" aria-label="Nedtælling til kampstart">
      {cells.map((c, i) => (
        <div key={c.l} className="count-box">
          <b className={i === 3 ? 'volt' : ''}>{pad2(c.v)}</b>
          <small>{c.l}</small>
        </div>
      ))}
    </div>
  )
}

export function QrImage({ text, size = 148, label }: { text: string; size?: number; label: string }) {
  const [src, setSrc] = useState<string>()
  useEffect(() => {
    QRCode.toDataURL(text, { margin: 1, width: size * 2, color: { dark: '#0B0B0C', light: '#FFFFFF' } }).then(setSrc)
  }, [text, size])
  return src
    ? <img src={src} width={size} height={size} alt={label} style={{ display: 'block', border: '2px solid var(--c-ink)', background: '#fff' }} />
    : <div style={{ width: size, height: size, background: '#fff' }} />
}

/** Kører en asynkron handling med busy-state og fejl som toast. */
export function useAction() {
  const { toast } = useApp()
  const [busy, setBusy] = useState(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const run = useCallback(async <T,>(fn: () => Promise<T>, onError?: (e: unknown) => void): Promise<T | undefined> => {
    setBusy(true)
    try {
      return await fn()
    } catch (e) {
      if (onError) onError(e)
      else toast(errorText(e), 'error')
      return undefined
    } finally {
      if (mounted.current) setBusy(false)
    }
  }, [toast])
  return { busy, run }
}

/** Henter data og genindlæser når deps ændres. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]): { data: T | undefined; reload: () => void } {
  const [data, setData] = useState<T>()
  const [n, setN] = useState(0)
  useEffect(() => {
    let alive = true
    fn().then((d) => alive && setData(d)).catch((e) => console.error(e))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n])
  return { data, reload: () => setN((x) => x + 1) }
}

export async function shareInvite(code: string, toast: (t: string) => void) {
  const url = `${window.location.origin}/velkommen?ven=${code}`
  const text = `Kom med til Team FOG Næstved! Brug min kode ${code}, så får vi begge 100 point, når du tjekker ind første gang.`
  if (navigator.share) {
    try { await navigator.share({ title: 'Team FOG Næstved', text, url }) } catch { /* annulleret */ }
  } else {
    await navigator.clipboard?.writeText(`${text} ${url}`)
    toast('Invitationen er kopieret')
  }
}
