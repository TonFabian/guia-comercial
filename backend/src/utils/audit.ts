/**
 * Auditoria mínima via log estruturado em stdout.
 *
 * `auditLog` emite uma linha JSON por chamada em `process.stdout` (sem
 * `console.log`, para não poluir logs de aplicação e permitir coleta).
 * `redigir` remove chaves sensíveis recursivamente, sem mutar a entrada.
 */

const SENSITIVE_KEYS = new Set([
  'ownerclerkid',
  'email',
  'phone',
  'token',
  'password',
  'secret',
]);

export interface AuditLogParams {
  actor: string;
  action: string;
  resource: string;
  resourceId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export function redigir<T = unknown>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redigir(item)) as unknown as T;
  }

  const proto = Object.getPrototypeOf(obj);
  // Preserva objetos não-planos (Date, ObjectId, classes etc.) como estão.
  if (proto !== Object.prototype && proto !== null) {
    return obj;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      continue;
    }
    result[key] = redigir(value);
  }
  return result as unknown as T;
}

export function auditLog(params: AuditLogParams): void {
  const { actor, action, resource, resourceId, before, after } = params;
  const payload: Record<string, unknown> = { actor, action, resource, resourceId };
  if (before !== undefined) {
    payload.before = redigir(before);
  }
  if (after !== undefined) {
    payload.after = redigir(after);
  }
  process.stdout.write(JSON.stringify(payload) + '\n');
}
