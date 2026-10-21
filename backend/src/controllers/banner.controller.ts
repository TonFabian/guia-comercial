import type { Request, Response } from 'express';

import * as bannerService from '../services/banner.service.js';
import type { CreateBannerDto, UpdateBannerDto } from '../types/dto.js';
import { asyncHandler, parsePagination } from '../utils/http.js';

export const list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const pagination = parsePagination(req.query.page, req.query.pageSize);
  const { items, total } = await bannerService.listBanners(pagination);
  res.json({ items, total, page: pagination.page, pageSize: pagination.pageSize });
});

export const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  throwIfInvalidId(String(req.params.id));
  const banner = await bannerService.getBannerById(String(req.params.id));
  if (!banner) {
    res.status(404).json({ error: 'banner não encontrado' });
    return;
  }
  res.json(banner);
});

export const create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const banner = await bannerService.createBanner(req.body as CreateBannerDto);
  res.status(201).json(banner);
});

export const update = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    throwIfInvalidId(String(req.params.id));
    const banner = await bannerService.updateBanner(String(req.params.id), req.body as UpdateBannerDto);
    if (!banner) {
      res.status(404).json({ error: 'banner não encontrado' });
      return;
    }
    res.json(banner);
  },
);

export const remove = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    throwIfInvalidId(String(req.params.id));
    await bannerService.deleteBanner(String(req.params.id));
    res.status(204).end();
  },
);

function throwIfInvalidId(id: string): void {
  if (!bannerService.isObjectId(id)) {
    throw Object.assign(new Error('id inválido'), { statusCode: 404 });
  }
}
