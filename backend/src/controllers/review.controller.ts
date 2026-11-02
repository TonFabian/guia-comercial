import type { Request, Response } from 'express';

import { createReview, listReviewsByCompany } from '../services/review.service.js';

export async function listReviews(req: Request, res: Response): Promise<void> {
  const reviews = await listReviewsByCompany(String(req.params.id));
  res.json(reviews);
}

export async function createReviewHandler(req: Request, res: Response): Promise<void> {
  const clerkId = req.auth?.clerkId;
  if (!clerkId) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  const { rating, comment, authorName } = req.body as {
    rating: number;
    comment?: string;
    authorName?: string;
  };
  const review = await createReview(String(req.params.id), clerkId, authorName, rating, comment);
  res.status(201).json(review);
}