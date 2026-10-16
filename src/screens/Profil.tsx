import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type FanType } from '../lib/api'
import { resetDemo } from '../lib/api/demoApi'
import { useApp } from '../lib/store'
import { LEVELS } from '../lib/rules'
import { fmtNum } from '../lib/format'
import { Icon } from '../components/Icon'
import { Sheet, TabBar, TopBar, useAction, useLoad } from '../components/ui'

const TYPES: { value: FanType; label: string }[] = [
  { value: 'tilskuer', label: 'Tilskuer' },
  { value: 'medlem', label: 'Medlem' },
  { value: 'foraelder', label: 'Forælder' },
]

const RULES: [string, string][] = [
  ['Jeg kommer', '+10'], ['Check-in i hallen', '+50'], ['Tidlig ankomst (20 min før)', '+25'],
  ['3 hjemmekampe i træk', '+50'], ['5 hjemmekampe i træk', '+100'], ['Rigtig vinder', '+50'],
  ['Rigtig margin (oveni)', '+100'], ['MVP-stemme', '+25'], ['Larm-runde', '+10'], ['Ny ven tjekker ind', '+100'],
]

export default function Profil() {
  const { profile, updateProfile, toast } = useApp()
  const [name, setName] = useState(profile.display_name ?? '')
  const [email, setEmail] = useState('')
  const [rules, setRules] = useState(false)
  const { data: kids, reload } = useLoad(() => api.listKids(), [])
  const [kidName, setKidName] = useState('')
  const { busy, run } = useAction()

  async function saveName() {
    const ok = await run(async () => { await updateProfile({ display_name: name.trim() || null }); return true })
    if (ok) toast('Navnet er gemt')
  }
  async function addKid() {
    const k = await run(() => api.addKid(kidName.trim(), null))
    if (k) { setKidName(''); reload() }
  }
  async function removeKid(id: string, first: string) {
    if (!window.confirm(`Fjern ${first}? Stempler og badges slettes.`)) return
    await run(() => api.removeKid(id))
    reload()
  }
  async function linkEmail() {
    const ok = await run(async () => { await api.linkEmail(email.trim()); return true })
    if (ok) toast('Tjek din mail og bekræft adressen')
  }

  return (
    <>
      <main className="screen">
        <TopBar back="/" title="Profil" />

        <form className="stack" onSubmit={(e) => { e.preventDefault(); void saveName() }}>
          <div className="field">
            <label htmlFor="pname">Fornavn</label>
            <div className="row">
              <input id="pname" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
              <button className="btn btn--secondary" disabled={busy || name === (profile.display_name ?? '')}>Gem</button>
            </div>
          </div>
        </form>

        <div className="stack">
          <span className="label">Jeg er</span>
          <div className="grid-4" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} role="group" aria-label="Fantype">
            {TYPES.map((t) => (
              <button key={t.value} className="choice" style={{ justifyContent: 'center' }} aria-pressed={profile.fan_type === t.value}
                onClick={() => run(() => updateProfile({ fan_type: t.value }))}>{t.label}</button>
            ))}
          </div>
        </div>

        <section className="stack" aria-labelledby="kids-h">
          <h2 id="kids-h" className="h-section">Børn</h2>
          {kids?.map((k) => (
            <div key={k.id} className="card row row--between" style={{ padding: '8px 12px' }}>
              <b>{k.first_name}</b>
              <button className="btn btn--ghost" onClick={() => removeKid(k.id, k.first_name)}>Fjern</button>
            </div>
          ))}
          <form className="row" onSubmit={(e) => { e.preventDefault(); if (kidName.trim()) void addKid() }}>
            <label htmlFor="pkid" className="sr-only">Barnets fornavn</label>
            <input id="pkid" className="input" placeholder="Barnets fornavn" value={kidName} onChange={(e) => setKidName(e.target.value)} maxLength={40} />
            <button className="icon-btn" style={{ width: 52, height: 52 }} aria-label="Tilføj barn" disabled={busy || !kidName.trim()}><Icon name="plus" /></button>
          </form>
        </section>

        {api.mode === 'supabase' && (
          <section className="card stack" aria-labelledby="mail-h">
            <h2 id="mail-h" className="h-section" style={{ fontSize: 20 }}>Gem dine point</h2>
            <p className="small muted">Tilknyt din e-mail, så du kan logge ind igen, hvis du skifter telefon.</p>
            <form className="stack" onSubmit={(e) => { e.preventDefault(); void linkEmail() }}>
              <label htmlFor="pmail" className="sr-only">E-mail</label>
              <input id="pmail" className="input" type="email" autoComplete="email" placeholder="din@mail.dk" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button className="btn btn--secondary btn--block" disabled={busy || !email.includes('@')}>Send bekræftelse</button>
            </form>
          </section>
        )}

        <div className="stack" style={{ gap: 8 }}>
          <button className="btn btn--secondary btn--block" onClick={() => setRules(true)}>Sådan får du point</button>
          {profile.role === 'admin' && <Link to="/admin" className="btn btn--secondary btn--block"><Icon name="settings" size={18} />Kampstyring (admin)</Link>}
          {api.mode === 'demo' && (
            <button className="btn btn--ghost" onClick={() => { if (window.confirm('Nulstil alle demo-data?')) { resetDemo(); window.location.href = '/' } }}>
              Nulstil demo
            </button>
          )}
        </div>
      </main>

      {rules && (
        <Sheet title="Sådan får du point" onClose={() => setRules(false)}>
          <div>
            {RULES.map(([k, v]) => <div key={k} className="list-row"><span>{k}</span><b className="volt">{v}</b></div>)}
          </div>
          <h3 className="h-section" style={{ fontSize: 20 }}>Niveauer</h3>
          <div>
            {LEVELS.map((l, i) => <div key={l.name} className="list-row"><span>{i + 1}. {l.name}</span><span className="muted">{fmtNum(l.min)} point</span></div>)}
          </div>
          <p className="small muted">Niveauet regnes ud fra alle de point, du har optjent. Når du bruger point hos partnerne, falder du ikke i niveau.</p>
        </Sheet>
      )}
      <TabBar />
    </>
  )
}
