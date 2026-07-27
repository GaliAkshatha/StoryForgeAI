import { PrismaClient } from "@prisma/client";
import { User, UserRepository } from "@storyforge/identity";

interface UserRecord {

    id: string;

    email: string;

    passwordHash: string;

    createdAt: Date;

}

// Implements the exact same UserRepository interface the
// InMemoryUserRepository does -- AuthService (and everything above
// it) is unaware this swap happened.
export class PostgresUserRepository implements UserRepository {

    constructor(
        private readonly prisma: PrismaClient
    ) {}

    async findByEmail(
        email: string
    ): Promise<User | undefined> {

        const record = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        return record ? this.toDomain(record) : undefined;

    }

    async findById(
        id: string
    ): Promise<User | undefined> {

        const record = await this.prisma.user.findUnique({
            where: { id }
        });

        return record ? this.toDomain(record) : undefined;

    }

    async save(
        user: User
    ): Promise<void> {

        await this.prisma.user.upsert({

            where: { id: user.id },

            create: {

                id: user.id,

                email: user.email.toLowerCase(),

                passwordHash: user.passwordHash,

                createdAt: new Date(user.createdAt)

            },

            update: {

                email: user.email.toLowerCase(),

                passwordHash: user.passwordHash,

            }

        });

    }

    private toDomain(
        record: UserRecord
    ): User {

        return {

            id: record.id,

            email: record.email,

            passwordHash: record.passwordHash,

            createdAt: record.createdAt.toISOString()

        };

    }

}
