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

      // Don't await - let buckets be created lazily on first use
      // Add a timeout to prevent hanging on connection attempts
      const bucketPromise = this.ensureBuckets();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Bucket creation timeout')), 5000)
      );
      
      Promise.race([bucketPromise, timeoutPromise])
        .catch((error) => {
          this.logger.warn(`Bucket creation failed or timed out: ${error instanceof Error ? error.message : 'Unknown error'}. Buckets will be created on first operation.`);
          this.client = null;
        });
    } catch (error) {
      this.client = null;
      this.logger.warn(`MinIO client initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}. Storage operations will be disabled.`);
    }
  }

  private async ensureBuckets(): Promise<void> {
    if (!this.client) return;

    for (const bucket of [this.bucketPdfs, this.bucketImages]) {
      try {
        const exists = await this.client.bucketExists(bucket);
        if (!exists) {
          await this.client.makeBucket(bucket, 'us-east-1');
          const policy = {
            Version: '2012-10-17',
            Statement: [{
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            }],
          };
          await this.client.setBucketPolicy(bucket, JSON.stringify(policy));
        }
      } catch (error) {
        this.logger.warn(`Failed to ensure bucket ${bucket}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  private async safeExecute<T>(operation: () => Promise<T>, fallback: T, operationName: string): Promise<T> {
    if (!this.client) {
      this.logger.debug(`MinIO not available, skipping ${operationName}`);
      return fallback;
    }

    try {
      return await operation();
    } catch (error) {
      if (this.isConnectionError(error)) {
        this.logger.warn(`MinIO connection failed during ${operationName}: ${error instanceof Error ? error.message : 'Unknown error'}. Returning fallback.`);
        this.client = null; // Mark client as dead to avoid repeated attempts
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
      return this.client.presignedUrl('GET', this.bucketPdfs, key, 365 * 24 * 60 * 60);
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