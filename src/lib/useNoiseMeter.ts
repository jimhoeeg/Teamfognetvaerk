import { useCallback, useEffect, useRef, useState } from 'react'

const HISTORY = 16

/**
 * Måler lydniveau via mikrofonen. Niveauet er 0–100 (−60 dBFS → 0, 0 dBFS → 100).
 * Lyden forlader aldrig telefonen – kun det samlede gennemsnit sendes.
 */
export function useNoiseMeter() {
  const [level, setLevel] = useState(0)
  const [history, setHistory] = useState<number[]>(() => Array(HISTORY).fill(0))
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sum = useRef({ total: 0, n: 0, peak: 0 })
  const stopFn = useRef<() => void>(() => {})

  const stop = useCallback(() => {
    stopFn.current()
    stopFn.current = () => {}
    setRunning(false)
    const { total, n, peak } = sum.current
    return { average: n ? total / n : 0, peak }
  }, [])

  const start = useCallback(async () => {
    setError(null)
    sum.current = { total: 0, n: 0, peak: 0 }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      const ctx = new AudioContext()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      src.connect(analyser)
      const buf = new Float32Array(analyser.fftSize)
      let raf = 0
      let lastPush = 0
      const tick = (t: number) => {
        analyser.getFloatTimeDomainData(buf)
        let sq = 0
        for (const v of buf) sq += v * v
        const rms = Math.sqrt(sq / buf.length)
        const db = 20 * Math.log10(rms || 1e-8)
        const lvl = Math.max(0, Math.min(100, ((db + 60) / 60) * 100))
        sum.current.total += lvl
        sum.current.n += 1
        sum.current.peak = Math.max(sum.current.peak, lvl)
        setLevel(lvl)
        if (t - lastPush > 120) {
          lastPush = t
          setHistory((h) => [...h.slice(1), lvl])
        }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
      stopFn.current = () => {
        cancelAnimationFrame(raf)
        stream.getTracks().forEach((tr) => tr.stop())
        void ctx.close()
      }
      setRunning(true)
    } catch {
      setError('Mikrofonen kunne ikke startes. Giv adgang til mikrofonen i browseren.')
    }
  }, [])

  useEffect(() => () => stopFn.current(), [])

  return { level, history, running, error, start, stop }
}
