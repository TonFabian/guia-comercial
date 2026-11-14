import type { RequestHandler } from 'express';
import { Router } from 'express';

import { guestLogin } from '../controllers/auth.controller.js';
import * as autonomousProfessionalController from '../controllers/autonomous-professional.controller.js';
import * as bannerController from '../controllers/banner.controller.js';
import * as cityController from '../controllers/city.controller.js';
import * as categoryController from '../controllers/category.controller.js';
import * as companyController from '../controllers/company.controller.js';
import * as couponController from '../controllers/coupon.controller.js';
import * as eventController from '../controllers/event.controller.js';
import { health } from '../controllers/health.controller.js';
import * as jobController from '../controllers/job.controller.js';
import * as noticeController from '../controllers/notice.controller.js';
import * as pushCampaignController from '../controllers/push-campaign.controller.js';
import * as publicUtilityController from '../controllers/public-utility.controller.js';
import * as touristSpotController from '../controllers/tourist-spot.controller.js';
import * as reviewController from '../controllers/review.controller.js';
import type { AuthDeps } from '../middlewares/auth.middleware.js';
import {
  makeAuthMiddleware,
  requireAuthIfConfigured,
} from '../middlewares/auth.middleware.js';
import { limitarView, limitarWhatsappClick, limitarFavorite } from '../middlewares/analytics-rate-limit.middleware.js';
import { limitarCampanha } from '../middlewares/campaign-rate-limit.middleware.js';
import { guestScrub } from '../middlewares/guest.middleware.js';
import {
  createAutonomousProfessionalSchema,
  createBannerSchema,
  createCategorySchema,
  createCitySchema,
  createCompanySchema,
  updateCompanySchema,
  updatePlanSchema,
  createCouponSchema,
  createJobSchema,
  createNoticeSchema,
  createPublicUtilitySchema,
  createReviewSchema,
  createTourEventSchema,
  createTouristSpotSchema,
  broadcastSchema,
  createCampaignSchema,
  updateCampaignStatusSchema,
  pushTokenSchema,
  updateUserSchema,
  updateUserRoleSchema,
  updateUserAdminSchema,
  updateTourEventSchema,
  updateTouristSpotSchema,
  validateBody,
} from '../types/dto.js';
import { listUsers, me, updateMe, updateUserRole, updateUserProfile, deleteUser } from '../controllers/user.controller.js';
import { broadcastPush, registerPushToken } from '../controllers/push-token.controller.js';

export function createRoutes(authDeps: AuthDeps | null): Router {
const routes = Router();

// -----------------------------------------------------------------------------
// Health
// -----------------------------------------------------------------------------
routes.get('/health', health);

// Auth opcional: sem CLERK_SECRET_KEY o modo legado segue sem `req.auth`.
// O health fica de fora para não depender do Clerk em monitoramento.
// Obs.: o `optionalAuth` do Clerk é montado em app.ts ANTES do rate limit
// global (risco aceito: token inválido chama o Clerk antes do limiter —
// mitigação futura). Aqui mantemos guestScrub e as rotas que exigem sessão.
if (authDeps) {
  const auth = makeAuthMiddleware(authDeps);

  // Scrub de convidado: redige contato/código antes de responder. Montado
  // dentro do bloco do Clerk (aqui) para rodar ANTES dos handlers de rota —
  // caso contrário a interceptação de `res.json` chega tarde demais.
  routes.use(guestScrub());
  // Handshake explícito de convidado: não cria sessão nem token; as chamadas
  // seguintes continuam sem Authorization e são redigidas pelo scrub.
  routes.post('/auth/guest', guestLogin);
  // Perfil do usuário autenticado: exige sessão válida e só existe com auth
  // ligado — em modo legado o app não a consome.
  routes.get('/me', auth.requireAuth, me);
  routes.put('/me', auth.requireAuth, validateBody(updateUserSchema.partial()), updateMe);
  routes.post('/push-tokens', validateBody(pushTokenSchema), registerPushToken);
  routes.post('/notifications/broadcast', validateBody(broadcastSchema), broadcastPush);
}

// Middleware de autorização para mutações: quando o Clerk está configurado,
// POST/PUT/DELETE exigem sessão (401 sem identidade). Em modo legado, o
// middleware é no-op e a autorização fica a cargo dos services (assertOwner/
// assertAdmin), que também permitem o modo legado. Evita repetir a mesma
// checagem `if (CLERK_SECRET_KEY && !req.auth?.clerkId)` em todos os
// controllers (DRY).
// Só POST/PUT/DELETE exigem sessão; GET/HEAD/OPTIONS (e /auth/guest) passam.
const requireAuthForMutations: RequestHandler = (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }
  if (req.path === '/auth/guest' || req.path === '/push-tokens') {
    next();
    return;
  }
  // View e clique de WhatsApp são anônimos (rate-limited): o convidado do app
  // navega e clica sem sessão — a contagem de engajamento (plano de
  // monetização) não pode depender de login. A defesa anti-inflação é o
  // rate limit por IP+empresa, não a autenticação.
  if (/^\/companies\/[^/]+\/(view|whatsapp-click)$/.test(req.path)) {
    next();
    return;
  }
  return requireAuthIfConfigured(req, res, next);
};
routes.use(requireAuthForMutations);

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
companies.put('/:id', validateBody(updateCompanySchema), companyController.update);
companies.put('/:id/plan', requireAuthIfConfigured, validateBody(updatePlanSchema), companyController.updatePlan);
// Rate limit anti-inflação: métrica vendida ao lojista não pode ser bombada
// por script (view 1/empresa/IP/hora, clique 5/empresa/IP/hora).
companies.post('/:id/view', limitarView, companyController.trackView);
companies.post('/:id/whatsapp-click', limitarWhatsappClick, companyController.trackWhatsappClick);
// Favorito exige sessão (o requireAuthForMutations já cobre POST/DELETE fora
// da allowlist anônima) — a métrica conta o toggle real do usuário logado.
companies.post('/:id/favorite', limitarFavorite, companyController.trackFavorite);
companies.delete('/:id/favorite', limitarFavorite, companyController.untrackFavorite);
companies.get('/:id/analytics', requireAuthIfConfigured, companyController.getAnalytics);
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
autonomousProfessionals.post('/', validateBody(createAutonomousProfessionalSchema), autonomousProfessionalController.create);
autonomousProfessionals.get('/', autonomousProfessionalController.list);
autonomousProfessionals.get('/:id', autonomousProfessionalController.getById);
autonomousProfessionals.put('/:id', validateBody(createAutonomousProfessionalSchema.partial()), autonomousProfessionalController.update);
autonomousProfessionals.delete('/:id', autonomousProfessionalController.remove);

