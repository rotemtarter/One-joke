// Anything longer is not a short joke (ARCHITECTURE 6.3).
export const MAX_JOKE_LENGTH = 600;

const HEBREW_LETTER = /[א-ת]/;

// Empty, non-Hebrew or overly long output counts as a failed generation.
export function isValidJoke(text: string): boolean {
  const joke = text.trim();
  return joke.length > 0 && joke.length <= MAX_JOKE_LENGTH && HEBREW_LETTER.test(joke);
}
