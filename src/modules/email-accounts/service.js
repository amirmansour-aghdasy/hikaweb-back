import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { EmailAccount } from './model.js';
import { SentEmail } from './sentEmailModel.js';
import { encrypt, decrypt } from '../../utils/encrypt.js';
import { logger } from '../../utils/logger.js';

function findPartByType(node, type, subtype, path = '1') {
  if (node.type === type && node.subtype === subtype) return path;
  if (node.childNodes) {
    for (let i = 0; i < node.childNodes.length; i++) {
      const childPath = path === '1' ? `${i + 1}` : `${path}.${i + 1}`;
      const found = findPartByType(node.childNodes[i], type, subtype, childPath);
      if (found) return found;
    }
  }
  return null;
}

export class EmailAccountsService {
  static async list(query = {}) {
    const { page = 1, limit = 50 } = query;
    const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
    const limitNum = Math.min(100, Math.max(1, limit));

    const [items, total] = await Promise.all([
      EmailAccount.find({ deletedAt: null })
        .sort({ isDefault: -1, address: 1 })
        .skip(skip)
        .limit(limitNum)
        .select('-smtpPasswordEncrypted')
        .lean(),
      EmailAccount.countDocuments({ deletedAt: null })
    ]);

    return { items, total, page: Math.max(1, page), limit: limitNum };
  }

  static async getById(id) {
    const account = await EmailAccount.findOne({ _id: id, deletedAt: null })
      .select('-smtpPasswordEncrypted')
      .lean();
    if (!account) return null;
    return account;
  }

  static async getByIdWithPassword(id) {
    const account = await EmailAccount.findOne({ _id: id, deletedAt: null }).lean();
    if (!account) return null;
    return account;
  }

  static async create(data, userId) {
    if (data.smtpPassword) {
      data.smtpPasswordEncrypted = encrypt(data.smtpPassword);
      delete data.smtpPassword;
    }
    if (data.isDefault) {
      await EmailAccount.updateMany({}, { $set: { isDefault: false } });
    }
    const account = new EmailAccount({
      ...data,
      createdBy: userId,
      updatedBy: userId
    });
    await account.save();
    const out = account.toObject();
    delete out.smtpPasswordEncrypted;
    logger.info(`Email account created: ${account.address}`);
    return out;
  }

  static async update(id, data, userId) {
    const account = await EmailAccount.findOne({ _id: id, deletedAt: null });
    if (!account) return null;
    if (data.smtpPassword !== undefined && data.smtpPassword !== '') {
      account.smtpPasswordEncrypted = encrypt(data.smtpPassword);
    }
    delete data.smtpPassword;
    if (data.isDefault === true) {
      await EmailAccount.updateMany({ _id: { $ne: id } }, { $set: { isDefault: false } });
    }
    Object.assign(account, data, { updatedBy: userId });
    await account.save();
    const out = account.toObject();
    delete out.smtpPasswordEncrypted;
    logger.info(`Email account updated: ${account.address}`);
    return out;
  }

  static async remove(id, userId) {
    const account = await EmailAccount.findOne({ _id: id, deletedAt: null });
    if (!account) return null;
    account.deletedAt = new Date();
    account.updatedBy = userId;
    await account.save();
    logger.info(`Email account removed: ${account.address}`);
    return account;
  }

  static async getDefaultAccount() {
    let acc = await EmailAccount.findOne({ deletedAt: null, isDefault: true })
      .select('+smtpPasswordEncrypted')
      .lean();
    if (!acc) {
      acc = await EmailAccount.findOne({ deletedAt: null })
        .select('+smtpPasswordEncrypted')
        .sort({ createdAt: 1 })
        .lean();
    }
    return acc;
  }

