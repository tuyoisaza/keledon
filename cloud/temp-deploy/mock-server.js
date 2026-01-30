const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Mock RAG endpoints for testing
app.post('/rag/retrieve', (req, res) => {
  const { query, sessionId, companyId } = req.body;
  
  console.log('RAG retrieve request:', { query, sessionId, companyId });
  
  const mockResults = [
    {
      id: 'mock-doc-1',
      content: 'Mock safety policy: All users must follow safety guidelines',
      relevance: 0.95,
      source: 'safety-policies',
      metadata: { type: 'policy', category: 'safety' }
    },
    {
      id: 'mock-doc-2', 
      content: 'Mock security guidelines: Authentication required for all operations',
      relevance: 0.87,
      source: 'security-guidelines',
      metadata: { type: 'guideline', category: 'security' }
    }
  ];
  
  res.json({
    success: true,
    message: `Retrieved ${mockResults.length} relevant documents`,
    data: mockResults,
    query: query
  });
});

app.get('/rag/health', (req, res) => {
  res.json({
    success: true,
    message: 'RAG service is healthy',
    timestamp: new Date().toISOString(),
    features: {
      knowledgeRetrieval: true,
      promptAugmentation: true,
      sessionMemory: true,
      learning: true
    }
  });
});

app.post('/rag/evaluate', (req, res) => {
  const { originalQuery, response, usedContext } = req.body;
  
  console.log('RAG evaluate request:', { originalQuery, response, usedContext });
  
  // Analyze feedback to determine quality score
  let score = 0.7; // base score
  let confidence = 'medium';
  let suggestions = [];
  
  if (response.includes('helpful')) {
    score += 0.2;
    confidence = 'high';
  }
  
  if (response.includes('not-helpful')) {
    score -= 0.3;
    confidence = 'low';
    suggestions.push('Improve relevance for this query type');
  }
  
  if (usedContext && usedContext.length > 0) {
    score += 0.1;
    suggestions.push('Good context utilization');
  } else {
    suggestions.push('Consider adding more relevant context');
  }
  
  res.json({
    success: true,
    message: 'RAG response evaluated successfully',
    data: {
      score: Math.max(0, Math.min(1, score)),
      confidence: confidence,
      suggestions: suggestions,
      evaluation: {
        query: originalQuery,
        feedback: response,
        contextUsed: usedContext.length,
        timestamp: new Date().toISOString()
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Mock RAG server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/rag/health`);
});