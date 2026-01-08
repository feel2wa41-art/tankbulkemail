// User Types

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface User {
  userId: number;
  userName: string;
  userEmail: string;
  role: UserRole;
  useYn: 'Y' | 'N';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  userName: string;
  userEmail: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserDto {
  userName?: string;
  userEmail?: string;
  role?: UserRole;
  useYn?: 'Y' | 'N';
}

export interface LoginDto {
  userId: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: Omit<User, 'createdAt' | 'updatedAt'>;
}

export interface OrgUserMapping {
  mappingId: number;
  orgId: number;
  userId: number;
  role: UserRole;
}
