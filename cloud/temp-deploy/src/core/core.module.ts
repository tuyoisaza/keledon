import { Module, Global } from '@nestjs/common';
import { PolicyEngine } from './policy/policy.engine';
import { AuditService } from './audit/audit.service';
import { ExecutionOrchestrator } from './execution/execution.orchestrator';
import { ContextService } from './context/context.service';
import { SupabaseModule } from '../supabase';
import { ExecutorsModule } from './executors.module';

// We import the modules that contain the "Executors" or register them as providers if they are not in modules yet.
// Since WorkflowExecutor and ToolExecutor are in the main AppModule/src root, we might need to assume they are available or import them here if they were in a module.
// However, since we are in the same 'src', and likely AppModule imports this, we need to be careful with circular dependencies.
// Ideally CoreModule should import 'ExecutorsModule'. 
// For now, we will expect WorkflowExecutor and ToolExecutor to be provided in the scope or imported.
// BUT, if they are providers in AppModule, we can't easily import them here without them being exported from a SharedModule.

@Global()
@Module({
    imports: [SupabaseModule, ExecutorsModule],
    providers: [
        PolicyEngine,
        AuditService,
        ExecutionOrchestrator,
        ContextService
    ],
    exports: [
        PolicyEngine,
        AuditService,
        ExecutionOrchestrator,
        ContextService,
        ExecutorsModule
    ]
})
export class CoreModule { }
