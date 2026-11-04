import { Router } from 'express';

import { guestLogin } from '../controllers/auth.controller.js';
import * as autonomousProfessionalController from '../controllers/autonomous-professional.controller.js';
import * as bannerController from '../controllers/banner.controller.js';
import * as cityController from '../controllers/city.controller.js';
import * as categoryController from '../controllers/category.controller.js';
import * as companyController from '../controllers/company.controller.js';
import * as couponController from '../controllers/coupon.controller.js';
import { health } from '../controllers/health.controller.js';
import * as jobController from '../controllers/job.controller.js';
import * as noticeController from '../controllers/notice.controller.js';
import * as publicUtilityController from '../controllers/public-utility.controller.js';
import * as reviewController from '../controllers/review.controller.js';
import {
  createAuthDeps,
  makeAuthMiddleware,
} from '../middlewares/auth.middleware.js';
import { guestScrub } from '../middlewares/guest.middleware.js';
import {
  createBannerSchema,
  createCategorySchema,
  createCompanySchema,
  createCouponSchema,
  createJobSchema,
  createNoticeSchema,
  createPublicUtilitySchema,
  createReviewSchema,
  updateUserSchema,
  validateBody,
} from '../types/dto.js';
import { listUsers, me, updateMe } from '../controllers/user.controller.js';
import { broadcastPush, registerPushToken } from '../controllers/push-token.controller.js';

const routes = Router();

// -----------------------------------------------------------------------------
// Health
// -----------------------------------------------------------------------------
routes.get('/health', health);

// Auth opcional: sem CLERK_SECRET_KEY o modo legado segue sem `req.auth`.
// O health fica de fora para não depender do Clerk em monitoramento.
const authDeps = createAuthDeps();
if (authDeps) {
  const auth = makeAuthMiddleware(authDeps);

  routes.use(auth.optionalAuth);
  routes.use(guestScrub());
  // Handshake explícito de convidado: não cria sessão nem token; as chamadas
  // seguintes continuam sem Authorization e são redigidas pelo scrub.
  routes.post('/auth/guest', guestLogin);
  // Perfil do usuário autenticado: exige sessão válida e só existe com auth
  // ligado — em modo legado o app não a consome.
  routes.get('/me', auth.requireAuth, me);
  routes.put('/me', auth.requireAuth, validateBody(updateUserSchema.partial()), updateMe);
  routes.post('/push-tokens', registerPushToken);
  routes.post('/notifications/broadcast', broadcastPush);
}

// -----------------------------------------------------------------------------
// Categories
// -----------------------------------------------------------------------------
const categories = Router();
categories.post('/', validateBody(createCategorySchema), categoryController.create);
categories.get('/', categoryController.list);
categories.get('/:id', categoryController.getById);
categories.put('/:id', validateBody(createCategorySchema.partial()), categoryController.update);
categories.delete('/:id', categoryController.remove);

// -----------------------------------------------------------------------------
// Companies
// -----------------------------------------------------------------------------
const companies = Router();
companies.post('/', validateBody(createCompanySchema), companyController.create);
companies.get('/', companyController.list);
companies.get('/:id', companyController.getById);
companies.get('/:id/reviews', reviewController.listReviews);
companies.post('/:id/reviews', validateBody(createReviewSchema), reviewController.createReviewHandler);
companies.put('/:id', validateBody(createCompanySchema.partial()), companyController.update);
companies.delete('/:id', companyController.remove);

// -----------------------------------------------------------------------------
// Banners
// -----------------------------------------------------------------------------
const banners = Router();
banners.post('/', validateBody(createBannerSchema), bannerController.create);
banners.get('/', bannerController.list);
banners.get('/:id', bannerController.getById);
banners.put('/:id', validateBody(createBannerSchema.partial()), bannerController.update);
banners.delete('/:id', bannerController.remove);

// -----------------------------------------------------------------------------
// Coupons
// -----------------------------------------------------------------------------
const coupons = Router();
coupons.post('/', validateBody(createCouponSchema), couponController.create);
coupons.get('/', couponController.list);
coupons.get('/:id', couponController.getById);
coupons.put('/:id', validateBody(createCouponSchema.partial()), couponController.update);
coupons.delete('/:id', couponController.remove);

// -----------------------------------------------------------------------------
// Jobs
// -----------------------------------------------------------------------------
const jobs = Router();
jobs.post('/', validateBody(createJobSchema), jobController.create);
jobs.get('/', jobController.list);
jobs.get('/:id', jobController.getById);
jobs.put('/:id', validateBody(createJobSchema.partial()), jobController.update);
jobs.delete('/:id', jobController.remove);

const autonomousProfessionals = Router();
autonomousProfessionals.post('/', autonomousProfessionalController.create);
autonomousProfessionals.get('/', autonomousProfessionalController.list);
autonomousProfessionals.get('/:id', autonomousProfessionalController.getById);
autonomousProfessionals.put('/:id', autonomousProfessionalController.update);
autonomousProfessionals.delete('/:id', autonomousProfessionalController.remove);

const notices = Router();
notices.post('/', validateBody(createNoticeSchema), noticeController.create);
notices.get('/', noticeController.list);
notices.get('/:id', noticeController.getById);
notices.put('/:id', validateBody(createNoticeSchema.partial()), noticeController.update);
notices.delete('/:id', noticeController.remove);

const cities = Router();
cities.post('/', cityController.create);
cities.get('/', cityController.list);
cities.delete('/:id', cityController.remove);

// Utilidades públicas (polícia, hospital, coleta): leitura aberta, escrita
// restrita ao admin — o controller devolve 401 sem sessão e o service 403
// para quem não é admin.
const publicUtilities = Router();
publicUtilities.post(
  '/',
  validateBody(createPublicUtilitySchema),
  publicUtilityController.create,
);
publicUtilities.get('/', publicUtilityController.list);
publicUtilities.get('/:id', publicUtilityController.getById);
publicUtilities.put(
  '/:id',
  validateBody(createPublicUtilitySchema.partial()),
  publicUtilityController.update,
);
publicUtilities.delete('/:id', publicUtilityController.remove);

routes.use('/categories', categories);
routes.use('/cities', cities);
routes.use('/companies', companies);
routes.use('/banners', banners);
routes.use('/coupons', coupons);
routes.use('/jobs', jobs);
routes.use('/notices', notices);
routes.use('/public-utilities', publicUtilities);
routes.use('/autonomous-professionals', autonomousProfessionals);

// -----------------------------------------------------------------------------
// Usuários (painel admin)
// -----------------------------------------------------------------------------
// A listagem exige sessão de admin: 401 sem identidade, 403 para usuário
// comum. Fica fora do bloco do Clerk porque a autorização mora no controller.
routes.get('/users', listUsers);

export default routes;
