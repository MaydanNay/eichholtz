export class PdfGenerationAbortedError extends Error {
  constructor(message = 'PDF_TIMEOUT') {
    super(message)
    this.name = 'PdfGenerationAbortedError'
  }
}

export function throwIfAborted(signal) {
  if (signal?.aborted) {
    const reason = signal.reason
    if (reason instanceof PdfGenerationAbortedError) throw reason
    if (reason instanceof Error) throw reason
    throw new PdfGenerationAbortedError()
  }
}
