import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserModel } from '../models/user.model.js';
import { NotificationModel } from '../models/notification.model.js';

vi.mock('../models/user.model.js', () => ({ UserModel: { find: vi.fn() } }));
vi.mock('../models/notification.model.js', () => ({
  NotificationModel: { insertMany: vi.fn(), find: vi.fn(), countDocuments: vi.fn(), updateMany: vi.fn() },
}));

import {
  notifyCouponFans,
  notifyEventCity,
  listNotifications,
  markNotificationsRead,
  markNotificationsUnread,
  countUnreadNotifications,
} from './notification.service.js';

const UserModelMock = UserModel as unknown as { find: ReturnType<typeof vi.fn> };
const NotificationModelMock = NotificationModel as unknown as {
  insertMany: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  countDocuments: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
};

function cadeiaLean(valor: unknown) {
  const lean = vi.fn().mockResolvedValue(valor);
  const limit = vi.fn().mockReturnValue({ lean });
  const skip = vi.fn().mockReturnValue({ limit });
  const sort = vi.fn().mockReturnValue({ skip });
  return { sort, skip, limit, lean };
}

beforeEach(() => vi.clearAllMocks());

describe('notifyCouponFans', () => {
  it('cria notificação para cada fã da empresa', async () => {
    UserModelMock.find.mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: () => Promise.resolve([{ clerkId: 'c1' }, { clerkId: 'c2' }]) }),
    });
    NotificationModelMock.insertMany.mockResolvedValue([]);
    await notifyCouponFans({ companyId: 'comp1', couponId: 'cp1', title: 'T', body: 'B', deepLink: '/company/comp1', expiresAt: null });
    expect(NotificationModelMock.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ clerkId: 'c1', refId: 'cp1' })]),
      { ordered: false },
    );
  });

  it('não notifica quando expiresAt está no passado', async () => {
    await notifyCouponFans({ companyId: 'comp1', couponId: 'cp1', title: 'T', body: 'B', deepLink: '/company/comp1', expiresAt: new Date(Date.now() - 1000) });
    expect(UserModelMock.find).not.toHaveBeenCalled();
  });

  it('trata duplicata (11000) como sucesso', async () => {
    UserModelMock.find.mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: () => Promise.resolve([{ clerkId: 'c1' }]) }),
    });
    NotificationModelMock.insertMany.mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 }));
    await expect(notifyCouponFans({ companyId: 'comp1', couponId: 'cp1', title: 'T', body: 'B', deepLink: '/company/comp1', expiresAt: null })).resolves.toBeUndefined();
  });

  it('suporta mock sem select (cadeia lean direta)', async () => {
    UserModelMock.find.mockReturnValue({ lean: () => Promise.resolve([{ clerkId: 'c3' }]) });
    NotificationModelMock.insertMany.mockResolvedValue([]);
    await notifyCouponFans({ companyId: 'comp1', couponId: 'cp2', title: 'T', body: 'B', deepLink: '/company/comp1', expiresAt: null });
    expect(NotificationModelMock.insertMany).toHaveBeenCalled();
  });
});

describe('notifyEventCity', () => {
  it('cria notificação para usuários da cidade', async () => {
    UserModelMock.find.mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: () => Promise.resolve([{ clerkId: 'u1' }]) }),
    });
    NotificationModelMock.insertMany.mockResolvedValue([]);
    await notifyEventCity({ eventId: 'ev1', title: 'E', body: 'B', deepLink: '/event/ev1', cityId: 'city1' });
    expect(UserModelMock.find).toHaveBeenCalledWith({ city: 'city1' });
    expect(NotificationModelMock.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ clerkId: 'u1', refId: 'ev1', type: 'event' })]),
      { ordered: false },
    );
  });

  it('ignora quando cityId ausente', async () => {
    await notifyEventCity({ eventId: 'ev1', title: 'E', body: 'B', deepLink: '/event/ev1', cityId: null });
    expect(UserModelMock.find).not.toHaveBeenCalled();
  });

  it('trata duplicata (11000) como sucesso', async () => {
    UserModelMock.find.mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: () => Promise.resolve([{ clerkId: 'u1' }]) }),
    });
    NotificationModelMock.insertMany.mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 }));
    await expect(notifyEventCity({ eventId: 'ev1', title: 'E', body: 'B', deepLink: '/event/ev1', cityId: 'city1' })).resolves.toBeUndefined();
  });
});

