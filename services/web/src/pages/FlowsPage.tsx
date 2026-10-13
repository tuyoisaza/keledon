import { useState, useEffect } from 'react';
import { Workflow, Plus, Trash2, Edit2, Search, Filter, Mic, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-fetch';

import { CATEGORIES, STEP_TYPES, type Flow } from "./flow-types";
import FlowFormModal from "./FlowFormModal";
import FlowRecordModal from "./FlowRecordModal";
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
      const res = await apiFetch('/api/flows');
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
      const res = await apiFetch(`/api/flows/${flowId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Flow deleted');
      loadFlows();
    } catch (_err) {
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
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-foreground rounded-lg hover:bg-orange-700 transition-colors"
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
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-foreground rounded-lg hover:bg-orange-700"
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
                  <span className={`px-2 py-1 rounded text-xs ${flow.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-muted-foreground'}`}>
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
