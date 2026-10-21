import type { Request, Response } from 'express';

/** 404 padronizado para rotas que não existem. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: 'Rota não encontrada', path: req.path });
}

export default notFoundHandler;
