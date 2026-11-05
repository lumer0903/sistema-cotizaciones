import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly storagePath: string;
  private readonly driver: string;
  private readonly logger = new Logger(StorageService.name);

  constructor() {
    this.driver = process.env.STORAGE_DRIVER || 'minio';
    this.storagePath = process.env.STORAGE_PATH || path.join(process.cwd(), 'uploads');
  }

  async onModuleInit() {
    try {
      await fs.access(this.storagePath);
    } catch {
      await fs.mkdir(this.storagePath, { recursive: true });
    }
  }

  getStoragePath(): string {
    return this.storagePath;
  }

  getDriver(): string {
    return this.driver;
  }

  /**
   * Guarda un archivo localmente en la carpeta de uploads.
   */
  async saveFile(subfolder: string, filename: string, buffer: Buffer): Promise<string> {
    const targetDir = path.resolve(this.storagePath, subfolder);
    await fs.mkdir(targetDir, { recursive: true });
    const filePath = path.join(targetDir, filename);
    await fs.writeFile(filePath, buffer);
    return `/uploads/${subfolder}/${filename}`;
  }
}
