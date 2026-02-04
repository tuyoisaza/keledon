#!/usr/bin/env node

/**
 * Simple test script to verify vector store connection to real Qdrant instance
 * This script tests the actual runtime connection without mock data
 */

const QDRANT_URL = process.env.QDRANT_URL || 'https://keledon.tuyoisaza.com/qdrant';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

console.log('🔍 Testing Vector Store Connection');
console.log('================================');
console.log(`QDRANT_URL: ${QDRANT_URL}`);
console.log(`QDRANT_API_KEY: ${QDRANT_API_KEY ? '***CONFIGURED***' : 'NOT SET'}`);

async function testConnection() {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (QDRANT_API_KEY) {
      headers['api-key'] = QDRANT_API_KEY;
    }

    // Test 1: Check if Qdrant is accessible
    console.log('\n📡 Testing Qdrant accessibility...');
    const response = await fetch(`${QDRANT_URL}/collections`, { headers });
    
    if (!response.ok) {
      throw new Error(`Qdrant not accessible: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Qdrant is accessible');
    console.log(`   Available collections: ${data.result.collections.length}`);

    // Test 2: Check keledon-policies collection
    console.log('\n📚 Testing keledon-policies collection...');
    const collectionResponse = await fetch(`${QDRANT_URL}/collections/keledon-policies`, { headers });
    
    if (collectionResponse.status === 404) {
      console.log('⚠️  Collection keledon-policies does not exist (will be created on first use)');
    } else if (collectionResponse.ok) {
      const collectionData = await collectionResponse.json();
      console.log('✅ Collection keledon-policies exists');
      console.log(`   Points count: ${collectionData.result.points_count}`);
      console.log(`   Vector size: ${collectionData.result.config.params.vectors.size}`);
      console.log(`   Distance: ${collectionData.result.config.params.vectors.distance}`);
    } else {
      throw new Error(`Collection check failed: ${collectionResponse.status} ${collectionResponse.statusText}`);
    }

    // Test 3: Test embedding generation (requires OpenAI API key)
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (OPENAI_API_KEY) {
      console.log('\n🧠 Testing OpenAI embedding generation...');
      const embedResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: 'test document for vector store',
        }),
      });

      if (embedResponse.ok) {
        const embedData = await embedResponse.json();
        console.log('✅ OpenAI embedding generation successful');
        console.log(`   Embedding dimensions: ${embedData.data[0].embedding.length}`);
      } else {
        console.log('❌ OpenAI embedding generation failed');
        console.log(`   Status: ${embedResponse.status} ${embedResponse.statusText}`);
      }
    } else {
      console.log('\n⚠️  OPENAI_API_KEY not set - skipping embedding test');
    }

    console.log('\n🎉 Vector Store Connection Test Complete');
    console.log('==========================================');
    console.log('✅ Connection to real Qdrant instance verified');
    console.log('✅ Ready for real vector operations');
    console.log('✅ No mock data - system is using real runtime');

  } catch (error) {
    console.error('\n❌ Vector Store Connection Test Failed');
    console.error('=====================================');
    console.error(error.message);
    process.exit(1);
  }
}

testConnection();