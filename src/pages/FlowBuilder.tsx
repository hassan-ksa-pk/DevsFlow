import { useState, useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
  Handle,
  Position,
  getRectOfNodes,
  getTransformForBounds,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail, Database, Globe, MessageSquare, Bell, FileText, Zap, GitBranch, Clock, Filter,
  Send, Webhook, Cloud, Lock, CreditCard, Users, ShoppingCart, Image, Video, Music,
  MapPin, Calendar, Sparkles, Trash2, Download, LucideIcon, Plus, Settings, Server,
  Code, Terminal, Folder, File, Search, Heart, Star, Check, X, AlertTriangle, Info,
  HelpCircle, Home, User, LogIn, LogOut, Key, Shield, Eye, EyeOff, Edit, Copy,
  Clipboard, Link, ExternalLink, Share, Upload, Printer, Save, RefreshCw, RotateCcw,
  Play, Pause, Square, SkipForward, SkipBack, Volume2, Mic, Camera, Phone, Smartphone,
  Tablet, Monitor, Laptop, Wifi, Bluetooth, Battery, Cpu, HardDrive, Package, Box,
  Gift, Tag, Bookmark, Flag, Award, Trophy, Target, Crosshair, Navigation, Compass,
  Map, Building, Briefcase, DollarSign, PieChart, BarChart, TrendingUp, TrendingDown,
  Activity, Layers, Grid, List, LayoutGrid, Columns, Rows, Table, Hash, AtSign, Percent, Calculator, FolderOpen, History,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { toPng, toSvg } from "html-to-image";

// Icon map for resolving icon names to components
const iconMap: Record<string, LucideIcon> = {
  Webhook, Clock, Mail, Database, Globe, MessageSquare, Bell, GitBranch, Filter, Zap,
  CreditCard, Lock, Users, Image, Video, FileText, Cloud, Send, ShoppingCart, MapPin,
  Calendar, Music, Settings, Server, Code, Terminal, Folder, File, Search, Heart, Star,
  Check, X, AlertTriangle, Info, HelpCircle, Home, User, LogIn, LogOut, Key, Shield,
  Eye, EyeOff, Edit, Copy, Clipboard, Link, ExternalLink, Share, Upload, Printer, Save,
  RefreshCw, RotateCcw, Play, Pause, Square, SkipForward, SkipBack, Volume2, Mic, Camera,
  Phone, Smartphone, Tablet, Monitor, Laptop, Wifi, Bluetooth, Battery, Cpu, HardDrive,
  Package, Box, Gift, Tag, Bookmark, Flag, Award, Trophy, Target, Crosshair, Navigation,
  Compass, Map, Building, Briefcase, DollarSign, PieChart, BarChart, TrendingUp,
  TrendingDown, Activity, Layers, Grid, List, LayoutGrid, Columns, Rows, Table, Hash,
  AtSign, Percent, Calculator, Sparkles, Trash2, Download, Plus,
};

const iconNames = Object.keys(iconMap);

const colorOptions = [
  { value: "bg-purple-500", label: "Purple" },
  { value: "bg-blue-500", label: "Blue" },
  { value: "bg-green-500", label: "Green" },
  { value: "bg-cyan-500", label: "Cyan" },
  { value: "bg-yellow-500", label: "Yellow" },
  { value: "bg-orange-500", label: "Orange" },
  { value: "bg-red-500", label: "Red" },
  { value: "bg-pink-500", label: "Pink" },
  { value: "bg-violet-500", label: "Violet" },
  { value: "bg-indigo-500", label: "Indigo" },
  { value: "bg-teal-500", label: "Teal" },
  { value: "bg-emerald-500", label: "Emerald" },
  { value: "bg-rose-500", label: "Rose" },
  { value: "bg-amber-500", label: "Amber" },
  { value: "bg-sky-500", label: "Sky" },
  { value: "bg-fuchsia-500", label: "Fuchsia" },
];

const typeOptions = [
  { value: "trigger", label: "Trigger" },
  { value: "action", label: "Action" },
  { value: "logic", label: "Logic" },
  { value: "integration", label: "Integration" },
  { value: "custom", label: "Custom" },
];

const nodeCategories = [
  {
    name: "Triggers",
    nodes: [
      { type: "trigger", label: "Webhook", iconName: "Webhook", color: "bg-purple-500", description: "", action: "Receive webhook" },
      { type: "trigger", label: "Schedule", iconName: "Clock", color: "bg-purple-500", description: "", action: "Run on schedule" },
      { type: "trigger", label: "Form Submit", iconName: "FileText", color: "bg-purple-500", description: "", action: "On form submit" },
    ],
  },
  {
    name: "Communication",
    nodes: [
      { type: "action", label: "Send Email", iconName: "Mail", color: "bg-blue-500", description: "", action: "Send email" },
      { type: "action", label: "Send SMS", iconName: "MessageSquare", color: "bg-green-500", description: "", action: "Send SMS" },
      { type: "action", label: "Push Notification", iconName: "Bell", color: "bg-orange-500", description: "", action: "Send notification" },
    ],
  },
  {
    name: "Data",
    nodes: [
      { type: "action", label: "Database Query", iconName: "Database", color: "bg-cyan-500", description: "", action: "Query database" },
      { type: "action", label: "API Request", iconName: "Globe", color: "bg-indigo-500", description: "", action: "Make API call" },
      { type: "action", label: "Cloud Storage", iconName: "Cloud", color: "bg-sky-500", description: "", action: "Store in cloud" },
    ],
  },
  {
    name: "Logic",
    nodes: [
      { type: "logic", label: "Condition", iconName: "GitBranch", color: "bg-yellow-500", description: "", action: "If/else branch" },
      { type: "logic", label: "Filter", iconName: "Filter", color: "bg-amber-500", description: "", action: "Filter data" },
      { type: "logic", label: "Transform", iconName: "Zap", color: "bg-rose-500", description: "", action: "Transform data" },
    ],
  },
  {
    name: "Integrations",
    nodes: [
      { type: "integration", label: "Stripe Payment", iconName: "CreditCard", color: "bg-violet-500", description: "", action: "Process payment" },
      { type: "integration", label: "Auth Check", iconName: "Lock", color: "bg-red-500", description: "", action: "Verify auth" },
      { type: "integration", label: "User Lookup", iconName: "Users", color: "bg-teal-500", description: "", action: "Find user" },
    ],
  },
  {
    name: "Media",
    nodes: [
      { type: "action", label: "Generate Image", iconName: "Image", color: "bg-pink-500", description: "", action: "Generate image" },
      { type: "action", label: "Process Video", iconName: "Video", color: "bg-fuchsia-500", description: "", action: "Process video" },
      { type: "action", label: "Audio Convert", iconName: "Music", color: "bg-emerald-500", description: "", action: "Convert audio" },
    ],
  },
];

interface NodeParam {
  key: string;
  value: string;
}

interface NodeData {
  label: string;
  type: string;
  iconName: string;
  color: string;
  description?: string;
  action?: string;
  parameters?: NodeParam[];
  payload?: string;
  outputPorts?: number;
  onDelete?: (e: React.MouseEvent) => void;
}

const FlowNode = ({ data, selected }: { data: NodeData; selected?: boolean }) => {
  const IconComponent = iconMap[data.iconName] || Zap;
  const hasParams = data.parameters && data.parameters.length > 0;
  const hasPayload = !!data.payload;
  const portCount = data.outputPorts || 1;
  const sourceHandles = Array.from({ length: portCount }, (_, i) => {
    const pct = portCount === 1 ? 50 : 20 + (i * 60) / (portCount - 1);
    return { id: `source-${i}`, top: `${pct}%` };
  });
  return (
    <div className="relative group">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />
      {sourceHandles.map((h) => (
        <Handle
          key={h.id}
          type="source"
          position={Position.Right}
          id={h.id}
          style={{ top: h.top }}
          className="!w-3 !h-3 !bg-primary !border-2 !border-background"
        />
      ))}
      {data.onDelete && (
        <button
          onClick={data.onDelete}
          className="absolute -top-2 -right-2 z-10 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:scale-110"
          title="Delete node"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      <Card className={`min-w-[220px] max-w-[280px] shadow-lg border-2 transition-all ${selected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-muted-foreground/50"}`}>
        <CardHeader className="p-3 pb-1">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${data.color} text-white`}>
              <IconComponent className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-medium truncate">{data.label}</CardTitle>
              {data.action && (
                <p className="text-xs text-muted-foreground truncate">{data.action}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-1 space-y-1.5">
          <Badge variant="outline" className="text-xs">{data.type}</Badge>
          {data.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{data.description}</p>
          )}
          {hasParams && (
            <div className="border-t border-border pt-1.5 mt-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Parameters</p>
              <div className="space-y-0.5">
                {data.parameters!.map((p, i) => (
                  <div key={i} className="flex items-center gap-1 text-[11px]">
                    <span className="font-mono text-primary/80 font-medium">{p.key}</span>
                    <span className="text-muted-foreground">:</span>
                    <span className="text-muted-foreground truncate">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {hasPayload && (
            <div className="border-t border-border pt-1.5 mt-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Payload</p>
              <pre className="text-[10px] text-muted-foreground bg-muted/50 rounded p-1.5 font-mono overflow-hidden max-h-[60px] whitespace-pre-wrap break-all">{data.payload}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const nodeTypes = { custom: FlowNode };

const FlowBuilder = () => {
  const { user } = useAuth();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [editForm, setEditForm] = useState<NodeData>({ label: "", type: "action", iconName: "Zap", color: "bg-blue-500", description: "", action: "", parameters: [], payload: "", outputPorts: 1 });
  
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customForm, setCustomForm] = useState<NodeData>({ label: "", type: "custom", iconName: "Zap", color: "bg-blue-500", description: "", action: "", parameters: [], payload: "", outputPorts: 1 });

  // Saved flows state
  const [savedFlows, setSavedFlows] = useState<{ id: string; name: string; description: string; updated_at: string }[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [flowName, setFlowName] = useState("");
  const [flowDescription, setFlowDescription] = useState("");
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);

  // Load saved flows on mount
  useEffect(() => {
    if (user) {
      loadSavedFlows();
    }
  }, [user]);

  const loadSavedFlows = async () => {
    const { data } = await supabase
      .from("saved_flows")
      .select("id, name, description, updated_at")
      .order("updated_at", { ascending: false });
    if (data) setSavedFlows(data);
  };

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 }, animated: true }, eds)
      ),
    [setEdges]
  );

  const onDragStart = (event: React.DragEvent, nodeData: any) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const deleteNodeById = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    toast.success("Node deleted!");
  }, [setNodes, setEdges]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const data = event.dataTransfer.getData("application/reactflow");
      if (!data || !reactFlowInstance) return;
      const nodeData = JSON.parse(data);
      const nodeId = `node_${Date.now()}`;
      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setNodes((nds) => nds.concat({
        id: nodeId,
        type: "custom",
        position,
        data: { ...nodeData, onDelete: (e: React.MouseEvent) => { e.stopPropagation(); deleteNodeById(nodeId); } },
      }));
    },
    [reactFlowInstance, setNodes, deleteNodeById]
  );

  const onNodeDoubleClick = useCallback((_: any, node: Node) => {
    setEditingNode(node);
    setEditForm(node.data as NodeData);
  }, []);

  const saveNodeEdit = () => {
    if (!editingNode) return;
    const nodeId = editingNode.id;
    setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...editForm, onDelete: (e: React.MouseEvent) => { e.stopPropagation(); deleteNodeById(nodeId); } } } : n)));
    setEditingNode(null);
    toast.success("Node updated!");
  };

  const deleteNode = () => {
    if (!editingNode) return;
    deleteNodeById(editingNode.id);
    setEditingNode(null);
  };

  const addCustomNode = () => {
    if (!customForm.label.trim()) { toast.error("Please enter a label"); return; }
    const nodeId = `node_${Date.now()}`;
    const position = { x: 250 + Math.random() * 100, y: 100 + nodes.length * 100 };
    setNodes((nds) => nds.concat({
      id: nodeId,
      type: "custom",
      position,
      data: { ...customForm, onDelete: (e: React.MouseEvent) => { e.stopPropagation(); deleteNodeById(nodeId); } },
    }));
    setShowCustomDialog(false);
    setCustomForm({ label: "", type: "custom", iconName: "Zap", color: "bg-blue-500", description: "", action: "", parameters: [], payload: "", outputPorts: 1 });
    toast.success("Custom node added!");
  };

  const clearCanvas = () => { setNodes([]); setEdges([]); };

  const generateFlowWithAI = async () => {
    if (!aiPrompt.trim()) { toast.error("Please enter a description"); return; }
    setIsGenerating(true);
    try {
      const response = await supabase.functions.invoke("ai-tools", {
        body: {
          type: "courses",
          stream: false,
          messages: [{
            role: "user",
            content: `Generate a workflow for: "${aiPrompt}"

Return ONLY JSON (no markdown):
{
  "nodes": [{"id": "1", "label": "Label", "type": "trigger|action|logic|integration", "iconName": "Webhook|Clock|Mail|Database|Globe|MessageSquare|Bell|GitBranch|Filter|Zap|CreditCard|Lock|Users|Image|Video|FileText|Cloud|Send|Server|Code|Key|Shield|User|Home|Settings|Search", "color": "bg-purple-500|bg-blue-500|bg-green-500|bg-cyan-500|bg-yellow-500|bg-orange-500|bg-red-500|bg-pink-500|bg-violet-500|bg-indigo-500|bg-teal-500|bg-emerald-500", "x": 100, "y": 150, "description": "Brief description", "action": "Action verb", "parameters": [{"key": "param_name", "value": "param_value"}], "payload": "{ \\"key\\": \\"value\\" }"}],
  "edges": [{"source": "1", "target": "2", "label": "data flow label"}]
}

Create 4-8 nodes. Position horizontally with ~280px x-spacing. Use LEFT-TO-RIGHT layout.
Each node should have realistic parameters and payload showing what data flows through it.
For example a "Send Email" node might have parameters: [{"key":"to","value":"user.email"},{"key":"subject","value":"Welcome!"}] and payload: "{ \\"body\\": \\"...\\" }".`,
          }],
        },
      });
      if (response.error) throw response.error;

      const content = response.data?.content || response.data;
      let jsonStr = typeof content === "string" ? content : JSON.stringify(content);

      // Extract JSON from possible markdown
      jsonStr = jsonStr.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const jsonStart = jsonStr.search(/[\{\[]/);
      const jsonEnd = jsonStr.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("Invalid response");
      jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);

      const flowData = JSON.parse(jsonStr);
      if (!flowData?.nodes) throw new Error("Invalid flow data");

      const newNodes: Node[] = flowData.nodes.map((n: any, index: number) => {
        const nodeId = n.id || `node_${index}`;
        return {
          id: nodeId,
          type: "custom",
          position: { x: n.x || index * 280, y: n.y || 150 },
          data: {
            label: n.label, type: n.type || "action", iconName: n.iconName || n.icon || "Zap",
            color: n.color || "bg-blue-500", description: n.description || "", action: n.action || "",
            parameters: Array.isArray(n.parameters) ? n.parameters : [],
            payload: n.payload || "",
            onDelete: (e: React.MouseEvent) => { e.stopPropagation(); deleteNodeById(nodeId); },
          },
        };
      });

      const newEdges: Edge[] = (flowData.edges || []).map((e: any, index: number) => ({
        id: `edge_${index}`,
        source: e.source,
        target: e.target,
        label: e.label || undefined,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
        animated: true,
        labelStyle: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
        labelBgStyle: { fill: 'hsl(var(--card))', fillOpacity: 0.8 },
      }));

      setNodes(newNodes);
      setEdges(newEdges);
      toast.success("Flow generated!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to generate");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportFlow = () => {
    const blob = new Blob([JSON.stringify({ nodes, edges }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flow-diagram.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Flow exported as JSON!");
  };

  const getExportOptions = (format: 'svg' | 'png') => {
    const nodesBounds = getRectOfNodes(nodes);
    const padding = 50;
    const imageWidth = nodesBounds.width + padding * 2;
    const imageHeight = nodesBounds.height + padding * 2;
    const transform = getTransformForBounds(nodesBounds, imageWidth, imageHeight, 0.5, 2, padding);

    return {
      width: imageWidth,
      height: imageHeight,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${transform[0]}px, ${transform[1]}px) scale(${transform[2]})`,
      },
      filter: (node: Element) => {
        if (node?.classList?.contains("react-flow__minimap") || node?.classList?.contains("react-flow__controls") || node?.classList?.contains("react-flow__panel")) return false;
        return true;
      },
      ...(format === 'png' ? { backgroundColor: "#0a0a0a" } : {}),
    };
  };

  const exportAsSvg = () => {
    const viewport = document.querySelector(".react-flow__viewport") as HTMLElement;
    if (!viewport || !nodes.length) return;
    toSvg(viewport, getExportOptions('svg')).then((dataUrl) => {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "flow-diagram.svg";
      a.click();
      toast.success("Flow exported as SVG!");
    }).catch(() => toast.error("Failed to export SVG"));
  };

  const exportAsPng = () => {
    const viewport = document.querySelector(".react-flow__viewport") as HTMLElement;
    if (!viewport || !nodes.length) return;
    toPng(viewport, getExportOptions('png')).then((dataUrl) => {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "flow-diagram.png";
      a.click();
      toast.success("Flow exported as PNG!");
    }).catch(() => toast.error("Failed to export PNG"));
  };

  const saveFlow = async () => {
    if (!user) { toast.error("Please sign in to save flows"); return; }
    if (!flowName.trim()) { toast.error("Please enter a name"); return; }

    // Strip onDelete from node data before saving
    const cleanNodes = nodes.map((n) => ({ ...n, data: { ...n.data, onDelete: undefined } }));

    if (currentFlowId) {
      const { error } = await supabase
        .from("saved_flows")
        .update({ name: flowName, description: flowDescription, nodes: cleanNodes as any, edges: edges as any, updated_at: new Date().toISOString() })
        .eq("id", currentFlowId);
      if (error) { toast.error("Failed to save"); return; }
      toast.success("Flow updated!");
    } else {
      const { data, error } = await supabase
        .from("saved_flows")
        .insert({ user_id: user.id, name: flowName, description: flowDescription, nodes: cleanNodes as any, edges: edges as any })
        .select("id")
        .single();
      if (error) { toast.error("Failed to save"); return; }
      setCurrentFlowId(data.id);
      toast.success("Flow saved!");
    }
    setShowSaveDialog(false);
    loadSavedFlows();
  };

  const loadFlow = async (flowId: string) => {
    const { data, error } = await supabase
      .from("saved_flows")
      .select("*")
      .eq("id", flowId)
      .single();
    if (error || !data) { toast.error("Failed to load flow"); return; }

    const loadedNodes = (data.nodes as any[]).map((n: any) => ({
      ...n,
      data: {
        ...n.data,
        onDelete: (e: React.MouseEvent) => { e.stopPropagation(); deleteNodeById(n.id); },
      },
    }));
    setNodes(loadedNodes);
    setEdges(data.edges as any[]);
    setCurrentFlowId(data.id);
    setFlowName(data.name);
    setFlowDescription(data.description || "");
    setShowLoadDialog(false);
    toast.success(`Loaded "${data.name}"`);
  };

  const deleteFlow = async (flowId: string) => {
    const { error } = await supabase.from("saved_flows").delete().eq("id", flowId);
    if (error) { toast.error("Failed to delete"); return; }
    if (currentFlowId === flowId) { setCurrentFlowId(null); setFlowName(""); }
    toast.success("Flow deleted!");
    loadSavedFlows();
  };

  const IconPickerGrid = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div className="grid grid-cols-8 gap-1 max-h-[200px] overflow-y-auto p-2 border rounded-md bg-muted/30">
      {iconNames.map((name) => {
        const Icon = iconMap[name];
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            className={`p-2 rounded hover:bg-accent transition-colors ${value === name ? "bg-primary text-primary-foreground" : ""}`}
            title={name}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {sidebarOpen && (
      <div className="w-72 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Flow Builder
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Drag nodes • Double-click to edit</p>
        </div>

        <div className="p-3 border-b">
          <Button onClick={() => setShowCustomDialog(true)} variant="outline" className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add Custom Node
          </Button>
        </div>

        <ScrollArea className="flex-1 p-3">
          {nodeCategories.map((category) => (
            <div key={category.name} className="mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{category.name}</h3>
              <div className="space-y-2">
                {category.nodes.map((node, idx) => {
                  const NodeIcon = iconMap[node.iconName] || Zap;
                  return (
                    <div
                      key={idx}
                      draggable
                      onDragStart={(e) => onDragStart(e, node)}
                      className="flex items-center gap-2 p-2 rounded-lg border bg-background hover:bg-accent cursor-grab active:cursor-grabbing transition-colors"
                    >
                      <div className={`p-1.5 rounded-md ${node.color} text-white`}>
                        <NodeIcon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm font-medium">{node.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </ScrollArea>

        <div className="p-3 border-t bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">AI Generate</span>
          </div>
          <Textarea
            placeholder="Describe your app flow..."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="text-xs min-h-[60px] mb-2"
          />
          <Button onClick={generateFlowWithAI} disabled={isGenerating} className="w-full" size="sm">
            {isGenerating ? <><Sparkles className="h-4 w-4 animate-spin mr-2" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Flow</>}
          </Button>
        </div>
      </div>
      )}

      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 left-2 z-10 bg-card border shadow-sm"
          onClick={() => setSidebarOpen((v) => !v)}
          title={sidebarOpen ? "Hide panel" : "Show panel"}
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
        </Button>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeDoubleClick={onNodeDoubleClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          className="bg-muted/20"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls className="bg-card border rounded-lg" />
          <Panel position="top-right" className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={clearCanvas}><Trash2 className="h-4 w-4 mr-1" />Clear</Button>
            <Button variant="outline" size="sm" onClick={exportAsSvg}><Download className="h-4 w-4 mr-1" />SVG</Button>
            <Button variant="outline" size="sm" onClick={exportAsPng}><Download className="h-4 w-4 mr-1" />PNG</Button>
            <Button variant="outline" size="sm" onClick={exportFlow}><Download className="h-4 w-4 mr-1" />JSON</Button>
            <Button variant="outline" size="sm" onClick={() => { setShowSaveDialog(true); if (!flowName && nodes.length) setFlowName("Untitled Flow"); }}>
              <Save className="h-4 w-4 mr-1" />{currentFlowId ? "Update" : "Save"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowLoadDialog(true)}>
              <FolderOpen className="h-4 w-4 mr-1" />Load
            </Button>
          </Panel>
        </ReactFlow>

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-muted-foreground">
              <GitBranch className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Drag nodes here or use AI to generate</p>
              <p className="text-sm">Connect by dragging from right handles to left handles</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!editingNode} onOpenChange={(open) => !open && setEditingNode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Node</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-2">
            <div><Label>Label</Label><Input value={editForm.label} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} /></div>
            <div><Label>Action</Label><Input value={editForm.action || ""} onChange={(e) => setEditForm({ ...editForm, action: e.target.value })} placeholder="e.g., Send email" /></div>
            <div><Label>Description</Label><Textarea value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="min-h-[60px]" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{typeOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Color</Label>
                <Select value={editForm.color} onValueChange={(v) => setEditForm({ ...editForm, color: v })}>
                  <SelectTrigger><div className="flex items-center gap-2"><div className={`w-4 h-4 rounded ${editForm.color}`} /><SelectValue /></div></SelectTrigger>
                  <SelectContent>{colorOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}><div className="flex items-center gap-2"><div className={`w-4 h-4 rounded ${opt.value}`} />{opt.label}</div></SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Parameters</Label>
              <div className="space-y-2">
                {(editForm.parameters || []).map((p, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input className="flex-1" placeholder="key" value={p.key} onChange={(e) => { const params = [...(editForm.parameters || [])]; params[i] = { ...params[i], key: e.target.value }; setEditForm({ ...editForm, parameters: params }); }} />
                    <Input className="flex-1" placeholder="value" value={p.value} onChange={(e) => { const params = [...(editForm.parameters || [])]; params[i] = { ...params[i], value: e.target.value }; setEditForm({ ...editForm, parameters: params }); }} />
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => { const params = (editForm.parameters || []).filter((_, idx) => idx !== i); setEditForm({ ...editForm, parameters: params }); }}><X className="h-3 w-3" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setEditForm({ ...editForm, parameters: [...(editForm.parameters || []), { key: "", value: "" }] })}><Plus className="h-3 w-3 mr-1" />Add Parameter</Button>
              </div>
            </div>
            <div><Label>Payload</Label><Textarea value={editForm.payload || ""} onChange={(e) => setEditForm({ ...editForm, payload: e.target.value })} placeholder='e.g., { "body": "Hello" }' className="min-h-[60px] font-mono text-xs" /></div>
            <div>
              <Label>Output Ports</Label>
              <Input type="number" min={1} max={5} value={editForm.outputPorts || 1} onChange={(e) => setEditForm({ ...editForm, outputPorts: Math.max(1, Math.min(5, parseInt(e.target.value) || 1)) })} />
              <p className="text-[10px] text-muted-foreground mt-1">Each port can connect to multiple nodes (1–5)</p>
            </div>
            <div><Label className="mb-2 block">Icon</Label><IconPickerGrid value={editForm.iconName} onChange={(v) => setEditForm({ ...editForm, iconName: v })} /></div>
          </div>
          </ScrollArea>
          <DialogFooter className="flex gap-2">
            <Button variant="destructive" onClick={deleteNode}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
            <Button onClick={saveNodeEdit}><Save className="h-4 w-4 mr-1" />Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Custom Node</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-2">
            <div><Label>Label *</Label><Input value={customForm.label} onChange={(e) => setCustomForm({ ...customForm, label: e.target.value })} placeholder="e.g., Send Slack Message" /></div>
            <div><Label>Action</Label><Input value={customForm.action || ""} onChange={(e) => setCustomForm({ ...customForm, action: e.target.value })} placeholder="e.g., Post to #general" /></div>
            <div><Label>Description</Label><Textarea value={customForm.description || ""} onChange={(e) => setCustomForm({ ...customForm, description: e.target.value })} className="min-h-[60px]" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={customForm.type} onValueChange={(v) => setCustomForm({ ...customForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{typeOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Color</Label>
                <Select value={customForm.color} onValueChange={(v) => setCustomForm({ ...customForm, color: v })}>
                  <SelectTrigger><div className="flex items-center gap-2"><div className={`w-4 h-4 rounded ${customForm.color}`} /><SelectValue /></div></SelectTrigger>
                  <SelectContent>{colorOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}><div className="flex items-center gap-2"><div className={`w-4 h-4 rounded ${opt.value}`} />{opt.label}</div></SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Parameters</Label>
              <div className="space-y-2">
                {(customForm.parameters || []).map((p, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input className="flex-1" placeholder="key" value={p.key} onChange={(e) => { const params = [...(customForm.parameters || [])]; params[i] = { ...params[i], key: e.target.value }; setCustomForm({ ...customForm, parameters: params }); }} />
                    <Input className="flex-1" placeholder="value" value={p.value} onChange={(e) => { const params = [...(customForm.parameters || [])]; params[i] = { ...params[i], value: e.target.value }; setCustomForm({ ...customForm, parameters: params }); }} />
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => { const params = (customForm.parameters || []).filter((_, idx) => idx !== i); setCustomForm({ ...customForm, parameters: params }); }}><X className="h-3 w-3" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setCustomForm({ ...customForm, parameters: [...(customForm.parameters || []), { key: "", value: "" }] })}><Plus className="h-3 w-3 mr-1" />Add Parameter</Button>
              </div>
            </div>
            <div><Label>Payload</Label><Textarea value={customForm.payload || ""} onChange={(e) => setCustomForm({ ...customForm, payload: e.target.value })} placeholder='e.g., { "body": "Hello" }' className="min-h-[60px] font-mono text-xs" /></div>
            <div>
              <Label>Output Ports</Label>
              <Input type="number" min={1} max={5} value={customForm.outputPorts || 1} onChange={(e) => setCustomForm({ ...customForm, outputPorts: Math.max(1, Math.min(5, parseInt(e.target.value) || 1)) })} />
              <p className="text-[10px] text-muted-foreground mt-1">Each port can connect to multiple nodes (1–5)</p>
            </div>
            <div><Label className="mb-2 block">Icon</Label><IconPickerGrid value={customForm.iconName} onChange={(v) => setCustomForm({ ...customForm, iconName: v })} /></div>
          </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomDialog(false)}>Cancel</Button>
            <Button onClick={addCustomNode}><Plus className="h-4 w-4 mr-1" />Add Node</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Flow Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{currentFlowId ? "Update Flow" : "Save Flow"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={flowName} onChange={(e) => setFlowName(e.target.value)} placeholder="My workflow" /></div>
            <div><Label>Description</Label><Textarea value={flowDescription} onChange={(e) => setFlowDescription(e.target.value)} placeholder="What does this flow do?" className="min-h-[60px]" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onClick={saveFlow}><Save className="h-4 w-4 mr-1" />{currentFlowId ? "Update" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Flow Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Saved Flows</DialogTitle></DialogHeader>
          {savedFlows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No saved flows yet</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2 pr-2">
                {savedFlows.map((flow) => (
                  <Card key={flow.id} className={`cursor-pointer hover:border-primary/50 transition-colors ${currentFlowId === flow.id ? "border-primary" : ""}`}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0" onClick={() => loadFlow(flow.id)}>
                        <p className="text-sm font-medium truncate">{flow.name}</p>
                        {flow.description && <p className="text-xs text-muted-foreground truncate">{flow.description}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(flow.updated_at).toLocaleDateString()}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteFlow(flow.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlowBuilder;
