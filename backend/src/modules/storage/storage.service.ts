import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private rootPath: string;

  constructor(private configService: ConfigService) {
    this.rootPath = this.configService.get<string>('FILE_ROOT_PATH', './files');
  }

  async findFile(fileName: string, subPath?: string): Promise<{
    found: boolean;
    filePath?: string;
    fileSize?: number;
    error?: string;
  }> {
    const searchPath = subPath ? path.join(this.rootPath, subPath) : this.rootPath;
    const fullPath = path.join(searchPath, fileName);

    try {
      const stats = await fs.promises.stat(fullPath);
      return {
        found: true,
        filePath: fullPath,
        fileSize: stats.size,
      };
    } catch (error) {
      return {
        found: false,
        error: `File not found: ${fileName}`,
      };
    }
  }

  async readFile(filePath: string): Promise<Buffer> {
    return fs.promises.readFile(filePath);
  }

  async listFiles(subPath?: string): Promise<string[]> {
    const searchPath = subPath ? path.join(this.rootPath, subPath) : this.rootPath;
    try {
      return await fs.promises.readdir(searchPath);
    } catch {
      return [];
    }
  }
}
