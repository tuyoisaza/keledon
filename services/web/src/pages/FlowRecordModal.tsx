import { useState } from "react";
import { Mic, X, PlusCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { CATEGORIES, STEP_TYPES, type FlowStep } from "./flow-types";


export default function FlowRecordModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [isRecording] = useState(false);
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
      const res = await apiFetch('/api/flows', {
        method: 'POST',
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
    } catch (_err) {
      toast.error('Failed to save flow');
    }
  };

  return (
    <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50 p-4">
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
              {triggerKeywords.map((kw: string) => (
                <span key={kw} className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                  {kw}
                  <button onClick={() => setTriggerKeywords(triggerKeywords.filter((k: string) => k !== kw))} className="hover:text-destructive">
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
