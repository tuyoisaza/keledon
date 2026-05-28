/**
 * Intent Normalization System
 * Processes raw user input into standardized intents for brain routing
 */

import { Injectable, Logger } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface NormalizedIntent {
  id: string;
  name: string;
  confidence: number;
  entities: Record<string, any>;
  context: Record<string, any>;
  metadata: Record<string, any>;
  originalText: string;
}

export interface IntentPattern {
  id: string;
  patterns: string[];
  priority: number;
  entities?: string[];
  contextRequirements?: Record<string, any>;
  examples?: string[];
}

export interface NormalizationResult {
  normalizedIntents: NormalizedIntent[];
  primaryIntent: NormalizedIntent | null;
  confidenceScore: number;
  processingTimeMs: number;
}

@Injectable()
export class IntentNormalizer {
  private readonly logger = new Logger(IntentNormalizer.name);
  
  // Predefined intent patterns for common use cases
  private readonly INTENT_PATTERNS: IntentPattern[] = [
    {
      id: 'greeting',
      patterns: [
        'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
        'how are you', 'what\'s up', 'sup'
      ],
      priority: 100,
      examples: ['Hello', 'Hi there', 'How are you doing?']
    },
    {
      id: 'farewell',
      patterns: [
        'bye', 'goodbye', 'see you', 'talk later', 'exit', 'quit', 'stop'
      ],
      priority: 95,
      examples: ['Goodbye', 'See you later', 'I need to go']
    },
    {
      id: 'help',
      patterns: [
        'help', 'assist', 'support', 'guide', 'tutorial', 'instructions'
      ],
      priority: 90,
      examples: ['Can you help me?', 'I need assistance', 'How do I...']
    },
    {
      id: 'question',
      patterns: [
        'what', 'how', 'why', 'when', 'where', 'who', 'which', 'is', 'are',
        'do', 'does', 'did', 'can', 'could', 'would', 'should'
      ],
      priority: 85,
      examples: ['What is this?', 'How does it work?', 'Why did this happen?']
    },
    {
      id: 'command',
      patterns: [
        'start', 'begin', 'initiate', 'execute', 'run', 'perform', 'do',
        'create', 'make', 'build', 'generate', 'produce'
      ],
      priority: 80,
      examples: ['Start the process', 'Create a new document', 'Run the script']
    },
    {
      id: 'information_request',
      patterns: [
        'tell me', 'explain', 'describe', 'define', 'what is', 'who is',
        'where is', 'when is', 'how to', 'steps to'
      ],
      priority: 75,
      examples: ['Tell me about this', 'Explain how it works', 'What is the process?']
    },
    {
      id: 'confirmation',
      patterns: [
        'yes', 'sure', 'okay', 'ok', 'affirmative', 'correct', 'right',
        'agree', 'accept', 'confirm'
      ],
      priority: 70,
      examples: ['Yes', 'Okay', 'That sounds good', 'I agree']
    },
    {
      id: 'denial',
      patterns: [
        'no', 'not', 'never', 'reject', 'decline', 'cancel', 'stop',
        'wrong', 'incorrect', 'false'
      ],
      priority: 65,
      examples: ['No', 'Not really', 'I don\'t think so', 'That\'s incorrect']
    },
    {
      id: 'clarification',
      patterns: [
        'what do you mean', 'can you clarify', 'explain again', 'repeat',
        'I don\'t understand', 'could you rephrase'
      ],
      priority: 60,
      examples: ['What do you mean?', 'Can you explain that again?', 'I don\'t get it']
    },
    {
      id: 'feedback',
      patterns: [
        'good', 'great', 'excellent', 'bad', 'poor', 'terrible', 'awesome',
        'nice', 'cool', 'fantastic', 'awful', 'horrible'
      ],
      priority: 55,
      examples: ['This is great!', 'That was terrible', 'It\'s okay']
    }
  ];

  constructor() {
    this.logger.log('IntentNormalizer initialized');
  }

