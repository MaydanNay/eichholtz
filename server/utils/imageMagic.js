export function detectImageType(buffer) {
  if (!buffer || buffer.length < 3) return null

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: '.jpg' }
  }

  if (buffer.length < 6) return null

  if (
    buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
  ) {
    return { mime: 'image/png', ext: '.png' }
  }

  if (
    buffer[0] === 0x47
    && buffer[1] === 0x49
    && buffer[2] === 0x46
    && buffer[3] === 0x38
  ) {
    return { mime: 'image/gif', ext: '.gif' }
  }

  if (buffer.length < 12) return null

  if (
    buffer[0] === 0x52
    && buffer[1] === 0x49
    && buffer[2] === 0x46
    && buffer[3] === 0x46
    && buffer[8] === 0x57
    && buffer[9] === 0x45
    && buffer[10] === 0x42
    && buffer[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: '.webp' }
  }

  return null
}
