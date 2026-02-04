#!/usr/bin/env node

/**
 * KELEDON Production Test CLI
 * Command-line interface for production testing
 */

import ProductionTestRunner from './production-test-runner.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProductionTestCLI {
  constructor() {
    this.runner = new ProductionTestRunner();
    this.setupConsoleLogging();
  }

  setupConsoleLogging() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    // Enhanced logging with timestamps
    console.log = (...args) => {
      const timestamp = new Date().toISOString();
      originalLog(`[${timestamp}]`, ...args);
    };

    console.error = (...args) => {
      const timestamp = new Date().toISOString();
      originalError(`[${timestamp}] ERROR:`, ...args);
    };

    console.warn = (...args) => {
      const timestamp = new Date().toISOString();
      originalWarn(`[${timestamp}] WARNING:`, ...args);
    };
  }

  showHeader() {
    console.log('\n' + '🎯'.repeat(40));
    console.log('    KELEDON PRODUCTION TESTING CLI');
    console.log('🎯'.repeat(40) + '\n');
    console.log('Complete production readiness assessment for KELEDON V1\n');
  }

  showUsage() {
    console.log('\nUSAGE:');
    console.log('  node production-test-cli.js [command] [options]\n');
    console.log('\nCOMMANDS:');
    console.log('  run              Run complete production test suite');
    console.log('  readiness         Run readiness assessment only');
    console.log('  scenarios         Run production scenarios only');
    console.log('  quick            Quick production readiness check');
    console.log('  report            Generate production report');
    console.log('  help              Show this help message\n');
    console.log('\nOPTIONS:');
    console.log('  --production     Test against production endpoints');
    console.log('  --development    Test against development endpoints (default)');
    console.log('  --verbose        Detailed output logging');
    console.log('  --output <file>  Save results to file');
    console.log('  --config <file>   Load configuration from file\n');
    console.log('\nEXAMPLES:');
    console.log('  node production-test-cli.js run');
    console.log('  node production-test-cli.js run --production --verbose');
    console.log('  node production-test-cli.js readiness --output results.json');
    console.log('  node production-test-cli.js scenarios --config test-config.json\n');
  }

  async runCompleteTest(options = {}) {
    console.log('🚀 Starting Complete Production Test Suite...\n');

    try {
      const config = this.loadConfiguration(options);
      this.runner = new ProductionTestRunner();
      
      // Setup progress monitoring
      this.setupProgressMonitoring();
      
      const results = await this.runner.runCompleteProductionTest();
      
      if (options.output) {
        await this.saveResults(results, options.output);
      }
      
      if (options.verbose) {
        this.displayDetailedResults(results);
      }
      
      process.exit(results.verdict.verdict === 'PRODUCTION READY' ? 0 : 1);
      
    } catch (error) {
      console.error('Production test failed:', error);
      process.exit(1);
    }
  }

  async runReadinessAssessment(options = {}) {
    console.log('🔍 Running Readiness Assessment Only...\n');

    try {
      const assessment = new ProductionReadinessAssessment();
      const results = await assessment.assessReadiness();
      
      console.log('\n📊 READINESS ASSESSMENT RESULTS:');
      console.log(`Overall Score: ${results.total_score}/100`);
      console.log(`Readiness Level: ${results.readiness_level}`);
      console.log(`Blockers: ${results.blockers.length} identified`);
      
      if (options.output) {
        await this.saveResults({ readiness_assessment: results }, options.output);
      }
      
      if (options.verbose) {
        console.log('\n📋 DETAILED RESULTS:');
        console.log(JSON.stringify(results, null, 2));
      }
      
      process.exit(results.readiness_level === 'PRODUCTION READY' ? 0 : 1);
      
    } catch (error) {
      console.error('Readiness assessment failed:', error);
      process.exit(1);
    }
  }

  async runProductionScenarios(options = {}) {
    console.log('🎭 Running Production Scenarios...\n');

    try {
      const config = this.loadConfiguration(options);
      this.runner = new ProductionTestRunner();
      
      const results = await this.runner.runCompleteProductionTest();
      
      console.log('\n📊 PRODUCTION SCENARIOS RESULTS:');
      console.log(`Overall Score: ${results.verdict.overall_score}/100`);
      console.log(`Production Ready: ${results.verdict.verdict}`);
      
      if (options.output) {
        await this.saveResults({ production_scenarios: results }, options.output);
      }
      
      process.exit(results.verdict.verdict === 'PRODUCTION READY' ? 0 : 1);
      
    } catch (error) {
      console.error('Production scenarios failed:', error);
      process.exit(1);
    }
  }

  async runQuickCheck(options = {}) {
    console.log('⚡ Running Quick Production Check...\n');

    try {
      const quickConfig = {
        production_mode: options.production || false,
        test_timeout_ms: 15000,
        test_scenarios: [
          {
            name: 'quick_readiness',
            description: 'Quick production readiness check',
            timeout_ms: 15000,
            required_components: ['websocket', 'session_management']
          }
        ]
      };

      this.runner = new ProductionTestRunner(quickConfig);
      const results = await this.runner.runCompleteProductionTest();
      
      console.log('\n⚡ QUICK CHECK RESULTS:');
      console.log(`Score: ${results.verdict.overall_score}/100`);
      console.log(`Status: ${results.verdict.verdict}`);
      
      process.exit(results.verdict.verdict === 'PRODUCTION READY' ? 0 : 1);
      
    } catch (error) {
      console.error('Quick check failed:', error);
      process.exit(1);
    }
  }

  async generateReport(options = {}) {
    console.log('📄 Generating Production Report...\n');

    try {
      // Load previous results if available
      const resultsPath = options.input || './production-results.json';
      const resultsData = await this.loadResults(resultsPath);
      
      const report = this.generateProductionReport(resultsData);
      
      if (options.output) {
        await this.saveResults(report, options.output);
      } else {
        console.log(report);
      }
      
    } catch (error) {
      console.error('Report generation failed:', error);
      process.exit(1);
    }
  }

  loadConfiguration(options) {
    const config = {
      production: options.production || false,
      verbose: options.verbose || false,
      output: options.output || null
    };

    if (options.config) {
      try {
        const configPath = path.resolve(options.config);
        const fileConfig = JSON.parse(require('fs').readFileSync(configPath, 'utf8'));
        Object.assign(config, fileConfig);
      } catch (error) {
        console.warn(`Failed to load config file ${options.config}:`, error.message);
      }
    }

    return config;
  }

  setupProgressMonitoring() {
    let spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠿'];
    let i = 0;

    const progressInterval = setInterval(() => {
      process.stdout.write(`\r${spinner[i % spinner.length]} Testing...`);
      i++;
    }, 100);

    // Clear interval when process exits
    process.on('exit', () => {
      clearInterval(progressInterval);
      process.stdout.write('\r');
    });
  }

  async saveResults(results, filePath) {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const fullPath = path.resolve(filePath);
      await fs.writeFile(fullPath, JSON.stringify(results, null, 2));
      console.log(`\n📄 Results saved to: ${fullPath}`);
    } catch (error) {
      console.error(`Failed to save results: ${error.message}`);
      throw error;
    }
  }

  async loadResults(filePath) {
    const fs = require('fs').promises;
    
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn(`Failed to load results from ${filePath}: ${error.message}`);
      return {};
    }
  }

  displayDetailedResults(results) {
    console.log('\n📋 DETAILED TEST RESULTS:');
    console.log(JSON.stringify(results, null, 2));
  }

  generateProductionReport(results) {
    const timestamp = new Date().toISOString();
    
    return `
KELEDON PRODUCTION TEST REPORT
Generated: ${timestamp}

EXECUTIVE SUMMARY
================
Overall Score: ${results.verdict?.overall_score || 'N/A'}/100
Readiness Score: ${results.readiness_assessment?.total_score || 'N/A'}/100
Production Verdict: ${results.verdict?.verdict || 'N/A'}
Deployment Risk: ${results.verdict?.deployment_risk || 'N/A'}

CRITICAL ISSUES
================
${(results.verdict?.critical_blockers || []).map(issue => 
  `❌ ${issue.description} (${issue.severity.toUpperCase()})`
).join('\n') || '✅ No critical issues'}

RECOMMENDATIONS
================
${(results.verdict?.next_steps || []).map(step => `• ${step}`).join('\n')}

DETAILED RESULTS
================
${JSON.stringify(results, null, 2)}
`;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const cli = new ProductionTestCLI();
  
  // Parse command line arguments
  const options = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const option = args[i].substring(2);
      const nextArg = args[i + 1];
      
      switch (option) {
        case 'production':
          options.production = true;
          break;
        case 'development':
          options.development = true;
          break;
        case 'verbose':
          options.verbose = true;
          break;
        case 'output':
          options.output = nextArg;
          i++; // Skip next arg as it's the value
          break;
        case 'config':
          options.config = nextArg;
          i++; // Skip next arg as it's the value
          break;
        case 'input':
          options.input = nextArg;
          i++; // Skip next arg as it's the value
          break;
      }
    }
  }

  cli.showHeader();

  switch (command) {
    case 'run':
      await cli.runCompleteTest(options);
      break;
    case 'readiness':
      await cli.runReadinessAssessment(options);
      break;
    case 'scenarios':
      await cli.runProductionScenarios(options);
      break;
    case 'quick':
      await cli.runQuickCheck(options);
      break;
    case 'report':
      await cli.generateReport(options);
      break;
    case 'help':
    case '--help':
    case '-h':
      cli.showUsage();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      cli.showUsage();
      process.exit(1);
  }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ProductionTestCLI;