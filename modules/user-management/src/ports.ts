import type {
  User,
  CreateUserData,
  UpdateUserData,
  UserFilters,
} from "./domain/user.types.js";
import type {
  Role,
  CreateRoleData,
  RoleAssignment,
  AssignRoleData,
} from "./domain/role.types.js";
import type {
  Session,
  CreateSessionData,
} from "./domain/session.types.js";

export interface UserRepo {
  findAll(tenantId: string, filters?: UserFilters): Promise<{ data: User[]; total: number }>;
  findById(tenantId: string, id: string): Promise<User | undefined>;
  findByUsername(tenantId: string, username: string): Promise<User | undefined>;
  create(data: CreateUserData): Promise<User>;
  update(tenantId: string, id: string, data: UpdateUserData): Promise<User | undefined>;
  deactivate(tenantId: string, id: string, deactivatedBy: string): Promise<User | undefined>;
}

export interface RoleRepo {
  findAll(tenantId: string): Promise<Role[]>;
  findById(tenantId: string, id: string): Promise<Role | undefined>;
  create(data: CreateRoleData): Promise<Role>;
  assignToUser(data: AssignRoleData): Promise<RoleAssignment>;
}

export interface SessionRepo {
  create(data: CreateSessionData): Promise<Session>;
  findByToken(token: string): Promise<Session | undefined>;
  invalidate(id: string): Promise<void>;
}
