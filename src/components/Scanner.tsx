import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'

/**
 * Kamera-scanner til QR-koder. Plakaterne i hallen indeholder et link som
 * https://app/tjek-ind?kode=XXXX – vi udtrækker koden, eller bruger teksten som den er.
 */
export function extractCode(raw: string, param = 'kode'): string {
  try {
    const u = new URL(raw)
    return u.searchParams.get(param) ?? raw
  } catch {
    return raw.trim()
  }
}

export function Scanner({ onResult, param = 'kode' }: { onResult: (code: string, raw: string) => void; param?: string }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const done = useRef(false)

  useEffect(() => {
    if (!video.current) return
    done.current = false
    const scanner = new QrScanner(video.current, (r) => {
      if (done.current) return
      done.current = true
      scanner.stop()
      onResult(extractCode(r.data, param), r.data)
    }, { returnDetailedScanResult: true, preferredCamera: 'environment', maxScansPerSecond: 8 })
    scanner.start().catch(() => setError('Kameraet kunne ikke startes. Giv adgang til kameraet, eller skriv koden herunder.'))
    return () => { scanner.stop(); scanner.destroy() }
  }, [onResult, param])

  return (
    <div className="stack">
      <video ref={video} className="video" muted playsInline aria-label="Kamera til QR-scanning" />
      {error && <p className="small muted">{error}</p>}
    </div>
  )
}
