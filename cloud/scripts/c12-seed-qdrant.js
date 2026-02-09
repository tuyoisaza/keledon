#!/usr/bin/env node

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'keledon_c12_proof';

function fail(message) {
  console.error(`[C12-SEED][FAIL] ${message}`);
  process.exit(1);
}

async function fetchOrFail(url, options = {}, errorContext) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    fail(`${errorContext}: ${error.message}`);
  }

  if (!response.ok) {
    const body = await response.text();
    fail(`${errorContext}: HTTP ${response.status} ${body}`);
  }

  return response;
}

async function ensureQdrantReady() {
  await fetchOrFail(`${QDRANT_URL}/collections`, {}, 'Qdrant service not reachable');
}

async function recreateCollection() {
  const collectionUrl = `${QDRANT_URL}/collections/${QDRANT_COLLECTION}`;

  await fetch(collectionUrl, { method: 'DELETE' });

  await fetchOrFail(
    collectionUrl,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vectors: { size: 3, distance: 'Cosine' },
      }),
    },
    'Failed to create deterministic Qdrant collection',
  );
}

async function upsertDeterministicDocs() {
  const points = [
    {
      id: 1,
      vector: [0.11, 0.22, 0.33],
      payload: {
        doc_id: 'doc-1',
        text: 'Deterministic doc 1 for KELEDON proof',
      },
    },
    {
      id: 2,
      vector: [0.21, 0.32, 0.43],
      payload: {
        doc_id: 'doc-2',
        text: 'Deterministic doc 2 for KELEDON proof',
      },
    },
    {
      id: 3,
      vector: [0.31, 0.42, 0.53],
      payload: {
        doc_id: 'doc-3',
        text: 'Deterministic doc 3 for KELEDON proof',
      },
    },
  ];

  await fetchOrFail(
    `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points?wait=true`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points }),
    },
    'Failed to upsert deterministic proof docs',
  );
}

async function main() {
  await ensureQdrantReady();
  await recreateCollection();
  await upsertDeterministicDocs();

  console.log(`[C12-SEED][SUCCESS] qdrant_collection=${QDRANT_COLLECTION}`);
  console.log('[C12-SEED] qdrant_doc_ids=doc-1,doc-2,doc-3');
}

main().catch((error) => fail(error.message || String(error)));