describe('listNotifications', () => {
  it('retorna items e total', async () => {
    const cadeia = cadeiaLean([{ _id: 'n1', clerkId: 'c1' }]);
    NotificationModelMock.find.mockReturnValue(cadeia);
    NotificationModelMock.countDocuments.mockResolvedValue(1);
    const { items, total } = await listNotifications('c1', { page: 1, pageSize: 20, skip: 0, limit: 20 });
    expect(total).toBe(1);
    expect(items).toHaveLength(1);
    expect(cadeia.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(cadeia.skip).toHaveBeenCalledWith(0);
    expect(cadeia.limit).toHaveBeenCalledWith(20);
  });
});

describe('countUnreadNotifications', () => {
  it('conta não lidas', async () => {
    NotificationModelMock.countDocuments.mockResolvedValue(3);
    const n = await countUnreadNotifications('c1');
    expect(n).toBe(3);
    expect(NotificationModelMock.countDocuments).toHaveBeenCalledWith({ clerkId: 'c1', readAt: null });
  });
});

describe('markNotificationsRead', () => {
  it('marca todas quando sem ids e retorna contador', async () => {
    NotificationModelMock.updateMany.mockResolvedValue({ matchedCount: 2, modifiedCount: 2 });
    NotificationModelMock.countDocuments.mockResolvedValue(0);
    const n = await markNotificationsRead('c1');
    expect(NotificationModelMock.updateMany).toHaveBeenCalledWith({ clerkId: 'c1', readAt: null }, { $set: expect.objectContaining({ readAt: expect.any(Date) }) });
    expect(n).toBe(0);
  });

  it('marca ids específicos', async () => {
    NotificationModelMock.updateMany.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    NotificationModelMock.countDocuments.mockResolvedValue(1);
    const id = '507f1f77bcf86cd799439011';
    const n = await markNotificationsRead('c1', [id]);
    expect(NotificationModelMock.updateMany).toHaveBeenCalledWith(
      { clerkId: 'c1', readAt: null, _id: { $in: expect.any(Array) } },
      expect.anything(),
    );
    expect(n).toBe(1);
  });

  it('ids inválidos não chama updateMany', async () => {
    NotificationModelMock.countDocuments.mockResolvedValue(5);
    const n = await markNotificationsRead('c1', ['nao-e-objectid']);
    expect(NotificationModelMock.updateMany).not.toHaveBeenCalled();
    expect(n).toBe(5);
  });
});

describe('markNotificationsUnread', () => {
  it('marca todas quando sem ids e retorna contador', async () => {
    NotificationModelMock.updateMany.mockResolvedValue({ modifiedCount: 2 });
    NotificationModelMock.countDocuments.mockResolvedValue(3);
    const n = await markNotificationsUnread('c1');
    expect(NotificationModelMock.updateMany).toHaveBeenCalledWith(
      { clerkId: 'c1', readAt: { $ne: null } },
      { $set: { readAt: null } },
    );
    expect(n).toBe(3);
  });

  it('marca ids específicos', async () => {
    NotificationModelMock.updateMany.mockResolvedValue({ modifiedCount: 1 });
    NotificationModelMock.countDocuments.mockResolvedValue(2);
    const id = '507f1f77bcf86cd799439011';
    const n = await markNotificationsUnread('c1', [id]);
    expect(NotificationModelMock.updateMany).toHaveBeenCalledWith(
      { clerkId: 'c1', readAt: { $ne: null }, _id: { $in: expect.any(Array) } },
      { $set: { readAt: null } },
    );
    expect(n).toBe(2);
  });

  it('ids inválidos não chama updateMany', async () => {
    NotificationModelMock.countDocuments.mockResolvedValue(4);
    const n = await markNotificationsUnread('c1', ['nao-e-objectid']);
    expect(NotificationModelMock.updateMany).not.toHaveBeenCalled();
    expect(n).toBe(4);
  });
});