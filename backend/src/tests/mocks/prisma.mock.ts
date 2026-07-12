import prisma from '../../database/db';

// Cast the database connection as jest.Mocked to allow mock implementation mapping in tests
export const prismaMock = prisma as any;

// Helper to mock a complete transaction block
export function mockPrismaTransaction(mockTx: any) {
  prismaMock.$transaction = jest.fn().mockImplementation((cb: any) => {
    if (typeof cb === 'function') {
      return cb(mockTx);
    }
    return Promise.resolve(cb);
  });
}
