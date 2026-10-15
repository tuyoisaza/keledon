import { useState } from "react";
import { X, PlusCircle, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { CATEGORIES, STEP_TYPES, type Flow, type FlowStep } from "./flow-types";


export default function FlowFormModal({ flow, onClose, onSuccess }: { flow?: Flow; onClose: () => void; onSuccess: () => void }) {
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
    setTriggerKeywords(triggerKeywords.filter((k: string) => k !== kw));
  };

  const addStep = (stepType: string) => {
    setSteps([...steps, { type: stepType as FlowStep['type'], order: steps.length, timeout: 10000 }]);
    setShowAddStep(false);
  };

  const updateStep = (index: number, field: keyof FlowStep, value: string | number | boolean) => {
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

      const endpoint = flow ? `/api/flows/${flow.id}` : '/api/flows';
      const method = flow ? 'PUT' : 'POST';
      const res = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(flow ? 'Flow updated' : 'Flow created');
      onSuccess();
    } catch (_err) {
      toast.error('Failed to save flow');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50 p-4">
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
              {triggerKeywords.map((kw: string) => (
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
