import type { Request, Response } from 'express';

import * as couponService from '../services/coupon.service.js';
import type { CreateCouponDto, UpdateCouponDto } from '../types/dto.js';
import { asyncHandler, parsePagination } from '../utils/http.js';

export const list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const pagination = parsePagination(req.query.page, req.query.pageSize);
  const { items, total } = await couponService.listCoupons(
    { company: req.query.company },
    pagination,
  );
  res.json({ items, total, page: pagination.page, pageSize: pagination.pageSize });
});

export const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  throwIfInvalidId(String(req.params.id));
  const coupon = await couponService.getCouponById(String(req.params.id));
  if (!coupon) {
    res.status(404).json({ error: 'cupom não encontrado' });
    return;
  }
  res.json(coupon);
});

export const create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const coupon = await couponService.createCoupon(req.body as CreateCouponDto);
  res.status(201).json(coupon);
});

export const update = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    throwIfInvalidId(String(req.params.id));
    const coupon = await couponService.updateCoupon(String(req.params.id), req.body as UpdateCouponDto);
    if (!coupon) {
      res.status(404).json({ error: 'cupom não encontrado' });
      return;
    }
    res.json(coupon);
  },
);

export const remove = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    throwIfInvalidId(String(req.params.id));
    await couponService.deleteCoupon(String(req.params.id));
    res.status(204).end();
  },
);

function throwIfInvalidId(id: string): void {
  if (!couponService.isObjectId(id)) {
    throw Object.assign(new Error('id inválido'), { statusCode: 404 });
  }
}
