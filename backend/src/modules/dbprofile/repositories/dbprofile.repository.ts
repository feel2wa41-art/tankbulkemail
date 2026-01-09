/**
 * DB Profile Repository
 */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../config/database.service';
import * as crypto from 'crypto';

export interface DbProfileEntity {
  PROFILE_ID: number;
  PROFILE_NAME: string;
  DESCRIPTION: string | null;
  DB_TYPE: string;
  HOST: string;
  PORT: number;
  DATABASE_NAME: string;
  USERNAME: string;
  PASSWORD_ENC: string;
  OPTIONS: string | null;
  USE_YN: string;
  CREATED_AT: Date;
  UPDATED_AT: Date;
}

@Injectable()
export class DbProfileRepository {
  private readonly encryptionKey: string;

  constructor(private readonly db: DatabaseService) {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'tank-default-key-32chars!!!!!';
  }

  async findAll(): Promise<DbProfileEntity[]> {
    const sql = `
      SELECT PROFILE_ID, PROFILE_NAME, DESCRIPTION, DB_TYPE, HOST, PORT,
             DATABASE_NAME, USERNAME, PASSWORD_ENC, OPTIONS, USE_YN,
             CREATED_AT, UPDATED_AT
      FROM DB_PROFILE
      WHERE USE_YN = 'Y'
      ORDER BY PROFILE_ID
    `;
    return this.db.query<DbProfileEntity>(sql);
  }

  async findById(profileId: number): Promise<DbProfileEntity | null> {
    const sql = `
      SELECT PROFILE_ID, PROFILE_NAME, DESCRIPTION, DB_TYPE, HOST, PORT,
             DATABASE_NAME, USERNAME, PASSWORD_ENC, OPTIONS, USE_YN,
             CREATED_AT, UPDATED_AT
      FROM DB_PROFILE
      WHERE PROFILE_ID = :profileId AND USE_YN = 'Y'
    `;
    return this.db.queryOne<DbProfileEntity>(sql, [profileId]);
  }

  async create(data: {
    profileName: string;
    description?: string;
    dbType: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    options?: string;
  }): Promise<number> {
    const passwordEnc = this.encryptPassword(data.password);
    const sql = `
      INSERT INTO DB_PROFILE (
        PROFILE_NAME, DESCRIPTION, DB_TYPE, HOST, PORT, DATABASE_NAME,
        USERNAME, PASSWORD_ENC, OPTIONS, USE_YN, CREATED_AT, UPDATED_AT
      ) VALUES (
        :profileName, :description, :dbType, :host, :port, :database,
        :username, :passwordEnc, :options, 'Y', SYSDATE, SYSDATE
      )
    `;
    return this.db.insert(sql, [
      data.profileName,
      data.description || null,
      data.dbType,
      data.host,
      data.port,
      data.database,
      data.username,
      passwordEnc,
      data.options || null,
    ], 'PROFILE_ID');
  }

  async update(profileId: number, data: {
    profileName?: string;
    description?: string;
    dbType?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    options?: string;
  }): Promise<void> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.profileName) {
      updates.push(`PROFILE_NAME = :${paramIndex}`);
      params.push(data.profileName);
      paramIndex++;
    }

    if (data.description !== undefined) {
      updates.push(`DESCRIPTION = :${paramIndex}`);
      params.push(data.description || null);
      paramIndex++;
    }

    if (data.dbType) {
      updates.push(`DB_TYPE = :${paramIndex}`);
      params.push(data.dbType);
      paramIndex++;
    }

    if (data.host) {
      updates.push(`HOST = :${paramIndex}`);
      params.push(data.host);
      paramIndex++;
    }

    if (data.port) {
      updates.push(`PORT = :${paramIndex}`);
      params.push(data.port);
      paramIndex++;
    }

    if (data.database) {
      updates.push(`DATABASE_NAME = :${paramIndex}`);
      params.push(data.database);
      paramIndex++;
    }

    if (data.username) {
      updates.push(`USERNAME = :${paramIndex}`);
      params.push(data.username);
      paramIndex++;
    }

    if (data.password) {
      updates.push(`PASSWORD_ENC = :${paramIndex}`);
      params.push(this.encryptPassword(data.password));
      paramIndex++;
    }

    if (data.options !== undefined) {
      updates.push(`OPTIONS = :${paramIndex}`);
      params.push(data.options || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return;
    }

    updates.push('UPDATED_AT = SYSDATE');
    params.push(profileId);

    const sql = `
      UPDATE DB_PROFILE
      SET ${updates.join(', ')}
      WHERE PROFILE_ID = :${paramIndex}
    `;
    await this.db.execute(sql, params);
  }

  async delete(profileId: number): Promise<void> {
    const sql = `
      UPDATE DB_PROFILE
      SET USE_YN = 'N', UPDATED_AT = SYSDATE
      WHERE PROFILE_ID = :profileId
    `;
    await this.db.execute(sql, [profileId]);
  }

  decryptPassword(encryptedPassword: string): string {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encryptedPassword, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return '';
    }
  }

  private encryptPassword(password: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }
}
