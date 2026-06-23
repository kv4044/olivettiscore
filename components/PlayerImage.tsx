'use client'

import { useState } from 'react'

interface PlayerImageProps {
  playerId: number
  playerName: string
  className?: string
}

export default function PlayerImage({ playerId, playerName, className }: PlayerImageProps) {
  const [src, setSrc] = useState(`https://sports.bzzoiro.com/img/player/${playerId}/?bg=transparent`)

  return (
    <img
      src={src}
      alt={playerName}
      className={className}
      onError={() => {
        setSrc('https://sports.bzzoiro.com/img/player/0/')
      }}
    />
  )
}
