export function safeErrorDetails(err: unknown): { message: string } {
  return { message: err instanceof Error ? err.message : String(err) };
}
