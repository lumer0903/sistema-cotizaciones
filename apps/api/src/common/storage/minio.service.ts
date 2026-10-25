import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as Minio from 'minio';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client | null = null;
  private readonly logger = new Logger(MinioService.name);

  // Bucket principal unificado (configurable con STORAGE_BUCKET, default: goldcontinent-media)
  private readonly bucketName: string;
  // Buckets legacy mantenidos por compatibilidad
  private readonly bucketPdfs = 'cotizacion-pdfs';
  private readonly bucketImages = 'product-images';

  private readonly isMinioEnabled: boolean;
  private readonly endPoint: string;
  private readonly port: number;
  private readonly useSSL: boolean;
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly publicBaseUrl: string;
  private readonly storagePath: string;

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
    const driver = this.config.get('STORAGE_DRIVER');
    const minioEnabled = this.config.get('MINIO_ENABLED');
    this.isMinioEnabled = driver !== 'local' && minioEnabled !== 'false';

    this.endPoint = this.config.get('STORAGE_ENDPOINT') || this.config.get('MINIO_ENDPOINT') || 'localhost';
    this.port = parseInt(this.config.get('STORAGE_PORT') || this.config.get('MINIO_PORT') || '9000', 10);
    this.useSSL = (this.config.get('STORAGE_USE_SSL') || this.config.get('MINIO_USE_SSL')) === 'true';
    this.accessKey = this.config.get('STORAGE_ACCESS_KEY') || this.config.get('MINIO_ACCESS_KEY') || 'minioadmin';
    this.secretKey = this.config.get('STORAGE_SECRET_KEY') || this.config.get('MINIO_SECRET_KEY') || 'minioadmin';
    this.bucketName = this.config.get('STORAGE_BUCKET') || 'goldcontinent-media';

    const defaultProtocol = this.useSSL ? 'https' : 'http';
    const rawPublicUrl = this.config.get('STORAGE_PUBLIC_URL') || `${defaultProtocol}://${this.endPoint}:${this.port}`;
    this.publicBaseUrl = rawPublicUrl.replace(/\/+$/, '');

    this.storagePath = this.config.get('STORAGE_PATH') || path.join(process.cwd(), 'uploads');
  }

  onModuleInit() {
    if (!this.isMinioEnabled) {
      this.logger.warn('MinIO desactivado (STORAGE_DRIVER=local o MINIO_ENABLED=false). Operaciones usarán almacenamiento local.');
      return;
    }

    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      this.client = new Minio.Client({
        endPoint: this.endPoint,
        port: this.port,
        useSSL: this.useSSL,
        accessKey: this.accessKey,
        secretKey: this.secretKey,
      });
      this.bucketsEnsured = false;

      // Buckets en segundo plano: un fallo aquí NO invalida el cliente
      void this.tryEnsureBuckets('inicialización');
    } catch (error) {
      this.client = null;
      this.nextRetryAt = Date.now() + MinioService.RETRY_COOLDOWN_MS;
      this.logger.warn(`Error inicializando cliente MinIO: ${error instanceof Error ? error.message : 'Unknown error'}. Se reintentará automáticamente.`);
    }
  }

  /** Retorna el nombre del bucket principal configurado. */
  getBucketName(): string {
    return this.bucketName;
  }

  /**
   * Genera la URL estática/directa para acceder a un recurso en MinIO
   * Ej: http://localhost:9000/goldcontinent-media/productos/172938-foto.png
   */
  getStaticUrl(bucket: string, key: string): string {
    const cleanKey = key.replace(/^\/+/, '');
    const cleanBucket = (bucket || this.bucketName).replace(/^\/+|\/+$/g, '');
    return `${this.publicBaseUrl}/${cleanBucket}/${cleanKey}`;
  }

  /** Verifica/crea buckets con tope. Nunca nula el cliente; deja bandera en false para reintentar. */
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

    const buckets = Array.from(new Set([this.bucketName, this.bucketPdfs, this.bucketImages]));
    for (const bucket of buckets) {
      const exists = await this.client.bucketExists(bucket);
      if (!exists) {
        await this.client.makeBucket(bucket, 'us-east-1');
        this.logger.log(`Bucket MinIO creado: ${bucket}`);
      }
      // Establecer política de lectura pública para servir URLs estáticas directas
      await this.applyPublicReadPolicy(bucket);
    }
  }

  /** Configura política anónima de sólo lectura (GET) para permitir URLs estáticas públicas */
  private async applyPublicReadPolicy(bucket: string): Promise<void> {
    if (!this.client) return;
    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      };
      await this.client.setBucketPolicy(bucket, JSON.stringify(policy));
    } catch (err) {
      this.logger.debug(`No se pudo aplicar política pública a ${bucket}: ${err instanceof Error ? err.message : String(err)}`);
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

  private isMissingObjectError(error: unknown): boolean {
    const code = (error as { code?: string })?.code;
    return code === 'NoSuchKey' || code === 'NotFound';
  }

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
        this.logger.log(`MinIO: reconectando para ${operationName}...`);
        this.initializeClient();
      }
      if (!this.client) {
        this.logger.debug(`MinIO no disponible, ejecutando fallback para ${operationName}`);
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
          `Conexión con MinIO falló durante ${operationName}: ${error instanceof Error ? error.message : 'Unknown error'}. Usando fallback.`,
        );
        this.markUnhealthy(operationName);
        return fallback;
      }
      throw error;
    }
  }

  /**
   * Guarda un archivo en el disco local como fallback cuando MinIO está caído o en mantenimiento.
   */
  private async saveLocalFallback(subfolder: string, filename: string, buffer: Buffer): Promise<string> {
    try {
      const dir = path.resolve(this.storagePath, subfolder);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, filename), buffer);
      return `/uploads/${subfolder}/${filename}`;
    } catch (err) {
      this.logger.warn(`Fallback local falló: ${err instanceof Error ? err.message : String(err)}`);
      return `/images/placeholder-${Date.now()}.png`;
    }
  }

  /**
   * Sube una imagen de producto a MinIO y devuelve la URL estática directa.
   * Ej: http://localhost:9000/goldcontinent-media/productos/172938-zapato.png
   */
  async uploadProductImage(file: Express.Multer.File): Promise<string | null> {
    const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    const key = `productos/${filename}`;
    const bucket = this.bucketName;

    const fallbackUrl = await this.saveLocalFallback('productos', filename, file.buffer);

    return this.safeExecute(async () => {
      if (!this.client) throw new Error('MinIO client not initialized');

      await this.client.putObject(bucket, key, file.buffer, file.size, {
        'Content-Type': file.mimetype,
      });
      return this.getStaticUrl(bucket, key);
    }, fallbackUrl, 'uploadProductImage');
  }

  /**
   * Sube un PDF generado a MinIO y devuelve su URL estática directa.
   * Ej: http://localhost:9000/goldcontinent-media/cotizaciones/12-hash.pdf
   */
  async uploadPdf(quoteId: number, pdfBuffer: Buffer): Promise<string | null> {
    const filename = `${quoteId}-${Date.now()}.pdf`;
    const key = `cotizaciones/${filename}`;
    const bucket = this.bucketName;

    const fallbackUrl = await this.saveLocalFallback('cotizaciones', filename, pdfBuffer);

    return this.safeExecute(async () => {
      if (!this.client) throw new Error('MinIO client not initialized');

      await this.client.putObject(bucket, key, pdfBuffer, pdfBuffer.length, {
        'Content-Type': 'application/pdf',
      });
      return this.getStaticUrl(bucket, key);
    }, fallbackUrl, 'uploadPdf');
  }

  async getPresignedUrl(bucket: string, key: string, expirySeconds: number = 7 * 24 * 60 * 60): Promise<string | null> {
    return this.safeExecute(async () => {
      if (!this.client) throw new Error('MinIO client not initialized');
      return this.client.presignedUrl('GET', bucket || this.bucketName, key, expirySeconds);
    }, null, 'getPresignedUrl');
  }

  async uploadFile(
    bucket: string,
    key: string,
    buffer: Buffer,
    contentType: string,
    _expirySeconds?: number,
  ): Promise<string | null> {
    const targetBucket = bucket || this.bucketName;
    return this.safeExecute(async () => {
      if (!this.client) throw new Error('MinIO client not initialized');

      await this.client.putObject(targetBucket, key, buffer, buffer.length, {
        'Content-Type': contentType,
      });
      return this.getStaticUrl(targetBucket, key);
    }, null, 'uploadFile');
  }

  async deleteFile(bucket: string, key: string): Promise<boolean> {
    const targetBucket = bucket || this.bucketName;
    return this.safeExecute(async () => {
      if (!this.client) throw new Error('MinIO client not initialized');

      await this.client.removeObject(targetBucket, key);
      return true;
    }, false, 'deleteFile');
  }

  async getObject(bucket: string, key: string): Promise<Buffer | null> {
    const targetBucket = bucket || this.bucketName;
    return this.safeExecute(async () => {
      if (!this.client) throw new Error('MinIO client not initialized');

      const stream = await this.client.getObject(targetBucket, key);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    }, null, 'getObject');
  }

  async fileExists(bucket: string, key: string): Promise<boolean> {
    const targetBucket = bucket || this.bucketName;
    return this.safeExecute(async () => {
      if (!this.client) throw new Error('MinIO client not initialized');

      await this.client.statObject(targetBucket, key);
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
