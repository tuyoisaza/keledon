import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DatabaseHealthService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseHealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.validateDatabaseConnection();
  }

  async validateDatabaseConnection(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1 as test`;
      this.logger.log('Database connection validated successfully');
      console.log('✅ Database connection established');
      return true;
    } catch (error) {
      const errorMessage = `Database connection failed: ${error.message}`;
      this.logger.error(errorMessage);
      console.error('❌ DATABASE: CRITICAL FAILURE - Database connection required');
      process.exit(1);
    }
  }

  async checkHealth(): Promise<{ status: string; database: boolean; error?: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1 as test`;
      return {
        status: 'healthy',
        database: true
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        database: false,
        error: error.message
      };
    }
  }
}
