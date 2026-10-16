import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, type CheckInResult } from '../lib/api'
import { useApp } from '../lib/store'
import { REASON_LABEL, errorText } from '../lib/rules'
import { Icon } from '../components/Icon'
import { Scanner } from '../components/Scanner'
import { TopBar, useAction } from '../components/ui'

/** Check-in i hallen: via QR-link (?kode=), kamera-scanner eller manuel kode. */
export default function CheckIn() {
  const [params, setParams] = useSearchParams()
  const { refreshStats } = useApp()
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const [scanning, setScanning] = useState(true)
  const { busy, run } = useAction()
  const tried = useRef<string | null>(null)

  const submit = useCallback(async (code: string) => {
    setError(null)
    setScanning(false)
    const r = await run(() => api.checkIn(code), (e) => setError(errorText(e)))
    if (r) { setResult(r); void refreshStats() }
  }, [run, refreshStats])

  // Åbnet direkte fra plakatens QR-kode med telefonens kamera.
  useEffect(() => {
    const code = params.get('kode')
    if (code && tried.current !== code) {
      tried.current = code
      void submit(code)
      setParams({}, { replace: true })
    }
  }, [params, setParams, submit])

  if (result) {
    return (
      <main className="screen" style={{ paddingBottom: 32, justifyContent: 'center' }}>
        <div className="stack stack--lg center">
          <span className="chip chip--volt" style={{ alignSelf: 'center' }}><Icon name="check" size={16} stroke={3} />Du er tjekket ind</span>
          <div className="points-pop" aria-live="polite">+{result.total}</div>
          <div className="card stack" style={{ textAlign: 'left' }}>
            {result.awards.map((a) => (
              <div key={a.reason} className="row row--between"><span>{REASON_LABEL[a.reason]}</span><b className="volt">+{a.amount}</b></div>
            ))}
            {result.streak > 1 && <p className="small muted">{result.streak} hjemmekampe i træk. Kom igen næste gang og hold streaken!</p>}
          </div>
          <Link to="/live" className="btn btn--primary btn--block">Til Live</Link>
          <Link to="/" className="btn btn--ghost">Tilbage til Kampdag</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="screen" style={{ paddingBottom: 32 }}>
      <TopBar back="/" title="Tjek ind" />
      <p className="muted">Scan QR-koden ved indgangen til Arena Næstved. Du får 50 point, og 25 ekstra hvis du er der senest 20 minutter før kampstart.</p>
      {scanning ? <Scanner onResult={submit} /> : (
        <button className="btn btn--secondary" onClick={() => { setError(null); setScanning(true) }}><Icon name="scan" size={20} />Scan igen</button>
      )}
      {error && <div role="alert" className="card" style={{ borderColor: 'var(--c-orange)', color: 'var(--c-chalk)' }}>{error}</div>}
      <form className="stack" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) void submit(manual) }}>
        <div className="field">
          <label htmlFor="code">Eller skriv koden under QR-koden</label>
          <input id="code" className="input input--code" value={manual} onChange={(e) => setManual(e.target.value.toUpperCase())} maxLength={10} autoCapitalize="characters" autoComplete="off" />
        </div>
        <button className="btn btn--primary btn--block" disabled={busy || !manual.trim()}>Tjek ind</button>
      </form>
    </main>
  )
}
