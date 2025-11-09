import { Router } from 'express';
import { MediaController } from './controller.js';
import { MediaService } from './service.js';
import { validate } from '../../middleware/validation.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { uploadLimiter } from '../../middleware/rateLimit.js';
import { mediaUpdateSchema, folderCreateSchema } from './validation.js';

const router = Router();

// Setup multer
const upload = MediaService.getMulterConfig();

// All routes require authentication
router.use(authenticate);

// Upload single file
router.post(
  '/upload',
  uploadLimiter,
  authorize(['media.create']),
  upload.single('file'),
  auditLog('UPLOAD_MEDIA', 'media'),
  MediaController.uploadFile
);

// Bulk upload
router.post(
  '/bulk-upload',
  uploadLimiter,
  authorize(['media.create']),
  upload.array('files', 10), // Max 10 files
  auditLog('BULK_UPLOAD_MEDIA', 'media'),
  MediaController.bulkUpload
);

// Get media list
router.get('/', authorize(['media.read']), MediaController.getMedia);

// Get media statistics
router.get('/statistics', authorize(['media.read']), MediaController.getStatistics);

// Get single media
router.get('/:id', authorize(['media.read']), MediaController.getMediaById);

// Update media metadata
router.put(
  '/:id',
  authorize(['media.update']),
  validate(mediaUpdateSchema),
  auditLog('UPDATE_MEDIA', 'media'),
  MediaController.updateMedia
);

// Delete media
router.delete(
  '/:id',
  authorize(['media.delete']),
  auditLog('DELETE_MEDIA', 'media'),
  MediaController.deleteMedia
);

// Create folder
router.post(
  '/folders',
  authorize(['media.create']),
  validate(folderCreateSchema),
  auditLog('CREATE_FOLDER', 'media'),
  MediaController.createFolder
);

// Edit image
router.post(
  '/:id/edit',
  uploadLimiter,
  authorize(['media.update']),
  upload.single('file'),
  auditLog('EDIT_IMAGE', 'media'),
  MediaController.editImage
);

export default router;
