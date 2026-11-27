// Turn on-screen text into something nice to hear: no HTML or emoji, math symbols in words ("6 + 6 = ?" →
// "6 plus 6 equals what?"), blanks said as "blank", a lone number in words. Pure, no DOM (tested in Node).

const NUM_WORDS_0_20 = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"];
const TENS_WORDS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

/** 0–100 in words ("Twenty-one"); other values as they are. */
export function numberToWords(n) {
  const num = Number(n);
  if (!Number.isInteger(num) || num < 0 || num > 100) return String(n);
  if (num <= 20) return NUM_WORDS_0_20[num];
  if (num === 100) return "One hundred";
  const tens = Math.floor(num / 10), ones = num % 10;
  return ones === 0 ? TENS_WORDS[tens] : `${TENS_WORDS[tens]}-${NUM_WORDS_0_20[ones].toLowerCase()}`;
}

export function spoken(text) {
  const s = String(text ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&times;/g, " times ").replace(/&divide;/g, " divided by ").replace(/&minus;|&#8722;/g, " minus ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, " and ").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    // Grammar's part-of-speech symbols and words
    .replace(/\s*\([▲●◡▬♠⎵]\)/g, "")
    .replace(/[▲●◡▬♠⎵★☆✓]/g, "")
    .replace(/\b(NOUNS?|VERBS?|ADJECTIVES?|ADVERBS?|ARTICLES?|PREPOSITIONS?|CONJUNCTIONS?|INTERJECTIONS?)\b/g, (m) => m.toLowerCase())
    .replace(/\bpronouns\b/gi, "pro-nouns").replace(/\bpronoun\b/gi, "pro-noun")
    .replace(/\p{Extended_Pictographic}|️/gu, "")
    // math
    .replace(/\s*=\s*\?/g, " equals what?")
    .replace(/\s*=\s*(□+|_{2,})/g, " equals blank")
    .replace(/(\d+)\s+[-–]\s+(\d+)/g, "$1 minus $2")
    .replace(/\s*−\s*/g, " minus ")
    .replace(/\s*\+\s*/g, " plus ")
    .replace(/\s*[×✕]\s*/g, " times ")
    .replace(/\s*÷\s*/g, " divided by ")
    .replace(/\s*=\s*/g, " equals ")
    .replace(/□+|_{2,}/g, " blank ")
    .replace(/[⬅➡]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return /^\d+$/.test(s) ? `${numberToWords(Number(s))}.` : s;
}
