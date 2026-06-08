'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

interface RefreshButtonProps {
  className?: string
}

export default function RefreshButton({ className }: RefreshButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleRefresh = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (isLoading) return

    setIsLoading(true)
    try {
      // Trigger the calculation endpoint on the server
      const res = await fetch('/api/predictions/calculate')
      const data = await res.json()
      console.log('Calculation result:', data)
    } catch (err) {
      console.error('Error calculating points:', err)
    } finally {
      setIsLoading(false)
      // Refresh the page to load updated points
      window.location.reload()
    }
  }

  return (
    <button
      onClick={handleRefresh}
      className={`${className} ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
      disabled={isLoading}
      title="Recalcular prognósticos finalizados"
    >
      <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
      <span>{isLoading ? 'A calcular...' : 'Atualizar Pontos'}</span>
    </button>
  )
}
