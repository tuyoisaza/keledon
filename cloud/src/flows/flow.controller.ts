import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { FlowService } from './flow.service';

@Controller('api/flows')
export class FlowController {
  constructor(private readonly flowService: FlowService) {}

  @Post()
  async create(@Body() data: any) {
    return this.flowService.create(data);
  }

  @Get()
  async findAll(
    @Query('teamId') teamId?: string,
    @Query('category') category?: string,
  ) {
    return this.flowService.findAll(teamId, category);
  }

  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('teamId') teamId?: string,
    @Query('limit') limit?: number,
  ) {
    if (!query) {
      return [];
    }
    return this.flowService.searchFlows(query, teamId, limit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.flowService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.flowService.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.flowService.remove(id);
    return { success: true };
  }

  @Get(':id/steps')
  async getSteps(@Param('id') id: string) {
    return this.flowService.getSteps(id);
  }

  @Post(':id/steps')
  async createStep(@Param('id') id: string, @Body() data: any) {
    return this.flowService.createStep(id, data);
  }

  @Put('steps/:stepId')
  async updateStep(@Param('stepId') stepId: string, @Body() data: any) {
    return this.flowService.updateStep(stepId, data);
  }

  @Delete('steps/:stepId')
  async deleteStep(@Param('stepId') stepId: string) {
    await this.flowService.deleteStep(stepId);
    return { success: true };
  }

  @Put(':id/steps/reorder')
  async reorderSteps(@Param('id') id: string, @Body() body: { stepIds: string[] }) {
    await this.flowService.reorderSteps(id, body.stepIds);
    return { success: true };
  }

  @Get('trigger/:keyword')
  async findByTrigger(
    @Param('keyword') keyword: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.flowService.findByTrigger(keyword, teamId);
  }
}
