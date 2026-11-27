/** Words this short fit in every column of every template, so they are never split. */
const KEEP_WHOLE = 14
/** Each side of an email address stays on one line up to this length. */
const KEEP_EMAIL_PART = 22
/** Longer than almost any real word: a run like this has no natural place to wrap, so it is cut into pieces. */
const MAX_SEGMENT = 20
const PIECE = new RegExp('.{1,6}', 'gu')

/** After punctuation used in addresses, links and reference numbers. */
const NATURAL_BREAKS = /(?<=[./_\-?&=:;,|+])/

const cut = (segment: string) => (segment.length > MAX_SEGMENT ? (segment.match(PIECE) ?? [segment]) : [segment])

/**
 * Decides where a word may wrap in a PDF. Ordinary words are never hyphenated, but a long unbroken value (an email
 * address, a link, a reference number) must be able to wrap, or it is drawn over the column next to it. An email
 * address wraps before its "@" first, and elsewhere only when one side is itself too long.
 *
 * The empty strings are break points: the layout engine adds a hyphen at a syllable boundary, which would change an
 * email address or link, but not where an empty syllable sits between two parts.
 */
export function pdfWordBreaks(word: string): string[] {
  if (word.length <= KEEP_WHOLE) return [word]

  const parts = word.split(/(?=@)/).flatMap((side) => {
    const isEmailSide = word.includes('@') && side.length <= KEEP_EMAIL_PART
    return isEmailSide ? [side] : side.split(NATURAL_BREAKS).flatMap((segment) => cut(segment))
  })
  return parts.flatMap((part, index) => (index === 0 ? [part] : ['', part]))
}
