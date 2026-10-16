import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, type FanType, type Kid } from '../lib/api'
import { useApp } from '../lib/store'
import { errorText } from '../lib/rules'
import { CourtLines, Icon } from '../components/Icon'
import { useAction } from '../components/ui'

const FAN_TYPES: { value: FanType; title: string; text: string }[] = [
  { value: 'tilskuer', title: 'Tilskuer', text: 'Jeg kommer for at se kampene.' },
  { value: 'medlem', title: 'Medlem', text: 'Jeg spiller i Næstved Basketball.' },
  { value: 'foraelder', title: 'Forælder', text: 'Jeg tager børn med til kampene.' },
]

type Step = 'welcome' | 'name' | 'type' | 'kids' | 'friend'

export default function Onboarding() {
  const { profile, updateProfile, toast } = useApp()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/'
  const [step, setStep] = useState<Step>('welcome')
  const [name, setName] = useState(profile.display_name ?? '')
  const [fanType, setFanType] = useState<FanType>(profile.fan_type)
  const [kids, setKids] = useState<Kid[]>([])
  const [kidName, setKidName] = useState('')
  const [kidYear, setKidYear] = useState('')
  const [friendCode, setFriendCode] = useState(params.get('ven') ?? '')
  const [friendError, setFriendError] = useState<string | null>(null)
  const { busy, run } = useAction()

  const order: Step[] = ['welcome', 'name', 'type', ...(fanType === 'foraelder' ? (['kids'] as Step[]) : []), 'friend']
  const index = order.indexOf(step)
  const go = (dir: 1 | -1) => setStep(order[index + dir])

  async function finish() {
    await run(async () => {
      await updateProfile({ display_name: name.trim() || null, fan_type: fanType, onboarded: true })
      nav(next, { replace: true })
    })
  }

  async function addKid() {
    if (!kidName.trim()) return
    const year = Number(kidYear)
    const kid = await run(() => api.addKid(kidName.trim(), year >= 2005 && year <= 2030 ? year : null))
    if (kid) { setKids((k) => [...k, kid]); setKidName(''); setKidYear('') }
  }

  async function applyFriend() {
    setFriendError(null)
    await run(async () => {
      await api.applyReferral(friendCode)
      toast('Koden er gemt. I får begge 100 point ved din første check-in.')
      await finish()
    }, (e) => setFriendError(errorText(e)))
  }

  return (
    <main className="screen" style={{ paddingBottom: 'calc(var(--s-6) + env(safe-area-inset-bottom))', minHeight: '100%' }}>
      {step !== 'welcome' && (
        <div className="row row--between">
          <button className="icon-btn" aria-label="Tilbage" onClick={() => go(-1)}><Icon name="back" size={20} /></button>
          <div className="segments" style={{ gridTemplateColumns: `repeat(${order.length - 1}, 24px)` }} aria-label={`Trin ${index} af ${order.length - 1}`}>
            {order.slice(1).map((s, i) => <span key={s} className={i < index ? 'on' : ''} />)}
          </div>
        </div>
      )}

      {step === 'welcome' && (
        <div className="stack stack--lg relative" style={{ flex: 1, justifyContent: 'flex-end', overflow: 'visible' }}>
          <CourtLines size={420} style={{ right: -160, top: -40, color: 'var(--c-chalk)' }} />
          <span className="chip chip--volt" style={{ alignSelf: 'flex-start' }}>Team FOG Næstved</span>
          <h1 className="display" style={{ fontSize: 76 }}>Meget mere<br />end<br /><span className="volt">basketball</span></h1>
          <p className="muted" style={{ fontSize: 17 }}>
            Tjek ind i hallen, tip kampene, stem på kampens MVP og saml point, du kan bruge hos klubbens partnere.
          </p>
          <button className="btn btn--primary btn--block" onClick={() => go(1)}>Kom i gang</button>
        </div>
      )}

      {step === 'name' && (
        <form className="stack stack--lg" onSubmit={(e) => { e.preventDefault(); go(1) }}>
          <h1 className="h-screen">Hvad skal vi kalde dig?</h1>
          <div className="field">
            <label htmlFor="name">Fornavn</label>
            <input id="name" className="input" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
          </div>
          <p className="small muted">Navnet vises kun for dig selv og på dit fankort.</p>
          <button className="btn btn--primary btn--block" disabled={!name.trim()}>Videre</button>
        </form>
      )}

      {step === 'type' && (
        <div className="stack stack--lg">
          <h1 className="h-screen">Hvem er du?</h1>
          <div className="stack" role="group" aria-label="Vælg hvem du er">
            {FAN_TYPES.map((t) => (
              <button key={t.value} className="choice" aria-pressed={fanType === t.value} onClick={() => setFanType(t.value)}>
                <span><b>{t.title}</b><br /><span className="small muted">{t.text}</span></span>
                <span className="choice__mark" />
              </button>
            ))}
          </div>
          <button className="btn btn--primary btn--block" onClick={() => go(1)}>Videre</button>
        </div>
      )}

      {step === 'kids' && (
        <div className="stack stack--lg">
          <h1 className="h-screen">Hvem tager du med?</h1>
          <p className="muted">Børnene får Ditlev Dunks stempelkort med missioner i hallen. Vi gemmer kun fornavn og fødselsår.</p>
          {kids.length > 0 && (
            <div className="stack">
              {kids.map((k) => (
                <div key={k.id} className="card row row--between"><b>{k.first_name}</b><span className="muted">{k.birth_year ?? ''}</span></div>
              ))}
            </div>
          )}
          <form className="stack" onSubmit={(e) => { e.preventDefault(); void addKid() }}>
            <div className="field">
              <label htmlFor="kid">Barnets fornavn</label>
              <input id="kid" className="input" value={kidName} onChange={(e) => setKidName(e.target.value)} maxLength={40} />
            </div>
            <div className="field">
              <label htmlFor="year">Fødselsår (valgfrit)</label>
              <input id="year" className="input" inputMode="numeric" value={kidYear} onChange={(e) => setKidYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            </div>
            <button className="btn btn--secondary btn--block" disabled={busy || !kidName.trim()}><Icon name="plus" size={18} />Tilføj barn</button>
          </form>
          <button className="btn btn--primary btn--block" onClick={() => go(1)}>{kids.length ? 'Videre' : 'Spring over'}</button>
        </div>
      )}

      {step === 'friend' && (
        <div className="stack stack--lg">
          <h1 className="h-screen">Har du en kode fra en ven?</h1>
          <p className="muted">I får begge 100 point, når du tjekker ind til din første kamp.</p>
          <div className="field">
            <label htmlFor="friend">Venens kode</label>
            <input id="friend" className="input input--code" value={friendCode} onChange={(e) => setFriendCode(e.target.value.toUpperCase())} maxLength={8} autoCapitalize="characters" />
            {friendError && <p className="small" style={{ color: 'var(--c-orange)' }}>{friendError}</p>}
          </div>
          <button className="btn btn--primary btn--block" disabled={busy || !friendCode.trim()} onClick={applyFriend}>Brug koden</button>
          <button className="btn btn--ghost" disabled={busy} onClick={finish}>Jeg har ingen kode</button>
        </div>
      )}
    </main>
  )
}
