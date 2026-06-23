import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const PALETTES = [
  { bg: '#111827', primary: '#22c55e', secondary: '#0f766e' },
  { bg: '#18181b', primary: '#38bdf8', secondary: '#2563eb' },
  { bg: '#1f2937', primary: '#f97316', secondary: '#dc2626' },
  { bg: '#0f172a', primary: '#facc15', secondary: '#16a34a' },
  { bg: '#172554', primary: '#e5e7eb', secondary: '#ef4444' },
  { bg: '#27272a', primary: '#a3e635', secondary: '#14b8a6' },
  { bg: '#312e81', primary: '#f8fafc', secondary: '#fb7185' },
  { bg: '#3f3f46', primary: '#f59e0b', secondary: '#0ea5e9' }
]

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function getInitials(name: string): string {
  const words = name
    .replace(/\b(fc|sc|cf|afc|the|liga|league|division|premier|npl)\b/gi, ' ')
    .split(/[\s-]+/)
    .map((word) => word.replace(/[^a-z0-9]/gi, ''))
    .filter(Boolean)

  const source = words.length > 0 ? words : name.split(/[\s-]+/).filter(Boolean)
  return source
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'LG'
}

export function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id') || '0'
  const name = searchParams.get('name') || `Liga #${id}`
  const country = searchParams.get('country') || 'Internacional'
  const palette = PALETTES[hashString(`${id}:${name}:${country}`) % PALETTES.length]
  const initials = getInitials(name)

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="${escapeXml(name)}">
  <defs>
    <linearGradient id="g" x1="22" y1="8" x2="106" y2="118" gradientUnits="userSpaceOnUse">
      <stop stop-color="${palette.primary}"/>
      <stop offset="1" stop-color="${palette.secondary}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000" flood-opacity=".32"/>
    </filter>
  </defs>
  <rect width="128" height="128" rx="26" fill="${palette.bg}"/>
  <path d="M64 10 106 26v34c0 28-17 48-42 58-25-10-42-30-42-58V26l42-16Z" fill="url(#g)" filter="url(#shadow)"/>
  <path d="M64 19 97 31v29c0 22-13 38-33 47-20-9-33-25-33-47V31l33-12Z" fill="none" stroke="#fff" stroke-opacity=".58" stroke-width="4"/>
  <path d="M34 70c10 5 20 7 30 7s20-2 30-7" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="5" stroke-linecap="round"/>
  <circle cx="64" cy="41" r="7" fill="#fff" fill-opacity=".72"/>
  <text x="64" y="72" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="${initials.length > 1 ? 34 : 42}" font-weight="900" fill="#fff">${escapeXml(initials)}</text>
  <text x="64" y="95" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="800" letter-spacing="1.4" fill="#fff" fill-opacity=".76">${escapeXml(country.slice(0, 16).toUpperCase())}</text>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  })
}
