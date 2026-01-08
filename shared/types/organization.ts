// Organization Types

export interface Organization {
  orgId: number;
  orgName: string;
  description?: string;
  useYn: 'Y' | 'N';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationDto {
  orgName: string;
  description?: string;
}

export interface UpdateOrganizationDto {
  orgName?: string;
  description?: string;
  useYn?: 'Y' | 'N';
}
