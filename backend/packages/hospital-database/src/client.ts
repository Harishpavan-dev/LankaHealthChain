import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client';
export { PrismaClient };
export function createPrismaClient(databaseUrl: string): PrismaClient {
  if (!databaseUrl) throw new Error('HOSPITAL_DATABASE_URL required');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}
