import { EmailAccountsService } from './service.js';

export class EmailAccountsController {
  static async list(req, res, next) {
    try {
      const result = await EmailAccountsService.list(req.query);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const account = await EmailAccountsService.getById(req.params.id);
      if (!account) {
        return res.status(404).json({ success: false, message: 'حساب ایمیل یافت نشد.' });
      }
      res.json({ success: true, data: account });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const account = await EmailAccountsService.create(req.body, req.user.id);
      res.status(201).json({ success: true, data: account, message: 'حساب ایمیل با موفقیت اضافه شد.' });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const account = await EmailAccountsService.update(req.params.id, req.body, req.user.id);
      if (!account) {
        return res.status(404).json({ success: false, message: 'حساب ایمیل یافت نشد.' });
      }
      res.json({ success: true, data: account, message: 'حساب ایمیل به‌روزرسانی شد.' });
    } catch (error) {
      next(error);
    }
  }

  static async remove(req, res, next) {
    try {
      const account = await EmailAccountsService.remove(req.params.id, req.user.id);
      if (!account) {
        return res.status(404).json({ success: false, message: 'حساب ایمیل یافت نشد.' });
      }
      res.json({ success: true, message: 'حساب ایمیل حذف شد.' });
    } catch (error) {
      next(error);
    }
  }

  static async send(req, res, next) {
    try {
      const accountId = req.params.id || req.body.accountId;
      const result = await EmailAccountsService.send(accountId, req.body, req.user.id);
      res.json({ success: true, data: result, message: 'ایمیل با موفقیت ارسال شد.' });
    } catch (error) {
      next(error);
    }
  }

  static async listSent(req, res, next) {
    try {
      const result = await EmailAccountsService.listSent(req.query);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getInbox(req, res, next) {
    try {
      const result = await EmailAccountsService.getInbox(req.params.id, req.query);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getInboxMessage(req, res, next) {
    try {
      const message = await EmailAccountsService.getInboxMessage(req.params.id, req.params.uid);
      if (!message) {
        return res.status(404).json({ success: false, message: 'پیام یافت نشد.' });
      }
      res.json({ success: true, data: message });
    } catch (error) {
      next(error);
    }
  }
}
