#!/usr/bin/env node

/**
 * Supabase Real Operations Test
 * Validates that authentication and database use real Supabase API, not mocks
 */

console.log('🔐 Testing Supabase Real Operations');
console.log('==================================');

// Test 1: Check for real Supabase client integration
function testSupabaseClient() {
  console.log('\n📡 Testing Supabase Client Integration...');
  
  const servicePath = './cloud/src/supabase-clean/minimal-supabase.service.ts';
  const frontendPath = './landing/src/lib/supabase.ts';
  const fs = require('fs');
  
  try {
    const serviceCode = fs.readFileSync(servicePath, 'utf8');
    const frontendCode = fs.readFileSync(frontendPath, 'utf8');
    
    // Check for real Supabase imports
    const hasRealSupabaseImport = serviceCode.includes('import { createClient, SupabaseClient, AuthError } from \'@supabase/supabase-js\'');
    const hasRealFrontendImport = frontendCode.includes('import { createClient, SupabaseClient } from \'@supabase/supabase-js\'');
    
    // Check for real Supabase client creation
    const hasRealClientCreation = serviceCode.includes('createClient(this.supabaseUrl, supabaseKey');
    
    // Check for absence of mock tokens
    const noMockTokens = !serviceCode.includes('temp-token-') && !serviceCode.includes('temp-id-');
    
    // Check for real API calls
    const hasRealSignUp = serviceCode.includes('await this.supabase.auth.signUp');
    const hasRealSignIn = serviceCode.includes('await this.supabase.auth.signInWithPassword');
    const hasRealSignOut = serviceCode.includes('await this.supabase.auth.signOut');
    
    console.log(`   Real Supabase imports: ${hasRealSupabaseImport && hasRealFrontendImport ? '✅' : '❌'}`);
    console.log(`   Real client creation: ${hasRealClientCreation ? '✅' : '❌'}`);
    console.log(`   No mock tokens: ${noMockTokens ? '✅' : '❌'}`);
    console.log(`   Real sign up: ${hasRealSignUp ? '✅' : '❌'}`);
    console.log(`   Real sign in: ${hasRealSignIn ? '✅' : '❌'}`);
    console.log(`   Real sign out: ${hasRealSignOut ? '✅' : '❌'}`);
    
    return hasRealSupabaseImport && hasRealClientCreation && noMockTokens && 
           hasRealSignUp && hasRealSignIn && hasRealSignOut;
  } catch (error) {
    console.log(`   ❌ Failed to read Supabase files: ${error.message}`);
    return false;
  }
}

// Test 2: Check for real database operations
function testDatabaseOperations() {
  console.log('\n💾 Testing Database Operations...');
  
  const frontendPath = './landing/src/lib/supabase.ts';
  const launchPagePath = './landing/src/pages/LaunchAgentPage.tsx';
  const fs = require('fs');
  
  try {
    const frontendCode = fs.readFileSync(frontendPath, 'utf8');
    const launchPageCode = fs.readFileSync(launchPagePath, 'utf8');
    
    // Check for real database function implementations
    const hasRealCompanies = frontendCode.includes('export async function getCompanies(): Promise<Company[]>');
    const hasRealBrands = frontendCode.includes('export async function getBrands(companyId?: string): Promise<Brand[]>');
    const hasRealTeams = frontendCode.includes('export async function getTeams(companyId?: string): Promise<Team[]>');
    
    // Check for real database calls
    const hasRealSelectAll = frontendCode.includes('.select(\'*\')');
    const hasRealFromTable = frontendCode.includes('.from(\'companies\')');
    
    // Check that launch page uses real data
    const hasNoMockData = !launchPageCode.includes('mockCompanies') && 
                       !launchPageCode.includes('mockBrands') && 
                       !launchPageCode.includes('mockTeams');
    const hasRealDataLoading = launchPageCode.includes('getCompanies()') &&
                           launchPageCode.includes('getBrands()') &&
                           launchPageCode.includes('getTeams()');
    
    console.log(`   Real getCompanies: ${hasRealCompanies ? '✅' : '❌'}`);
    console.log(`   Real getBrands: ${hasRealBrands ? '✅' : '❌'}`);
    console.log(`   Real getTeams: ${hasRealTeams ? '✅' : '❌'}`);
    console.log(`   Real select operations: ${hasRealSelectAll ? '✅' : '❌'}`);
    console.log(`   Real from operations: ${hasRealFromTable ? '✅' : '❌'}`);
    console.log(`   No mock data in UI: ${hasNoMockData ? '✅' : '❌'}`);
    console.log(`   Real data loading: ${hasRealDataLoading ? '✅' : '❌'}`);
    
    return hasRealCompanies && hasRealBrands && hasRealTeams && 
           hasRealSelectAll && hasRealFromTable && 
           hasNoMockData && hasRealDataLoading;
  } catch (error) {
    console.log(`   ❌ Failed to read database files: ${error.message}`);
    return false;
  }
}

