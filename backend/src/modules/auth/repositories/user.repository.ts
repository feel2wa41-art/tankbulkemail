import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../config/database.service';
import * as crypto from 'crypto';

export interface UserEntity {
  USER_ID: number;
  USER_NAME: string;
  USER_EMAIL: string;
  PASSWORD_HASH: string;
  ROLE: string;
  USE_YN: string;
  CREATED_AT: Date;
  UPDATED_AT: Date;
}

@Injectable()
export class UserRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    const sql = `
      SELECT USER_ID, USER_NAME, USER_EMAIL, PASSWORD_HASH, ROLE, USE_YN, CREATED_AT, UPDATED_AT
      FROM USERS
      WHERE USER_EMAIL = :email AND USE_YN = 'Y'
    `;
    return this.db.queryOne<UserEntity>(sql, [email]);
  }

  async findById(id: number): Promise<UserEntity | null> {
    const sql = `
      SELECT USER_ID, USER_NAME, USER_EMAIL, PASSWORD_HASH, ROLE, USE_YN, CREATED_AT, UPDATED_AT
      FROM USERS
      WHERE USER_ID = :id AND USE_YN = 'Y'
    `;
    return this.db.queryOne<UserEntity>(sql, [id]);
  }

  async findByUserId(userId: string): Promise<UserEntity | null> {
    // userId can be email or username
    const sql = `
      SELECT USER_ID, USER_NAME, USER_EMAIL, PASSWORD_HASH, ROLE, USE_YN, CREATED_AT, UPDATED_AT
      FROM USERS
      WHERE (USER_EMAIL = :userId OR USER_NAME = :userId) AND USE_YN = 'Y'
    `;
    return this.db.queryOne<UserEntity>(sql, [userId, userId]);
  }

  async findAll(): Promise<UserEntity[]> {
    const sql = `
      SELECT USER_ID, USER_NAME, USER_EMAIL, ROLE, USE_YN, CREATED_AT, UPDATED_AT
      FROM USERS
      WHERE USE_YN = 'Y'
      ORDER BY USER_ID
    `;
    return this.db.query<UserEntity>(sql);
  }

  async create(data: {
    userName: string;
    userEmail: string;
    password: string;
    role: string;
  }): Promise<number> {
    const passwordHash = this.hashPassword(data.password);
    const sql = `
      INSERT INTO USERS (USER_NAME, USER_EMAIL, PASSWORD_HASH, ROLE, USE_YN, CREATED_AT, UPDATED_AT)
      VALUES (:userName, :userEmail, :passwordHash, :role, 'Y', SYSDATE, SYSDATE)
    `;
    return this.db.insert(sql, [data.userName, data.userEmail, passwordHash, data.role], 'USER_ID');
  }

  async updatePassword(userId: number, newPassword: string): Promise<void> {
    const passwordHash = this.hashPassword(newPassword);
    const sql = `
      UPDATE USERS
      SET PASSWORD_HASH = :passwordHash, UPDATED_AT = SYSDATE
      WHERE USER_ID = :userId
    `;
    await this.db.execute(sql, [passwordHash, userId]);
  }

  async update(userId: number, data: {
    userName?: string;
    userEmail?: string;
    role?: string;
  }): Promise<void> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.userName) {
      updates.push(`USER_NAME = :${paramIndex}`);
      params.push(data.userName);
      paramIndex++;
    }

    if (data.userEmail) {
      updates.push(`USER_EMAIL = :${paramIndex}`);
      params.push(data.userEmail);
      paramIndex++;
    }

    if (data.role) {
      updates.push(`ROLE = :${paramIndex}`);
      params.push(data.role);
      paramIndex++;
    }

    if (updates.length === 0) {
      return;
    }

    updates.push('UPDATED_AT = SYSDATE');
    params.push(userId);

    const sql = `
      UPDATE USERS
      SET ${updates.join(', ')}
      WHERE USER_ID = :${paramIndex}
    `;
    await this.db.execute(sql, params);
  }

  async delete(userId: number): Promise<void> {
    // Soft delete
    const sql = `
      UPDATE USERS
      SET USE_YN = 'N', UPDATED_AT = SYSDATE
      WHERE USER_ID = :userId
    `;
    await this.db.execute(sql, [userId]);
  }

  verifyPassword(password: string, hash: string): boolean {
    const inputHash = this.hashPassword(password);
    return inputHash === hash;
  }

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }
}
