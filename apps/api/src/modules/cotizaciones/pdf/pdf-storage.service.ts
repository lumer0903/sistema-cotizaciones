import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MinioService } from '../../../common/storage/minio.service';
import { StorageService } from '../../../common/storage/storage.service';
import { PDF_BUCKET } from './pdf.constants';

export interface SavedPdf {
  /** Object key de MinIO (`cotizaciones/...`) o ruta relativa local (`pdfs/...`) */
  key: string;
  /** URL directa o firmada de MinIO, o null si se guardó en almacenamiento local */
  url: string | null;
}

const LOCAL_PREFIX = 'pdfs';

@Injectable()
export class PdfStorageService {
  private readonly logger = new Logger(PdfStorageService.name);

  constructor(
    private readonly minio: MinioService,
    private readonly storage: StorageService,
  ) {}

  async save(id: number, hash: string, buffer: Buffer): Promise<SavedPdf> {
    if (this.minio.isHealthy()) {
      const key = `cotizaciones/${id}-${hash}.pdf`;
      const bucket = this.minio.getBucketName() || PDF_BUCKET;
      const url = await this.minio.uploadFile(
        bucket,
        key,
        buffer,
        'application/pdf',
      );
      if (url) return { key, url };
      this.logger.warn(`MinIO upload devolvió null para ${key}; usando almacenamiento local`);
    }
    return this.saveLocal(id, hash, buffer);
  }

  async read(key: string): Promise<Buffer | null> {
    if (key.startsWith(`${LOCAL_PREFIX}/`)) {
      const fullPath = this.resolveLocalPath(key);
      if (!fullPath) return null;
      try {
        return await fs.readFile(fullPath);
      } catch {
        return null;
      }
    }
    const bucket = this.minio.getBucketName() || PDF_BUCKET;
    const data = await this.minio.getObject(bucket, key);
    if (data) return data;

    // Fallback al bucket legacy si fue guardado previamente en cotizacion-pdfs
    if (bucket !== PDF_BUCKET) {
      return this.minio.getObject(PDF_BUCKET, key);
    }
    return null;
  }

  private async saveLocal(id: number, hash: string, buffer: Buffer): Promise<SavedPdf> {
    const key = `${LOCAL_PREFIX}/cotizaciones/${id}-${hash}.pdf`;
    const fullPath = this.resolveLocalPath(key);
    if (!fullPath) throw new Error(`Ruta de almacenamiento local inválida: ${key}`);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return { key, url: null };
  }

  private resolveLocalPath(key: string): string | null {
    const base = path.resolve(this.storage.getStoragePath());
    const fullPath = path.resolve(base, key);
    if (!fullPath.startsWith(base + path.sep)) return null;
    return fullPath;
  }
}
