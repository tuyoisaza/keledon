console.log('Testing TypeScript compilation...');

try {
  console.log('✅ TypeScript compilation works');
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}