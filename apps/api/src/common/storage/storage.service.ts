import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly storagePath = process.env.STORAGE_PATH || path.join(process.cwd(), 'uploads');

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
}
