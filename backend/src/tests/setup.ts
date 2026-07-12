// ─── Test Environment Variables ─────────────────────────────────────────────
process.env.JWT_SECRET = 'mock_jwt_secret_minimum_32_characters_for_validation';
process.env.JWT_REFRESH_SECRET = 'mock_jwt_refresh_secret_minimum_32_characters_for_validation';
process.env.DATABASE_URL = 'mysql://root:root@localhost:3306/assetflow_test';
process.env.NODE_ENV = 'test';
process.env.SMTP_FROM = 'noreply@test.com';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// ─── Mock Database Module (Prisma client proxy) ──────────────────────────────
jest.mock('../database/db', () => {
  const modelMock = () => ({
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({}),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    update: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    delete: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    count: jest.fn().mockResolvedValue(0),
    groupBy: jest.fn().mockResolvedValue([]),
  });

  return {
    __esModule: true,
    default: {
      $transaction: jest.fn().mockImplementation(function (this: any, cb: any) {
        return cb(this);
      }),
      $queryRaw: jest.fn().mockResolvedValue([]),
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
      $executeRaw: jest.fn().mockResolvedValue(0),
      organization: modelMock(),
      department: modelMock(),
      employee: modelMock(),
      assetCategory: modelMock(),
      asset: modelMock(),
      allocation: modelMock(),
      transfer: modelMock(),
      resourceBooking: modelMock(),
      maintenanceRequest: modelMock(),
      auditCycle: modelMock(),
      auditItem: modelMock(),
      auditDiscrepancy: modelMock(),
      notification: modelMock(),
      activityLog: modelMock(),
    },
    prisma: {},
  };
});

// ─── Mock ioredis ────────────────────────────────────────────────────────────
jest.mock('ioredis', () => {
  const RedisMock = jest.fn().mockImplementation(() => {
    return {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      incr: jest.fn().mockResolvedValue(1),
      decr: jest.fn().mockResolvedValue(0),
      scan: jest.fn().mockResolvedValue(['0', []]),
      ping: jest.fn().mockResolvedValue('PONG'),
      connect: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      duplicate: jest.fn().mockReturnThis(),
    };
  });
  return RedisMock;
});

// ─── Mock BullMQ ─────────────────────────────────────────────────────────────
jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => ({
      add: jest.fn().mockResolvedValue({ id: 'job-id' }),
      addBulk: jest.fn().mockResolvedValue([{ id: 'job-id' }]),
      close: jest.fn().mockResolvedValue(undefined),
    })),
    Worker: jest.fn().mockImplementation(() => ({
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    })),
  };
});

// ─── Mock Nodemailer ──────────────────────────────────────────────────────────
jest.mock('nodemailer', () => {
  return {
    createTransport: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-email-id' }),
    }),
  };
});

// ─── Mock Socket.IO ──────────────────────────────────────────────────────────
jest.mock('socket.io', () => {
  return {
    Server: jest.fn().mockImplementation(() => ({
      use: jest.fn(),
      on: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      adapter: jest.fn(),
    })),
  };
});

// Mock the socket.io redis adapter
jest.mock('@socket.io/redis-adapter', () => {
  return {
    createAdapter: jest.fn().mockReturnValue(() => {}),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});
