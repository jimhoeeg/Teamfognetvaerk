const tz = 'Europe/Copenhagen'

export const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat('da-DK', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(new Date(iso)).replace('.', ':')

export const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat('da-DK', { weekday: 'short', day: 'numeric', month: 'long', timeZone: tz }).format(new Date(iso))

export const fmtShortDate = (iso: string) =>
  new Intl.DateTimeFormat('da-DK', { day: '2-digit', month: '2-digit', timeZone: tz }).format(new Date(iso))

export const fmtNum = (n: number) => new Intl.NumberFormat('da-DK').format(n)

export const addMinutes = (iso: string, min: number) => new Date(new Date(iso).getTime() + min * 60_000).toISOString()

export function countdownParts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  }
}

export const pad2 = (n: number) => String(n).padStart(2, '0')
