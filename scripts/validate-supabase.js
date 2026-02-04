const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

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
 * Validate Supabase connectivity (Phase 2 requirement)
 */
async function validateSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('⏭️  Supabase: skipped (Phase 0/1)');
    return true;
  }

  console.log(`🔍 Validating Supabase at: ${supabaseUrl}`);

  try {
    const url = new URL(`${supabaseUrl}/rest/v1/`);
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      };

      const req = https.request(options, (res) => {
        // 200 = OK, 406 = Not Acceptable (expected, no tables yet)
        if (res.statusCode === 200 || res.statusCode === 406) {
          console.log('✅ Supabase: connected');
          resolve(true);
        } else {
          console.error(`❌ Supabase validation failed: ${res.statusCode}`);
          reject(new Error(`Supabase returned status ${res.statusCode}`));
        }
      });

      req.on('error', (error) => {
        console.error(`❌ Supabase connection failed: ${error.message}`);
        const nodeEnv = process.env.NODE_ENV;
        if (nodeEnv === 'local') {
          console.error('\n💡 Local solutions:');
          console.error('   1. Start Supabase CLI: supabase start');
          console.error('   2. Or use Docker: docker run -p 54321:54321 supabase/cli');
        } else {
          console.error('\n💡 Production: Check SUPABASE_URL and SUPABASE_KEY');
        }
        reject(error);
      });

      req.on('timeout', () => {
        console.error('❌ Supabase connection timeout');
        req.destroy();
        reject(new Error('Supabase connection timeout'));
      });

      req.end();
    });
  } catch (error) {
    console.error(`❌ Invalid Supabase URL: ${error.message}`);
    throw error;
  }
}

// Run validation if called directly
if (require.main === module) {
  try {
    const environment = validateAndLoadEnvironment();
    const phase = determinePhase();
    console.log(`🚀 Phase: ${phase}`);
    
    validateSupabase()
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
  validateSupabase 
};