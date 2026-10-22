import type { ErrorRequestHandler } from 'express';
import type { Error as MongooseError } from 'mongoose';

interface HttpError extends Error {
  statusCode?: number;
}

/** Resultado do mapeamento de erro para a resposta HTTP. */
export interface MappedError {
  status: number;
  message: string;
}

function isMongooseError(error: unknown): error is MongooseError {
  const name = (error as { name?: string }).name ?? '';
  return name === 'ValidationError' || name === 'CastError';
}

/**
 * Mapeamento de erros conhecidos:
 *  - erro com `statusCode` (gerado nos services)       → statusCode
 *  - Mongoose ValidationError                          → 400
 *  - Mongoose CastError (id malformado / cast falhou)  → 404
 *  - Mongo duplicate key (code 11000)                  → 409
 *  - ZodError (payload inválido)                       → 400
 *  - qualquer outro erro                               → 500 (message só em dev)
 */
export function mapError(error: unknown): MappedError {
  let status = 500;
  let message = 'Erro interno do servidor';

  const httpError = error as HttpError;

  if (typeof httpError.statusCode === 'number') {
    status = httpError.statusCode;
    message = httpError.message;
  } else if (isMongooseError(error)) {
    switch ((error as { name: string }).name) {
      case 'ValidationError':
        status = 400;
        message = 'Dados inválidos';
        break;
      case 'CastError':
        status = 404;
        message = 'Registro não encontrado';
        break;
    }
  } else if ((error as { name?: string }).name === 'ZodError') {
    status = 400;
    message = 'Dados inválidos';
  } else if ((error as { code?: number }).code === 11000) {
    status = 409;
    message = 'Registro duplicado';
  }

  return { status, message };
}

/**
 * Error handler global.
 *
 * IMPORTANTE: o Express só reconhece um error handler quando a função declara
 * 4 parâmetros (err, req, res, next). Reduzir a assinatura faz o Express
 * ignorar este middleware e cair no handler padrão (HTML, sem JSON).
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, next): void => {
  // Se a resposta já começou, não dá para escrever JSON: delega ao Express.
  if (res.headersSent) {
    next(error);
    return;
  }

  const { status, message } = mapError(error);

  if (status >= 500) {
    console.error(error);
  }

  const isDev = process.env.NODE_ENV !== 'production';
  const details = error instanceof Error ? error.message : String(error);

  res.status(status).json({
    error: message,
    ...(isDev ? { message: details } : {}),
  });
};

export default errorHandler;
