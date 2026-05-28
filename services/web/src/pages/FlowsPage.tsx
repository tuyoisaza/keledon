import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Workflow, Plus, Settings } from 'lucide-react';

export default function FlowsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Workflow className="w-6 h-6 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">Flows</h1>
                        <p className="text-muted-foreground">Manage automation flows</p>
                    </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                    <Plus className="w-4 h-4" />
                    Create Flow
                </button>
            </div>

            <div className="bg-card border border-border rounded-lg p-12 text-center">
                <Workflow className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Flows Coming Soon</h3>
                <p className="text-muted-foreground mb-4">Flow management is not yet implemented.</p>
                <p className="text-sm text-muted-foreground">
                    Use the Vector Store to add knowledge documents for the AI agent.
                </p>
            </div>
        </div>
    );
}
