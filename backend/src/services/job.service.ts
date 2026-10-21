import { isValidObjectId } from 'mongoose';

import { JobModel } from '../models/job.model.js';
import type { CreateJobDto, UpdateJobDto } from '../types/dto.js';
import type { Pagination } from '../utils/http.js';

/** Regras de dados para vagas. */

export async function listJobs(pagination: Pagination) {
  const [items, total] = await Promise.all([
    JobModel.find()
      .populate('company')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    JobModel.countDocuments(),
  ]);
  return { items, total };
}

export async function getJobById(id: string) {
  return JobModel.findById(id).populate('company').lean();
}

export async function createJob(dto: CreateJobDto) {
  return JobModel.create(dto);
}

export async function updateJob(id: string, dto: UpdateJobDto) {
  return JobModel.findByIdAndUpdate(id, dto, { new: true, runValidators: true }).populate('company').lean();
}

export async function deleteJob(id: string) {
  const doc = await JobModel.findByIdAndDelete(id).lean();
  if (!doc) {
    throw Object.assign(new Error('vaga não encontrada'), { statusCode: 404 });
  }
}

export function isObjectId(value: string): boolean {
  return isValidObjectId(value);
}
