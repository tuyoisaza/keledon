import { Module } from '@nestjs/common';
import { WorkflowExecutor } from '../workflow.executor';
import { ToolExecutor } from '../tool.executor';
import { WorkflowStorage } from '../workflow.storage';
import { RpaFactory } from '../rpa.factory';

@Module({
    providers: [
        WorkflowExecutor,
        ToolExecutor,
        WorkflowStorage,
        RpaFactory,
    ],
    exports: [
        WorkflowExecutor,
        ToolExecutor,
        WorkflowStorage,
        RpaFactory,
    ]
})
export class ExecutorsModule { }
