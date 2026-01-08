import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';
import { createLogger } from '../config/logger';

const logger = createLogger('FileService');

export interface FileInfo {
  filePath: string;
  fileName: string;
  content: Buffer;
  contentType: string;
  size: number;
}

export class FileService {
  private rootPath: string;

  constructor() {
    this.rootPath = process.env.FILE_ROOT_PATH || './files';
  }

  async findFile(fileName: string, subPath?: string): Promise<FileInfo | null> {
    const searchPath = subPath ? path.join(this.rootPath, subPath) : this.rootPath;
    const fullPath = path.join(searchPath, fileName);

    try {
      const stats = await fs.promises.stat(fullPath);

      if (!stats.isFile()) {
        logger.warn(`Path is not a file: ${fullPath}`);
        return null;
      }

      const content = await fs.promises.readFile(fullPath);
      const contentType = mime.lookup(fileName) || 'application/octet-stream';

      logger.debug(`File found: ${fileName} (${stats.size} bytes)`);

      return {
        filePath: fullPath,
        fileName,
        content,
        contentType,
        size: stats.size,
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logger.warn(`File not found: ${fileName}`);
      } else {
        logger.error(`Error reading file ${fileName}:`, error);
      }
      return null;
    }
  }

  async searchFile(pattern: string, directory?: string): Promise<string[]> {
    const searchDir = directory ? path.join(this.rootPath, directory) : this.rootPath;
    const results: string[] = [];

    try {
      const files = await fs.promises.readdir(searchDir);

      for (const file of files) {
        if (file.includes(pattern)) {
          results.push(path.join(searchDir, file));
        }
      }
    } catch (error) {
      logger.error(`Error searching files:`, error);
    }

    return results;
  }

  async loadFile(filePath: string): Promise<FileInfo | null> {
    try {
      const stats = await fs.promises.stat(filePath);

      if (!stats.isFile()) {
        logger.warn(`Path is not a file: ${filePath}`);
        return null;
      }

      const fileName = path.basename(filePath);
      const content = await fs.promises.readFile(filePath);
      const contentType = mime.lookup(fileName) || 'application/octet-stream';

      logger.debug(`File loaded: ${fileName} (${stats.size} bytes)`);

      return {
        filePath,
        fileName,
        content,
        contentType,
        size: stats.size,
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logger.warn(`File not found at path: ${filePath}`);
      } else {
        logger.error(`Error loading file ${filePath}:`, error);
      }
      return null;
    }
  }

  validateFileName(fileName: string): boolean {
    // Only allow safe characters: a-z, A-Z, 0-9, ., _, -
    const safePattern = /^[a-zA-Z0-9._-]+$/;
    return safePattern.test(fileName);
  }
}
