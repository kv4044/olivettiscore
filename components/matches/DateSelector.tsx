'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface DateSelectorProps {
  activeDate: string // YYYY-MM-DD
  statusParam: string
  leagueParam?: string
  teamParam?: string
  todayStr: string // YYYY-MM-DD
}

const WEEKDAYS = ['DO', 'SE', 'TE', 'QU', 'QT', 'SX', 'SA']

export default function DateSelector({
  activeDate,
  statusParam,
  leagueParam,
  teamParam,
  todayStr
}: DateSelectorProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const selectedItemRef = useRef<HTMLButtonElement | null>(null)

  // Parse strings to Dates safely
  const parseLocalDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  const formatDateLocal = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const formatDisplayDate = (date: Date) => {
    const d = String(date.getDate()).padStart(2, '0')
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const wd = WEEKDAYS[date.getDay()]
    return `${d}/${m} ${wd}`
  }

  // Generate range: 15 days before to 15 days after the active date
  const activeDateObj = parseLocalDate(activeDate)
  const days = []
  for (let i = -15; i <= 15; i++) {
    const d = new Date(activeDateObj)
    d.setDate(activeDateObj.getDate() + i)
    days.push(d)
  }

  // Generate URL for navigation
  const getUrlForDate = (dateStr: string) => {
    const params = new URLSearchParams()
    params.set('date', dateStr)
    if (statusParam && statusParam !== 'all') params.set('status', statusParam)
    if (leagueParam) params.set('league', leagueParam)
    if (teamParam) params.set('team', teamParam)
    return `/?${params.toString()}`
  }

  // Handle clicking left/right arrows
  const handleOffsetDate = (offset: number) => {
    const d = parseLocalDate(activeDate)
    d.setDate(d.getDate() + offset)
    router.push(getUrlForDate(formatDateLocal(d)))
  }

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Scroll active date or HOJE into view when dropdown opens
  useEffect(() => {
    if (isOpen && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: 'center',
        behavior: 'auto'
      })
    }
  }, [isOpen])

  const activeDisplay = formatDisplayDate(parseLocalDate(activeDate))

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Date Selector Header Button Group */}
      <div className="inline-flex items-center justify-center bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden shadow-md select-none h-10">
        <button
          onClick={() => handleOffsetDate(-1)}
          className="h-full px-3 hover:bg-zinc-800/80 text-zinc-400 hover:text-white transition-colors cursor-pointer border-r border-zinc-800/80 flex items-center justify-center"
          title="Dia Anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`h-full px-4 flex items-center gap-2 font-bold text-xs sm:text-sm transition-colors cursor-pointer border-r border-zinc-800/80 ${
            isOpen ? 'bg-zinc-800 text-white' : 'text-zinc-200 hover:text-white hover:bg-zinc-800/80'
          }`}
          title="Ver calendário"
        >
          <Calendar className="w-4 h-4 text-zinc-400" />
          <span>{activeDisplay}</span>
        </button>
        <button
          onClick={() => handleOffsetDate(1)}
          className="h-full px-3 hover:bg-zinc-800/80 text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
          title="Dia Seguinte"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl py-2 z-50 max-h-72 overflow-y-auto scrollbar-thin animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-col gap-1 px-1">
            {days.map((date, idx) => {
              const dStr = formatDateLocal(date)
              const isToday = dStr === todayStr
              const isActive = dStr === activeDate
              const displayLabel = formatDisplayDate(date)

              if (isToday) {
                return (
                  <button
                    key={idx}
                    ref={isActive ? selectedItemRef : null}
                    onClick={() => {
                      setIsOpen(false)
                      router.push(getUrlForDate(dStr))
                    }}
                    className={`w-[calc(100%-16px)] py-2 px-4 rounded-xl font-extrabold text-xs text-center uppercase tracking-wider block transition-all cursor-pointer mx-2 my-1 shadow-sm ${
                      isActive
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                        : 'bg-zinc-950 border border-zinc-800 hover:bg-zinc-850 text-zinc-200 hover:text-white'
                    }`}
                  >
                    HOJE
                  </button>
                )
              }

              return (
                <button
                  key={idx}
                  ref={isActive ? selectedItemRef : null}
                  onClick={() => {
                    setIsOpen(false)
                    router.push(getUrlForDate(dStr))
                  }}
                  className={`w-full text-center py-2 px-4 text-xs rounded-lg transition-colors block cursor-pointer ${
                    isActive
                      ? 'bg-indigo-500/10 text-indigo-400 font-extrabold'
                      : 'font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  {displayLabel}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