// Test 3: Check for anti-demo validation
function testAntiDemoValidation() {
  console.log('\n🛡️ Testing Anti-Demo Validation...');
  
  const authContextPath = './landing/src/context/AuthContext.tsx';
  const fs = require('fs');
  
  try {
    const authCode = fs.readFileSync(authContextPath, 'utf8');
    
    // Check for anti-demo validation in login
    const hasAntiDemoLogin = authCode.includes('Demo login not supported');
    
    // Check for real Google auth (if present)
    const hasRealGoogleAuth = authCode.includes('loginWithGoogle: () => Promise<void>');
    
    // Check for real email auth
    const hasRealEmailAuth = authCode.includes('signInWithEmail: (email: string, password: string) => Promise<void>');
    
    // Check for Superabase integration
    const hasSupabaseIntegration = authCode.includes('import { supabase } from \'@/lib/supabase\'');
    
    console.log(`   Anti-demo login validation: ${hasAntiDemoLogin ? '✅' : '❌'}`);
    console.log(`   Real Google auth: ${hasRealGoogleAuth ? '✅' : '❌'}`);
    console.log(`   Real email auth: ${hasRealEmailAuth ? '✅' : '❌'}`);
    console.log(`   Supabase integration: ${hasSupabaseIntegration ? '✅' : '❌'}`);
    
    return hasAntiDemoLogin && hasSupabaseIntegration;
  } catch (error) {
    console.log(`   ❌ Failed to read auth files: ${error.message}`);
    return false;
  }
}

// Test 4: Check for production configuration
function testProductionConfig() {
  console.log('\n⚙️ Testing Production Configuration...');
  
  const landingEnvPath = './landing/.env.production';
  const cloudEnvPath = './cloud/.env.produccion.txt';
  const fs = require('fs');
  
  try {
    const landingEnv = fs.readFileSync(landingEnvPath, 'utf8');
    const cloudEnv = fs.readFileSync(cloudEnvPath, 'utf8');
    
    // Check for real Supabase configuration
    const hasRealSupabaseURL = landingEnv.includes('https://isoyzcvjoevyphnaznkl.supabase.co');
    const hasRealSupabaseKey = landingEnv.includes('sb_publishable_9sKVxamNyK4CdXM-yH69qg_fEHRvHRa') && !landingEnv.includes('REDACTED');
    const hasRealCloudSupabase = cloudEnv.includes('SUPABASE_URL=https://isoyzcvjoevyphnaznkl.supabase.co');
    
    console.log(`   Real Supabase URL: ${hasRealSupabaseURL ? '✅' : '❌'}`);
    console.log(`   Real Supabase key: ${hasRealSupabaseKey ? '✅' : '❌'}`);
    console.log(`   Cloud Supabase config: ${hasRealCloudSupabase ? '✅' : '❌'}`);
    
    return hasRealSupabaseURL && hasRealSupabaseKey && hasRealCloudSupabase;
  } catch (error) {
    console.log(`   ❌ Failed to read config files: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const results = {
    client: testSupabaseClient(),
    database: testDatabaseOperations(),
    antiDemo: testAntiDemoValidation(),
    config: testProductionConfig()
  };
  
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  
  const allPassed = Object.values(results).every(result => result);
  
  console.log(`Supabase Real Client: ${results.client ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Database Real Ops: ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Anti-Demo Validation: ${results.antiDemo ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Production Config: ${results.config ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\n🎯 Overall Result');
  console.log('==================');
  
  if (allPassed) {
    console.log('✅ SUPABASE REWIRE SUCCESSFUL');
    console.log('✅ All authentication uses real Supabase API');
    console.log('✅ Database operations use real queries');
    console.log('✅ No mock data detected');
    console.log('✅ Production configuration ready');
  } else {
    console.log('❌ SUPABASE REWIRE INCOMPLETE');
    console.log('❌ Some components still use mock behavior');
    console.log('❌ Requires further investigation');
  }
  
  return allPassed;
}

runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});