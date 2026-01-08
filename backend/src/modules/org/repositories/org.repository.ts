/**
 * Organization Repository
 * 조직(ORG_GROUP) 데이터 접근 레이어
 */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../config/database.service';

export interface OrgEntity {
  ORG_ID: number;
  ORG_NAME: string;
  DESCRIPTION: string;
  USE_YN: string;
  CREATED_AT: Date;
  UPDATED_AT: Date;
}

export interface CreateOrgDto {
  orgName: string;
  description?: string;
}

export interface UpdateOrgDto {
  orgName?: string;
  description?: string;
  useYn?: string;
}

@Injectable()
export class OrgRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(): Promise<OrgEntity[]> {
    const sql = `
      SELECT ORG_ID, ORG_NAME, DESCRIPTION, USE_YN, CREATED_AT, UPDATED_AT
      FROM ORG_GROUP
      WHERE USE_YN = 'Y'
      ORDER BY ORG_ID DESC
    `;
    return this.databaseService.query<OrgEntity>(sql);
  }

  async findById(orgId: number): Promise<OrgEntity | null> {
    const sql = `
      SELECT ORG_ID, ORG_NAME, DESCRIPTION, USE_YN, CREATED_AT, UPDATED_AT
      FROM ORG_GROUP
      WHERE ORG_ID = :1
    `;
    return this.databaseService.queryOne<OrgEntity>(sql, [orgId]);
  }

  async findByName(orgName: string): Promise<OrgEntity | null> {
    const sql = `
      SELECT ORG_ID, ORG_NAME, DESCRIPTION, USE_YN, CREATED_AT, UPDATED_AT
      FROM ORG_GROUP
      WHERE ORG_NAME = :1
    `;
    return this.databaseService.queryOne<OrgEntity>(sql, [orgName]);
  }

  async create(dto: CreateOrgDto): Promise<number> {
    const sql = `
      INSERT INTO ORG_GROUP (ORG_NAME, DESCRIPTION, USE_YN, CREATED_AT, UPDATED_AT)
      VALUES (:1, :2, 'Y', SYSDATE, SYSDATE)
    `;
    return this.databaseService.insert(sql, [dto.orgName, dto.description || null], 'ORG_ID');
  }

  async update(orgId: number, dto: UpdateOrgDto): Promise<number> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (dto.orgName !== undefined) {
      updates.push(`ORG_NAME = :${paramIndex++}`);
      params.push(dto.orgName);
    }
    if (dto.description !== undefined) {
      updates.push(`DESCRIPTION = :${paramIndex++}`);
      params.push(dto.description);
    }
    if (dto.useYn !== undefined) {
      updates.push(`USE_YN = :${paramIndex++}`);
      params.push(dto.useYn);
    }

    if (updates.length === 0) {
      return 0;
    }

    updates.push(`UPDATED_AT = SYSDATE`);
    params.push(orgId);

    const sql = `
      UPDATE ORG_GROUP
      SET ${updates.join(', ')}
      WHERE ORG_ID = :${paramIndex}
    `;

    return this.databaseService.execute(sql, params);
  }

  async delete(orgId: number): Promise<number> {
    // Soft delete
    const sql = `
      UPDATE ORG_GROUP
      SET USE_YN = 'N', UPDATED_AT = SYSDATE
      WHERE ORG_ID = :1
    `;
    return this.databaseService.execute(sql, [orgId]);
  }

  async hardDelete(orgId: number): Promise<number> {
    const sql = `DELETE FROM ORG_GROUP WHERE ORG_ID = :1`;
    return this.databaseService.execute(sql, [orgId]);
  }
}
