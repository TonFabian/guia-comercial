import { model, Schema } from 'mongoose';

import type { Review } from '../../../shared/domain.js';

const reviewSchema = new Schema<Review>(
  {
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    clerkId: { type: String, required: true, trim: true },
    authorName: { type: String, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
  },
  { timestamps: true },
);

export const ReviewModel = model<Review>('Review', reviewSchema);