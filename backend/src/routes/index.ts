import { Router } from 'express';

import { health } from '../controllers/health.controller.js';

const routes = Router();

routes.get('/health', health);

// Estrutura: crie um arquivo por recurso em routes/, controllers/ e models/
// e monte aqui (ex.: routes.use('/empresas', companiesRoutes)).

export default routes;
