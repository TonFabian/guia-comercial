import { model, Schema } from 'mongoose';

import type { Job } from '../../../shared/domain.js';

/**
 * Vaga de emprego vinculada a uma empresa.
 * O domínio só declara `createdAt`.
 */
const jobSchema = new Schema<Job>(
  {
    title: { type: String, required: true, trim: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    description: String,
    location: String,
    type: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const JobModel = model<Job>('Job', jobSchema);
