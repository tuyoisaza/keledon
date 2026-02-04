const fs = require('fs');
const path = require('path');
const http = require('http');

/**
 * Validate environment and load appropriate .env file
 * KELEDON Environment Contract v1
 */
function validateAndLoadEnvironment() {
  const nodeEnv = process.env.NODE_ENV;
  
  if (!nodeEnv) {
    console.error('❌ NODE_ENV is required and must be "local" or "production"');
    console.error('\n💡 Solutions:');
    console.error('   export NODE_ENV=local    # For development');
    console.error('   export NODE_ENV=production # For production');
    process.exit(1);
  }

  if (!['local', 'production'].includes(nodeEnv)) {
    console.error(`❌ Invalid NODE_ENV: "${nodeEnv}". Must be "local" or "production"`);
    process.exit(1);
  }

  const envFile = path.join(process.cwd(), `.env.${nodeEnv}`);
  
  if (!fs.existsSync(envFile)) {
    console.error(`❌ Environment file not found: ${envFile}`);
    console.error(`\n💡 Create .env.${nodeEnv} from .env.example template`);
    process.exit(1);
  }

  // Load environment file
  const envContent = fs.readFileSync(envFile, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  console.log(`🌍 Environment: ${nodeEnv.toUpperCase()}`);
  console.log(`📁 Loaded: .env.${nodeEnv}`);
  
  return nodeEnv;
}

/**
 * Determine current phase based on available services
 */
function determinePhase() {
  const hasQdrant = process.env.QDRANT_URL;
  const hasSupabase = process.env.SUPABASE_URL;
  
  if (hasSupabase) return 'DATABASE-READY';
  if (hasQdrant) return 'VECTOR-READY';
  return 'BOOTABLE';
}

/**
 * Validate Qdrant connectivity (Phase 1+ requirement)
 */
async function validateQdrant() {
  const qdrantUrl = process.env.QDRANT_URL;
  
  if (!qdrantUrl) {
    console.log('⏭️  Qdrant: skipped (Phase 0)');
    return true;
  }

  console.log(`🔍 Validating Qdrant at: ${qdrantUrl}`);
  
  const url = new URL(qdrantUrl);
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || 6333,
      path: '/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Qdrant: connected');
        resolve(true);
      } else {
        console.error(`❌ Qdrant health check failed: ${res.statusCode}`);
        reject(new Error(`Qdrant returned status ${res.statusCode}`));
      }
    });

    req.on('error', (error) => {
      console.error(`❌ Qdrant connection failed: ${error.message}`);
      const nodeEnv = process.env.NODE_ENV;
      if (nodeEnv === 'local') {
        console.error('\n💡 Local solutions:');
        console.error('   docker run -d --name keledon-qdrant -p 6333:6333 qdrant/qdrant:latest');
      } else {
        console.error('\n💡 Production: Check QDRANT_URL and network connectivity');
      }
      reject(error);
    });

    req.on('timeout', () => {
      console.error('❌ Qdrant connection timeout');
      req.destroy();
      reject(new Error('Qdrant connection timeout'));
    });

    req.end();
  });
}

// Run validation if called directly
if (require.main === module) {
  try {
    const environment = validateAndLoadEnvironment();
    const phase = determinePhase();
    console.log(`🚀 Phase: ${phase}`);
    
    validateQdrant()
      .then(() => {
        console.log('🎉 Environment validation passed');
        process.exit(0);
      })
      .catch(() => {
        console.error('💥 Environment validation failed');
        process.exit(1);
      });
  } catch (error) {
    console.error('💥 Environment setup failed:', error.message);
    process.exit(1);
  }
}

module.exports = { 
  validateAndLoadEnvironment, 
  determinePhase, 
  validateQdrant 
};