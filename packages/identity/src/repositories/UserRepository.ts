import { User } from "../models/User";

export interface UserRepository {

    findByEmail(
        email: string
    ): Promise<User | undefined>;

    findById(
        id: string
    ): Promise<User | undefined>;

    save(
        user: User
    ): Promise<void>;

}

export class InMemoryUserRepository implements UserRepository {

    private readonly usersById = new Map<string, User>();

    private readonly idsByEmail = new Map<string, string>();

    async findByEmail(
        email: string
    ): Promise<User | undefined> {

        const id = this.idsByEmail.get(email.toLowerCase());

        return id ? this.usersById.get(id) : undefined;

    }

    async findById(
        id: string
    ): Promise<User | undefined> {

        return this.usersById.get(id);

    }

    async save(
        user: User
    ): Promise<void> {

        this.usersById.set(user.id, user);

        this.idsByEmail.set(user.email.toLowerCase(), user.id);

    }

}
