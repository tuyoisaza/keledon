import * as crypto from 'crypto';
import { createHash } from 'crypto';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const COLLECTION = process.env.QDRANT_COLLECTION || 'keledon';
const VECTOR_SIZE = 768;

interface KnowledgeEntry {
  id: string;
  text: string;
  category: string;
  source: string;
  company_id: string;
}

const KNOWLEDGE_BASE: Omit<KnowledgeEntry, 'id'>[] = [
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
    category: 'help-click',
    source: 'system-help',
    company_id: 'keledon-default',
  },
  {
    text: 'To fill in a form field, tell me what text to type and which field to fill.',
    category: 'help-type',
    source: 'system-help',
    company_id: 'keledon-default',
  },
  {
    text: 'I can navigate to any website by you telling me the URL.',
    category: 'help-navigate',
    source: 'system-help',
    company_id: 'keledon-default',
  },
  {
    text: 'Is there anything else I can help you with?',
    category: 'closing',
    source: 'system-closing',
    company_id: 'keledon-default',
  },
  {
    text: 'Thank you for using KELEDON. Have a great day!',
    category: 'farewell',
    source: 'system-farewell',
    company_id: 'keledon-default',
  },
  {
    text: 'Click on the search button to search the database.',
    category: 'example-click',
    source: 'system-examples',
    company_id: 'keledon-default',
  },
  {
    text: 'Type your query into the search input field.',
    category: 'example-type',
    source: 'system-examples',
    company_id: 'keledon-default',
  },
  {
    text: 'The submit button sends the form data to the server.',
    category: 'example-form',
    source: 'system-examples',
    company_id: 'keledon-default',
  },
];

function textToVector(text: string): number[] {
  const hash = createHash('sha256').update(text).digest();
  const vector = new Array<number>(VECTOR_SIZE);
  for (let i = 0; i < VECTOR_SIZE; i += 1) {
    const b = hash[i % hash.length];
    vector[i] = b / 255;
  }
  return vector;
}

async function createCollection(): Promise<void> {
  console.log(`[Seed] Creating collection: ${COLLECTION}`);

  const response = await fetch(`${QDRANT_URL}/collections/${COLLECTION}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (response.ok) {
    console.log('[Seed] Collection already exists');
    return;
  }

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
    throw new Error(`Failed to create collection: ${error}`);
  }

  console.log('[Seed] Collection created successfully');
}

async function seedKnowledge(): Promise<void> {
  console.log('[Seed] Seeding knowledge base...');

  const points = KNOWLEDGE_BASE.map((entry, index) => ({
    id: index + 1,
    vector: textToVector(entry.text),
    payload: {
      doc_id: `doc-${index + 1}`,
      text: entry.text,
      category: entry.category,
      source: entry.source,
      company_id: entry.company_id,
      created_at: new Date().toISOString(),
    },
  }));

  const response = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      points,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to seed knowledge: ${error}`);
  }

  console.log(`[Seed] Successfully seeded ${points.length} knowledge entries`);
}

async function verifySeed(): Promise<void> {
  console.log('[Seed] Verifying seed data...');

  const response = await fetch(
    `${QDRANT_URL}/collections/${COLLECTION}/points/search`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector: textToVector('hello'),
        limit: 3,
        with_payload: true,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Verification failed: ${response.status}`);
  }

  const result = await response.json();
  console.log(`[Seed] Verified: ${result.result?.length || 0} results returned for "hello"`);
}

async function main(): Promise<void> {
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
