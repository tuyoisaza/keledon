const crypto = require('crypto');

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const COLLECTION = process.env.QDRANT_COLLECTION || 'keledon';
const VECTOR_SIZE = 768;

const KNOWLEDGE_BASE = [
  {
    text: 'Hello and welcome! How can I assist you today?',
    category: 'greeting',
    source: 'system-greetings',
    company_id: 'keledon-default',
  },
  {
    text: 'I can help you with browser automation tasks like clicking buttons, filling forms, navigating pages, and extracting information.',
    category: 'capabilities',
    source: 'system-capabilities',
    company_id: 'keledon-default',
  },
  {
    text: 'To click on an element, I need you to tell me what to click on, like a button name or link text.',
    category: 'capabilities',
    source: 'system-capabilities',
    company_id: 'keledon-default',
  },
  {
    text: 'I can extract text content from web pages, including articles, product listings, and data tables.',
    category: 'capabilities',
    source: 'system-capabilities',
    company_id: 'keledon-default',
  },
  {
    text: 'The current date is available through the browser context and can be used for date-related queries.',
    category: 'capabilities',
    source: 'system-capabilities',
    company_id: 'keledon-default',
  },
  {
    text: 'I can help you fill out web forms by identifying input fields and submitting form data.',
    category: 'capabilities',
    source: 'system-capabilities',
    company_id: 'keledon-default',
  },
  {
    text: 'To navigate to a webpage, simply tell me the URL and I will open it in the browser.',
    category: 'capabilities',
    source: 'system-capabilities',
    company_id: 'keledon-default',
  },
  {
    text: 'KELEDON is a voice-controlled browser automation agent that uses AI for decision making.',
    category: 'about',
    source: 'system-info',
    company_id: 'keledon-default',
  },
  {
    text: 'I use a vector database to store and retrieve knowledge, allowing me to provide contextual responses.',
    category: 'about',
    source: 'system-info',
    company_id: 'keledon-default',
  },
  {
    text: 'Thank you for using KELEDON! Have a great day.',
    category: 'farewell',
    source: 'system-farewell',
    company_id: 'keledon-default',
  },
];

function deterministicHash(text) {
  const hash = crypto.createHash('sha256').update(text).digest();
  const vector = new Array(VECTOR_SIZE).fill(0);
  for (let i = 0; i < Math.min(hash.length, VECTOR_SIZE); i++) {
    vector[i] = (hash[i] / 255) * 2 - 1;
  }
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(v => v / norm);
}

async function createCollection() {
  console.log(`[Seed] Creating collection '${COLLECTION}'...`);
  
  const response = await fetch(`${QDRANT_URL}/collections/${COLLECTION}`, {
    method: 'DELETE',
  }).catch(() => null);

  const createResponse = await fetch(`${QDRANT_URL}/collections/${COLLECTION}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vectors: {
        size: VECTOR_SIZE,
        distance: 'Cosine',
      },
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    console.log(`[Seed] Collection may already exist: ${error}`);
  } else {
    console.log(`[Seed] Collection '${COLLECTION}' created`);
  }
}

async function seedKnowledge() {
  console.log(`[Seed] Seeding ${KNOWLEDGE_BASE.length} knowledge entries...`);
  
  const points = KNOWLEDGE_BASE.map((entry, index) => {
    const id = Buffer.from(`${entry.text.substring(0, 20)}-${index}`).toString('base64');
    const vector = deterministicHash(entry.text);
    
    return {
      id: index,
      vector: vector,
      payload: {
        text: entry.text,
        category: entry.category,
        source: entry.source,
        company_id: entry.company_id,
      },
    };
  });

  const response = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      points: points,
    }),
  });

  if (response.ok) {
    console.log(`[Seed] Successfully seeded ${points.length} entries`);
  } else {
    const error = await response.text();
    console.error(`[Seed] Failed to seed: ${error}`);
  }
}

async function verifySeed() {
  console.log('[Seed] Verifying seed data...');
  
  const response = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vector: deterministicHash('hello'),
      limit: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Verification failed: ${response.status}`);
  }

  const result = await response.json();
  console.log(`[Seed] Verified: ${result.result?.length || 0} results returned for "hello"`);
}

async function main() {
  console.log('[Seed] Starting Qdrant seed...');
  console.log(`[Seed] QDRANT_URL: ${QDRANT_URL}`);
  console.log(`[Seed] COLLECTION: ${COLLECTION}`);

  try {
    await createCollection();
    await seedKnowledge();
    await verifySeed();
    console.log('[Seed] Done!');
  } catch (error) {
    console.error('[Seed] Error:', error);
    process.exit(1);
  }
}

main();
