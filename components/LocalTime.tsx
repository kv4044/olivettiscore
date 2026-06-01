'use client'

import { useEffect, useState } from 'react'

interface LocalTimeProps {
  utcDateString: string
}

export default function LocalTime({ utcDateString }: LocalTimeProps) {
  const [formattedTime, setFormattedTime] = useState('')

  useEffect(() => {
    try {
      const date = new Date(utcDateString)
      setFormattedTime(
        date.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })
      )
    } catch (e) {
      console.error('Failed to parse date:', e)
    }
  }, [utcDateString])

  // Retorna "--:--" até a hidratação estar concluída no cliente para evitar erros de renderização
  return (
    <span className="text-zinc-500 text-xs font-semibold select-none">
      {formattedTime || '--:--'}
    </span>
  )
}
