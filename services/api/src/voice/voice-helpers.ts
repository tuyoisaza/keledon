import type { CallContext } from './voice.types';

/**
 * Build a short spoken version of a reply text for conversational TTS.
 * Strips markdown, takes only first 1-2 sentences, caps at 220 chars.
 */
export function buildConversationalSpokenReply(replyText: string): string {
  const normalized = replyText
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_`>-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return '';

  const sentences = normalized.match(/[^.!?¿¡]+[.!?]+/g) || [normalized];
  const firstSentence = (sentences[0] || normalized).trim();
  const secondSentence = (sentences[1] || '').trim();
  const candidate =
    firstSentence.length < 90 && secondSentence
      ? `${firstSentence} ${secondSentence}`
      : firstSentence;

  if (candidate.length <= 220) return candidate;

  const cut = candidate.slice(0, 220);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 120 ? lastSpace : 220).trim()}…`;
}

/**
 * Build a greeting text based on team context and detected language.
 */
export function buildCallGreeting(context?: CallContext): string {
  const rawName = context?.teamName || context?.brandName || 'KELEDON';
  const name = rawName.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const lang = (context?.language || 'en-US').toLowerCase();
  if (lang.startsWith('es')) {
    return `Hola, soy ${name}. ¿En qué puedo ayudarte?`;
  }
  return `Hello, I'm ${name}. How can I help you?`;
}
