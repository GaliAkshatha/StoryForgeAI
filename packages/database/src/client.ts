import { PrismaClient } from "@prisma/client";

// A single PrismaClient per process, per Prisma's own connection
// pooling guidance -- never `new PrismaClient()` per repository.
// AppContainer creates exactly one of these and hands it to all four
// Postgres repositories below.
export function createPrismaClient(): PrismaClient {

    return new PrismaClient();

}

export type { PrismaClient };
