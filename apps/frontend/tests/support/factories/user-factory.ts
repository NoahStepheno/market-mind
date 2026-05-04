import { faker } from "@faker-js/faker";

export type UserRole = "user" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

interface CreateUserOptions extends Partial<Omit<User, "id" | "createdAt">> {}

export function createUser(options: CreateUserOptions = {}): User {
  return {
    id: faker.string.uuid(),
    email: options.email ?? faker.internet.email(),
    name: options.name ?? faker.person.fullName(),
    role: options.role ?? "user",
    isActive: options.isActive ?? true,
    createdAt: faker.date.recent(),
  };
}
