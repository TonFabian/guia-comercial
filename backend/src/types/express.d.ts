/** Identidade resolvida pelo middleware de autenticação. */
export interface RequestAuth {
  guest: boolean;
  clerkId?: string;
}

declare global {
  namespace Express {
    interface Request {
      /**
       * `undefined` no modo legado (sem `CLERK_SECRET_KEY`); definido pelo
       * `optionalAuth`/`requireAuth` caso contrário.
       */
      auth?: RequestAuth;
    }
  }
}
