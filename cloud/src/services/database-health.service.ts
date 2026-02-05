import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity';

@Injectable()
export class DatabaseHealthService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseHealthService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async onModuleInit() {
    await this.validateDatabaseConnection();
  }

  /**
   * DATABASE-READY: Fail-fast validation of Supabase connectivity
   */
  async validateDatabaseConnection(): Promise<boolean> {
    try {
      // Test basic connectivity with a simple query
      const result = await this.sessionRepository.query('SELECT 1 as test');
      
      if (result && result.length > 0) {
        this.logger.log('DATABASE-READY: Supabase connection validated successfully');
        console.log('✅ DATABASE-READY: Supabase connection established - Phase 2 hardening complete');
        return true;
      }
    } catch (error) {
      const errorMessage = `DATABASE-READY: CRITICAL - Supabase connection failed: ${error.message}`;
      this.logger.error(errorMessage);
      console.error('❌ DATABASE-READY: CRITICAL FAILURE - Supabase connection required');
      console.error('❌ DATABASE-READY: Cloud cannot start without Supabase connectivity');
      console.error('❌ DATABASE-READY: Please check your Supabase configuration and try again');
      
      // DATABASE-READY: Fail fast - terminate the application
      process.exit(1);
    }
    
    return false;
  }

  /**
   * Runtime health check
   */
  async checkHealth(): Promise<{ status: string; database: boolean; error?: string }> {
    try {
      await this.sessionRepository.query('SELECT 1 as test');
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