import { Controller, Post, Body, Get } from '@nestjs/common';
import { ConversationOrchestratorService } from '../orchestration/conversation-orchestrator.service';
import { MultimodalProcessorService } from '../multimodal/multimodal-processor.service';
import { IntelligentRPAService } from '../automation/intelligent-rpa.service';
import { EnhancedSTTService } from '../../stt/enhanced-local-stt.service';
import {
  OrchestrationOptions,
  OrchestrationResult
} from '../types/orchestration.types';

@Controller('api/ai/orchestrate')
export class OrchestrationController {
  constructor(
    private readonly conversationOrchestratorService: ConversationOrchestratorService,
    private readonly multimodalProcessorService: MultimodalProcessorService,
    private readonly intelligentRPAService: IntelligentRPAService,
    private readonly enhancedSTTService: EnhancedSTTService
  ) {}

  @Post()
  async orchestrateConversation(@Body() options: OrchestrationOptions) {
    try {
      console.log('[Orchestration Controller] Starting conversation orchestration:', {
        sessionId: options.sessionId,
        agents: options.agents,
        taskComplexity: options.taskComplexity,
        coordinationMode: options.coordinationMode
      });

      if (!options.sessionId) {
        throw new Error('Session ID is required for orchestration');
      }

      const result = await this.conversationOrchestratorService.orchestrateConversation(options);
      
      return {
        success: true,
        message: 'Conversation orchestrated successfully',
        data: result
      };
    } catch (error) {
      console.error('[Orchestration Controller] Error in orchestration:', error);
      return {
        success: false,
        error: error.message,
        message: `Conversation orchestration failed: ${error.message}`
      };
    }
  }

  @Get('context/:sessionId')
  async getOrchestrationContext(@Param('sessionId') sessionId: string) {
    try {
      const context = await this.conversationOrchestratorService.getSessionContext(sessionId);
      
      return {
        success: true,
        message: 'Orchestration context retrieved successfully',
        data: context
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to get orchestration context: ${error.message}`
      };
    }
  }

  @Post('/context/:sessionId')
  async updateOrchestrationContext(
    @Param('sessionId') sessionId: string,
    @Body() body: { pattern: any }
  ) {
    try {
      await this.conversationOrchestratorService.updateSessionContext(sessionId, body.pattern);
      
      return {
        success: true,
        message: 'Orchestration context updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to update orchestration context: ${error.message}`
      };
    }
  }

  @Post('/intent')
  async recognizeIntent(@Body() body: { userInput: string; sessionId: string; context?: any }) {
    try {
      console.log('[Orchestration Controller] Recognizing intent for:', {
        userInput: body.userInput,
        sessionId: body.sessionId
      });

      const intent = await this.conversationOrchestratorService.recognizeIntent(body.userInput, body.sessionId, body.context);
      
      return {
        success: true,
        message: 'Intent recognized successfully',
        data: intent
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Intent recognition failed: ${error.message}`
      };
    }
  }

  @Post('/knowledge/retrieve')
  async retrieveKnowledge(@Body() body: { query: string; sessionId: string; maxResults?: number }) {
    try {
      console.log('[Orchestration Controller] Retrieving knowledge for:', {
        query: body.query,
        sessionId: body.sessionId,
        maxResults: body.maxResults
      });

      const result = await this.conversationOrchestratorService.retrieveKnowledge(body.query, {
        sessionId: body.sessionId,
        companyId: body.companyId,
        categories: body.categories,
        maxResults: body.maxResults,
        minScore: body.minScore
      });
      
      return {
        success: true,
        message: 'Knowledge retrieved successfully',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Knowledge retrieval failed: ${error.message}`
      };
    }
  }

  @Post('/evaluate/response')
  async evaluateResponse(
    @Body() body: { 
      sessionId: string; 
      originalQuery: string; 
      response: string; 
      usedContext?: any[] 
    }
  ) {
    try {
      console.log('[Orchestration Controller] Evaluating response for session:', body.sessionId);

      const evaluation = await this.conversationOrchestratorService.evaluateResponse(
        body.sessionId,
        body.originalQuery,
        body.response,
        body.usedContext
      );
      
      return {
        success: true,
        message: 'Response evaluated successfully',
        data: evaluation
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Response evaluation failed: ${error.message}`
      };
    }
  }

  @Get('/gaps/:sessionId')
  async getKnowledgeGaps(@Param('sessionId') sessionId: string) {
    try {
      const gaps = await this.conversationOrchestatorService.getKnowledgeGaps(sessionId);
      
      return {
        success: true,
        message: 'Knowledge gaps retrieved successfully',
        data: gaps
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to get knowledge gaps: ${error.message}`
      };
    }
  }

  @Get('/suggestions/:sessionId')
  async getQuerySuggestions(@Param('sessionId') sessionId: string) {
    try {
      const suggestions = await this.conversationOrchestratorService.getQuerySuggestions(sessionId);
      
      return {
        success: true,
        message: 'Query suggestions retrieved successfully',
        data: suggestions
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        service: 'orchestration',
        message: `Failed to get query suggestions: ${error.message}`
      };
    }
  }
}