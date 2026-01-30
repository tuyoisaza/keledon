
export enum ActionType {
    READ = 'READ',
    WRITE = 'WRITE',
    SUBMIT = 'SUBMIT',
    CLOSE = 'CLOSE',
    SPEAK = 'SPEAK',
    NAVIGATE = 'NAVIGATE',
    WAIT = 'WAIT',
    EXECUTE_FLOW = 'EXECUTE_FLOW'
}

export enum ActionDomain {
    CRM = 'CRM',
    VOICE = 'VOICE',
    UI = 'UI',
    KNOWLEDGE = 'KNOWLEDGE',
    SYSTEM = 'SYSTEM'
}

export enum ActionRisk {
    LOW = 'LOW',         // Read-only, navigational
    MEDIUM = 'MEDIUM',   // Reversible writes (notes, drafts)
    HIGH = 'HIGH',       // Irreversible or impactful (sending emails, saving forms)
    CRITICAL = 'CRITICAL' // Money, deletion, closing cases
}

export enum ActionReversibility {
    REVERSIBLE = 'REVERSIBLE',
    IRREVERSIBLE = 'IRREVERSIBLE'
}

export interface KeledonAction {
    type: ActionType;
    domain: ActionDomain;
    system: string; // e.g. 'Salesforce', 'Genesys', 'WebPortal'
    resource: string; // e.g. 'Case', 'Contact', 'Form'
    intent: string; // Semantic purpose
    risk: ActionRisk;
    reversibility: ActionReversibility;
    requiredLevel: number; // Minimum autonomy level required (1-5)

    // Execution details (declarative)
    payload?: any;
}

export interface AutonomyContext {
    accountId: string;
    level: number; // 1-5
    features: string[];
}
