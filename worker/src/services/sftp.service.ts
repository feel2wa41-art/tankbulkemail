/**
 * SFTP Service
 * SFTP 서버에서 첨부파일을 가져오는 서비스
 */
import * as Client from 'ssh2-sftp-client';
import * as path from 'path';
import * as mime from 'mime-types';
import { createLogger } from '../config/logger';
import { FileInfo } from './file.service';

const logger = createLogger('SftpService');

export interface SftpConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  remotePath: string;
}

export class SftpService {
  private devMode: boolean;
  private localCachePath: string;

  constructor() {
    this.devMode = process.env.DEV_MODE === 'true';
    this.localCachePath = process.env.SFTP_CACHE_PATH || './sftp-cache';
  }

  /**
   * SFTP 서버에서 파일 다운로드
   */
  async downloadFile(config: SftpConfig, fileName: string): Promise<FileInfo | null> {
    if (this.devMode) {
      logger.info(`[DEV MODE] Would download from SFTP: ${fileName}`);
      return this.createMockFile(fileName);
    }

    const sftp = new Client();

    try {
      await sftp.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey,
        passphrase: config.passphrase,
      });

      const remotePath = path.posix.join(config.remotePath, fileName);

      // Check if file exists
      const exists = await sftp.exists(remotePath);
      if (!exists) {
        logger.warn(`File not found on SFTP: ${remotePath}`);
        return null;
      }

      // Download file content as buffer
      const content = await sftp.get(remotePath) as Buffer;
      const contentType = mime.lookup(fileName) || 'application/octet-stream';

      logger.info(`Downloaded file from SFTP: ${fileName} (${content.length} bytes)`);

      return {
        filePath: remotePath,
        fileName,
        content,
        contentType,
        size: content.length,
      };

    } catch (error: any) {
      logger.error(`SFTP download failed for ${fileName}:`, error.message);
      return null;
    } finally {
      try {
        await sftp.end();
      } catch (closeError) {
        logger.warn('Error closing SFTP connection:', closeError);
      }
    }
  }

  /**
   * SFTP 서버에서 파일 목록 조회
   */
  async listFiles(config: SftpConfig, pattern?: string): Promise<string[]> {
    if (this.devMode) {
      logger.info(`[DEV MODE] Would list SFTP files with pattern: ${pattern || '*'}`);
      return [];
    }

    const sftp = new Client();

    try {
      await sftp.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey,
        passphrase: config.passphrase,
      });

      const files = await sftp.list(config.remotePath);

      let fileNames = files
        .filter(f => f.type === '-') // Only regular files
        .map(f => f.name);

      // Filter by pattern if provided
      if (pattern) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
        fileNames = fileNames.filter(name => regex.test(name));
      }

      logger.info(`Found ${fileNames.length} files on SFTP`);
      return fileNames;

    } catch (error: any) {
      logger.error(`SFTP list failed:`, error.message);
      return [];
    } finally {
      try {
        await sftp.end();
      } catch (closeError) {
        logger.warn('Error closing SFTP connection:', closeError);
      }
    }
  }

  /**
   * SFTP 연결 테스트
   */
  async testConnection(config: SftpConfig): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (this.devMode) {
      logger.info('[DEV MODE] SFTP connection test - returning success');
      return { success: true };
    }

    const sftp = new Client();

    try {
      await sftp.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey,
        passphrase: config.passphrase,
      });

      // Try to list the remote directory to verify access
      await sftp.list(config.remotePath);

      logger.info(`SFTP connection successful: ${config.host}:${config.port}`);
      return { success: true };

    } catch (error: any) {
      const errorMessage = this.categorizeError(error);
      logger.error(`SFTP connection test failed:`, errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      try {
        await sftp.end();
      } catch (closeError) {
        // Ignore close errors during test
      }
    }
  }

  /**
   * 파일 패턴으로 첨부파일 검색 및 다운로드
   */
  async findAndDownload(
    config: SftpConfig,
    pattern: string,
    searchKeys: Record<string, string>
  ): Promise<FileInfo | null> {
    // Replace placeholders in pattern
    let resolvedPattern = pattern;
    for (const [key, value] of Object.entries(searchKeys)) {
      resolvedPattern = resolvedPattern.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    if (this.devMode) {
      logger.info(`[DEV MODE] Would search SFTP for pattern: ${resolvedPattern}`);
      return this.createMockFile(`matched-${resolvedPattern}.pdf`);
    }

    // List files and find matching one
    const files = await this.listFiles(config, resolvedPattern);

    if (files.length === 0) {
      logger.warn(`No files matching pattern: ${resolvedPattern}`);
      return null;
    }

    if (files.length > 1) {
      logger.warn(`Multiple files matching pattern ${resolvedPattern}, using first: ${files[0]}`);
    }

    return this.downloadFile(config, files[0]);
  }

  private categorizeError(error: any): string {
    const message = error.message || 'Unknown error';

    if (message.includes('ECONNREFUSED')) {
      return 'Connection refused - check SFTP server is running';
    }

    if (message.includes('ENOTFOUND')) {
      return 'Host not found - check hostname';
    }

    if (message.includes('ETIMEDOUT')) {
      return 'Connection timed out - check network and firewall';
    }

    if (message.includes('authentication') || message.includes('Auth')) {
      return 'Authentication failed - check credentials';
    }

    if (message.includes('permission') || message.includes('EACCES')) {
      return 'Permission denied - check user permissions';
    }

    return message;
  }

  private createMockFile(fileName: string): FileInfo {
    const mockContent = Buffer.from(`Mock file content for ${fileName}`);
    return {
      filePath: `/mock/path/${fileName}`,
      fileName,
      content: mockContent,
      contentType: mime.lookup(fileName) || 'application/octet-stream',
      size: mockContent.length,
    };
  }
}
