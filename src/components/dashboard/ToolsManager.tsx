import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Wrench, Plus, Trash2, Loader2, ChevronDown, ChevronUp,
  Zap, Globe, Code2, Variable, Settings2, GripVertical, Copy,
  Target, CheckCircle2, Clock, AlertCircle, Calendar, Flag,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BotTool {
  id: string;
  project_id: string;
  tool_name: string;
  description: string;
  http_method: string;
  request_url: string;
  headers: Record<string, string>;
  body_template: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BotToolParameter {
  id: string;
  tool_id: string;
  param_name: string;
  param_type: string;
  description: string;
  location: string;
  required: boolean;
  default_value: string | null;
  created_at: string;
}

interface BotVariable {
  id: string;
  project_id: string;
  var_name: string;
  description: string;
  default_value: string | null;
  scope: string;
  bot_writable: boolean;
  created_at: string;
  updated_at: string;
}

interface ToolsManagerProps {
  projectId: string;
}

interface UserTask {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  type: 'task' | 'goal';
  created_at: string;
  updated_at: string;
}

export default function ToolsManager({ projectId }: ToolsManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tools, setTools] = useState<BotTool[]>([]);
  const [params, setParams] = useState<Record<string, BotToolParameter[]>>({});
  const [variables, setVariables] = useState<BotVariable[]>([]);
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [showAddTool, setShowAddTool] = useState(false);
  const [showAddVar, setShowAddVar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState<'task' | 'goal'>('task');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  // New tool form
  const [newTool, setNewTool] = useState({ tool_name: '', description: '', http_method: 'POST', request_url: '', headers: '{}', body_template: '{}' });
  // New param form
  const [newParam, setNewParam] = useState({ param_name: '', param_type: 'string', description: '', location: 'body', required: true, default_value: '' });
  // New variable form
  const [newVar, setNewVar] = useState({ var_name: '', description: '', default_value: '', scope: 'session', bot_writable: false });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [toolsRes, varsRes, tasksRes] = await Promise.all([
      supabase.from('bot_tools').select('*').eq('project_id', projectId).order('created_at').then(r => r),
      supabase.from('bot_variables').select('*').eq('project_id', projectId).order('created_at').then(r => r),
      user ? supabase.from('user_tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(r => r) : Promise.resolve({ data: null }),
    ]);
    const fetchedTools = (toolsRes.data || []) as BotTool[];
    setTools(fetchedTools);
    setVariables((varsRes.data || []) as BotVariable[]);
    if (tasksRes.data) setTasks(tasksRes.data as UserTask[]);

    if (fetchedTools.length > 0) {
      const toolIds = fetchedTools.map(t => t.id);
      const { data: paramsData } = await supabase.from('bot_tool_parameters').select('*').in('tool_id', toolIds).order('created_at');
      const grouped: Record<string, BotToolParameter[]> = {};
      (paramsData || []).forEach((p: BotToolParameter) => {
        if (!grouped[p.tool_id]) grouped[p.tool_id] = [];
        grouped[p.tool_id].push(p);
      });
      setParams(grouped);
    }
    setLoading(false);
  }, [projectId, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddTool = async () => {
    if (!newTool.tool_name.trim() || !newTool.request_url.trim()) {
      toast({ title: 'Missing fields', description: 'Name and URL are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      let parsedHeaders = {};
      let parsedBody = {};
      try { parsedHeaders = JSON.parse(newTool.headers); } catch { /* keep empty */ }
      try { parsedBody = JSON.parse(newTool.body_template); } catch { /* keep empty */ }

      const { error } = await supabase.from('bot_tools').insert({
        project_id: projectId,
        tool_name: newTool.tool_name.trim(),
        description: newTool.description.trim(),
        http_method: newTool.http_method,
        request_url: newTool.request_url.trim(),
        headers: parsedHeaders,
        body_template: parsedBody,
      });
      if (error) throw error;
      toast({ title: 'Tool added!' });
      setNewTool({ tool_name: '', description: '', http_method: 'POST', request_url: '', headers: '{}', body_template: '{}' });
      setShowAddTool(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDeleteTool = async (toolId: string) => {
    await supabase.from('bot_tools').delete().eq('id', toolId);
    setTools(prev => prev.filter(t => t.id !== toolId));
    toast({ title: 'Tool deleted' });
  };

  const handleToggleTool = async (toolId: string, active: boolean) => {
    await supabase.from('bot_tools').update({ is_active: active }).eq('id', toolId);
    setTools(prev => prev.map(t => t.id === toolId ? { ...t, is_active: active } : t));
  };

  const handleAddParam = async (toolId: string) => {
    if (!newParam.param_name.trim()) {
      toast({ title: 'Parameter name required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('bot_tool_parameters').insert({
        tool_id: toolId,
        param_name: newParam.param_name.trim(),
        param_type: newParam.param_type,
        description: newParam.description.trim(),
        location: newParam.location,
        required: newParam.required,
        default_value: newParam.default_value || null,
      });
      if (error) throw error;
      toast({ title: 'Parameter added!' });
      setNewParam({ param_name: '', param_type: 'string', description: '', location: 'body', required: true, default_value: '' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDeleteParam = async (paramId: string) => {
    await supabase.from('bot_tool_parameters').delete().eq('id', paramId);
    fetchData();
    toast({ title: 'Parameter removed' });
  };

  const handleAddVariable = async () => {
    if (!newVar.var_name.trim()) {
      toast({ title: 'Variable name required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('bot_variables').insert({
        project_id: projectId,
        var_name: newVar.var_name.trim(),
        description: newVar.description.trim(),
        default_value: newVar.default_value || null,
        scope: newVar.scope,
        bot_writable: newVar.bot_writable,
      });
      if (error) throw error;
      toast({ title: 'Variable added!' });
      setNewVar({ var_name: '', description: '', default_value: '', scope: 'session', bot_writable: false });
      setShowAddVar(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDeleteVariable = async (varId: string) => {
    await supabase.from('bot_variables').delete().eq('id', varId);
    setVariables(prev => prev.filter(v => v.id !== varId));
    toast({ title: 'Variable removed' });
  };

  // ──── TASKS & GOALS CRUD ────
  const addTask = async () => {
    if (!newTaskTitle.trim() || !user) return;
    const { data, error } = await supabase
      .from('user_tasks')
      .insert({
        user_id: user.id,
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        due_date: newTaskDueDate || null,
        type: taskTypeFilter,
      } as any)
      .select()
      .single();
    if (error) {
      toast({ title: 'Error', description: 'Could not add item', variant: 'destructive' });
      return;
    }
    setTasks(prev => [data as UserTask, ...prev]);
    setNewTaskTitle('');
    setNewTaskDueDate('');
    toast({ title: `${taskTypeFilter === 'goal' ? 'Goal' : 'Task'} added!` });
  };

  const updateTaskStatus = async (id: string, status: UserTask['status']) => {
    await supabase.from('user_tasks').update({ status }).eq('id', id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const deleteTask = async (id: string) => {
    await supabase.from('user_tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
    toast({ title: 'Deleted' });
  };

  const filteredTasks = tasks
    .filter(t => (t.type || 'task') === taskTypeFilter)
    .filter(t => taskFilter === 'all' || t.status === taskFilter);

  const currentTypeTasks = tasks.filter(t => (t.type || 'task') === taskTypeFilter);
  const todoCount = currentTypeTasks.filter(t => t.status === 'todo').length;
  const inProgressCount = currentTypeTasks.filter(t => t.status === 'in_progress').length;
  const doneCount = currentTypeTasks.filter(t => t.status === 'done').length;

  const priorityColors: Record<string, string> = {
    low: 'text-muted-foreground bg-muted',
    medium: 'text-primary bg-primary/10',
    high: 'text-destructive bg-destructive/10',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  return (
    <Tabs defaultValue="tools" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="tools" className="gap-2"><Wrench className="h-3.5 w-3.5" /> Tools ({tools.length})</TabsTrigger>
        <TabsTrigger value="variables" className="gap-2"><Variable className="h-3.5 w-3.5" /> Variables ({variables.length})</TabsTrigger>
        <TabsTrigger value="tasks" className="gap-2"><Target className="h-3.5 w-3.5" /> Tasks & Goals</TabsTrigger>
      </TabsList>

      {/* ──── TOOLS TAB ──── */}
      <TabsContent value="tools" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4" /> Bot Tools</CardTitle>
                <CardDescription>Define HTTP actions the bot can invoke during conversations</CardDescription>
              </div>
              <Button onClick={() => setShowAddTool(true)} size="sm" className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Add Tool
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tools.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No tools defined yet.</p>
                <p className="text-xs mt-1">Tools let your bot make HTTP requests to external APIs.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tools.map(tool => (
                  <div key={tool.id} className="border rounded-lg overflow-hidden">
                    {/* Tool Header */}
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/30 transition-colors"
                      onClick={() => setExpandedTool(expandedTool === tool.id ? null : tool.id)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">{tool.http_method}</Badge>
                        <span className="font-medium text-sm truncate">{tool.tool_name}</span>
                        {tool.description && <span className="text-xs text-muted-foreground truncate hidden sm:block">— {tool.description}</span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={tool.is_active ? 'default' : 'secondary'} className="text-[10px]">
                          {tool.is_active ? 'Active' : 'Off'}
                        </Badge>
                        <Switch
                          checked={tool.is_active}
                          onCheckedChange={(v) => { handleToggleTool(tool.id, v); }}
                          onClick={e => e.stopPropagation()}
                        />
                        {expandedTool === tool.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>

                    {/* Expanded Tool Details */}
                    {expandedTool === tool.id && (
                      <div className="border-t p-4 space-y-4 bg-secondary/20">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">URL</Label>
                            <p className="text-sm font-mono break-all">{tool.request_url}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Method</Label>
                            <p className="text-sm font-mono">{tool.http_method}</p>
                          </div>
                        </div>

                        {Object.keys(tool.headers || {}).length > 0 && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Headers</Label>
                            <pre className="text-xs bg-secondary/50 rounded p-2 mt-1 overflow-x-auto">{JSON.stringify(tool.headers, null, 2)}</pre>
                          </div>
                        )}

                        {Object.keys(tool.body_template || {}).length > 0 && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Body Template</Label>
                            <pre className="text-xs bg-secondary/50 rounded p-2 mt-1 overflow-x-auto">{JSON.stringify(tool.body_template, null, 2)}</pre>
                          </div>
                        )}

                        {/* Parameters Section */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs text-muted-foreground">Parameters (bot-assigned)</Label>
                            <Badge variant="outline" className="text-[10px]">{(params[tool.id] || []).length} params</Badge>
                          </div>

                          {(params[tool.id] || []).length > 0 && (
                            <div className="space-y-1.5 mb-3">
                              {(params[tool.id] || []).map(p => (
                                <div key={p.id} className="flex items-center gap-2 p-2 rounded bg-secondary/40 text-sm group">
                                  <Code2 className="h-3 w-3 text-primary shrink-0" />
                                  <span className="font-mono text-xs font-medium">{p.param_name}</span>
                                  <Badge variant="outline" className="text-[9px]">{p.param_type}</Badge>
                                  <Badge variant="outline" className="text-[9px]">{p.location}</Badge>
                                  {p.required && <Badge variant="destructive" className="text-[9px]">req</Badge>}
                                  {p.description && <span className="text-xs text-muted-foreground truncate flex-1">{p.description}</span>}
                                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteParam(p.id)}>
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add Parameter inline form */}
                          <div className="border rounded-lg p-3 space-y-2 bg-background">
                            <p className="text-xs font-medium">Add Parameter</p>
                            <div className="grid grid-cols-2 gap-2">
                              <Input placeholder="param_name" value={newParam.param_name} onChange={e => setNewParam({...newParam, param_name: e.target.value})} className="h-8 text-xs" />
                              <Select value={newParam.param_type} onValueChange={v => setNewParam({...newParam, param_type: v})}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="string">string</SelectItem>
                                  <SelectItem value="number">number</SelectItem>
                                  <SelectItem value="boolean">boolean</SelectItem>
                                  <SelectItem value="object">object</SelectItem>
                                  <SelectItem value="array">array</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Input placeholder="Description (what should the bot fill in?)" value={newParam.description} onChange={e => setNewParam({...newParam, description: e.target.value})} className="h-8 text-xs" />
                            <div className="flex gap-2 items-center">
                              <Select value={newParam.location} onValueChange={v => setNewParam({...newParam, location: v})}>
                                <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="body">Body</SelectItem>
                                  <SelectItem value="query">Query</SelectItem>
                                  <SelectItem value="header">Header</SelectItem>
                                  <SelectItem value="path">Path</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="flex items-center gap-1.5">
                                <Switch checked={newParam.required} onCheckedChange={v => setNewParam({...newParam, required: v})} />
                                <span className="text-xs">Required</span>
                              </div>
                              <Input placeholder="Default" value={newParam.default_value} onChange={e => setNewParam({...newParam, default_value: e.target.value})} className="h-8 text-xs flex-1" />
                              <Button size="sm" className="h-8" onClick={() => handleAddParam(tool.id)} disabled={saving}>
                                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteTool(tool.id)}>
                            <Trash2 className="h-3 w-3 mr-1" /> Delete Tool
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Tool Dialog */}
        <Dialog open={showAddTool} onOpenChange={setShowAddTool}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Add New Tool</DialogTitle>
              <DialogDescription>Define an HTTP action that your bot can call during conversations.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tool Name</Label>
                <Input placeholder="e.g. search_products" value={newTool.tool_name} onChange={e => setNewTool({...newTool, tool_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="What does this tool do? The bot uses this to decide when to call it." value={newTool.description} onChange={e => setNewTool({...newTool, description: e.target.value})} rows={2} />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select value={newTool.http_method} onValueChange={v => setNewTool({...newTool, http_method: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3 space-y-2">
                  <Label>Request URL</Label>
                  <Input placeholder="https://api.example.com/endpoint" value={newTool.request_url} onChange={e => setNewTool({...newTool, request_url: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Headers (JSON)</Label>
                <Textarea placeholder='{"Authorization": "Bearer ..."}' value={newTool.headers} onChange={e => setNewTool({...newTool, headers: e.target.value})} rows={2} className="font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label>Body Template (JSON)</Label>
                <Textarea placeholder='{"query": "{{search_term}}", "limit": 10}' value={newTool.body_template} onChange={e => setNewTool({...newTool, body_template: e.target.value})} rows={3} className="font-mono text-xs" />
                <p className="text-xs text-muted-foreground">Use {"{{param_name}}"} placeholders for bot-assigned values.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddTool(false)}>Cancel</Button>
              <Button onClick={handleAddTool} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                Add Tool
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>

      {/* ──── VARIABLES TAB ──── */}
      <TabsContent value="variables" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base"><Variable className="h-4 w-4" /> Bot Variables</CardTitle>
                <CardDescription>Variables received via API or set during conversations. Bot can read/write based on permissions.</CardDescription>
              </div>
              <Button onClick={() => setShowAddVar(true)} size="sm" className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Add Variable
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {variables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Variable className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No variables defined yet.</p>
                <p className="text-xs mt-1">Variables let the API caller pass data and the bot can modify them.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {variables.map(v => (
                  <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border group">
                    <Variable className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{v.var_name}</span>
                        <Badge variant="outline" className="text-[10px]">{v.scope}</Badge>
                        {v.bot_writable && <Badge className="text-[10px]">writable</Badge>}
                        {!v.bot_writable && <Badge variant="secondary" className="text-[10px]">read-only</Badge>}
                      </div>
                      {v.description && <p className="text-xs text-muted-foreground mt-0.5">{v.description}</p>}
                      {v.default_value && <p className="text-xs font-mono text-muted-foreground">default: {v.default_value}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteVariable(v.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Variable Dialog */}
        <Dialog open={showAddVar} onOpenChange={setShowAddVar}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Variable className="h-5 w-5" /> Add Variable</DialogTitle>
              <DialogDescription>Variables can be passed via the API and optionally edited by the bot.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Variable Name</Label>
                <Input placeholder="e.g. user_language" value={newVar.var_name} onChange={e => setNewVar({...newVar, var_name: e.target.value})} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input placeholder="What does this variable represent?" value={newVar.description} onChange={e => setNewVar({...newVar, description: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Default Value</Label>
                <Input placeholder="Optional default" value={newVar.default_value} onChange={e => setNewVar({...newVar, default_value: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scope</Label>
                  <Select value={newVar.scope} onValueChange={v => setNewVar({...newVar, scope: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="session">Session (ephemeral)</SelectItem>
                      <SelectItem value="persistent">Persistent (saved)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bot Permission</Label>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch checked={newVar.bot_writable} onCheckedChange={v => setNewVar({...newVar, bot_writable: v})} />
                    <span className="text-sm">{newVar.bot_writable ? 'Bot can write' : 'Read-only'}</span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddVar(false)}>Cancel</Button>
              <Button onClick={handleAddVariable} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                Add Variable
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>

      {/* ──── TASKS & GOALS TAB ──── */}
      <TabsContent value="tasks" className="space-y-4">
        {/* Type toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={taskTypeFilter === 'task' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setTaskTypeFilter('task'); setTaskFilter('all'); }}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Tasks
          </Button>
          <Button
            variant={taskTypeFilter === 'goal' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setTaskTypeFilter('goal'); setTaskFilter('all'); }}
          >
            <Flag className="h-3.5 w-3.5 mr-1.5" /> Goals
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-3">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setTaskFilter('todo')}>
            <CardContent className="pt-3 pb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xl font-bold">{todoCount}</p>
                <p className="text-[10px] text-muted-foreground">To Do</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setTaskFilter('in_progress')}>
            <CardContent className="pt-3 pb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xl font-bold">{inProgressCount}</p>
                <p className="text-[10px] text-muted-foreground">In Progress</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setTaskFilter('done')}>
            <CardContent className="pt-3 pb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xl font-bold">{doneCount}</p>
                <p className="text-[10px] text-muted-foreground">Done</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add item */}
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder={taskTypeFilter === 'goal' ? 'Define a new goal...' : 'What do you need to do?'}
                className="flex-1"
                onKeyDown={e => e.key === 'Enter' && addTask()}
              />
              <Select value={newTaskPriority} onValueChange={(v) => setNewTaskPriority(v as any)}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Low</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="high">🔴 High</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} className="w-[140px]" />
              <Button onClick={addTask} size="sm" className="gradient-primary gap-1" disabled={!newTaskTitle.trim()}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filter */}
        <div className="flex gap-1.5">
          {(['all', 'todo', 'in_progress', 'done'] as const).map(f => (
            <Button key={f} variant={taskFilter === f ? 'default' : 'outline'} size="sm" onClick={() => setTaskFilter(f)} className="capitalize text-xs h-7">
              {f.replace('_', ' ')} {f === 'all' ? `(${currentTypeTasks.length})` : ''}
            </Button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-1.5">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-10">
              <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No {taskTypeFilter}s yet. Add one above!</p>
            </div>
          ) : (
            filteredTasks.map(task => (
              <Card key={task.id} className={`transition-all ${task.status === 'done' ? 'opacity-60' : ''}`}>
                <CardContent className="py-2.5 px-3 flex items-center gap-2">
                  <Checkbox
                    checked={task.status === 'done'}
                    onCheckedChange={(checked) => updateTaskStatus(task.id, checked ? 'done' : 'todo')}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through' : ''}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="secondary" className={`text-[9px] ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </Badge>
                      {task.due_date && (
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Select value={task.status} onValueChange={(v) => updateTaskStatus(task.id, v as UserTask['status'])}>
                    <SelectTrigger className="w-[110px] h-7 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">📋 To Do</SelectItem>
                      <SelectItem value="in_progress">🔄 In Progress</SelectItem>
                      <SelectItem value="done">✅ Done</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive shrink-0" onClick={() => deleteTask(task.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center">The AI Assistant can see your tasks & goals for context.</p>
      </TabsContent>
    </Tabs>
  );
}
