import { CarouselService } from './service.js';
import { Carousel } from './model.js';
import { logger } from '../../utils/logger.js';

export class CarouselController {
  /**
   * @swagger
   * /api/v1/carousel:
   *   post:
   *     summary: ایجاد اسلاید جدید
   *     tags: [Carousel]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - image
   *     responses:
   *       201:
   *         description: اسلاید با موفقیت ایجاد شد
   */
  static async createCarousel(req, res, next) {
    try {
      const carousel = await CarouselService.createCarousel(req.body, req.user.id);

      res.status(201).json({
        success: true,
        message: 'اسلاید با موفقیت ایجاد شد',
        data: { carousel }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/carousel:
   *   get:
   *     summary: دریافت لیست اسلایدها
   *     tags: [Carousel]
   *     parameters:
   *       - in: query
   *         name: position
   *         schema:
   *           type: string
   *           enum: [home, services, portfolio, about]
   *       - in: query
   *         name: isVisible
   *         schema:
   *           type: boolean
   *     responses:
   *       200:
   *         description: لیست اسلایدها دریافت شد
   */
  static async getCarousels(req, res, next) {
    try {
      const carousels = await CarouselService.getCarousels(req.query);

      res.json({
        success: true,
        data: { carousels }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/carousel/active/{position}:
   *   get:
   *     summary: دریافت اسلایدهای فعال
   *     tags: [Carousel]
   *     parameters:
   *       - in: path
   *         name: position
   *         required: true
   *         schema:
   *           type: string
   *           enum: [home, services, portfolio, about]
   *     responses:
   *       200:
   *         description: اسلایدهای فعال دریافت شدند
   */
  static async getActiveCarousels(req, res, next) {
    try {
      const { position } = req.params;
      const carousels = await CarouselService.getActiveCarousels(position);

      res.json({
        success: true,
        data: { carousels }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/carousel/{id}:
   *   get:
   *     summary: دریافت جزئیات اسلاید
   *     tags: [Carousel]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: جزئیات اسلاید دریافت شد
   *       404:
   *         description: اسلاید یافت نشد
   */
  static async getCarouselById(req, res, next) {
    try {
      const carousel = await Carousel.findById(req.params.id);

      if (!carousel || carousel.deletedAt) {
        return res.status(404).json({
          success: false,
          message: 'اسلاید یافت نشد'
        });
      }

      res.json({
        success: true,
        data: { carousel }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/carousel/{id}:
   *   put:
   *     summary: ویرایش اسلاید
   *     tags: [Carousel]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               subtitle:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               description:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               image:
   *                 type: string
   *               link:
   *                 type: string
   *               position:
   *                 type: string
   *                 enum: [home, services, portfolio, about]
   *               isVisible:
   *                 type: boolean
   *               orderIndex:
   *                 type: number
   *               status:
   *                 type: string
   *                 enum: [active, inactive, archived]
   *     responses:
   *       200:
   *         description: اسلاید با موفقیت ویرایش شد
   *       404:
   *         description: اسلاید یافت نشد
   */
  static async updateCarousel(req, res, next) {
    try {
      const carousel = await CarouselService.updateCarousel(req.params.id, req.body, req.user.id);

      res.json({
        success: true,
        message: 'اسلاید با موفقیت به‌روزرسانی شد',
        data: { carousel }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/carousel/{id}:
   *   delete:
   *     summary: حذف اسلاید
   *     tags: [Carousel]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: اسلاید با موفقیت حذف شد
   *       404:
   *         description: اسلاید یافت نشد
   */
  static async deleteCarousel(req, res, next) {
    try {
      await CarouselService.deleteCarousel(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'اسلاید با موفقیت حذف شد'
      });
    } catch (error) {
      next(error);
    }
  }

  static async trackCarouselClick(req, res, next) {
    try {
      const carousel = await Carousel.findById(req.params.id);

      if (!carousel) {
        return res.status(404).json({
          success: false,
          message: 'اسلاید یافت نشد'
        });
      }

      await carousel.trackClick();

      res.json({
        success: true,
        message: 'کلیک ثبت شد'
      });
    } catch (error) {
      next(error);
    }
  }

  static async trackCarouselView(req, res, next) {
    try {
      const carousel = await Carousel.findById(req.params.id);

      if (!carousel) {
        return res.status(404).json({
          success: false,
          message: 'اسلاید یافت نشد'
        });
      }

      await carousel.trackView();

      res.json({
        success: true,
        message: 'بازدید ثبت شد'
      });
    } catch (error) {
      next(error);
    }
  }
}
