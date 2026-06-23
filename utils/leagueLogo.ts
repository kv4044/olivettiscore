type LeagueLogoInput = {
  id: number
  name: string
  country?: string | null
  logoUrl?: string | null
}

export function hasRealLeagueLogo(logoUrl?: string | null): logoUrl is string {
  return Boolean(logoUrl && logoUrl !== 'no_logo')
}

export function getLeagueLogoUrl({ id, name, country, logoUrl }: LeagueLogoInput): string {
  if (hasRealLeagueLogo(logoUrl)) {
    return logoUrl
  }

  const params = new URLSearchParams({
    id: String(id),
    name: name || `Liga #${id}`
  })

  if (country) {
    params.set('country', country)
  }

  return `/api/league-logo?${params.toString()}`
}
