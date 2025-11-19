import { Router } from 'express';
import { userMe } from '../controllers/apiController';

const router = Router();

// GET /api/user/me - Get authenticated user info
router.get('/user/me', userMe);

export default router;
