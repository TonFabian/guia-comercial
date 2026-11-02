import { ReviewModel } from '../models/review.model.js';
import { CompanyModel } from '../models/company.model.js';
import { findUserByClerkId } from './user.service.js';
import type { Review } from '../../../shared/domain.js';

export async function listReviewsByCompany(companyId: string): Promise<Review[]> {
  return ReviewModel.find({ company: companyId }).sort({ createdAt: -1 }).lean<Review[]>().exec();
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