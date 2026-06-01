'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface LiveRefresherProps {
  hasLiveEvents: boolean
}

export default function LiveRefresher({ hasLiveEvents }: LiveRefresherProps) {
  const router = useRouter()

  useEffect(() => {
    if (!hasLiveEvents) return

    // Atualiza o Server Component (re-fetch da API) a cada 20 segundos enquanto houver jogos ao vivo
    const interval = setInterval(() => {
      router.refresh()
    }, 20000)

    return () => clearInterval(interval)
  }, [hasLiveEvents, router])

  return null
}
