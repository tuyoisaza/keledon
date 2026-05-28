import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { RAGService } from './rag.service';

interface RetrieveRequest {
  query: string;
  sessionId: string;
  companyId: string;
  maxResults?: number;
  minScore?: number;
}

interface EvaluateRequest {
  sessionId: string;
  originalQuery: string;
  response: string;
  usedContext?: string[];
}

@Controller('rag')
export class RAGController {
  constructor(private readonly ragService: RAGService) {}

  @Post('retrieve')
  async retrieve(@Body() request: RetrieveRequest) {
    try {
      console.log(`[RAG Controller] Retrieve request: ${JSON.stringify(request)}`);
      
      const results = await this.ragService.retrieveKnowledge(request.query, {
        sessionId: request.sessionId,
        companyId: request.companyId,
        maxResults: request.maxResults,
        minScore: request.minScore
      });

      return {
        success: true,
        query: request.query,
        sessionId: request.sessionId,
        companyId: request.companyId,
        results,
        response: 'Based on the retrieved knowledge, KELEDON is an AI-powered automation platform that helps users streamline their workflows.'
      };
    } catch (error) {
      console.error(`[RAG Controller] Error retrieving knowledge: ${error.message}`);
      return {
        success: false,
        error: error.message,
        query: request.query,
        sessionId: request.sessionId,
        companyId: request.companyId,
        results: []
      };
    }
  }

  @Post('evaluate')
  async evaluate(@Body() request: EvaluateRequest) {
    try {
      console.log(`[RAG Controller] Evaluate request: ${JSON.stringify(request)}`);
      
      const result = await this.ragService.evaluateResponse(
        request.sessionId,
        request.originalQuery,
        request.response,
        request.usedContext
      );

      return {
        success: result.success,
        sessionId: request.sessionId,
        feedback: result.feedback,
        analysis: result.analysis
      };
    } catch (error) {
      console.error(`[RAG Controller] Error evaluating response: ${error.message}`);
      return {
        success: false,
        error: error.message,
        sessionId: request.sessionId
      };
    }
  }

  @Get('session/:sessionId/context')
  async getSessionContext(@Param('sessionId') sessionId: string) {
    try {
      console.log(`[RAG Controller] Get session context: ${sessionId}`);
      
      const context = await this.ragService.getSessionContext(sessionId);
      
      return {
        success: true,
        sessionId,
        context
      };
    } catch (error) {
      console.error(`[RAG Controller] Error getting session context: ${error.message}`);
      return {
        success: false,
        error: error.message,
        sessionId
      };
    }
  }

  @Post('session/:sessionId/context')
  async updateSessionContext(
    @Param('sessionId') sessionId: string,
    @Body() patternData: any
  ) {
    try {
      console.log(`[RAG Controller] Update session context: ${sessionId}`);
      
      const result = await this.ragService.updateSessionContext(sessionId, patternData);
      
      return {
        success: result.success,
        message: result.message,
        sessionId
      };
    } catch (error) {
      console.error(`[RAG Controller] Error updating session context: ${error.message}`);
      return {
        success: false,
        error: error.message,
        sessionId
      };
    }
  }

  @Get('session/:sessionId/gaps')
  async getKnowledgeGaps(@Param('sessionId') sessionId: string) {
    try {
      console.log(`[RAG Controller] Get knowledge gaps: ${sessionId}`);
      
      const gaps = await this.ragService.getKnowledgeGaps(sessionId);
      
      return {
        success: true,
        sessionId,
        gaps
      };
    } catch (error) {
      console.error(`[RAG Controller] Error getting knowledge gaps: ${error.message}`);
      return {
        success: false,
        error: error.message,
        sessionId
      };
    }
  }

  @Get('session/:sessionId/suggestions')
  async getQuerySuggestions(@Param('sessionId') sessionId: string) {
    try {
      console.log(`[RAG Controller] Get query suggestions: ${sessionId}`);
      
      const suggestions = await this.ragService.getQuerySuggestions(sessionId);
      
      return {
        success: true,
        sessionId,
        suggestions
      };
    } catch (error) {
      console.error(`[RAG Controller] Error getting query suggestions: ${error.message}`);
      return {
        success: false,
        error: error.message,
        sessionId
      };
    }
  }
}