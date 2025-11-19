import { Router } from 'express';
import {
  registerApp,
  authorize,
  token,
  userinfo,
} from '../controllers/oauthController';

const router = Router();

// POST /oauth/register-app - Register a new OAuth application
router.post('/register-app', registerApp);

// GET /oauth/authorize - Authorization endpoint
router.get('/authorize', authorize);

// POST /oauth/token - Token endpoint
router.post('/token', token);

// GET /oauth/userinfo - User info endpoint
router.get('/userinfo', userinfo);

export default router;
