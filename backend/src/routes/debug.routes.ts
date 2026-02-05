import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { AuthenticatedRequest } from '../types/index.js';
import { Response } from 'express';

const router = Router();

// Debug endpoint to check JWT token contents
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      user: req.user,
      tenantId: req.tenantId,
      plantId: req.plantId,
    },
  });
});

export default router;
