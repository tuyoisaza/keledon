/**
 * Detect dominant language in text: 'es' (Spanish) or 'en' (English) or 'other'.
 * Uses simple character frequency heuristics — no external API.
 */
export function detectLanguage(text: string): 'es' | 'en' | 'other' {
  if (!text || text.length < 2) return 'en';
  const lower = text.toLowerCase().trim();

  // Spanish-specific character patterns
  const spanishChars = (lower.match(/[áéíóúñü¿¡]/g) || []).length;

  // Common Spanish function words (high frequency)
  const spanishWords = [
    'el', 'la', 'los', 'las', 'de', 'del', 'en', 'un', 'una', 'que', 'es',
    'por', 'para', 'con', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus',
    'le', 'ya', 'este', 'esta', 'entre', 'todo', 'también', 'porque',
    'bien', 'muy', 'sin', 'sobre', 'tiene', 'ser', 'hay', 'esa', 'ese',
    'eso', 'era', 'han', 'ella', 'ello', 'ellos', 'está', 'están', 'estoy',
    'estamos', 'estáis', 'hola', 'gracias', 'bueno', 'buena', 'adiós',
    'sí', 'no', 'cómo', 'cuándo', 'dónde', 'qué', 'quién', 'cuál',
    'me', 'te', 'se', 'nos', 'os', 'lo', 'la', 'le', 'sino', 'cuando',
    'donde', 'quien',
  ];

  const words = lower.split(/\s+/);
  const spanishWordCount = words.filter((w) => spanishWords.includes(w)).length;
  const totalWords = words.length || 1;
  const spanishRatio = (spanishChars + spanishWordCount) / totalWords;

  // English-specific common words
  const englishWords = [
    'the', 'and', 'you', 'for', 'are', 'all', 'but', 'not', 'have', 'has',
    'had', 'was', 'were', 'been', 'will', 'would', 'could', 'should', 'may',
    'might', 'shall', 'can', 'does', 'did', 'with', 'this', 'that', 'from',
    'they', 'them', 'their', 'what', 'when', 'where', 'which', 'who', 'whom',
    'why', 'how', 'than', 'then', 'just', 'about', 'also', 'very', 'too',
    'here', 'there',
  ];
  const englishWordCount = words.filter((w) => englishWords.includes(w)).length;

  if (spanishRatio > 0.12) return 'es';
  if (englishWordCount > 0 && spanishRatio < 0.05) return 'en';
  return 'en';
}

/**
 * Map detected language to a Speaches Kokoro voice.
 */
export function getSpeachesVoiceForLanguage(
  lang: 'es' | 'en' | 'other',
): string {
  switch (lang) {
    case 'es':
      return 'ef_dora'; // Spanish Kokoro voice; af_* voices are English/American
    case 'en':
      return 'af_sky'; // American English female
    default:
      return 'af_sky';
  }
}

/**
 * Map detected language + optional configured voiceId to a Speaches Kokoro voice.
 * In voice/call mode, language wins over team default voice.
 */
export function getSpeachesVoice(
  text: string,
  configuredVoiceId?: string | null,
  forceLanguageVoice = false,
): string {
  const lang = detectLanguage(text);
  const languageVoice = getSpeachesVoiceForLanguage(lang);
  if (forceLanguageVoice || !configuredVoiceId || configuredVoiceId === 'ef_dora') {
    return languageVoice;
  }
  return configuredVoiceId;
}
