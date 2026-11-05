import { isValidObjectId } from 'mongoose';

import { ReviewModel } from '../models/review.model.js';
import { CompanyModel } from '../models/company.model.js';
import { findUserByClerkId } from './user.service.js';
import type { Review } from '../../../shared/domain.js';

/** Teto de reviews retornadas pela listagem pública de uma empresa. */
const LIMITE_REVIEWS = 50;

export async function listReviewsByCompany(companyId: string): Promise<Review[]> {
  // Id malformado vira 404 explícito, sem depender do CastError do driver.
  if (!isValidObjectId(companyId)) {
    throw Object.assign(new Error('empresa não encontrada'), { statusCode: 404 });
  }
  // Recorte fixo (50 mais recentes): a listagem é consumida pelo app e não
  // tem paginação — sem teto, uma empresa popular devolveria a coleção inteira.
  return ReviewModel.find({ company: companyId })
    .sort({ createdAt: -1 })
    .limit(LIMITE_REVIEWS)
    .lean<Review[]>()
    .exec();
}

export async function createReview(
  companyId: string,
  clerkId: string,
  rating: number,
  comment?: string,
): Promise<Review> {
  const user = await findUserByClerkId(clerkId);
  const authorName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || undefined
    : undefined;

  const review = await ReviewModel.create({
    company: companyId,
    clerkId,
    authorName,
    rating,
    comment,
  });

  // Recalcula rating médio da empresa.
  const agg = await ReviewModel.aggregate([
    { $match: { company: review.company } },
    { $group: { _id: '$company', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (agg.length > 0) {
    await CompanyModel.findByIdAndUpdate(companyId, {
      rating: Math.round(agg[0].avg * 10) / 10,
      ratingCount: agg[0].count,
    }).exec();
  }

  return review.toObject() as Review;
}