export function fluidWidthFactor(reference: number, width: number): number {
  const raw = width / reference;
  return Math.min(1.2, Math.max(0.9, raw));
}
