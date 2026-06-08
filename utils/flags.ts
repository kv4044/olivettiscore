/**
 * Maps country names to FlagCDN ISO country codes.
 */
export function getFlagCode(country?: string): string | null {
  if (!country) return null;
  const c = country.toLowerCase().trim();
  switch (c) {
    case 'inglaterra':
    case 'england':
      return 'gb-eng';
    case 'espanha':
    case 'spain':
      return 'es';
    case 'portugal':
      return 'pt';
    case 'itália':
    case 'italy':
      return 'it';
    case 'alemanha':
    case 'germany':
      return 'de';
    case 'frança':
    case 'france':
      return 'fr';
    case 'europa':
    case 'europe':
      return 'eu';
    case 'holanda':
    case 'netherlands':
    case 'países baixos':
      return 'nl';
    case 'brasil':
    case 'brazil':
      return 'br';
    case 'escócia':
    case 'scotland':
      return 'gb-sct';
    case 'eua':
    case 'usa':
    case 'estados unidos':
      return 'us';
    case 'méxico':
    case 'mexico':
      return 'mx';
    case 'bulgária':
    case 'bulgaria':
      return 'bg';
    case 'roménia':
    case 'romania':
      return 'ro';
    case 'suécia':
    case 'sweden':
      return 'se';
    case 'noruega':
    case 'norway':
      return 'no';
    default:
      return null;
  }
}

/**
 * Returns the FlagCDN URL for a given country name.
 */
export function getFlagUrl(country?: string): string | null {
  const code = getFlagCode(country);
  if (!code) return null;
  return `https://flagcdn.com/w40/${code}.png`;
}
