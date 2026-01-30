import { Injectable, OnModuleInit } from '@nestjs/common';
import {
    ManagedInterface,
    Workflow,
    FlowDefinition,
    FlowVersion,
    TenantFlowPermission,
    IntentFlowMapping,
    FlowRun,
    FlowRunEvidence
} from './interfaces/workflow.interface';
import { SupabaseService } from './supabase/supabase.service';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const INTERFACES_FILE = path.join(DATA_DIR, 'interfaces.json');
const WORKFLOWS_FILE = path.join(DATA_DIR, 'workflows.json');
const FLOW_DEFINITIONS_FILE = path.join(DATA_DIR, 'flow-definitions.json');
const FLOW_VERSIONS_FILE = path.join(DATA_DIR, 'flow-versions.json');
const TENANT_FLOW_PERMISSIONS_FILE = path.join(DATA_DIR, 'tenant-flow-permissions.json');
const INTENT_FLOW_MAPPINGS_FILE = path.join(DATA_DIR, 'intent-flow-mappings.json');
const FLOW_RUNS_FILE = path.join(DATA_DIR, 'flow-runs.json');
const FLOW_RUN_EVIDENCE_FILE = path.join(DATA_DIR, 'flow-run-evidence.json');

@Injectable()
export class WorkflowStorage implements OnModuleInit {
    private interfaces: Map<string, ManagedInterface> = new Map();
    private workflows: Map<string, Workflow> = new Map();
    private flowDefinitions: Map<string, FlowDefinition> = new Map();
    private flowVersions: Map<string, FlowVersion> = new Map();
    private tenantFlowPermissions: Map<string, TenantFlowPermission> = new Map();
    private intentFlowMappings: Map<string, IntentFlowMapping> = new Map();
    private flowRuns: Map<string, FlowRun> = new Map();
    private flowRunEvidence: Map<string, FlowRunEvidence> = new Map();
    private useSupabase = false;

    constructor(private readonly supabaseService: SupabaseService) { }

    async onModuleInit() {
        // Check if Supabase is configured
        try {
            this.supabaseService.getClient();
            this.useSupabase = true;
            console.log('📦 Using Supabase for data storage');
            await this.loadFromSupabase();
        } catch (e) {
            console.log('📁 Supabase not configured, using JSON file storage');
            this.ensureDataDir();
            this.loadFromFiles();
        }
    }

    // ========== DATA LOADING ==========

    private async loadFromSupabase() {
        try {
            // Load interfaces
            const interfaces = await this.supabaseService.getAllInterfaces();
            interfaces.forEach((iface: any) => {
                this.interfaces.set(iface.id, this.mapDbToInterface(iface));
            });
            console.log(`Loaded ${this.interfaces.size} interfaces from Supabase`);

            // Load workflows
            const workflows = await this.supabaseService.getAllWorkflows();
            workflows.forEach((wf: any) => {
                this.workflows.set(wf.id, this.mapDbToWorkflow(wf));
            });
            console.log(`Loaded ${this.workflows.size} workflows from Supabase`);

            const flowDefinitions = await this.supabaseService.getAllFlowDefinitions();
            flowDefinitions.forEach((def: any) => {
                this.flowDefinitions.set(def.id, this.mapDbToFlowDefinition(def));
            });
            console.log(`Loaded ${this.flowDefinitions.size} flow definitions from Supabase`);

            const flowVersions = await this.supabaseService.getAllFlowVersions();
            flowVersions.forEach((version: any) => {
                this.flowVersions.set(version.id, this.mapDbToFlowVersion(version));
            });
            console.log(`Loaded ${this.flowVersions.size} flow versions from Supabase`);

            const tenantPermissions = await this.supabaseService.getAllTenantFlowPermissions();
            tenantPermissions.forEach((perm: any) => {
                this.tenantFlowPermissions.set(perm.id, this.mapDbToTenantFlowPermission(perm));
            });

            const intentMappings = await this.supabaseService.getAllIntentFlowMappings();
            intentMappings.forEach((mapping: any) => {
                this.intentFlowMappings.set(mapping.id, this.mapDbToIntentFlowMapping(mapping));
            });
        } catch (error) {
            console.error('Failed to load from Supabase:', error);
            // Fallback to files
            this.useSupabase = false;
            this.ensureDataDir();
            this.loadFromFiles();
        }
    }

