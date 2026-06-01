'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface LiveRefresherProps {
  hasLiveEvents: boolean
}

export default function LiveRefresher({ hasLiveEvents }: LiveRefresherProps) {
  const router = useRouter()

  useEffect(() => {
    // Atualiza a cada 20 segundos se houver jogos ao vivo, ou a cada 60 segundos caso contrário
    const delay = hasLiveEvents ? 20000 : 60000

    const interval = setInterval(() => {
      router.refresh()
    }, delay)

    return () => clearInterval(interval)
  }, [hasLiveEvents, router])

  return null
}
