import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';

import { PushCampaignModel } from '../models/push-campaign.model.js';
import { assertAdminEstrito } from '../services/user.service.js';
import { enviarCampanha } from '../services/push-campaign.service.js';
import { asyncHandler, parsePagination } from '../utils/http.js';
import type { CreateCampaignDto } from '../types/dto.js';

export const criarCampanha = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await assertAdminEstrito(req.auth?.clerkId, 'criar campanha');

  const body = req.body as CreateCampaignDto;

  if (body.scheduledFor) {
    const dataAgendada = new Date(body.scheduledFor);
    if (Number.isNaN(dataAgendada.getTime()) || dataAgendada.getTime() < Date.now()) {
      res.status(422).json({ error: 'scheduledFor no passado' });
      return;
    }
  }

  const status = body.scheduledFor ? 'scheduled' : 'draft';

  const doc = await PushCampaignModel.create({
    title: body.title,
    body: body.body,
    imageUrl: body.imageUrl,
    deepLink: body.deepLink,
    segment: body.segment,
    status,
    scheduledFor: body.scheduledFor ? body.scheduledFor : undefined,
    createdByClerkId: req.auth!.clerkId,
    stats: { targeted: 0, sent: 0, failed: 0, deadTokens: 0 },
  });

  res.status(201).json(doc);
});

export const enviarAgora = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await assertAdminEstrito(req.auth?.clerkId, 'enviar campanha');

  const id = String(req.params.id);
  if (!isValidObjectId(id)) {
    res.status(404).json({ error: 'campanha não encontrada' });
    return;
  }

  const campanha = (await PushCampaignModel.findById(id)) as { status?: string } | null;
  if (!campanha) {
    res.status(404).json({ error: 'campanha não encontrada' });
    return;
  }

  const status = campanha.status;
  if (status !== 'draft' && status !== 'scheduled') {
    res.status(409).json({ error: 'campanha não pode ser enviada' });
    return;
  }

  await enviarCampanha(id);

  const atualizada = await PushCampaignModel.findById(id);
  res.status(200).json(atualizada);
});

export const cancelarCampanha = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await assertAdminEstrito(req.auth?.clerkId, 'cancelar campanha');

  const id = String(req.params.id);
  if (!isValidObjectId(id)) {
    res.status(404).json({ error: 'campanha não encontrada' });
    return;
  }

  const campanha = (await PushCampaignModel.findById(id)) as { status?: string } | null;
  if (!campanha) {
    res.status(404).json({ error: 'campanha não encontrada' });
    return;
  }

  if (campanha.status !== 'scheduled') {
    res.status(409).json({ error: 'campanha não pode ser cancelada' });
    return;
  }

  await PushCampaignModel.findByIdAndUpdate(id, { $set: { status: 'draft' } });
  const atualizada = await PushCampaignModel.findById(id);
  res.status(200).json(atualizada);
});

export const listarCampanhas = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await assertAdminEstrito(req.auth?.clerkId, 'listar campanhas');

  const pagination = parsePagination(req.query.page, req.query.pageSize);

  const docs = (await PushCampaignModel.find({})
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit)
    .lean()) as unknown as Array<Record<string, unknown>>;

  const total = await PushCampaignModel.countDocuments({});

  const items = docs.map((doc) => {
    const { receipts: _receipts, ...rest } = doc;
    void _receipts;
    return rest;
  });

  res.json({ items, total, page: pagination.page, pageSize: pagination.pageSize });
});

export const detalharCampanha = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await assertAdminEstrito(req.auth?.clerkId, 'detalhar campanha');

  const id = String(req.params.id);
  if (!isValidObjectId(id)) {
    res.status(404).json({ error: 'campanha não encontrada' });
    return;
  }

  const doc = await PushCampaignModel.findById(id);
  if (!doc) {
    res.status(404).json({ error: 'campanha não encontrada' });
    return;
  }

  res.json(doc);
});

export const excluirCampanha = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await assertAdminEstrito(req.auth?.clerkId, 'excluir campanha');

  const id = String(req.params.id);
  if (!isValidObjectId(id)) {
    res.status(404).json({ error: 'campanha não encontrada' });
    return;
  }

  const campanha = (await PushCampaignModel.findById(id)) as { status?: string } | null;
  if (!campanha) {
    res.status(404).json({ error: 'campanha não encontrada' });
    return;
  }

  if (campanha.status !== 'draft' && campanha.status !== 'failed') {
    res.status(409).json({ error: 'campanha não pode ser excluída' });
    return;
  }

  await PushCampaignModel.findByIdAndDelete(id);
  res.status(204).end();
});
