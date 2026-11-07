export function validateProductionConfig(): void {
  if (
    process.env.NODE_ENV === 'production' &&
    !process.env.CLERK_SECRET_KEY
  ) {
    throw new Error('CLERK_SECRET_KEY obrigatório em produção');
  }
}