const notices = Router();
notices.post('/', validateBody(createNoticeSchema), noticeController.create);
notices.get('/', noticeController.list);
notices.get('/:id', noticeController.getById);
notices.put('/:id', validateBody(createNoticeSchema.partial()), noticeController.update);
notices.delete('/:id', noticeController.remove);

const cities = Router();
cities.post('/', validateBody(createCitySchema), cityController.create);
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

// Pontos turísticos (atrações permanentes do módulo de turismo): leitura
// aberta, escrita restrita ao admin — mesmo modelo das utilidades públicas.
const touristSpots = Router();
touristSpots.post('/', validateBody(createTouristSpotSchema), touristSpotController.create);
touristSpots.get('/', touristSpotController.list);
touristSpots.get('/:id', touristSpotController.getById);
touristSpots.put('/:id', validateBody(updateTouristSpotSchema), touristSpotController.update);
touristSpots.delete('/:id', touristSpotController.remove);

// Eventos turísticos (agenda temporária do módulo de turismo): leitura aberta,
// escrita restrita ao admin — mesmo modelo dos pontos turísticos. O push de
// "novo evento" mora no service e acontece apenas na criação.
const events = Router();
events.post('/', validateBody(createTourEventSchema), eventController.create);
events.get('/', eventController.list);
events.get('/:id', eventController.getById);
events.put('/:id', validateBody(updateTourEventSchema), eventController.update);
events.delete('/:id', eventController.remove);

routes.use('/categories', categories);
routes.use('/cities', cities);
routes.use('/companies', companies);
routes.use('/banners', banners);
routes.use('/coupons', coupons);
routes.use('/jobs', jobs);
routes.use('/notices', notices);
routes.use('/public-utilities', publicUtilities);
routes.use('/tourist-spots', touristSpots);
routes.use('/events', events);
routes.use('/autonomous-professionals', autonomousProfessionals);

// -----------------------------------------------------------------------------
// Usuários (painel admin)
// -----------------------------------------------------------------------------
// A listagem exige sessão de admin: 401 sem identidade, 403 para usuário
// comum. Fica fora do bloco do Clerk porque a autorização mora no controller.
routes.get('/users', listUsers);

// Mutação de role e exclusão de usuário (admin).
routes.put('/users/:id/role', validateBody(updateUserRoleSchema), updateUserRole);
routes.put('/users/:id', validateBody(updateUserAdminSchema), updateUserProfile);
routes.delete('/users/:id', deleteUser);

// -----------------------------------------------------------------------------
// Push Center (admin) — rotas sempre registradas (fora do bloco do Clerk).
// O guard assertAdminEstrito (no controller) devolve 401 em modo legado.
// -----------------------------------------------------------------------------
routes.post('/notifications/campaigns', limitarCampanha, validateBody(createCampaignSchema), pushCampaignController.criarCampanha);
routes.post('/notifications/campaigns/:id/send-now', pushCampaignController.enviarAgora);
routes.post('/notifications/campaigns/:id/cancel', validateBody(updateCampaignStatusSchema), pushCampaignController.cancelarCampanha);
routes.get('/notifications/campaigns', pushCampaignController.listarCampanhas);
routes.get('/notifications/campaigns/:id', pushCampaignController.detalharCampanha);
routes.delete('/notifications/campaigns/:id', pushCampaignController.excluirCampanha);

return routes;
}
