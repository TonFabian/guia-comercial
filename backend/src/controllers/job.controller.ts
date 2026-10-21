import type { Request, Response } from 'express';

import * as jobService from '../services/job.service.js';
import type { CreateJobDto, UpdateJobDto } from '../types/dto.js';
import { asyncHandler, parsePagination } from '../utils/http.js';

export const list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const pagination = parsePagination(req.query.page, req.query.pageSize);
  const { items, total } = await jobService.listJobs(pagination);
  res.json({ items, total, page: pagination.page, pageSize: pagination.pageSize });
});

export const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  throwIfInvalidId(String(req.params.id));
  const job = await jobService.getJobById(String(req.params.id));
  if (!job) {
    res.status(404).json({ error: 'vaga não encontrada' });
    return;
  }
  res.json(job);
});

export const create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const job = await jobService.createJob(req.body as CreateJobDto);
  res.status(201).json(job);
});

export const update = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    throwIfInvalidId(String(req.params.id));
    const job = await jobService.updateJob(String(req.params.id), req.body as UpdateJobDto);
    if (!job) {
      res.status(404).json({ error: 'vaga não encontrada' });
      return;
    }
    res.json(job);
  },
);

export const remove = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    throwIfInvalidId(String(req.params.id));
    await jobService.deleteJob(String(req.params.id));
    res.status(204).end();
  },
);

function throwIfInvalidId(id: string): void {
  if (!jobService.isObjectId(id)) {
    throw Object.assign(new Error('id inválido'), { statusCode: 404 });
  }
}
