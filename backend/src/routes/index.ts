import { Router } from 'express';

import * as bannerController from '../controllers/banner.controller.js';
import * as categoryController from '../controllers/category.controller.js';
import * as companyController from '../controllers/company.controller.js';
import * as couponController from '../controllers/coupon.controller.js';
import { health } from '../controllers/health.controller.js';
import * as jobController from '../controllers/job.controller.js';
import {
  createAuthDeps,
  makeAuthMiddleware,
} from '../middlewares/auth.middleware.js';
import {
  createBannerSchema,
  createCategorySchema,
  createCompanySchema,
  createCouponSchema,
  createJobSchema,
  validateBody,
} from '../types/dto.js';
import { me } from '../controllers/user.controller.js';

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
  // Perfil do usuário autenticado: exige sessão válida e só existe com auth
  // ligado — em modo legado o app não a consome.
  routes.get('/me', auth.requireAuth, me);
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

routes.use('/categories', categories);
routes.use('/companies', companies);
routes.use('/banners', banners);
routes.use('/coupons', coupons);
routes.use('/jobs', jobs);

export default routes;
