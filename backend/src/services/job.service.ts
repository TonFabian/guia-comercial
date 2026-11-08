import { isValidObjectId } from 'mongoose';

import { CompanyModel } from '../models/company.model.js';
import { JobModel } from '../models/job.model.js';
import type { CreateJobDto, UpdateJobDto } from '../types/dto.js';
import type { Pagination } from '../utils/http.js';
import { assertOwnerOrAdmin } from './authorization.service.js';

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

export async function createJob(dto: CreateJobDto, clerkId?: string) {
  const company = await CompanyModel.findById(dto.company).lean();
  if (!company) {
    throw Object.assign(new Error('empresa não encontrada'), { statusCode: 404 });
  }
  await assertOwnerOrAdmin({
    resourceId: String(company._id),
    clerkId,
    findResource: async () => ({ exists: true, ownerClerkId: company.ownerClerkId }),
    notFoundMessage: 'empresa não encontrada',
    forbiddenMessage: 'sem permissão para gerenciar vagas desta empresa',
  });
  return JobModel.create(dto);
}

export async function updateJob(id: string, dto: UpdateJobDto, clerkId?: string) {
  const job = await JobModel.findById(id).lean();
  if (!job) {
    throw Object.assign(new Error('vaga não encontrada'), { statusCode: 404 });
  }
  const company = await CompanyModel.findById(job.company).lean();
  if (!company) {
    throw Object.assign(new Error('empresa não encontrada'), { statusCode: 404 });
  }
  await assertOwnerOrAdmin({
    resourceId: String(job.company),
    clerkId,
    findResource: async () => ({ exists: !!company, ownerClerkId: company?.ownerClerkId }),
    notFoundMessage: 'empresa não encontrada',
    forbiddenMessage: 'sem permissão para editar esta vaga',
  });
  const rest = { ...(dto as Record<string, unknown>) };
  delete rest.company;
  return JobModel.findByIdAndUpdate(id, rest, { returnDocument: 'after', runValidators: true }).populate('company').lean();
}

export async function deleteJob(id: string, clerkId?: string) {
  const job = await JobModel.findById(id).lean();
  if (!job) {
    throw Object.assign(new Error('vaga não encontrada'), { statusCode: 404 });
  }
  const company = await CompanyModel.findById(job.company).lean();
  if (!company) {
    throw Object.assign(new Error('empresa não encontrada'), { statusCode: 404 });
  }
  await assertOwnerOrAdmin({
    resourceId: String(job.company),
    clerkId,
    findResource: async () => ({ exists: !!company, ownerClerkId: company?.ownerClerkId }),
    notFoundMessage: 'empresa não encontrada',
    forbiddenMessage: 'sem permissão para excluir esta vaga',
  });
  const doc = await JobModel.findByIdAndDelete(id).lean();
  if (!doc) {
    throw Object.assign(new Error('vaga não encontrada'), { statusCode: 404 });
  }
}

export function isObjectId(value: string): boolean {
  return isValidObjectId(value);
}