  /**
   * Normalize raw user input into structured intents
   */
  normalize(text: string): Observable<NormalizationResult> {
    const startTime = Date.now();
    
    try {
      // Preprocess text
      const processedText = this.preprocessText(text);
      
      // Extract intents
      const intents = this.extractIntents(processedText);
      
      // Select primary intent
      const primaryIntent = this.selectPrimaryIntent(intents);
      
      // Calculate confidence score
      const confidenceScore = this.calculateConfidence(intents, primaryIntent);
      
      const result: NormalizationResult = {
        normalizedIntents: intents,
        primaryIntent,
        confidenceScore,
        processingTimeMs: Date.now() - startTime
      };

      this.logger.debug(`Normalized: "${text}" → ${primaryIntent?.name || 'none'} (${confidenceScore.toFixed(2)})`);
      
      return of(result);
    } catch (error) {
      this.logger.error('Intent normalization failed', error);
      return of({
        normalizedIntents: [],
        primaryIntent: null,
        confidenceScore: 0,
        processingTimeMs: Date.now() - startTime
      });
    }
  }

  /**
   * Preprocess raw text for normalization
   */
  private preprocessText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    // Convert to lowercase
    let processed = text.toLowerCase();
    
    // Remove extra whitespace
    processed = processed.replace(/\s+/g, ' ').trim();
    
