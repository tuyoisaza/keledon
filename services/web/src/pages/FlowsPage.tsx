import { useState, useEffect, useCallback } from 'react';
import { Workflow, Plus, Settings, Play, Pause, Trash2, Edit2, Eye, Search, Filter, Mic, Square, Download, Upload, ChevronDown, ChevronRight, StepForward, ArrowUp, ArrowDown, Save, X, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '@/lib/config';

interface FlowStep {
  id: string;
  flowId: string;
  order: number;
  type: 'navigate' | 'click' | 'input' | 'read' | 'wait' | 'submit' | 'decision' | 'speak';
  selector?: string;
  selectorType?: string;
  value?: string;
  extract?: string;
  waitFor?: string;
  condition?: string;
  timeout?: number;
  optional?: boolean;
  nextStepId?: string;
}

interface Flow {
  id: string;
  name: string;
  description?: string;
  triggerKeywords: string;
  category: string;
  tool: string;
  teamId?: string;
  isActive: boolean;
  version: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  steps: FlowStep[];
}

const STEP_TYPES = [
  { value: 'navigate', label: 'Navigate', icon: '🌐', desc: 'Go to a URL' },
  { value: 'click', label: 'Click', icon: '👆', desc: 'Click an element' },
  { value: 'input', label: 'Input', icon: '⌨️', desc: 'Type text into a field' },
  { value: 'read', label: 'Read', icon: '👁️', desc: 'Extract text from an element' },
  { value: 'wait', label: 'Wait', icon: '⏱️', desc: 'Wait for a duration or element' },
  { value: 'submit', label: 'Submit', icon: '📤', desc: 'Submit a form' },
  { value: 'decision', label: 'Decision', icon: '🔀', desc: 'Conditional branching' },
  { value: 'speak', label: 'Speak', icon: '🗣️', desc: 'Say something to the caller' },
];

const CATEGORIES = ['general', 'crm', 'support', 'sales', 'billing', 'onboarding', 'reporting'];

export default function FlowsPage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [expandedFlowId, setExpandedFlowId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/flows`);
      if (!res.ok) throw new Error('Failed to load flows');
      const data = await res.json();
      setFlows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Failed to load flows');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFlow = async (flowId: string) => {
    if (!confirm('Delete this flow? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_URL}/api/flows/${flowId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Flow deleted');
      loadFlows();
    } catch (err) {
      toast.error('Failed to delete flow');
    }
  };

  const toggleExpand = (flowId: string) => {
    setExpandedFlowId(expandedFlowId === flowId ? null : flowId);
  };

  const filteredFlows = flows.filter(flow => {
    const matchesSearch = !searchQuery ||
      flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (flow.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || flow.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Workflow className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Flows</h1>
            <p className="text-muted-foreground">Manage automation flows and RPA sequences</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRecordModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Mic className="w-4 h-4" />
            Record Flow
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Flow
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search flows..."
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="pl-10 pr-8 py-2 border border-border rounded-lg bg-muted/50 appearance-none focus:border-primary/50 outline-none"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Flow List */}
      {loading ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <div className="animate-spin w-8 h-8 mx-auto mb-4 text-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <p className="text-muted-foreground">Loading flows...</p>
        </div>
      ) : filteredFlows.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Workflow className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Flows Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first automation flow or record one by interacting with a website.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setShowRecordModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              <Mic className="w-4 h-4" />
              Record Flow
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Create Flow
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFlows.map(flow => (
            <div key={flow.id} className="bg-card border border-border rounded-lg overflow-hidden">
              {/* Flow Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleExpand(flow.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedFlowId === flow.id ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <div>
                    <h3 className="font-medium">{flow.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {flow.steps.length} steps • {flow.category} • v{flow.version}
                      {flow.isActive ? '' : ' • Inactive'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${flow.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                    {flow.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedFlow(flow); setShowEditModal(true); }}
                    className="p-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteFlow(flow.id); }}
                    className="p-1.5 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Flow Steps */}
              {expandedFlowId === flow.id && (
                <div className="border-t border-border bg-muted/20 p-4 space-y-2">
                  {flow.description && (
                    <p className="text-sm text-muted-foreground mb-3">{flow.description}</p>
                  )}
                  <div className="space-y-1">
                    {flow.steps.map((step, idx) => {
                      const stepType = STEP_TYPES.find(t => t.value === step.type);
                      return (
                        <div key={step.id} className="flex items-center gap-2 text-sm bg-card border border-border rounded p-2">
                          <span className="text-muted-foreground w-6 text-center">{idx + 1}</span>
                          <span className="text-lg">{stepType?.icon || '⚡'}</span>
                          <span className="font-medium w-20">{stepType?.label || step.type}</span>
                          <span className="text-muted-foreground flex-1 truncate">
                            {step.selector && `Selector: ${step.selector}`}
                            {step.value && ` → Value: ${step.value}`}
                            {step.extract && ` → Extract: ${step.extract}`}
                            {step.waitFor && ` → Wait: ${step.waitFor}`}
                            {step.condition && ` → If: ${step.condition}`}
                            {!step.selector && !step.value && !step.extract && !step.waitFor && !step.condition && (
                              step.type === 'navigate' ? `URL: ${step.value || '(not set)'}` :
                              step.type === 'wait' ? `Duration: ${step.timeout || 10000}ms` :
                              step.type === 'speak' ? `"${step.value || '(not set)'}"` :
                              '(no details)'
                            )}
                          </span>
                          {step.optional && <span className="text-xs text-muted-foreground">(optional)</span>}
                        </div>
                      );
                    })}
                    {flow.steps.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">No steps defined yet</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <FlowFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); loadFlows(); }}
        />
      )}
      {showEditModal && selectedFlow && (
        <FlowFormModal
          flow={selectedFlow}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => { setShowEditModal(false); loadFlows(); }}
        />
      )}
      {showRecordModal && (
        <FlowRecordModal
          onClose={() => setShowRecordModal(false)}
          onSuccess={() => { setShowRecordModal(false); loadFlows(); }}
        />
      )}
    </div>
  );
}

/* ─── Flow Form Modal ─── */

function FlowFormModal({ flow, onClose, onSuccess }: { flow?: Flow; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState(flow?.name || '');
  const [description, setDescription] = useState(flow?.description || '');
  const [category, setCategory] = useState(flow?.category || 'general');
  const [tool, setTool] = useState(flow?.tool || 'browser');
  const [triggerKeywords, setTriggerKeywords] = useState(
    flow ? JSON.parse(flow.triggerKeywords || '[]') : []
  );
  const [keywordInput, setKeywordInput] = useState('');
  const [steps, setSteps] = useState<Partial<FlowStep>[]>(flow?.steps || []);
  const [saving, setSaving] = useState(false);
  const [showAddStep, setShowAddStep] = useState(false);

  const addKeyword = () => {
    if (keywordInput.trim() && !triggerKeywords.includes(keywordInput.trim())) {
      setTriggerKeywords([...triggerKeywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (kw: string) => {
    setTriggerKeywords(triggerKeywords.filter(k => k !== kw));
  };

  const addStep = (stepType: string) => {
    setSteps([...steps, { type: stepType as FlowStep['type'], order: steps.length, timeout: 10000 }]);
    setShowAddStep(false);
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newSteps.length) return;
    [newSteps[index], newSteps[swapIndex]] = [newSteps[swapIndex], newSteps[index]];
    setSteps(newSteps.map((s, i) => ({ ...s, order: i })));
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Flow name is required'); return; }
    setSaving(true);
    try {
      const body = {
        name,
        description,
        category,
        tool,
        triggerKeywords,
        steps: steps.map((s, i) => ({ ...s, order: i })),
      };

      const url = flow ? `${API_URL}/api/flows/${flow.id}` : `${API_URL}/api/flows`;
      const method = flow ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(flow ? 'Flow updated' : 'Flow created');
      onSuccess();
    } catch (err) {
      toast.error('Failed to save flow');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold">{flow ? 'Edit Flow' : 'Create Flow'}</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 outline-none focus:border-primary/50"
              placeholder="e.g. Check order status"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 outline-none focus:border-primary/50"
              rows={2}
              placeholder="What this flow does..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 outline-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tool</label>
              <select
                value={tool}
                onChange={(e) => setTool(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 outline-none"
              >
                <option value="browser">Browser</option>
                <option value="genesys">Genesys</option>
                <option value="salesforce">Salesforce</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Trigger Keywords</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {triggerKeywords.map(kw => (
                <span key={kw} className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                  {kw}
                  <button onClick={() => removeKeyword(kw)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-muted/50 outline-none focus:border-primary/50"
                placeholder="Type keyword and press Enter"
              />
              <button onClick={addKeyword} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg">
                Add
              </button>
            </div>
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Steps ({steps.length})</label>
              <button
                onClick={() => setShowAddStep(!showAddStep)}
                className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm hover:bg-primary/20"
              >
                <PlusCircle className="w-3 h-3" />
                Add Step
              </button>
            </div>

            {showAddStep && (
              <div className="grid grid-cols-2 gap-2 mb-3 p-3 bg-muted/30 border border-border rounded-lg">
                {STEP_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => addStep(type.value)}
                    className="flex items-center gap-2 p-2 bg-card border border-border rounded hover:border-primary/50 text-left"
                  >
                    <span className="text-lg">{type.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {steps.map((step, idx) => {
                const stepType = STEP_TYPES.find(t => t.value === step.type);
                return (
                  <div key={idx} className="bg-muted/20 border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">{idx + 1}</span>
                        <span className="text-lg">{stepType?.icon}</span>
                        <span className="font-medium">{stepType?.label}</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => moveStep(idx, 'up')} className="p-1 hover:text-primary">
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button onClick={() => moveStep(idx, 'down')} className="p-1 hover:text-primary">
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button onClick={() => removeStep(idx)} className="p-1 hover:text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {step.type === 'navigate' && (
                        <div className="col-span-2">
                          <label className="text-xs text-muted-foreground">URL</label>
                          <input
                            value={step.value || ''}
                            onChange={(e) => updateStep(idx, 'value', e.target.value)}
                            className="w-full px-2 py-1 border border-border rounded bg-muted/50 text-sm"
                            placeholder="https://..."
                          />
                        </div>
                      )}
                      {(step.type === 'click' || step.type === 'input' || step.type === 'read' || step.type === 'wait') && (
                        <>
                          <div>
                            <label className="text-xs text-muted-foreground">CSS Selector</label>
                            <input
                              value={step.selector || ''}
                              onChange={(e) => updateStep(idx, 'selector', e.target.value)}
                              className="w-full px-2 py-1 border border-border rounded bg-muted/50 text-sm"
                              placeholder="#element-id"
                            />
                          </div>
                          {step.type === 'input' && (
                            <div>
                              <label className="text-xs text-muted-foreground">Value</label>
                              <input
                                value={step.value || ''}
                                onChange={(e) => updateStep(idx, 'value', e.target.value)}
                                className="w-full px-2 py-1 border border-border rounded bg-muted/50 text-sm"
                                placeholder="Text to type"
                              />
                            </div>
                          )}
                          {step.type === 'read' && (
                            <div>
                              <label className="text-xs text-muted-foreground">Extract Variable</label>
                              <input
                                value={step.extract || ''}
                                onChange={(e) => updateStep(idx, 'extract', e.target.value)}
                                className="w-full px-2 py-1 border border-border rounded bg-muted/50 text-sm"
                                placeholder="variableName"
                              />
                            </div>
                          )}
                          {step.type === 'wait' && (
                            <div>
                              <label className="text-xs text-muted-foreground">
                                {step.selector ? 'Wait for selector' : 'Wait (ms)'}
                              </label>
                              <input
                                value={step.waitFor || step.timeout || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (step.selector) updateStep(idx, 'waitFor', val);
                                  else updateStep(idx, 'timeout', parseInt(val) || 10000);
                                }}
                                className="w-full px-2 py-1 border border-border rounded bg-muted/50 text-sm"
                              />
                            </div>
                          )}
                        </>
                      )}
                      {step.type === 'submit' && (
                        <div className="col-span-2">
                          <label className="text-xs text-muted-foreground">Form Selector</label>
                          <input
                            value={step.selector || ''}
                            onChange={(e) => updateStep(idx, 'selector', e.target.value)}
                            className="w-full px-2 py-1 border border-border rounded bg-muted/50 text-sm"
                            placeholder="form#my-form"
                          />
                        </div>
                      )}
                      {step.type === 'decision' && (
                        <div className="col-span-2">
                          <label className="text-xs text-muted-foreground">Condition</label>
                          <input
                            value={step.condition || ''}
                            onChange={(e) => updateStep(idx, 'condition', e.target.value)}
                            className="w-full px-2 py-1 border border-border rounded bg-muted/50 text-sm"
                            placeholder="e.g. extracted.price > 100"
                          />
                        </div>
                      )}
                      {step.type === 'speak' && (
                        <div className="col-span-2">
                          <label className="text-xs text-muted-foreground">Text to Speak</label>
                          <input
                            value={step.value || ''}
                            onChange={(e) => updateStep(idx, 'value', e.target.value)}
                            className="w-full px-2 py-1 border border-border rounded bg-muted/50 text-sm"
                            placeholder="What the agent should say"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={step.optional || false}
                          onChange={(e) => updateStep(idx, 'optional', e.target.checked)}
                          id={`optional-${idx}`}
                        />
                        <label htmlFor={`optional-${idx}`} className="text-xs text-muted-foreground">Optional</label>
                      </div>
                    </div>
                  </div>
                );
              })}
              {steps.length === 0 && (
                <p className="text-sm text-muted-foreground italic text-center py-4">No steps yet. Click "Add Step" to define the flow.</p>
              )}
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-border rounded-lg hover:bg-muted/50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : (flow ? 'Update' : 'Create')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Flow Record Modal ─── */

function FlowRecordModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSteps, setRecordingSteps] = useState<Partial<FlowStep>[]>([]);
  const [flowName, setFlowName] = useState('');
  const [flowDescription, setFlowDescription] = useState('');
  const [flowCategory, setFlowCategory] = useState('general');
  const [triggerKeywords, setTriggerKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [manualMode, setManualMode] = useState(true);

  const addRecordingStep = () => {
    setRecordingSteps([...recordingSteps, { type: 'navigate', order: recordingSteps.length, value: '', timeout: 10000 }]);
  };

  const updateRecordingStep = (index: number, field: string, value: any) => {
    const newSteps = [...recordingSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setRecordingSteps(newSteps);
  };

  const removeRecordingStep = (index: number) => {
    setRecordingSteps(recordingSteps.filter((_, i) => i !== index));
  };

  const handleSaveFlow = async () => {
    if (!flowName.trim()) { toast.error('Flow name is required'); return; }
    if (recordingSteps.length === 0) { toast.error('Add at least one step'); return; }

    try {
      const res = await fetch(`${API_URL}/api/flows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: flowName,
          description: flowDescription,
          category: flowCategory,
          tool: 'browser',
          triggerKeywords,
          steps: recordingSteps.map((s, i) => ({ ...s, order: i })),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success('Flow recorded and saved!');
      onSuccess();
    } catch (err) {
      toast.error('Failed to save flow');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mic className={`w-5 h-5 ${isRecording ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
            <h2 className="text-xl font-bold">Record Flow</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setManualMode(true)}
              className={`px-4 py-2 rounded-lg text-sm ${manualMode ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setManualMode(false)}
              className={`px-4 py-2 rounded-lg text-sm ${!manualMode ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Browser Recording
            </button>
          </div>

          {!manualMode && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <p className="text-sm text-orange-800 dark:text-orange-300">
                🎯 To record browser actions, open the KELEDON Browser and use the built-in recorder.
                Steps will automatically appear here. For now, use Manual Entry to define steps.
              </p>
            </div>
          )}

          {/* Flow Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Flow Name *</label>
              <input
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 outline-none focus:border-primary/50"
                placeholder="e.g. Check order status"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={flowCategory}
                onChange={(e) => setFlowCategory(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 outline-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={flowDescription}
              onChange={(e) => setFlowDescription(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 outline-none focus:border-primary/50"
              rows={2}
              placeholder="What this flow does..."
            />
          </div>

          {/* Trigger Keywords */}
          <div>
            <label className="block text-sm font-medium mb-1">Trigger Keywords</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {triggerKeywords.map(kw => (
                <span key={kw} className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                  {kw}
                  <button onClick={() => setTriggerKeywords(triggerKeywords.filter(k => k !== kw))} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (keywordInput.trim() && !triggerKeywords.includes(keywordInput.trim())) {
                      setTriggerKeywords([...triggerKeywords, keywordInput.trim()]);
                      setKeywordInput('');
                    }
                  }
                }}
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-muted/50 outline-none focus:border-primary/50"
                placeholder="Type keyword and press Enter"
              />
              <button
                onClick={() => {
                  if (keywordInput.trim() && !triggerKeywords.includes(keywordInput.trim())) {
                    setTriggerKeywords([...triggerKeywords, keywordInput.trim()]);
                    setKeywordInput('');
                  }
                }}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-lg"
              >
                Add
              </button>
            </div>
          </div>

          {/* Recording Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Recorded Steps ({recordingSteps.length})</label>
              <button
                onClick={addRecordingStep}
                className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm hover:bg-primary/20"
              >
                <PlusCircle className="w-3 h-3" />
                Add Step
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recordingSteps.map((step, idx) => {
                const stepType = STEP_TYPES.find(t => t.value === step.type);
                return (
                  <div key={idx} className="bg-muted/20 border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">{idx + 1}</span>
                        <select
                          value={step.type || 'navigate'}
                          onChange={(e) => updateRecordingStep(idx, 'type', e.target.value)}
                          className="px-2 py-1 border border-border rounded bg-muted/50 text-sm"
                        >
                          {STEP_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                          ))}
                        </select>
                      </div>
                      <button onClick={() => removeRecordingStep(idx)} className="p-1 hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(step.type === 'navigate' || step.type === 'speak') && (
                        <div className="col-span-2">
                          <label className="text-xs text-muted-foreground">{step.type === 'navigate' ? 'URL' : 'Text'}</label>
                          <input
                            value={step.value || ''}
                            onChange={(e) => updateRecordingStep(idx, 'value', e.target.value)}
                            className="w-full px-2 py-1 border border-border rounded bg-muted/50 text-sm"
                            placeholder={step.type === 'navigate' ? 'https://...' : 'What to say...'}
                          />
                        </div>
                      )}
                      {(step.type === 'click' || step.type === 'input' || step.type === 'read') && (
                        <>
                          <div>
                            <label className="text-xs text-muted-foreground">CSS Selector</label>
                            <input
                              value={step.selector || ''}
                              onChange={(e) => updateRecordingStep(idx, 'selector', e.target.value)}
                              className="w-full px-2 py-1 border border-border rounded bg-muted/50 text-sm"
                              placeholder="#element-id"
                            />
                          </div>
                          {step.type === 'input' && (
                            <div>
                              <label className="text-xs text-muted-foreground">Value</label>
                              <input
                                value={step.value || ''}
                                onChange={(e) => updateRecordingStep(idx, 'value', e.target.value)}
                                className="w-full px-2 py-1 border border-border rounded bg-muted/50 text-sm"
                                placeholder="Text to type"
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {recordingSteps.length === 0 && (
                <p className="text-sm text-muted-foreground italic text-center py-4">No steps recorded yet. Click "Add Step" to start building your flow.</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-border rounded-lg hover:bg-muted/50">
            Cancel
          </button>
          <button
            onClick={handleSaveFlow}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Save Flow
          </button>
        </div>
      </div>
    </div>
  );
}
