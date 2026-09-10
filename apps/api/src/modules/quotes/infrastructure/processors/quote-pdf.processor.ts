import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('quote-processing')
export class QuotePdfProcessor extends WorkerHost {
  private readonly logger = new Logger(QuotePdfProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name} with data`, job.data);
    // Simulate PDF generation work
    await new Promise((resolve) => setTimeout(resolve, 2000)); 
    this.logger.log(`Job ${job.id} completed. PDF generated for quote ${job.data.quoteId}`);
  }
}