    // Remove punctuation (except for essential ones like apostrophes)
    processed = processed.replace(/[^\w\s']/g, '');
    
    // Expand common contractions
    processed = processed.replace(/'m/g, ' am')
                        .replace(/'re/g, ' are')
                        .replace(/'s/g, ' is')
                        .replace(/'ve/g, ' have')
                        .replace(/'ll/g, ' will')
                        .replace(/n't/g, ' not');
    
    // Remove common filler words
    const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'actually'];
    fillerWords.forEach(word => {
      processed = processed.replace(new RegExp(`\\b${word}\\b`, 'g'), '');
    });

    return processed.trim();
  }

  /**
   * Extract intents from processed text
   */
  private extractIntents(text: string): NormalizedIntent[] {
    if (!text) return [];
    
    const intents: NormalizedIntent[] = [];
    
    // Check each pattern against the text
    for (const pattern of this.INTENT_PATTERNS) {
      const matches = this.matchPattern(text, pattern);
      if (matches.confidence > 0.1) { // Minimum confidence threshold
        const intent: NormalizedIntent = {
          id: pattern.id,
          name: pattern.id,
          confidence: matches.confidence,
          entities: this.extractEntities(text, pattern),
          context: {},
          metadata: {
            matchedPatterns: matches.matchedPatterns,
            patternPriority: pattern.priority
          },
          originalText: text
        };
        
        intents.push(intent);
      }
    }

    // Sort by confidence and priority
    intents.sort((a, b) => {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      return a.metadata.patternPriority - b.metadata.patternPriority;
    });

    return intents;
  }

  /**
   * Match text against a pattern
   */
  private matchPattern(text: string, pattern: IntentPattern): { confidence: number; matchedPatterns: string[] } {
    const matchedPatterns: string[] = [];
    let totalConfidence = 0;
    
    for (const patternStr of pattern.patterns) {
      // Exact match
      if (text === patternStr) {
        matchedPatterns.push(patternStr);
        totalConfidence += 0.9;
        continue;
      }
      
      // Substring match
      if (text.includes(patternStr)) {
        matchedPatterns.push(patternStr);
        totalConfidence += 0.6;
        continue;
      }
      
      // Word match (individual words in pattern)
      const patternWords = patternStr.split(' ');
      const textWords = text.split(' ');
      
      let wordMatches = 0;
      for (const patternWord of patternWords) {
        if (textWords.includes(patternWord)) {
          wordMatches++;
        }
      }
      
      if (wordMatches > 0) {
        const wordConfidence = wordMatches / patternWords.length * 0.4;
        matchedPatterns.push(patternStr);
        totalConfidence += wordConfidence;
      }
    }
    
    // Normalize confidence to 0-1 range
    const maxPossible = pattern.patterns.length * 0.9;
    const confidence = Math.min(1.0, totalConfidence / maxPossible);
    
    return { confidence, matchedPatterns };
  }

  /**
   * Extract entities from text based on pattern
   */
  private extractEntities(text: string, pattern: IntentPattern): Record<string, any> {
    const entities: Record<string, any> = {};
    
    // Simple entity extraction based on common patterns
    if (pattern.id === 'question') {
      // Extract question type
      const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which'];
      for (const word of questionWords) {
        if (text.includes(word)) {
          entities.questionType = word;
          break;
        }
      }
    }
    
    if (pattern.id === 'command') {
      // Extract action verb
      const actionVerbs = ['start', 'begin', 'create', 'make', 'build', 'generate', 'run', 'execute'];
      for (const verb of actionVerbs) {
        if (text.includes(verb)) {
          entities.action = verb;
          break;
        }
      }
    }
    
    // Extract numbers
    const numbers = text.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      entities.numbers = numbers.map(n => parseInt(n));
    }
    
    // Extract dates (simple pattern)
    const datePattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}\b/i;
    const dateMatch = text.match(datePattern);
    if (dateMatch) {
      entities.date = dateMatch[0];
    }
    
    return entities;
  }

  /**
   * Select primary intent from list of candidates
   */
  private selectPrimaryIntent(intents: NormalizedIntent[]): NormalizedIntent | null {
    if (intents.length === 0) {
      return null;
    }
    
    // Return highest confidence intent
    return intents[0];
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(intents: NormalizedIntent[], primaryIntent: NormalizedIntent | null): number {
    if (!primaryIntent) {
      return 0.1; // Low confidence for no intent
    }
    
    // Base confidence on primary intent confidence
    let confidence = primaryIntent.confidence;
    
    // Adjust based on number of competing intents
    if (intents.length > 1) {
      const secondBest = intents[1];
      const confidenceGap = primaryIntent.confidence - secondBest.confidence;
      confidence *= (1 - Math.max(0, 0.5 - confidenceGap));
    }
    
    // Ensure minimum confidence
    return Math.max(0.1, confidence);
  }

  /**
   * Get intent pattern by ID
   */
  getIntentPattern(id: string): IntentPattern | undefined {
    return this.INTENT_PATTERNS.find(pattern => pattern.id === id);
  }

  /**
   * Add custom intent pattern
   */
  addIntentPattern(pattern: Omit<IntentPattern, 'id'> & { id?: string }): IntentPattern {
    const id = pattern.id || `custom-${Date.now()}`;
    const newPattern: IntentPattern = {
      id,
      ...pattern,
      priority: pattern.priority ?? 50
    };
    
    this.INTENT_PATTERNS.push(newPattern);
    this.logger.log(`Added custom intent pattern: ${id}`);
    
    return newPattern;
  }

  /**
   * Remove intent pattern by ID
   */
  removeIntentPattern(id: string): boolean {
    const index = this.INTENT_PATTERNS.findIndex(pattern => pattern.id === id);
    if (index !== -1) {
      this.INTENT_PATTERNS.splice(index, 1);
      this.logger.log(`Removed intent pattern: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Get all intent patterns
   */
  getAllIntentPatterns(): IntentPattern[] {
    return [...this.INTENT_PATTERNS];
  }

  /**
   * Validate intent normalization
   */
  validate(): boolean {
    try {
      // Check for duplicate IDs
      const ids = this.INTENT_PATTERNS.map(p => p.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        throw new Error('Duplicate intent pattern IDs found');
      }
      
      return true;
    } catch (error) {
      this.logger.error('Intent pattern validation failed', error);
      return false;
    }
  }
}

// Export singleton instance
export const intentNormalizer = new IntentNormalizer();
export const defaultIntentNormalizer = intentNormalizer;