    private ensureDataDir() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
    }

    private loadFromFiles() {
        // Load Interfaces
        if (fs.existsSync(INTERFACES_FILE)) {
            const data = JSON.parse(fs.readFileSync(INTERFACES_FILE, 'utf-8'));
            data.forEach((iface: ManagedInterface) => this.interfaces.set(iface.id, iface));
            console.log(`Loaded ${this.interfaces.size} interfaces from file`);
        }

        // Load Workflows
        if (fs.existsSync(WORKFLOWS_FILE)) {
            const data = JSON.parse(fs.readFileSync(WORKFLOWS_FILE, 'utf-8'));
            data.forEach((wf: Workflow) => this.workflows.set(wf.id, wf));
            console.log(`Loaded ${this.workflows.size} workflows from file`);
        }

        if (fs.existsSync(FLOW_DEFINITIONS_FILE)) {
            const data = JSON.parse(fs.readFileSync(FLOW_DEFINITIONS_FILE, 'utf-8'));
            data.forEach((def: FlowDefinition) => this.flowDefinitions.set(def.id, def));
            console.log(`Loaded ${this.flowDefinitions.size} flow definitions from file`);
        }

        if (fs.existsSync(FLOW_VERSIONS_FILE)) {
            const data = JSON.parse(fs.readFileSync(FLOW_VERSIONS_FILE, 'utf-8'));
            data.forEach((version: FlowVersion) => this.flowVersions.set(version.id, version));
            console.log(`Loaded ${this.flowVersions.size} flow versions from file`);
        }

        if (fs.existsSync(TENANT_FLOW_PERMISSIONS_FILE)) {
            const data = JSON.parse(fs.readFileSync(TENANT_FLOW_PERMISSIONS_FILE, 'utf-8'));
            data.forEach((perm: TenantFlowPermission) => this.tenantFlowPermissions.set(perm.id, perm));
            console.log(`Loaded ${this.tenantFlowPermissions.size} tenant flow permissions from file`);
        }

        if (fs.existsSync(INTENT_FLOW_MAPPINGS_FILE)) {
            const data = JSON.parse(fs.readFileSync(INTENT_FLOW_MAPPINGS_FILE, 'utf-8'));
            data.forEach((mapping: IntentFlowMapping) => this.intentFlowMappings.set(mapping.id, mapping));
            console.log(`Loaded ${this.intentFlowMappings.size} intent flow mappings from file`);
        }

        if (fs.existsSync(FLOW_RUNS_FILE)) {
            const data = JSON.parse(fs.readFileSync(FLOW_RUNS_FILE, 'utf-8'));
            data.forEach((run: FlowRun) => this.flowRuns.set(run.id, run));
        }

        if (fs.existsSync(FLOW_RUN_EVIDENCE_FILE)) {
            const data = JSON.parse(fs.readFileSync(FLOW_RUN_EVIDENCE_FILE, 'utf-8'));
            data.forEach((evidence: FlowRunEvidence) => this.flowRunEvidence.set(evidence.id, evidence));
        }
    }

    private saveInterfaces() {
        if (!this.useSupabase) {
            fs.writeFileSync(INTERFACES_FILE, JSON.stringify([...this.interfaces.values()], null, 2));
        }
    }

    private saveWorkflows() {
        if (!this.useSupabase) {
            fs.writeFileSync(WORKFLOWS_FILE, JSON.stringify([...this.workflows.values()], null, 2));
        }
    }

    private saveFlowDefinitions() {
        if (!this.useSupabase) {
            fs.writeFileSync(FLOW_DEFINITIONS_FILE, JSON.stringify([...this.flowDefinitions.values()], null, 2));
        }
    }

    private saveFlowVersions() {
        if (!this.useSupabase) {
            fs.writeFileSync(FLOW_VERSIONS_FILE, JSON.stringify([...this.flowVersions.values()], null, 2));
        }
    }

    private saveTenantFlowPermissions() {
        if (!this.useSupabase) {
            fs.writeFileSync(TENANT_FLOW_PERMISSIONS_FILE, JSON.stringify([...this.tenantFlowPermissions.values()], null, 2));
        }
    }

    private saveIntentFlowMappings() {
        if (!this.useSupabase) {
            fs.writeFileSync(INTENT_FLOW_MAPPINGS_FILE, JSON.stringify([...this.intentFlowMappings.values()], null, 2));
        }
    }

    private saveFlowRuns() {
        if (!this.useSupabase) {
            fs.writeFileSync(FLOW_RUNS_FILE, JSON.stringify([...this.flowRuns.values()], null, 2));
        }
    }

    private saveFlowRunEvidence() {
        if (!this.useSupabase) {
            fs.writeFileSync(FLOW_RUN_EVIDENCE_FILE, JSON.stringify([...this.flowRunEvidence.values()], null, 2));
        }
    }

    // ========== DB MAPPERS ==========

    private mapDbToInterface(row: any): ManagedInterface {
        return {
            id: row.id,
            name: row.name,
            baseUrl: row.base_url,
            icon: row.icon,
            category: row.category,
            providerKey: row.provider_key,
            capabilities: row.capabilities || {},
            status: row.status,
            credentials: row.credentials,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    private mapInterfaceToDb(iface: Partial<ManagedInterface>): any {
        const result: any = {};
        if (iface.name !== undefined) result.name = iface.name;
        if (iface.baseUrl !== undefined) result.base_url = iface.baseUrl;
        if (iface.icon !== undefined) result.icon = iface.icon;
        if (iface.category !== undefined) result.category = iface.category;
        if (iface.providerKey !== undefined) result.provider_key = iface.providerKey;
        if (iface.capabilities !== undefined) result.capabilities = iface.capabilities;
        if (iface.status !== undefined) result.status = iface.status;
        if (iface.credentials !== undefined) result.credentials = iface.credentials;
        return result;
    }

    private mapDbToFlowDefinition(row: any): FlowDefinition {
        return {
            id: row.id,
            companyId: row.company_id,
            interfaceId: row.interface_id,
            name: row.name,
            category: row.category,
            intentTags: row.intent_tags || [],
            description: row.description,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    private mapFlowDefinitionToDb(def: Partial<FlowDefinition>): any {
        const result: any = {};
        if (def.companyId !== undefined) result.company_id = def.companyId;
        if (def.interfaceId !== undefined) result.interface_id = def.interfaceId;
        if (def.name !== undefined) result.name = def.name;
        if (def.category !== undefined) result.category = def.category;
        if (def.intentTags !== undefined) result.intent_tags = def.intentTags;
        if (def.description !== undefined) result.description = def.description;
        return result;
    }

    private mapDbToFlowVersion(row: any): FlowVersion {
        return {
            id: row.id,
            flowDefinitionId: row.flow_definition_id,
            version: row.version,
            steps: row.steps || [],
            status: row.status,
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    private mapFlowVersionToDb(version: Partial<FlowVersion>): any {
        const result: any = {};
        if (version.flowDefinitionId !== undefined) result.flow_definition_id = version.flowDefinitionId;
        if (version.version !== undefined) result.version = version.version;
        if (version.steps !== undefined) result.steps = version.steps;
        if (version.status !== undefined) result.status = version.status;
        if (version.createdBy !== undefined) result.created_by = version.createdBy;
        return result;
    }

    private mapDbToTenantFlowPermission(row: any): TenantFlowPermission {
        return {
            id: row.id,
            companyId: row.company_id,
            flowDefinitionId: row.flow_definition_id,
            isEnabled: row.is_enabled,
            defaultForIntent: row.default_for_intent,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    private mapDbToIntentFlowMapping(row: any): IntentFlowMapping {
        return {
            id: row.id,
            companyId: row.company_id,
            intent: row.intent,
            allowedFlowDefinitionIds: row.allowed_flow_definition_ids || [],
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    private mapDbToWorkflow(row: any): Workflow {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            trigger: row.trigger,
            interfaceId: row.interface_id,
            steps: row.steps || [],
            variables: row.variables || {},
            isEnabled: row.is_enabled,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    private mapWorkflowToDb(wf: Partial<Workflow>): any {
        const result: any = {};
        if (wf.name !== undefined) result.name = wf.name;
        if (wf.description !== undefined) result.description = wf.description;
        if (wf.trigger !== undefined) result.trigger = wf.trigger;
        if (wf.interfaceId !== undefined) result.interface_id = wf.interfaceId;
        if (wf.steps !== undefined) result.steps = wf.steps;
        if (wf.variables !== undefined) result.variables = wf.variables;
        if (wf.isEnabled !== undefined) result.is_enabled = wf.isEnabled;
        return result;
    }

    // ========== INTERFACES ==========

    getAllInterfaces(): ManagedInterface[] {
        return [...this.interfaces.values()];
    }

    getInterface(id: string): ManagedInterface | undefined {
        return this.interfaces.get(id);
    }

    async createInterface(data: Omit<ManagedInterface, 'id' | 'createdAt' | 'updatedAt'>): Promise<ManagedInterface> {
        if (this.useSupabase) {
            const dbData = this.mapInterfaceToDb(data);
            const created = await this.supabaseService.createInterface(dbData);
            const iface = this.mapDbToInterface(created);
            this.interfaces.set(iface.id, iface);
            return iface;
        } else {
            const now = new Date().toISOString();
            const iface: ManagedInterface = {
                ...data,
                id: `iface-${Date.now()}`,
                createdAt: now,
                updatedAt: now,
            };
            this.interfaces.set(iface.id, iface);
            this.saveInterfaces();
            return iface;
        }
    }

    async updateInterface(id: string, data: Partial<ManagedInterface>): Promise<ManagedInterface | null> {
        const existing = this.interfaces.get(id);
        if (!existing) return null;

        if (this.useSupabase) {
            const dbData = this.mapInterfaceToDb(data);
            const updated = await this.supabaseService.updateInterface(id, dbData);
            const iface = this.mapDbToInterface(updated);
            this.interfaces.set(id, iface);
            return iface;
        } else {
            const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
            this.interfaces.set(id, updated);
            this.saveInterfaces();
            return updated;
        }
    }

    async deleteInterface(id: string): Promise<boolean> {
        if (this.useSupabase) {
            await this.supabaseService.deleteInterface(id);
        }
        const result = this.interfaces.delete(id);
        if (result && !this.useSupabase) this.saveInterfaces();
        return result;
    }

    // ========== WORKFLOWS ==========

    getAllWorkflows(): Workflow[] {
        return [...this.workflows.values()];
    }

    getWorkflow(id: string): Workflow | undefined {
        return this.workflows.get(id);
    }

    getWorkflowsByInterface(interfaceId: string): Workflow[] {
        return [...this.workflows.values()].filter(w => w.interfaceId === interfaceId);
    }

    getWorkflowByTrigger(triggerType: string, triggerValue: string): Workflow | undefined {
        return [...this.workflows.values()].find(w =>
            w.isEnabled &&
            w.trigger.type === triggerType &&
            w.trigger.value.toLowerCase() === triggerValue.toLowerCase()
        );
    }

    async createWorkflow(data: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
        if (this.useSupabase) {
            const dbData = this.mapWorkflowToDb(data);
            const created = await this.supabaseService.createWorkflow(dbData);
            const workflow = this.mapDbToWorkflow(created);
            this.workflows.set(workflow.id, workflow);
            return workflow;
        } else {
            const now = new Date().toISOString();
            const workflow: Workflow = {
                ...data,
                id: `wf-${Date.now()}`,
                createdAt: now,
                updatedAt: now,
            };
            this.workflows.set(workflow.id, workflow);
            this.saveWorkflows();
            return workflow;
        }
    }

    async updateWorkflow(id: string, data: Partial<Workflow>): Promise<Workflow | null> {
        const existing = this.workflows.get(id);
        if (!existing) return null;

        if (this.useSupabase) {
            const dbData = this.mapWorkflowToDb(data);
            const updated = await this.supabaseService.updateWorkflow(id, dbData);
            const workflow = this.mapDbToWorkflow(updated);
            this.workflows.set(id, workflow);
            return workflow;
        } else {
            const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
            this.workflows.set(id, updated);
            this.saveWorkflows();
            return updated;
        }
    }

    async deleteWorkflow(id: string): Promise<boolean> {
        if (this.useSupabase) {
            await this.supabaseService.deleteWorkflow(id);
        }
        const result = this.workflows.delete(id);
        if (result && !this.useSupabase) this.saveWorkflows();
        return result;
    }

    // ========== FLOW DEFINITIONS ==========

    getAllFlowDefinitions(): FlowDefinition[] {
        return [...this.flowDefinitions.values()];
    }

    getFlowDefinition(id: string): FlowDefinition | undefined {
        return this.flowDefinitions.get(id);
    }

    async createFlowDefinition(data: Omit<FlowDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<FlowDefinition> {
        if (this.useSupabase) {
            const dbData = this.mapFlowDefinitionToDb(data);
            const created = await this.supabaseService.createFlowDefinition(dbData);
            const def = this.mapDbToFlowDefinition(created);
            this.flowDefinitions.set(def.id, def);
            return def;
        }

        const now = new Date().toISOString();
        const def: FlowDefinition = {
            ...data,
            id: `flow-def-${Date.now()}`,
            createdAt: now,
            updatedAt: now,
        };
        this.flowDefinitions.set(def.id, def);
        this.saveFlowDefinitions();
        return def;
    }

    async updateFlowDefinition(id: string, data: Partial<FlowDefinition>): Promise<FlowDefinition | null> {
        const existing = this.flowDefinitions.get(id);
        if (!existing) return null;

        if (this.useSupabase) {
            const dbData = this.mapFlowDefinitionToDb(data);
            const updated = await this.supabaseService.updateFlowDefinition(id, dbData);
            const def = this.mapDbToFlowDefinition(updated);
            this.flowDefinitions.set(id, def);
            return def;
        }

        const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
        this.flowDefinitions.set(id, updated);
        this.saveFlowDefinitions();
        return updated;
    }

    async deleteFlowDefinition(id: string): Promise<boolean> {
        if (this.useSupabase) {
            await this.supabaseService.deleteFlowDefinition(id);
        }
        const result = this.flowDefinitions.delete(id);
        if (result && !this.useSupabase) this.saveFlowDefinitions();
        return result;
    }

    // ========== FLOW VERSIONS ==========

    getAllFlowVersions(): FlowVersion[] {
        return [...this.flowVersions.values()];
    }

    getFlowVersion(id: string): FlowVersion | undefined {
        return this.flowVersions.get(id);
    }

    getFlowVersionsByDefinition(definitionId: string): FlowVersion[] {
        return [...this.flowVersions.values()]
            .filter(version => version.flowDefinitionId === definitionId)
            .sort((a, b) => b.version - a.version);
    }

    getApprovedFlowVersion(definitionId: string): FlowVersion | undefined {
        return this.getFlowVersionsByDefinition(definitionId)
            .find(version => version.status === 'approved');
    }

    async createFlowVersion(data: Omit<FlowVersion, 'id' | 'createdAt' | 'updatedAt'>): Promise<FlowVersion> {
        if (this.useSupabase) {
            const dbData = this.mapFlowVersionToDb(data);
            const created = await this.supabaseService.createFlowVersion(dbData);
            const version = this.mapDbToFlowVersion(created);
            this.flowVersions.set(version.id, version);
            return version;
        }

        const now = new Date().toISOString();
        const version: FlowVersion = {
            ...data,
            id: `flow-version-${Date.now()}`,
            createdAt: now,
            updatedAt: now,
        };
        this.flowVersions.set(version.id, version);
        this.saveFlowVersions();
        return version;
    }

    async updateFlowVersion(id: string, data: Partial<FlowVersion>): Promise<FlowVersion | null> {
        const existing = this.flowVersions.get(id);
        if (!existing) return null;

        if (this.useSupabase) {
            const dbData = this.mapFlowVersionToDb(data);
            const updated = await this.supabaseService.updateFlowVersion(id, dbData);
            const version = this.mapDbToFlowVersion(updated);
            this.flowVersions.set(id, version);
            return version;
        }

        const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
        this.flowVersions.set(id, updated);
        this.saveFlowVersions();
        return updated;
    }

    async deleteFlowVersion(id: string): Promise<boolean> {
        if (this.useSupabase) {
            await this.supabaseService.deleteFlowVersion(id);
        }
        const result = this.flowVersions.delete(id);
        if (result && !this.useSupabase) this.saveFlowVersions();
        return result;
    }

    // ========== TENANT FLOW PERMISSIONS ==========

    getTenantFlowPermissions(companyId: string): TenantFlowPermission[] {
        return [...this.tenantFlowPermissions.values()].filter(perm => perm.companyId === companyId);
    }

    async upsertTenantFlowPermissions(entries: Omit<TenantFlowPermission, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<TenantFlowPermission[]> {
        if (this.useSupabase) {
            const payload = entries.map(entry => ({
                company_id: entry.companyId,
                flow_definition_id: entry.flowDefinitionId,
                is_enabled: entry.isEnabled,
                default_for_intent: entry.defaultForIntent
            }));
            const updated = await this.supabaseService.upsertTenantFlowPermissions(payload);
            updated.forEach((perm: any) => this.tenantFlowPermissions.set(perm.id, this.mapDbToTenantFlowPermission(perm)));
            return updated.map((perm: any) => this.mapDbToTenantFlowPermission(perm));
        }

        const results: TenantFlowPermission[] = [];
        entries.forEach(entry => {
            const existing = [...this.tenantFlowPermissions.values()].find(perm =>
                perm.companyId === entry.companyId && perm.flowDefinitionId === entry.flowDefinitionId
            );
            const now = new Date().toISOString();
            const updated: TenantFlowPermission = existing
                ? { ...existing, ...entry, updatedAt: now }
                : {
                    ...entry,
                    id: `tenant-flow-${Date.now()}-${Math.random()}`,
                    createdAt: now,
                    updatedAt: now
                };
            this.tenantFlowPermissions.set(updated.id, updated);
            results.push(updated);
        });
        this.saveTenantFlowPermissions();
        return results;
    }

    // ========== INTENT FLOW MAPPINGS ==========

    getIntentFlowMappings(companyId: string): IntentFlowMapping[] {
        return [...this.intentFlowMappings.values()].filter(mapping => mapping.companyId === companyId);
    }

    async upsertIntentFlowMapping(entry: Omit<IntentFlowMapping, 'id' | 'createdAt' | 'updatedAt'>): Promise<IntentFlowMapping> {
        if (this.useSupabase) {
            const updated = await this.supabaseService.upsertIntentFlowMapping({
                company_id: entry.companyId,
                intent: entry.intent,
                allowed_flow_definition_ids: entry.allowedFlowDefinitionIds
            });
            const mapping = this.mapDbToIntentFlowMapping(updated);
            this.intentFlowMappings.set(mapping.id, mapping);
            return mapping;
        }

        const existing = [...this.intentFlowMappings.values()].find(mapping =>
            mapping.companyId === entry.companyId && mapping.intent.toLowerCase() === entry.intent.toLowerCase()
        );
        const now = new Date().toISOString();
        const mapping: IntentFlowMapping = existing
            ? { ...existing, ...entry, updatedAt: now }
            : {
                ...entry,
                id: `intent-flow-${Date.now()}-${Math.random()}`,
                createdAt: now,
                updatedAt: now
            };
        this.intentFlowMappings.set(mapping.id, mapping);
        this.saveIntentFlowMappings();
        return mapping;
    }

    // ========== FLOW RUN AUDIT ==========

    async createFlowRun(flowVersionId: string, sessionId?: string, companyId?: string): Promise<FlowRun> {
        if (this.useSupabase) {
            const created = await this.supabaseService.createFlowRun({
                flow_version_id: flowVersionId,
                session_id: sessionId,
                company_id: companyId,
                status: 'running'
            });
            return {
                id: created.id,
                flowVersionId: created.flow_version_id,
                sessionId: created.session_id,
                companyId: created.company_id,
                status: created.status,
                startedAt: created.started_at,
                completedAt: created.completed_at
            };
        }

        const now = new Date().toISOString();
        const run: FlowRun = {
            id: `flow-run-${Date.now()}`,
            flowVersionId,
            sessionId,
            companyId,
            status: 'running',
            startedAt: now,
        };
        this.flowRuns.set(run.id, run);
        this.saveFlowRuns();
        return run;
    }

    async updateFlowRun(id: string, updates: Partial<FlowRun>): Promise<FlowRun | null> {
        const existing = this.flowRuns.get(id);
        if (this.useSupabase) {
            const updated = await this.supabaseService.updateFlowRun(id, {
                status: updates.status,
                completed_at: updates.completedAt
            });
            return {
                id: updated.id,
                flowVersionId: updated.flow_version_id,
                sessionId: updated.session_id,
                companyId: updated.company_id,
                status: updated.status,
                startedAt: updated.started_at,
                completedAt: updated.completed_at
            };
        }

        if (!existing) return null;
        const updated = { ...existing, ...updates };
        this.flowRuns.set(id, updated);
        this.saveFlowRuns();
        return updated;
    }

    async createFlowRunEvidence(evidence: Omit<FlowRunEvidence, 'id' | 'createdAt'>): Promise<FlowRunEvidence> {
        if (this.useSupabase) {
            const created = await this.supabaseService.createFlowRunEvidence({
                flow_run_id: evidence.flowRunId,
                step_index: evidence.stepIndex,
                action: evidence.action,
                selector: evidence.selector,
                value: evidence.value,
                screenshot_hash: evidence.screenshotHash,
                result: evidence.result
            });
            return {
                id: created.id,
                flowRunId: created.flow_run_id,
                stepIndex: created.step_index,
                action: created.action,
                selector: created.selector,
                value: created.value,
                screenshotHash: created.screenshot_hash,
                result: created.result,
                createdAt: created.created_at
            };
        }

        const created: FlowRunEvidence = {
            ...evidence,
            id: `flow-evidence-${Date.now()}`,
            createdAt: new Date().toISOString(),
        };
        this.flowRunEvidence.set(created.id, created);
        this.saveFlowRunEvidence();
        return created;
    }

    // Add step to workflow
    async addStepToWorkflow(workflowId: string, step: Workflow['steps'][0], insertIndex?: number): Promise<Workflow | null> {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) return null;

        if (insertIndex !== undefined) {
            workflow.steps.splice(insertIndex, 0, step);
        } else {
            workflow.steps.push(step);
        }

        workflow.updatedAt = new Date().toISOString();

        if (this.useSupabase) {
            await this.supabaseService.updateWorkflow(workflowId, { steps: workflow.steps });
        } else {
            this.saveWorkflows();
        }
        return workflow;
    }

    // ========== FLOW ROUTING HELPERS ==========

    resolveApprovedFlowVersionForIntent(companyId: string, intent: string): { definition: FlowDefinition; version: FlowVersion } | null {
        const normalizedIntent = intent.trim().toLowerCase();
        const mapping = this.getIntentFlowMappings(companyId)
            .find(entry => entry.intent.trim().toLowerCase() === normalizedIntent);

        if (!mapping || mapping.allowedFlowDefinitionIds.length === 0) {
            return null;
        }

        const allowedDefinitions = mapping.allowedFlowDefinitionIds
            .map(defId => this.flowDefinitions.get(defId))
            .filter((def): def is FlowDefinition => !!def);

        const enabledDefinitions = allowedDefinitions.filter(def =>
            this.getTenantFlowPermissions(companyId)
                .some(perm => perm.flowDefinitionId === def.id && perm.isEnabled)
        );

        for (const def of enabledDefinitions) {
            const version = this.getApprovedFlowVersion(def.id);
            if (version) {
                return { definition: def, version };
            }
        }

        return null;
    }

    async removeStepFromWorkflow(workflowId: string, stepId: string): Promise<Workflow | null> {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) return null;

        workflow.steps = workflow.steps.filter(s => s.id !== stepId);
        workflow.updatedAt = new Date().toISOString();

        if (this.useSupabase) {
            await this.supabaseService.updateWorkflow(workflowId, { steps: workflow.steps });
        } else {
            this.saveWorkflows();
        }
        return workflow;
    }
}
