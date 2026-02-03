/**
 * Test script for Core Agent-Cloud Connection
 * Demonstrates real session management with observable evidence
 */

import { CloudConnection } from '../connection/CloudConnection';

const TEST_CONFIG = {
  CLOUD_URL: 'http://localhost:3001',
  AGENT_ID: `test-agent-${Date.now()}`
};

class ConnectionTest {
  private agentConnection: CloudConnection;
  private messagesReceived: any[] = [];

  constructor() {
    this.agentConnection = new CloudConnection(
      TEST_CONFIG.CLOUD_URL,
      TEST_CONFIG.AGENT_ID,
      this.handleMessage.bind(this)
    );
  }

  /**
   * Run complete connection test
   */
  async runTest(): Promise<void> {
    console.log('='.repeat(60));
    console.log('KELEDON Agent-Cloud Connection Test');
    console.log('='.repeat(60));
    console.log(`Agent ID: ${TEST_CONFIG.AGENT_ID}`);
    console.log(`Cloud URL: ${TEST_CONFIG.CLOUD_URL}`);
    console.log('');

    try {
      await this.testConnection();
      await this.testMessaging();
      await this.testSessionPersistence();
      
      console.log('');
      console.log('='.repeat(60));
      console.log('TEST PASSED: Real session management working');
      console.log(`Session ID: ${this.agentConnection.getSession()?.session_id}`);
      console.log(`Messages sent/received: ${this.messagesReceived.length}`);
      console.log('='.repeat(60));
      
    } catch (error) {
      console.error('');
      console.error('='.repeat(60));
      console.error('TEST FAILED:', error instanceof Error ? error.message : error);
      console.error('='.repeat(60));
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Test basic connection and session creation
   */
  private async testConnection(): Promise<void> {
    console.log('Testing connection and session creation...');
    
    await this.agentConnection.connect();
    
    const session = this.agentConnection.getSession();
    if (!session) {
      throw new Error('Session not created');
    }

    if (!this.agentConnection.isConnected()) {
      throw new Error('Agent not connected');
    }

    console.log(`✓ Connected with session: ${session.session_id}`);
    console.log(`✓ Session status: ${session.status}`);
    console.log(`✓ Agent ID: ${session.agent_id}`);
    console.log('');
  }

  /**
   * Test message exchange
   */
  private async testMessaging(): Promise<void> {
    console.log('Testing message exchange...');

    // Send brain event
    this.agentConnection.sendBrainEvent('user_input', {
      text: 'Hello from agent',
      timestamp: new Date().toISOString()
    });

    // Send test command
    this.agentConnection.sendTestCommand('get_status', {});

    // Wait for responses
    await this.waitForMessages(2000, 2);

    if (this.messagesReceived.length === 0) {
      throw new Error('No messages received from cloud');
    }

    console.log(`✓ Sent brain event and command`);
    console.log(`✓ Received ${this.messagesReceived.length} messages`);
    console.log('');
  }

  /**
   * Test session persistence
   */
  private async testSessionPersistence(): Promise<void> {
    console.log('Testing session persistence...');

    const session = this.agentConnection.getSession();
    if (!session) {
      throw new Error('No session found');
    }

    // Check heartbeat is working
    const originalHeartbeat = session.last_heartbeat;
    await this.waitForMessages(35000, 1); // Wait for heartbeat

    const updatedSession = this.agentConnection.getSession();
    if (!updatedSession || updatedSession.last_heartbeat === originalHeartbeat) {
      throw new Error('Heartbeat not working');
    }

    console.log(`✓ Session persisted: ${updatedSession.session_id}`);
    console.log(`✓ Heartbeat working: ${updatedSession.last_heartbeat}`);
    console.log('');
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: any): void {
    console.log(`[Received] ${message.message_type}:`, JSON.stringify(message.payload, null, 2));
    this.messagesReceived.push(message);
  }

  /**
   * Wait for messages with timeout
   */
  private async waitForMessages(ms: number, expectedCount: number): Promise<void> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (this.messagesReceived.length >= expectedCount || Date.now() - startTime > ms) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    console.log('Cleaning up...');
    
    if (this.agentConnection.isConnected()) {
      await this.agentConnection.disconnect();
    }

    console.log('Cleanup complete.');
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  const test = new ConnectionTest();
  test.runTest().catch(console.error);
}

export default ConnectionTest;