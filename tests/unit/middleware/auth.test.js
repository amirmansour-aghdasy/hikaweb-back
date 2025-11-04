import jwt from 'jsonwebtoken';
import { authenticate } from '../../../src/middleware/auth.js';
import { config } from '../../../src/config/environment.js';
import { redisClient } from '../../../src/config/redis.js';

// Mock dependencies
jest.mock('../../../src/config/redis.js', () => ({
  redisClient: {
    getClient: jest.fn()
  }
}));

jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null,
      t: (key) => key
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 401 if no authorization header', async () => {
    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'auth.tokenRequired'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is blacklisted', async () => {
    const token = 'blacklisted-token';
    req.headers.authorization = `Bearer ${token}`;

    const mockRedis = {
      get: jest.fn().mockResolvedValue('true')
    };
    redisClient.getClient.mockReturnValue(mockRedis);

    await authenticate(req, res, next);

    expect(mockRedis.get).toHaveBeenCalledWith(`blacklist:${token}`);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should authenticate valid token', async () => {
    const user = {
      id: 'user123',
      email: 'test@example.com',
      role: 'user',
      permissions: []
    };

    const token = jwt.sign(user, config.JWT_SECRET, {
      expiresIn: '1h',
      issuer: 'hikaweb',
      audience: 'hikaweb-clients'
    });

    req.headers.authorization = `Bearer ${token}`;

    const mockRedis = {
      get: jest.fn().mockResolvedValue(null)
    };
    redisClient.getClient.mockReturnValue(mockRedis);

    await authenticate(req, res, next);

    expect(req.user).toEqual({
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 401 if token is expired', async () => {
    const expiredToken = jwt.sign(
      { id: 'user123' },
      config.JWT_SECRET,
      { expiresIn: '-1h' }
    );

    req.headers.authorization = `Bearer ${expiredToken}`;

    const mockRedis = {
      get: jest.fn().mockResolvedValue(null)
    };
    redisClient.getClient.mockReturnValue(mockRedis);

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

