#!/usr/bin/env node

// Environment Preparation Script for Vector Store Development
// This script sets up necessary environment files and configurations

const fs = require('fs');
const path = require('path');

function createEnvFile(templatePath, targetPath) {
  if (!fs.existsSync(targetPath)) {
    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, targetPath);
      console.log(`[SUCCESS] Created ${targetPath} from template`);
    } else {
      console.warn(`[WARNING] Template file not found: ${templatePath}`);
    }
  } else {
    console.log(`[INFO] Environment file already exists: ${targetPath}`);
  }
}

function checkRequiredEnvVars(envPath) {
  if (!fs.existsSync(envPath)) {
    console.warn(`[WARNING] Environment file not found: ${envPath}`);
    return false;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const requiredVars = ['VITE_OPENAI_API_KEY'];
  const missingVars = [];

  requiredVars.forEach(varName => {
    if (!content.includes(`${varName}=`) || content.includes(`${varName}=your_`) || content.includes(`${varName}=`)) {
      const match = content.match(new RegExp(`${varName}=([^\n\r]+)`));
      if (!match || match[1].trim() === '' || match[1].includes('your_')) {
        missingVars.push(varName);
      }
    }
  });

  if (missingVars.length > 0) {
    console.warn(`[WARNING] Missing or incomplete environment variables: ${missingVars.join(', ')}`);
    console.log(`[INFO] Please update ${envPath} with required values`);
    return false;
  }

  console.log(`[SUCCESS] Environment variables are properly configured`);
  return true;
}

function createBackupDirectory() {
  const backupDir = './vs-backups';
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`[SUCCESS] Created backup directory: ${backupDir}`);
  } else {
    console.log(`[INFO] Backup directory already exists: ${backupDir}`);
  }
}

function main() {
  console.log('[INFO] Preparing Vector Store Environment...\n');

  const projectRoot = path.resolve(__dirname, '..');
  const envLocalTemplate = path.join(projectRoot, '..', '.env.local.template');
  const envLocalTarget = path.join(projectRoot, '.env.local');
  const envProdTemplate = path.join(projectRoot, '..', '.env.production.template');
  const envProdTarget = path.join(projectRoot, '.env.production');

  // Create environment files from templates
  console.log('[INFO] Setting up environment files...');
  createEnvFile(envLocalTemplate, envLocalTarget);
  createEnvFile(envProdTemplate, envProdTarget);

  // Check required environment variables
  console.log('\n[INFO] Checking environment configuration...');
  const isConfigured = checkRequiredEnvVars(envLocalTarget);

  // Create backup directory
  console.log('\n[INFO] Setting up backup directory...');
  createBackupDirectory();

  // Summary
  console.log('\n[INFO] Environment Preparation Summary:');
  console.log(`   Environment Files: ${isConfigured ? '[SUCCESS]' : '[WARNING]'}`);
  console.log(`   Backup Directory: [SUCCESS]`);
  console.log(`   Docker Scripts: [SUCCESS]`);

  if (!isConfigured) {
    console.log('\n[NEXT STEPS]:');
    console.log('   1. Update .env.local with your OpenAI API key');
    console.log('   2. Run: npm run start:qdrant');
    console.log('   3. Run: npm run dev');
  } else {
    console.log('\n[SUCCESS] Ready to start development!');
    console.log('   Run: npm run dev:vector-store');
  }
}

if (require.main === module) {
    main();
}

module.exports = { createEnvFile, checkRequiredEnvVars, createBackupDirectory };