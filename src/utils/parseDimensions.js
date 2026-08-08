/**
 * Split product dimensions blob into cm / inch strings.
 * Source text often has both lines (or one compacted string with cm then inches).
 */
export function parseDimensionUnits(raw) {
  const text = String(raw || '')
  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  let cm = lines.find((l) => /\bcm\b/i.test(l)) || ''
  let inch =
    lines.find((l) => /["″]|inch/i.test(l) && !/\bcm\b/i.test(l)) || ''

  // One line containing both: "... cm W. 12" | ..."
  const trySplit = (blob) => {
    const m = String(blob).match(/^(.*?)\s*cm\s+(.+)$/i)
    if (!m) return null
    return { cm: `${m[1].trim()} cm`, inch: m[2].trim() }
  }

  if (cm && !inch) {
    const split = trySplit(cm)
    if (split) {
      cm = split.cm
      inch = split.inch
    }
  }

  if (!cm && !inch && lines.length) {
    const joined = lines.join(' ')
    const split = trySplit(joined)
    if (split) {
      cm = split.cm
      inch = split.inch
    } else {
      cm = joined
    }
  }

  // Normalize inch marks
  if (inch) {
    inch = inch.replace(/″/g, '"').replace(/\s+/g, ' ').trim()
  }
  if (cm) {
    cm = cm.replace(/\s+/g, ' ').trim()
  }

  return {
    cm,
    inch,
    hasBoth: Boolean(cm && inch),
  }
}
