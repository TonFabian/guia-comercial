import type { Request, Response } from 'express';

import { createReview, listReviewsByCompany } from '../services/review.service.js';
import { reviewImageValidatorService } from '../services/review-image-validator.service.js';

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
  const { rating, comment, image } = req.body as {
    rating: number;
    comment?: string;
    image?: string;
  };
  if (image) {
    const result = await reviewImageValidatorService.validate(image);
    if (!result.ok) {
      res.status(400).json({ error: 'Imagem inválida', reason: result.reason });
      return;
    }
  }
  const review = await createReview(String(req.params.id), clerkId, rating, comment, image);
  res.status(201).json(review);
}