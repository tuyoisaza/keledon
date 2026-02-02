import { Controller, Get, Post, Query, Body, HttpException, HttpStatus, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RBACRecommendationService, RBACAnalysis, RBACAnalysisFilter } from './rbac-recommendation.service';

@ApiTags('RBAC Analysis')
@Controller('rbac-analysis')
export class RBACAnalysisController {
  constructor(private readonly rbacRecommendationService: RBACRecommendationService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Perform comprehensive RBAC analysis' })
  @ApiResponse({ status: 200, description: 'RBAC analysis completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async performAnalysis(
    @Body() request?: any
  ): Promise<{
    success: boolean;
    data: RBACAnalysis;
    message: string;
  }> {
    try {
      console.log('RBACAnalysisController: Starting comprehensive RBAC analysis', {
        timestamp: new Date().toISOString(),
        options: request
      });

      const analysis = await this.rbacRecommendationService.performFullAnalysis(request);

      return {
        success: true,
        data: analysis,
        message: `RBAC analysis completed with ${analysis.gaps.length} gaps and ${analysis.recommendations.length} recommendations`
      };
    } catch (error) {
      console.error('RBACAnalysisController: Error performing analysis', error);
      throw new HttpException('Failed to perform RBAC analysis', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('analyses')
  @ApiOperation({ summary: 'Get RBAC analysis history' })
  @ApiResponse({ status: 200, description: 'Analysis history retrieved successfully' })
  async getAnalysesHistory(
    @Query('limit') limit?: number,
    @Query('sort') sort?: 'date' | 'score' | 'risk',
    @Query('order') order?: 'asc' | 'desc'
  ): Promise<{
    success: boolean;
    data: {
      analyses: RBACAnalysis[];
      total: number;
      summary: {
        avgScore: number;
        avgRisk: string;
        totalGaps: number;
        totalRecommendations: number;
      };
    };
  }> {
    try {
      const analyses = await this.rbacRecommendationService.getAnalysisHistory();
      
      const totalGaps = analyses.reduce((sum, analysis) => sum + analysis.gaps.length, 0);
      const totalRecommendations = analyses.reduce((sum, analysis) => sum + analysis.recommendations.length, 0);
      const avgScore = analyses.length > 0 ? analyses.reduce((sum, analysis) => sum + analysis.maturityScore, 0) / analyses.length : 0;
      
      // Calculate average risk level
      const riskLevels = analyses.map(a => a.riskAssessment.overallRisk);
      const avgRisk = riskLevels.length > 0 ? 
        riskLevels[Math.floor(riskLevels.length / 2)] || 'medium' : 'medium';

      return {
        success: true,
        data: {
          analyses,
          total: analyses.length,
          summary: {
            avgScore: Math.round(avgScore),
            avgRisk,
            totalGaps,
            totalRecommendations
          }
        }
      };
    } catch (error) {
      console.error('RBACAnalysisController: Error getting analysis history', error);
      throw new HttpException('Failed to get analysis history', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('analyses/:id')
  @ApiOperation({ summary: 'Get specific RBAC analysis by ID' })
  @ApiResponse({ status: 200, description: 'Analysis retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Analysis not found' })
  async getAnalysisById(@Param('id') id: string): Promise<{
    success: boolean;
    data: RBACAnalysis | null;
  }> {
    try {
      const analysis = await this.rbacRecommendationService.getAnalysisById(id);
      return {
        success: true,
        data: analysis
      };
    } catch (error) {
      console.error('RBACAnalysisController: Error getting analysis by ID', error);
      throw new HttpException('Failed to get analysis', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('gaps')
  @ApiOperation({ summary: 'Get RBAC analysis gaps' })
  @ApiResponse({ status: 200, description: 'Gaps retrieved successfully' })
  async getAnalysisGaps(
    @Query() filters?: RBACAnalysisFilter
  ): Promise<{
    success: boolean;
    data: any[];
    filters: RBACAnalysisFilter;
    total: number;
    severity: Record<string, number>;
    categories: Record<string, number>;
  }> {
    try {
      const gaps = await this.rbacRecommendationService.getAnalysisGaps(filters);
      
      const severity = gaps.reduce((acc, gap) => {
        acc[gap.severity] = (acc[gap.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const categories = gaps.reduce((acc, gap) => {
        acc[gap.category] = (acc[gap.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        success: true,
        data: gaps,
        filters: filters || {},
        total: gaps.length,
        severity,
        categories
      };
    } catch (error) {
      console.error('RBACAnalysisController: Error getting analysis gaps', error);
      throw new HttpException('Failed to get analysis gaps', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get RBAC analysis recommendations' })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved successfully' })
  async getAnalysisRecommendations(
    @Query() filters?: RBACAnalysisFilter
  ): Promise<{
    success: boolean;
    data: any[];
    filters: RBACAnalysisFilter;
    total: number;
    priorities: Record<string, number>;
    categories: Record<string, number>;
  }> {
    try {
      const recommendations = await this.rbacRecommendationService.getRecommendations(filters);
      
      const priorities = recommendations.reduce((acc, rec) => {
        acc[rec.priority] = (acc[rec.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const categories = recommendations.reduce((acc, rec) => {
        acc[rec.category] = (acc[rec.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        success: true,
        data: recommendations,
        filters: filters || {},
        total: recommendations.length,
        priorities,
        categories
      };
    } catch (error) {
      console.error('RBACAnalysisController: Error getting analysis recommendations', error);
      throw new HttpException('Failed to get analysis recommendations', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('implementation-plan')
  @ApiOperation({ summary: 'Get RBAC implementation plan' })
  @ApiResponse({ status: 200, description: 'Implementation plan retrieved successfully' })
  async getImplementationPlan(): Promise<{
    success: boolean;
    data: any;
  }> {
    try {
      const plan = await this.rbacRecommendationService.getImplementationPlan();
      return {
        success: true,
        data: plan
      };
    } catch (error) {
      console.error('RBACAnalysisController: Error getting implementation plan', error);
      throw new HttpException('Failed to get implementation plan', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('report/:analysisId')
  @ApiOperation({ summary: 'Generate RBAC analysis report' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  @ApiResponse({ status: 404, description: 'Analysis not found' })
  async generateReport(@Param('analysisId') analysisId: string): Promise<{
    success: boolean;
    data: {
      reportId: string;
      format: string;
      size: number;
      generatedAt: string;
    };
  }> {
    try {
      const reportBuffer = await this.rbacRecommendationService.generateReport(analysisId);
      
      return {
        success: true,
        data: {
          reportId: `report-${analysisId}`,
          format: 'txt',
          size: reportBuffer.length,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('RBACAnalysisController: Error generating report', error);
      throw new HttpException('Failed to generate report', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get RBAC dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboardData(): Promise<{
    success: boolean;
    data: any;
  }> {
    try {
      const dashboardData = await this.rbacRecommendationService.getDashboardData();
      return {
        success: true,
        data: dashboardData
      };
    } catch (error) {
      console.error('RBACAnalysisController: Error getting dashboard data', error);
      throw new HttpException('Failed to get dashboard data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get AI-powered RBAC insights' })
  @ApiResponse({ status: 200, description: 'AI insights retrieved successfully' })
  async getAIInsights(): Promise<{
    success: boolean;
    data: any;
  }> {
    try {
      const insights = await this.rbacRecommendationService.generateAIInsights();
      return {
        success: true,
        data: insights
      };
    } catch (error) {
      console.error('RBACAnalysisController: Error generating AI insights', error);
      throw new HttpException('Failed to generate AI insights', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}