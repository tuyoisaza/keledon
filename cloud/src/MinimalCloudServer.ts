/**
 * Minimal Cloud Server with WebSocket Support
 * Demonstrates real runtime behavior for Agent-Cloud connection
 */

import express from 'express';
import { createServer } from 'http';
import { CloudServer } from './src/websocket/CloudServer';

const PORT = process.env.PORT || 3001;

class MinimalCloudServer {
  private app: express.Application;
  private httpServer: any;
  private cloudServer: CloudServer;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.cloudServer = new CloudServer(this.httpServer);
    
    this.setupRoutes();
  }

  /**
   * Setup HTTP routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        stats: this.cloudServer.getStats()
      });
    });

    // Session info endpoint
    this.app.get('/sessions', (req, res) => {
      const sessions = this.cloudServer.getActiveSessions();
      res.json({
        active_sessions: sessions.length,
        sessions: sessions.map(s => ({
          session_id: s.session_id,
          agent_id: s.agent_id,
          status: s.status,
          created_at: s.created_at,
          last_heartbeat: s.last_heartbeat,
          message_count: s.message_count
        }))
      });
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'KELEDON Cloud Server',
        version: '1.0.0',
        status: 'running',
        endpoints: ['/health', '/sessions'],
        websocket: 'enabled on /socket.io'
      });
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(PORT, () => {
        console.log('='.repeat(60));
        console.log('KELEDON Cloud Server Started');
        console.log('='.repeat(60));
        console.log(`HTTP Server: http://localhost:${PORT}`);
        console.log(`WebSocket: ws://localhost:${PORT}`);
        console.log(`Health Check: http://localhost:${PORT}/health`);
        console.log(`Sessions API: http://localhost:${PORT}/sessions`);
        console.log('='.repeat(60));
        console.log('Ready for agent connections...');
        console.log('');
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    console.log('Stopping cloud server...');
    
    this.cloudServer.shutdown();
    
    return new Promise((resolve) => {
      this.httpServer.close(() => {
        console.log('Cloud server stopped.');
        resolve();
      });
    });
  }

  /**
   * Get server statistics
   */
  getStats(): any {
    return this.cloudServer.getStats();
  }
}

// Start server if this file is executed directly
if (require.main === module) {
  const server = new MinimalCloudServer();
  
  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
}

export default MinimalCloudServer;