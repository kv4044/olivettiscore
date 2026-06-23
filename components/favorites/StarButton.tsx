'use client'

import { useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { Star } from 'lucide-react'
import { toggleFavoriteMatchAction, toggleFavoriteLeagueAction, toggleFavoriteTeamAction } from '@/app/actions'

interface StarButtonProps {
  type: 'match' | 'league' | 'team';
  id: number;
  name: string; // Utilizado para registo automático na BD se não existir
  country?: string; // Utilizado apenas se for liga
  logoUrl?: string;
  isFavorited: boolean;
  className?: string;
}

export default function StarButton({ type, id, name, country, logoUrl, isFavorited, className = '' }: StarButtonProps) {
  const [isPending, startTransition] = useTransition()
  const pathname = usePathname()

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isPending) return

    startTransition(async () => {
      let res;
      if (type === 'match') {
        res = await toggleFavoriteMatchAction(id)
      } else if (type === 'league') {
        res = await toggleFavoriteLeagueAction(id, name, country)
      } else if (type === 'team') {
        res = await toggleFavoriteTeamAction(id, name, logoUrl, pathname)
      }

      if (res && !res.success) {
        console.error('Erro ao alternar favorito:', res.error)
        alert(`Erro ao alternar favorito: ${res.error}`)
      }
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-amber-400 transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${className}`}
      title={`Favoritar ${type === 'match' ? 'jogo' : type === 'league' ? 'liga' : 'equipa'}`}
    >
      <Star
        className={`w-4 h-4 transition-all duration-300 ${
          isFavorited 
            ? 'fill-amber-400 text-amber-400 scale-110' 
            : 'text-zinc-500 group-hover:text-amber-400'
        }`}
      />
    </button>
  )
}
