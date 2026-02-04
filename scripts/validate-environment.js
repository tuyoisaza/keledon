const fs = require('fs');
const path = require('path');

/**
 * Master environment validation script
 * KELEDON Environment Contract v1
 * 
 * Usage:
 *   node scripts/validate-environment.js
 *   NODE_ENV=local node scripts/validate-environment.js
 *   NODE_ENV=production node scripts/validate-environment.js
 */

function validateEnvironment() {
  console.log('🔍 KELEDON Environment Validation');
  console.log('==================================');
  
  // Check NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  
  if (!nodeEnv) {
    console.error('❌ NODE_ENV is required and must be "local" or "production"');
    console.error('\n💡 Usage:');
    console.error('   NODE_ENV=local npm run dev');
    console.error('   NODE_ENV=production npm run dev');
    console.error('\n💡 Or set environment variable:');
    console.error('   export NODE_ENV=local');
    console.error('   export NODE_ENV=production');
    process.exit(1);
  }

  if (!['local', 'production'].includes(nodeEnv)) {
    console.error(`❌ Invalid NODE_ENV: "${nodeEnv}". Must be "local" or "production"`);
    process.exit(1);
  }

  // Check environment file exists
  const envFile = path.join(process.cwd(), `.env.${nodeEnv}`);
  
  if (!fs.existsSync(envFile)) {
    console.error(`❌ Environment file not found: ${envFile}`);
    console.error(`\n💡 Create .env.${nodeEnv} from .env.example template:`);
    console.error(`   cp .env.example .env.${nodeEnv}`);
    console.error(`   # Then edit .env.${nodeEnv} with your values`);
    process.exit(1);
  }

  // Load and parse environment file
  const envContent = fs.readFileSync(envFile, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  // Display environment info
  console.log(`🌍 Environment: ${nodeEnv.toUpperCase()}`);
  console.log(`📁 File: .env.${nodeEnv}`);
  
  // Determine phase
  const hasQdrant = envVars.QDRANT_URL;
  const hasSupabase = envVars.SUPABASE_URL;
  
  let phase = 'BOOTABLE';
  if (hasSupabase) phase = 'DATABASE-READY';
  else if (hasQdrant) phase = 'VECTOR-READY';
  
  console.log(`🚀 Phase: ${phase}`);
  
  // Validate required variables per phase
  const errors = [];
  
  // Phase 0 - BOOTABLE requirements
  if (!envVars.CLOUD_PORT) {
    errors.push('CLOUD_PORT is required for BOOTABLE phase');
  }
  
  if (!envVars.CORS_ORIGINS) {
    errors.push('CORS_ORIGINS is required for BOOTABLE phase');
  }
  
  // Phase 1 - VECTOR-READY requirements
  if (phase !== 'BOOTABLE') {
    if (!envVars.QDRANT_URL) {
      errors.push('QDRANT_URL is required for VECTOR-READY phase');
    }
    
    // Production requires API key for Qdrant
    if (nodeEnv === 'production' && !envVars.QDRANT_API_KEY) {
      errors.push('QDRANT_API_KEY is required for production VECTOR-READY phase');
    }
  }
  
  // Phase 2 - DATABASE-READY requirements
  if (phase === 'DATABASE-READY') {
    if (!envVars.SUPABASE_URL) {
      errors.push('SUPABASE_URL is required for DATABASE-READY phase');
    }
    
    const supabaseKey = envVars.SUPABASE_ANON_KEY || envVars.SUPABASE_KEY || envVars.SUPABASE_SERVICE_KEY;
    if (!supabaseKey) {
      errors.push('SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY is required for DATABASE-READY phase');
    }
  }
  
  if (errors.length > 0) {
    console.error('\n❌ Environment validation failed:');
    errors.forEach(error => console.error(`   - ${error}`));
    process.exit(1);
  }
  
  console.log('\n✅ Environment validation passed');
  
  // Show service configuration
  console.log('\n📋 Service Configuration:');
  if (phase !== 'BOOTABLE') {
    console.log(`   Qdrant: ${envVars.QDRANT_URL}`);
  }
  if (phase === 'DATABASE-READY') {
    console.log(`   Supabase: ${envVars.SUPABASE_URL}`);
  }
  console.log(`   CORS: ${envVars.CORS_ORIGINS}`);
  console.log(`   Port: ${envVars.CLOUD_PORT}`);
  
  return { environment: nodeEnv, phase, envVars };
}

if (require.main === module) {
  try {
    validateEnvironment();
    process.exit(0);
  } catch (error) {
    console.error('💥 Environment validation failed:', error.message);
    process.exit(1);
  }
}

module.exports = { validateEnvironment };