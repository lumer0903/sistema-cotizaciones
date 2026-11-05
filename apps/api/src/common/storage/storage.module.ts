import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';
import { MinioService } from './minio.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [StorageService, MinioService],
  exports: [StorageService, MinioService],
})
export class StorageModule {}
