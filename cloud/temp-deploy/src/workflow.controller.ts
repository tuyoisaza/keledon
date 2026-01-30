import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { WorkflowStorage } from './workflow.storage';
import { RpaFactory } from './rpa.factory';
import {
    ManagedInterface,
    Workflow,
    WorkflowStep,
    FlowDefinition,
    FlowVersion,
    TenantFlowPermission,
    IntentFlowMapping
} from './interfaces/workflow.interface';

@Controller('api')
export class WorkflowController {
    constructor(
        private readonly storage: WorkflowStorage,
        private readonly rpaFactory: RpaFactory,
    ) { }

    // ========== RPA PROVIDERS ==========

    @Get('rpa-providers')
    getRpaProviders() {
        return this.rpaFactory.getAvailableProviders();
    }

    // ========== INTERFACES ==========

    @Get('interfaces')
    getInterfaces() {
        return this.storage.getAllInterfaces();
    }

    @Get('interfaces/:id')
    getInterface(@Param('id') id: string) {
        return this.storage.getInterface(id);
    }

    @Post('interfaces')
    async createInterface(@Body() data: Omit<ManagedInterface, 'id' | 'createdAt' | 'updatedAt'>) {
        return this.storage.createInterface(data);
    }

    @Put('interfaces/:id')
    async updateInterface(@Param('id') id: string, @Body() data: Partial<ManagedInterface>) {
        return this.storage.updateInterface(id, data);
    }

    @Delete('interfaces/:id')
    async deleteInterface(@Param('id') id: string) {
        const success = await this.storage.deleteInterface(id);
        return { success };
    }

    // ========== WORKFLOWS ==========

    @Get('workflows')
    getWorkflows() {
        return this.storage.getAllWorkflows();
    }

    @Get('workflows/:id')
    getWorkflow(@Param('id') id: string) {
        return this.storage.getWorkflow(id);
    }

    @Get('interfaces/:interfaceId/workflows')
    getWorkflowsByInterface(@Param('interfaceId') interfaceId: string) {
        return this.storage.getWorkflowsByInterface(interfaceId);
    }

    @Post('workflows')
    async createWorkflow(@Body() data: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>) {
        return this.storage.createWorkflow(data);
    }

    @Put('workflows/:id')
    async updateWorkflow(@Param('id') id: string, @Body() data: Partial<Workflow>) {
        return this.storage.updateWorkflow(id, data);
    }

    @Delete('workflows/:id')
    async deleteWorkflow(@Param('id') id: string) {
        const success = await this.storage.deleteWorkflow(id);
        return { success };
    }

    // ========== FLOW DEFINITIONS ==========

    @Get('flow-definitions')
    getFlowDefinitions() {
        return this.storage.getAllFlowDefinitions();
    }

    @Get('flow-definitions/:id')
    getFlowDefinition(@Param('id') id: string) {
        return this.storage.getFlowDefinition(id);
    }

    @Post('flow-definitions')
    async createFlowDefinition(@Body() data: Omit<FlowDefinition, 'id' | 'createdAt' | 'updatedAt'>) {
        return this.storage.createFlowDefinition(data);
    }

    @Put('flow-definitions/:id')
    async updateFlowDefinition(@Param('id') id: string, @Body() data: Partial<FlowDefinition>) {
        return this.storage.updateFlowDefinition(id, data);
    }

    @Delete('flow-definitions/:id')
    async deleteFlowDefinition(@Param('id') id: string) {
        const success = await this.storage.deleteFlowDefinition(id);
        return { success };
    }

    // ========== FLOW VERSIONS ==========

    @Get('flow-versions')
    getFlowVersions() {
        return this.storage.getAllFlowVersions();
    }

    @Get('flow-versions/:id')
    getFlowVersion(@Param('id') id: string) {
        return this.storage.getFlowVersion(id);
    }

    @Get('flow-definitions/:definitionId/versions')
    getFlowVersionsByDefinition(@Param('definitionId') definitionId: string) {
        return this.storage.getFlowVersionsByDefinition(definitionId);
    }

    @Post('flow-versions')
    async createFlowVersion(@Body() data: Omit<FlowVersion, 'id' | 'createdAt' | 'updatedAt'>) {
        return this.storage.createFlowVersion(data);
    }

    @Put('flow-versions/:id')
    async updateFlowVersion(@Param('id') id: string, @Body() data: Partial<FlowVersion>) {
        return this.storage.updateFlowVersion(id, data);
    }

    @Delete('flow-versions/:id')
    async deleteFlowVersion(@Param('id') id: string) {
        const success = await this.storage.deleteFlowVersion(id);
        return { success };
    }

    // ========== TENANT FLOW PERMISSIONS ==========

    @Get('tenant-flow-permissions/:companyId')
    getTenantFlowPermissions(@Param('companyId') companyId: string) {
        return this.storage.getTenantFlowPermissions(companyId);
    }

    @Post('tenant-flow-permissions')
    async upsertTenantFlowPermissions(@Body() data: Omit<TenantFlowPermission, 'id' | 'createdAt' | 'updatedAt'>[]) {
        return this.storage.upsertTenantFlowPermissions(data);
    }

    // ========== INTENT FLOW MAPPINGS ==========

    @Get('intent-flow-mappings/:companyId')
    getIntentFlowMappings(@Param('companyId') companyId: string) {
        return this.storage.getIntentFlowMappings(companyId);
    }

    @Post('intent-flow-mappings')
    async upsertIntentFlowMapping(@Body() data: Omit<IntentFlowMapping, 'id' | 'createdAt' | 'updatedAt'>) {
        return this.storage.upsertIntentFlowMapping(data);
    }

    // ========== WORKFLOW STEPS ==========

    @Post('workflows/:id/steps')
    async addStep(@Param('id') id: string, @Body() body: { step: WorkflowStep; insertIndex?: number }) {
        return this.storage.addStepToWorkflow(id, body.step, body.insertIndex);
    }

    @Delete('workflows/:workflowId/steps/:stepId')
    async removeStep(@Param('workflowId') workflowId: string, @Param('stepId') stepId: string) {
        return this.storage.removeStepFromWorkflow(workflowId, stepId);
    }
}