  static createTransporter(account) {
    const password = account.smtpPasswordEncrypted
      ? decrypt(account.smtpPasswordEncrypted)
      : '';
    return nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort || 587,
      secure: account.smtpSecure || false,
      auth: {
        user: account.smtpUser,
        pass: password
      }
    });
  }

  static async send(accountId, payload, userId) {
    const account = accountId
      ? await EmailAccountsService.getByIdWithPassword(accountId)
      : await EmailAccountsService.getDefaultAccount();
    if (!account) {
      throw new Error('حساب ایمیل یافت نشد. لطفاً یک حساب پیش‌فرض تنظیم کنید.');
    }
    const transporter = EmailAccountsService.createTransporter(account);
    const to = Array.isArray(payload.to) ? payload.to : [payload.to];
    const cc = payload.cc ? (Array.isArray(payload.cc) ? payload.cc : [payload.cc]) : undefined;
    const bcc = payload.bcc ? (Array.isArray(payload.bcc) ? payload.bcc : [payload.bcc]) : undefined;
    const mailOptions = {
      from: payload.from || `${account.displayName || account.address} <${account.address}>`,
      to,
      cc,
      bcc,
      subject: payload.subject,
      text: payload.text || (payload.html ? payload.html.replace(/<[^>]*>/g, '') : ''),
      html: payload.html || undefined
    };
    await transporter.sendMail(mailOptions);

    await SentEmail.create({
      fromAccount: account._id,
      fromAddress: account.address,
      to,
      cc: cc || [],
      bcc: bcc || [],
      subject: payload.subject,
      bodyHtml: payload.html || '',
      bodyText: payload.text || '',
      sentBy: userId
    });

    logger.info(`Email sent from ${account.address} to ${to.join(', ')}`);
    return { success: true, from: account.address, to };
  }

  static async listSent(query = {}) {
    const { page = 1, limit = 20, accountId } = query;
    const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
    const limitNum = Math.min(100, Math.max(1, limit));
    const filter = {};
    if (accountId) filter.fromAccount = accountId;

    const [items, total] = await Promise.all([
      SentEmail.find(filter)
        .populate('fromAccount', 'address displayName')
        .populate('sentBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SentEmail.countDocuments(filter)
    ]);
    return { items, total, page: Math.max(1, page), limit: limitNum };
  }

  static getImapConfig(account) {
    const password = account.smtpPasswordEncrypted ? decrypt(account.smtpPasswordEncrypted) : '';
    const host = (account.imapHost && account.imapHost.trim()) ? account.imapHost.trim() : account.smtpHost;
    const port = account.imapPort ?? 993;
    const secure = account.imapSecure !== false;
    return {
      host,
      port,
      secure,
      auth: { user: account.smtpUser, pass: password }
    };
  }

  static async getInbox(accountId, query = {}) {
    const account = await EmailAccountsService.getByIdWithPassword(accountId);
    if (!account) throw new Error('حساب ایمیل یافت نشد.');
    const imapHost = (account.imapHost && account.imapHost.trim()) || null;
    if (!imapHost) {
      throw new Error('برای این حساب IMAP تنظیم نشده. در ویرایش حساب، فیلد «سرور IMAP» را پر کنید.');
    }
    const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const client = new ImapFlow(EmailAccountsService.getImapConfig(account));
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        const total = client.mailbox.exists;
        if (total === 0) {
          return { items: [], total: 0, page: 1, limit };
        }
        const end = Math.min(total, total - (page - 1) * limit);
        const start = Math.max(1, end - limit + 1);
        if (start > end) {
          return { items: [], total, page, limit };
        }
        const range = `${start}:${end}`;
        const messages = await client.fetchAll(range, {
          envelope: true,
          flags: true,
          uid: true
        });
        const items = messages.map((msg) => ({
          uid: msg.uid,
          from: msg.envelope?.from?.[0]?.address || msg.envelope?.from?.[0]?.name || '',
          fromName: msg.envelope?.from?.[0]?.name || null,
          to: (msg.envelope?.to || []).map((t) => t.address || t.name).filter(Boolean),
          subject: msg.envelope?.subject || '(بدون موضوع)',
          date: msg.envelope?.date || null,
          seen: msg.flags?.has?.('\\Seen') ?? false
        }));
        return { items: items.reverse(), total, page, limit };
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
  }

  static async getInboxMessage(accountId, uid) {
    const account = await EmailAccountsService.getByIdWithPassword(accountId);
    if (!account) throw new Error('حساب ایمیل یافت نشد.');
    const imapHost = (account.imapHost && account.imapHost.trim()) || null;
    if (!imapHost) throw new Error('برای این حساب IMAP تنظیم نشده.');
    const client = new ImapFlow(EmailAccountsService.getImapConfig(account));
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        const message = await client.fetchOne(uid, {
          envelope: true,
          bodyStructure: true,
          flags: true
        }, { uid: true });
        if (!message) return null;
        const envelope = {
          from: message.envelope?.from?.[0]?.address || '',
          fromName: message.envelope?.from?.[0]?.name || null,
          to: (message.envelope?.to || []).map((t) => t.address || t.name).filter(Boolean),
          subject: message.envelope?.subject || '(بدون موضوع)',
          date: message.envelope?.date || null,
          seen: message.flags?.has?.('\\Seen') ?? false
        };
        let text = '';
        let html = '';
        if (message.bodyStructure) {
          const textPart = findPartByType(message.bodyStructure, 'text', 'plain');
          const htmlPart = findPartByType(message.bodyStructure, 'text', 'html');
          if (textPart) {
            const { content } = await client.download(uid, textPart, { uid: true });
            const chunks = [];
            for await (const chunk of content) chunks.push(chunk);
            text = Buffer.concat(chunks).toString('utf-8');
          }
          if (htmlPart) {
            const { content } = await client.download(uid, htmlPart, { uid: true });
            const chunks = [];
            for await (const chunk of content) chunks.push(chunk);
            html = Buffer.concat(chunks).toString('utf-8');
          }
        }
        return { envelope, text, html };
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
  }
}
