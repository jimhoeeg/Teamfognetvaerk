import type { LedgerReason, Match } from './api/types'

/** Niveauer efter samlet optjente point. Skal matche docs/PRODUKT.md. */
export const LEVELS = [
  { name: 'Rookie', min: 0 },
  { name: 'Starter', min: 500 },
  { name: 'All-Star', min: 1500 },
  { name: 'Legend', min: 4000 },
] as const

export function levelFor(earned: number) {
  let index = 0
  LEVELS.forEach((l, i) => { if (earned >= l.min) index = i })
  const current = LEVELS[index]
  const next = LEVELS[index + 1] ?? null
  const progress = next ? (earned - current.min) / (next.min - current.min) : 1
  return { index, number: index + 1, current, next, progress, toNext: next ? next.min - earned : 0 }
}

export const STREAK_TARGET = 5

/** Tidsvinduer – samme som i databasen. */
export const CHECKIN_OPENS_MIN = 60
export const CHECKIN_CLOSES_MIN = 150
export const EARLY_MIN = 20

export const REASON_LABEL: Record<LedgerReason, string> = {
  rsvp: 'Jeg kommer',
  checkin: 'Check-in',
  early: 'Tidlig ankomst',
  streak: 'Streak-bonus',
  prediction_winner: 'Rigtig vinder',
  prediction_margin: 'Rigtig margin',
  mvp_vote: 'MVP-stemme',
  noise: 'Larm-runde',
  referral: 'Ny ven',
  redeem: 'Indløst belønning',
  admin: 'Fra klubben',
}

export const BADGES: Record<string, { label: string; text: string }> = {
  'foerste-stempel': { label: '1.', text: 'Første stempel' },
  'fuldt-kort': { label: 'Fuld', text: 'Fuldt stempelkort' },
  'tre-fulde-kort': { label: '3×', text: 'Tre fulde kort' },
}

const ERRORS: Record<string, string> = {
  not_authenticated: 'Du er ikke logget ind. Genstart appen.',
  invalid_code: 'Koden passer ikke. Tjek den og prøv igen.',
  checkin_closed: 'Check-in er kun åben fra en time før kampstart og til kampen er slut.',
  already_checked_in: 'Du er allerede tjekket ind til denne kamp.',
  rsvp_closed: 'Kampen er gået i gang.',
  predictions_closed: 'Tippet er låst, fordi kampen er startet.',
  voting_closed: 'Afstemningen er ikke åben.',
  already_voted: 'Du har allerede stemt.',
  invalid_player: 'Spilleren findes ikke.',
  round_closed: 'Larm-runden er slut.',
  already_submitted: 'Du har allerede været med i denne runde.',
  reward_unavailable: 'Belønningen er ikke tilgængelig længere.',
  sold_out: 'Udsolgt.',
  insufficient_points: 'Du har ikke point nok endnu.',
  too_late: 'Henvisningskoden skal bruges før din første check-in.',
  not_your_kid: 'Barnet findes ikke på din profil.',
  missions_closed: 'Missionerne er kun åbne i hallen på kampdagen.',
  invalid_mission: 'Missionen hører ikke til denne kamp.',
  wrong_answer: 'Ikke helt rigtigt. Prøv igen!',
  forbidden: 'Kun for klubbens administratorer.',
  already_finished: 'Kampen er allerede afsluttet.',
}

export function errorText(e: unknown): string {
  const code = e instanceof Error ? e.message : String(e)
  return ERRORS[code] ?? 'Noget gik galt. Prøv igen om lidt.'
}

/** En afsluttet kamp bliver i fokus resten af aftenen, så fans kan se resultat, MVP og tip. */
export const AFTERGLOW_HOURS = 12

/**
 * Den kamp appen fokuserer på: en live kamp, ellers aftenens afsluttede kamp,
 * ellers den næste kommende, ellers den senest afsluttede.
 */
export function currentMatch(matches: Match[], now = Date.now()): Match | null {
  const live = matches.find((m) => m.status === 'live')
  if (live) return live
  const tonight = matches
    .filter((m) => m.status === 'finished' && new Date(m.tip_off).getTime() > now - AFTERGLOW_HOURS * 3600_000)
    .sort((a, b) => b.tip_off.localeCompare(a.tip_off))
  if (tonight[0]) return tonight[0]
  const upcoming = matches
    .filter((m) => m.status === 'upcoming' && new Date(m.tip_off).getTime() > now - CHECKIN_CLOSES_MIN * 60_000)
    .sort((a, b) => a.tip_off.localeCompare(b.tip_off))
  if (upcoming[0]) return upcoming[0]
  const finished = matches.filter((m) => m.status === 'finished').sort((a, b) => b.tip_off.localeCompare(a.tip_off))
  return finished[0] ?? null
}

/** Er vi inden for kampaftenens vindue (check-in, missioner)? */
export function inMatchWindow(m: Match, now = Date.now()) {
  const t = new Date(m.tip_off).getTime()
  return now >= t - CHECKIN_OPENS_MIN * 60_000 && now <= t + CHECKIN_CLOSES_MIN * 60_000
}
