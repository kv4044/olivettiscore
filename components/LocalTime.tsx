'use client'

import { useEffect, useState } from 'react'

interface LocalTimeProps {
  utcDateString: string
}

export default function LocalTime({ utcDateString }: LocalTimeProps) {
  const [formattedDateTime, setFormattedDateTime] = useState('')

  useEffect(() => {
    try {
      const date = new Date(utcDateString)
      const formattedDate = date.toLocaleDateString(undefined, {
        day: '2-digit',
        month: '2-digit',
      })
      const formattedTime = date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })

      setFormattedDateTime(`${formattedDate}, ${formattedTime}`)
    } catch (e) {
      console.error('Failed to parse date:', e)
    }
  }, [utcDateString])

  // Keep the server/client text stable until the browser timezone is known.
  return (
    <span className="text-zinc-500 text-xs font-semibold select-none whitespace-nowrap">
      {formattedDateTime || '--/--, --:--'}
    </span>
  )
}
