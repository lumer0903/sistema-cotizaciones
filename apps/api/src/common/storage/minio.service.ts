import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as Minio from 'minio';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client | null = null;
  private readonly logger = new Logger(MinioService.name);
  private readonly bucketPdfs = 'cotizacion-pdfs';
  private readonly bucketImages = 'product-images';
  private readonly isMinioEnabled: boolean;

  /** Buckets garantizados. Si falla, se reintenta en la próxima operación. */
  private bucketsEnsured = false;
  /** Timestamp mínimo para re-inicializar el cliente tras un fallo (cooldown). */
  private nextRetryAt = 0;
  /** Tope por operación: evita que una petición se cuelgue indefinidamente. */
  private static readonly OP_TIMEOUT_MS = 8_000;
  /** Cooldown entre reintentos de reconexión. */
  private static readonly RETRY_COOLDOWN_MS = 10_000;
  /** Tope para verificar/crear buckets en la inicialización. */
  private static readonly BUCKET_TIMEOUT_MS = 5_000;

  constructor(private config: ConfigService) {
    this.isMinioEnabled = this.config.get('MINIO_ENABLED') !== 'false';
  }

  onModuleInit() {
    if (!this.isMinioEnabled) {
      this.logger.warn('MinIO disabled via MINIO_ENABLED=false. Storage operations will return null.');
      return;
    }

    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      this.client = new Minio.Client({
        endPoint: this.config.get('MINIO_ENDPOINT') || 'localhost',
        port: parseInt(this.config.get('MINIO_PORT') || '9000', 10),
        useSSL: this.config.get('MINIO_USE_SSL') === 'true',
        accessKey: this.config.get('MINIO_ACCESS_KEY') || 'minioadmin',
        secretKey: this.config.get('MINIO_SECRET_KEY') || 'minioadmin',
      });
      this.bucketsEnsured = false;

      // Buckets en segundo plano: un fallo aquí NO invalida el cliente
      // (antes se nulaba el cliente para siempre si MinIO aún no estaba listo).
      void this.tryEnsureBuckets('inicialización');
    } catch (error) {
      this.client = null;
      this.nextRetryAt = Date.now() + MinioService.RETRY_COOLDOWN_MS;
      this.logger.warn(`MinIO client initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}. Se reintentará automáticamente.`);
    }
  }

  /** Verifica/crea buckets con tope. Nunca nula el cliente; solo deja la
   *  bandera en false para reintentar en la próxima operación. */
  private async tryEnsureBuckets(contexto: string): Promise<void> {
    if (!this.client || this.bucketsEnsured) return;

    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.doEnsureBuckets(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Bucket creation timeout')), MinioService.BUCKET_TIMEOUT_MS);
        }),
      ]);
      this.bucketsEnsured = true;
    } catch (error) {
      this.logger.warn(
        `Bucket ensure falló (${contexto}): ${error instanceof Error ? error.message : 'Unknown error'}. Se reintentará en la próxima operación.`,
      );
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async doEnsureBuckets(): Promise<void> {
    if (!this.client) return;

    for (const bucket of [this.bucketPdfs, this.bucketImages]) {
      const exists = await this.client.bucketExists(bucket);
      if (!exists) {
        await this.client.makeBucket(bucket, 'us-east-1');
        // Sin política anónima: los objetos se sirven vía presigned URLs
      }
    }
  }

  private isConnectionError(error: unknown): boolean {
    if (!error) return false;
    const message = error instanceof Error ? error.message : String(error);
    const code = (error as { code?: string })?.code;
    return (
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      code === 'ENOTFOUND' ||
      code === 'ECONNRESET' ||
      message.includes('connect') ||
      message.includes('timeout') ||
      message.includes('refused')
    );
  }

  /** Objeto inexistente (NoSuchKey/NotFound): no es un error de conexión,
   *  tampoco un fallo del sistema → se devuelve el fallback. */
  private isMissingObjectError(error: unknown): boolean {
    const code = (error as { code?: string })?.code;
    return code === 'NoSuchKey' || code === 'NotFound';
  }

  /** Tope por operación: si MinIO no responde, se trata como fallo de
   *  conexión (fallback) en vez de colgar la petición. */
  private async withTimeout<T>(operacion: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        operacion,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('MinIO operation timeout')),
            MinioService.OP_TIMEOUT_MS,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /** Marca al cliente como caído y programa un re-intento con cooldown. */
  private markUnhealthy(contexto: string): void {
    this.client = null;
    this.bucketsEnsured = false;
    this.nextRetryAt = Date.now() + MinioService.RETRY_COOLDOWN_MS;
    this.logger.warn(`MinIO marcado como no disponible (${contexto}); se reintentará en ${MinioService.RETRY_COOLDOWN_MS / 1000}s.`);
  }

  private async safeExecute<T>(operation: () => Promise<T>, fallback: T, operationName: string): Promise<T> {
    if (!this.isMinioEnabled) return fallback;

    if (!this.client) {
      if (Date.now() >= this.nextRetryAt) {
        this.logger.log(`MinIO: re-conectando para ${operationName}...`);
        this.initializeClient();
      }
      if (!this.client) {
        this.logger.debug(`MinIO not available, skipping ${operationName}`);
        return fallback;
      }
    }

    try {
      if (!this.bucketsEnsured) await this.tryEnsureBuckets(operationName);
      return await this.withTimeout(Promise.resolve().then(operation));
    } catch (error) {
      if (this.isMissingObjectError(error)) {
        return fallback;
      }
      if (this.isConnectionError(error)) {
        this.logger.warn(
          `MinIO connection failed during ${operationName}: ${error instanceof Error ? error.message : 'Unknown error'}. Returning fallback.`,
        );
        this.markUnhealthy(operationName);
        return fallback;
      }
      // Re-throw non-connection errors
      throw error;
    }
  }

  async uploadProductImage(file: Express.Multer.File): Promise<string | null> {
    const fallbackUrl = `/images/placeholder-${Date.now()}.png`;

    return this.safeExecute(async () => {
      if (!this.client) throw new Error('MinIO client not initialized');

      const key = `productos/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
      await this.client.putObject(this.bucketImages, key, file.buffer, file.size, {
        'Content-Type': file.mimetype,
      });
      return this.client.presignedUrl('GET', this.bucketImages, key, 7 * 24 * 60 * 60);
    }, fallbackUrl, 'uploadProductImage');
  }

  async uploadPdf(quoteId: number, pdfBuffer: Buffer): Promise<string | null> {
    const fallbackUrl = `/pdfs/placeholder-${quoteId}-${Date.now()}.pdf`;

    return this.safeExecute(async () => {
      if (!this.client) throw new Error('MinIO client not initialized');

      const key = `cotizaciones/${quoteId}-${Date.now()}.pdf`;
      await this.client.putObject(this.bucketPdfs, key, pdfBuffer, pdfBuffer.length, {
        'Content-Type': 'application/pdf',
      });
      // Máximo permitido por S3/MinIO: 7 días (más => "expires cannot be greater than 7 days")
      return this.client.presignedUrl('GET', this.bucketPdfs, key, 7 * 24 * 60 * 60);
    }, fallbackUrl, 'uploadPdf');
  }

  async getPresignedUrl(bucket: string, key: string, expirySeconds: number): Promise<string | null> {
    return this.safeExecute(async () => {
      if (!this.client) throw new Error('MinIO client not initialized');
      return this.client.presignedUrl('GET', bucket, key, expirySeconds);
    }, null, 'getPresignedUrl');
  }

  async uploadFile(
    bucket: string,
    key: string,
    buffer: Buffer,
    contentType: string,
    expirySeconds: number = 7 * 24 * 60 * 60
  ): Promise<string | null> {
    return this.safeExecute(async () => {
      if (!this.client) throw new Error('MinIO client not initialized');

      await this.client.putObject(bucket, key, buffer, buffer.length, {
        'Content-Type': contentType,
      });
      return this.client.presignedUrl('GET', bucket, key, expirySeconds);
    }, null, 'uploadFile');
  }

  async deleteFile(bucket: string, key: string): Promise<boolean> {
    return this.safeExecute(async () => {
      if (!this.client) throw new Error('MinIO client not initialized');

      await this.client.removeObject(bucket, key);
      return true;
    }, false, 'deleteFile');
  }

  async getObject(bucket: string, key: string): Promise<Buffer | null> {
    return this.safeExecute(async () => {
      if (!this.client) throw new Error('MinIO client not initialized');

      const stream = await this.client.getObject(bucket, key);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    }, null, 'getObject');
  }

  async fileExists(bucket: string, key: string): Promise<boolean> {
    return this.safeExecute(async () => {
      if (!this.client) throw new Error('MinIO client not initialized');

      await this.client.statObject(bucket, key);
      return true;
    }, false, 'fileExists');
  }

  getClient(): Minio.Client | null {
    return this.client;
  }

  isHealthy(): boolean {
    return this.client !== null;
  }
}
