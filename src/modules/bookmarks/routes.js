import { Router } from 'express';
import { BookmarkController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { auditLog } from '../../middleware/audit.js';

const router = Router();

// All bookmark routes require authentication
router.use(authenticate);

router.post('/:id', auditLog('TOGGLE_BOOKMARK', 'bookmarks'), BookmarkController.toggleBookmark);
router.get('/', BookmarkController.getUserBookmarks);
router.get('/:id/check', BookmarkController.checkBookmark);

export default router;

