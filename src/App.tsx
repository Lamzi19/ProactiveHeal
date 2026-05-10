import { useState, useEffect, useRef, useMemo, cloneElement, ReactNode, ReactElement } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Brain, 
  CheckCircle2, 
  Cpu, 
  Database, 
  History, 
  Layers, 
  Play, 
  RefreshCw, 
  Server, 
  ShieldCheck, 
  Terminal, 
  TrendingUp, 
  XCircle,
  Search,
  Filter,
  SlidersHorizontal
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SimState, MetricPoint, LogEntry, Incident, DetailedAnalysis, SimNotification } from './types';

// --- Constants & Mock Data ---

const INITIAL_METRICS: MetricPoint[] = Array.from({ length: 20 }, (_, i) => ({
  time: `${i}:00`,
  cpu: 20 + Math.random() * 10,
  memory: 45 + Math.random() * 5,
  latency: 120 + Math.random() * 20,
}));

const PAST_INCIDENTS: Incident[] = [
  {
    id: 'INC-8821',
    rootCause: 'Memory leak in image processing microservice',
    action: 'Restart pod and increase memory limits',
    outcome: 'Resolved in 45s',
    similarity: 0.92,
  },
  {
    id: 'INC-7742',
    rootCause: 'Sudden traffic surge from marketing campaign',
    action: 'Horizontal Pod Autoscaling (HPA) triggered',
    outcome: 'Resolved in 120s',
    similarity: 0.85,
  },
  {
    id: 'INC-6610',
    rootCause: 'Database connection pool exhaustion',
    action: 'Scale DB read replicas',
    outcome: 'Resolved in 90s',
    similarity: 0.78,
  }
];

// --- Main Component ---

export default function App() {
  const [state, setState] = useState<SimState>('NORMAL');
  const [metrics, setMetrics] = useState<MetricPoint[]>(INITIAL_METRICS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentIncident, setCurrentIncident] = useState<Incident | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<DetailedAnalysis | null>(null);
  const [isAutoSim, setIsAutoSim] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [compFilter, setCompFilter] = useState<string>("ALL");
  const [currentTraceId, setCurrentTraceId] = useState<string | null>(null);
  const [failureProbability, setFailureProbability] = useState<number>(2.4);
  const [notifications, setNotifications] = useState<SimNotification[]>([]);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);
  const [activeMetric, setActiveMetric] = useState<'cpu' | 'memory'>('cpu');

  const addNotification = (title: string, message: string, type: SimNotification['type'] = 'INFO') => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotif: SimNotification = {
      id,
      title,
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setNotifications(prev => [newNotif, ...prev]);
    // Auto-remove after 8 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 8000);
  };

  const activeTrace = useMemo(() => {
    if (!currentTraceId) return null;
    const incidentLogs = logs.filter(l => l.incidentId === currentTraceId).reverse();
    return {
      id: currentTraceId,
      logs: incidentLogs,
      components: Array.from(new Set(incidentLogs.map(l => l.component)))
    };
  }, [logs, currentTraceId]);

  const filteredIncidents = useMemo(() => {
    return PAST_INCIDENTS.filter(inc => 
      inc.rootCause.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const uniqueComponents = useMemo(() => {
    const comps = logs.map(l => l.component);
    return ["ALL", ...Array.from(new Set(comps))];
  }, [logs]);

const getModuleColor = (comp: string) => {
    switch (comp.toUpperCase()) {
      case 'PREDICTOR': return 'bg-amber-500/5 text-amber-500/80 border-amber-500/10';
      case 'PROMETHEUS': return 'bg-orange-500/5 text-orange-500/80 border-orange-500/10';
      case 'CHROMADB': return 'bg-blue-500/5 text-blue-500/80 border-blue-500/10';
      case 'ANOMALYDETECTOR': return 'bg-rose-500/5 text-rose-500/80 border-rose-500/10';
      case 'VERITAS': return 'bg-emerald-500/5 text-emerald-400/80 border-emerald-500/10';
      case 'GEMINI AI': return 'bg-purple-500/5 text-purple-400/80 border-purple-500/10';
      case 'K8S-CONTROLLER': 
      case 'CONTROLPLANE': return 'bg-cyan-500/5 text-cyan-400/80 border-cyan-500/10';
      case 'ELB-INTERNAL': return 'bg-indigo-500/5 text-indigo-400/80 border-indigo-500/10';
      default: return 'bg-zinc-800/10 text-zinc-400 border-zinc-700/10';
    }
  };

  const filteredLogs = useMemo(() => {
    const rawInfraComponents = [
      'PROMETHEUS', 'K8S-PROBE', 'CONTROLPLANE', 'INFLUXDB', 
      'ELB-INTERNAL', 'VAULT', 'K8S-CONTROLLER', 'KUBELET', 
      'ENVOY', 'ISTIO', 'ALERTMANAGER', 'MONITOR', 'SYSTEM'
    ];
    
    return logs.filter(log => {
      const isInfra = rawInfraComponents.includes(log.component.toUpperCase());
      const levelMatch = levelFilter === "ALL" || log.level === levelFilter;
      const compMatch = compFilter === "ALL" || log.component === compFilter;
      return isInfra && levelMatch && compMatch;
    });
  }, [logs, levelFilter, compFilter]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const traceScrollRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---

  const addLog = (message: string, component: string, level: LogEntry['level'] = 'INFO', incidentId?: string) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message,
      component,
      level,
      incidentId: incidentId || (state !== 'NORMAL' ? currentTraceId || undefined : undefined)
    };
    
    // Simulate streaming by adding a tiny randomized delay if in simulation
    const delay = state === 'NORMAL' ? 0 : Math.random() * 200;
    setTimeout(() => {
      setLogs(prev => [newLog, ...prev].slice(0, 200));
    }, delay);
  };

  useEffect(() => {
    if (activeTrace && traceScrollRef.current) {
      const scrollContainer = traceScrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        // Use requestAnimationFrame to ensure the DOM has updated with the new entry's height
        requestAnimationFrame(() => {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth'
          });
        });
      }
    }
  }, [activeTrace?.logs.length]);

  const backgroundLogs = [
    { msg: "Scraping metrics from node-cluster-01...", comp: "Prometheus" },
    { msg: "Health check passed for 'auth-service' (200 OK)", comp: "K8s-Probe" },
    { msg: "Heartbeat received from worker-04", comp: "ControlPlane" },
    { msg: "Indexing telemetry data in time-series DB", comp: "InfluxDB" },
    { msg: "Rebalancing traffic across 3 availability zones", comp: "ELB-Internal" },
    { msg: "Rotating session keys for 'api-gateway'", comp: "Vault" },
  ];

  // --- Simulation Logic ---

  const runSimulation = async () => {
    if (state !== 'NORMAL') return;

    const incidentId = `TRC-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    setCurrentTraceId(incidentId);
    setAiAnalysis(null);
    setReasoningExpanded(false);

    const isCpuScenario = activeMetric === 'cpu';

    // 1. Trigger Anomaly
    setState('ANOMALY_DETECTED');
    setFailureProbability(isCpuScenario ? 72.5 : 45.2);
    
    if (isCpuScenario) {
      addLog("CRITICAL: CPU threshold exceeded (92.4%) on node 'worker-node-04'", "Prometheus", "ERROR", incidentId);
      addLog("Alerting: high_cpu_usage_detected -> PagerDuty", "AlertManager", "WARN", incidentId);
    } else {
      addLog("WARNING: Memory saturation increasing (88.1%) on 'order-service-v2'", "Prometheus", "WARN", incidentId);
      addLog("Alerting: memory_saturation_approaching_limit -> Slack", "AlertManager", "INFO", incidentId);
    }
    
    // Simulate metrics spike
    setMetrics(prev => {
      return [...prev.slice(1), {
        time: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
        cpu: isCpuScenario ? 95 + Math.random() * 5 : 45 + Math.random() * 5,
        memory: isCpuScenario ? 60 + Math.random() * 10 : 92 + Math.random() * 5,
        latency: isCpuScenario ? 450 + Math.random() * 100 : 180 + Math.random() * 20,
      }];
    });

    await delay(1000);
    addLog(`Isolation Forest: Detected anomalous ${isCpuScenario ? 'compute' : 'memory'} pattern`, "AnomalyDetector", "WARN", incidentId);
    
    // 2. Prediction
    setState('PREDICTING');
    setFailureProbability(isCpuScenario ? 98.2 : 68.4);
    await delay(1500);
    if (isCpuScenario) {
      addLog("Prophet: Predicted 100% saturation of node 'worker-node-04' in T-42s", "Predictor", "WARN", incidentId);
    } else {
      addLog("Prophet: Memory leak detected in 'order-service-v2'. OOM-kill likely in T-120s", "Predictor", "WARN", incidentId);
    }
    await delay(1000);

    // 3. Retrieval
    setState('RETRIEVING');
    addLog("DecisionEngine: Evaluating recovery candidates based on historical signatures...", "DecisionEngine", "AI", incidentId);
    addLog("VectorDB: Fetching historical failures with matching signatures...", "ChromaDB", "INFO", incidentId);
    await delay(1500);
    const mockIncident = isCpuScenario ? PAST_INCIDENTS[1] : PAST_INCIDENTS[0];
    setCurrentIncident(mockIncident);
    addLog(`ChromaDB: Top historical match: ${mockIncident.id} (Similarity: ${isCpuScenario ? '0.94' : '0.62'})`, "VectorDB", "SUCCESS", incidentId);

    // 4. Analysis & Decision
    setState('ANALYZING');
    addLog("Gemini AI: Analyzing telemetry delta and historical context...", "Gemini AI", "AI", incidentId);
    
    try {
      if (isCpuScenario) {
        addLog("AI-Decision: Proposed Candidates -> [HPA, Re-route, Flush]", "Gemini AI", "AI", incidentId);
        addLog("AI-Decision: Candidate 1 -> Horizontal Scaling (Success Prob: 98%)", "Gemini AI", "AI", incidentId);
        addLog("AI-Decision: Candidate 2 -> Traffic Re-routing (Success Prob: 74%)", "Gemini AI", "AI", incidentId);
        addLog("AI-Decision: Candidate 3 -> Cache Flush (Success Prob: 22%)", "Gemini AI", "AI", incidentId);
        
        await delay(2000);
        setAiAnalysis({
          rootCause: "Traffic burst exceeding provisioned compute capacity",
          confidence: 0.96,
          dataPoints: ["CPU > 92%", "HPA Lag", "Healthy Upstream"],
          proposedAction: "Horizontal Pod Autoscaling (Manual Override)",
          reasoning: "Telemetry indicates a pure compute saturation event. Upstream latency is stable, suggesting the bottleneck is local to the worker-node-04 cluster. Historical match INC-7742 confirms that scaling is the optimal recovery vector with 99% success probability."
        });
      } else {
        addLog("AI-Decision: Proposed Candidates -> [Restart, Scale-Up]", "Gemini AI", "AI", incidentId);
        addLog("AI-Decision: Candidate 1 -> Pod Restart (Success Prob: 45%)", "Gemini AI", "AI", incidentId);
        addLog("AI-Decision: Candidate 2 -> Resource Limit Increase (Success Prob: 38%)", "Gemini AI", "AI", incidentId);
        
        await delay(2000);
        setAiAnalysis({
          rootCause: "Indeterminate Memory Growth Pattern (Potential Leak)",
          confidence: 0.38,
          dataPoints: ["Memory > 88%", "Low historical similarity", "Stochastic GC pressure"],
          proposedAction: "Preventive Escalation to Engineering Level 3",
          reasoning: "Current memory consumption does not match known traffic patterns. Confidence in autonomous scaling is low (38%) as scaling may exacerbate a potential memory leak or cascading cache invalidation. Recommending human-in-the-loop audit before any state-altering remediation."
        });
      }
      addLog(`Gemini AI: Logic complete. ${isCpuScenario ? 'Heal sequence selected.' : 'Escalation required.'}`, "Gemini AI", "SUCCESS", incidentId);
    } catch (error) {
      addLog("LLM Analysis failed. Using fallback safety engine.", "System", "ERROR", incidentId);
    }
    await delay(1500);

    // 5. Deciding & Verifying
    setState('VERIFYING');
    addLog("Veritas: Validating remediation safety boundaries...", "Veritas", "INFO", incidentId);
    await delay(2000);
    
    if (isCpuScenario) {
      addLog("Veritas: Safety score 0.98. VALIDATION_PASSED.", "Veritas", "SUCCESS", incidentId);
      addLog("VERITAS: [ACTION APPROVED]", "Veritas", "SUCCESS", incidentId);
      await delay(1200);
      setState('EXECUTING');
      addLog("K8s-Controller: kubectl scale deployment/app-service --replicas=8 [HEALING]", "K8s-Controller", "INFO", incidentId);
      await delay(2000);
      
      // Recovery
      setMetrics(prev => {
        return [...prev.slice(1), {
          time: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
          cpu: 32 + Math.random() * 8,
          memory: 55 + Math.random() * 5,
          latency: 125 + Math.random() * 15,
        }];
      });
      
      setState('LEARNING');
      setFailureProbability(1.8);
      addLog("System: Telemetry stabilized. Recovery verified.", "Monitor", "SUCCESS", incidentId);
      await delay(1500);
      setState('NORMAL');
      addNotification("Autonomous Recovery Successful", "CPU spike remediated via horizontal scaling.", "SUCCESS");
    } else {
      addLog("Veritas: CONFIDENCE_UNDER_THRESHOLD. Autonomous action blocked.", "Veritas", "ERROR", incidentId);
      addLog("System: Initiating Fail-Safe protocols. Escalating to SRE.", "Veritas", "ERROR", incidentId);
      setState('CRITICAL');
      setFailureProbability(88.5);
      addNotification("Human Intervention Required", "Veritas rejected autonomous remediation due to low confidence.", "ERROR");
      await delay(4000);
    }
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // --- Effects ---

  useEffect(() => {
    const interval = setInterval(() => {
      if (state === 'NORMAL') {
        setMetrics(prev => {
          return [...prev.slice(1), {
            time: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
            cpu: 20 + Math.random() * 10,
            memory: 45 + Math.random() * 5,
            latency: 120 + Math.random() * 20,
          }];
        });

        // Add background noise logs
        if (Math.random() > 0.7) {
          const randomLog = backgroundLogs[Math.floor(Math.random() * backgroundLogs.length)];
          addLog(randomLog.msg, randomLog.comp, 'INFO');
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [state]);

  // --- Render Helpers ---

  const getStatusColor = (s: SimState) => {
    switch (s) {
      case 'NORMAL': return 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
      case 'CRITICAL': return 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.7)] scale-110';
      case 'ANOMALY_DETECTED':
      case 'REJECTED': return 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]';
      case 'WARNING': return 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]';
      case 'EXECUTING':
      case 'LEARNING': return 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]';
      default: return 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]';
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#0B1120]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-emerald-500/5 rounded-[14px] border border-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight text-[#F8FAFC]">ProactiveHeal <span className="text-[#64748B] font-medium ml-1 text-sm">v2.4</span></h1>
              <p className="text-[10px] text-[#64748B] uppercase tracking-[0.3em] font-black">Autonomous Operations Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] animate-pulse ${getStatusColor(state)}`} />
              <span className="text-[11px] font-black uppercase tracking-[0.1em] text-[#94A3B8]">{state.replace('_', ' ')}</span>
            </div>
            <Separator orientation="vertical" className="h-5 bg-white/[0.06]" />
            <Button 
              size="sm" 
              variant="outline" 
              className="border-white/[0.1] bg-[#0F172A] hover:bg-[#1E293B] text-[#F8FAFC] gap-2.5 h-10 px-5 rounded-full font-black text-[11px] uppercase tracking-widest transition-all duration-300 shadow-lg hover:shadow-emerald-500/10"
              onClick={runSimulation}
              disabled={state !== 'NORMAL'}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {activeMetric === 'cpu' ? 'Inject CPU Spike' : 'Inject Memory Spike'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-[#0F172A] border border-white/[0.06] p-1 pr-6 rounded-full h-12">
              <div className="bg-[#1E293B] text-white shadow-lg rounded-full px-8 h-full flex items-center text-[11px] font-black uppercase tracking-widest">
                Live Monitor
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 mt-0">
            {/* Left Column: Metrics & Visuals */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              
              {/* Main Metrics Chart */}
              <Card className="bg-[#0B1120] border-white/[0.06] rounded-[24px] overflow-hidden shadow-2xl">
                <CardHeader className="pb-4 pt-6 px-6 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xs font-black uppercase tracking-[0.25em] text-[#F8FAFC] flex items-center gap-2.5">
                        <TrendingUp className="w-4 h-4 text-emerald-400/80" /> System Metrics
                      </CardTitle>
                    </div>
                    <div className="flex gap-2 bg-[#0F172A] p-1.5 rounded-full border border-white/[0.06] shadow-inner">
                      <Button 
                        variant={activeMetric === 'cpu' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        className={`h-7 text-[10px] font-black px-4 rounded-full transition-all duration-300 ${activeMetric === 'cpu' ? 'bg-[#1E293B] text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'text-[#94A3B8]'}`}
                        onClick={() => setActiveMetric('cpu')}
                      >
                        CPU
                      </Button>
                      <Button 
                        variant={activeMetric === 'memory' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        className={`h-7 text-[10px] font-black px-4 rounded-full transition-all duration-300 ${activeMetric === 'memory' ? 'bg-[#1E293B] text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'text-[#94A3B8]'}`}
                        onClick={() => setActiveMetric('memory')}
                      >
                        MEMORY
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full relative">
                    <AnimatePresence>
                      {state !== 'NORMAL' && (
                        <motion.div 
                          initial={{ opacity: 0, x: 20, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 20, scale: 0.95 }}
                          className="absolute top-4 right-4 z-40"
                        >
                          <div className="bg-zinc-950/80 backdrop-blur-2xl border border-rose-500/30 rounded-xl p-4 shadow-[0_0_40px_rgba(244,63,94,0.15)] flex flex-col items-end group">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold text-rose-500/80 uppercase tracking-[0.2em] animate-pulse">Critical System Risk</span>
                              <AlertTriangle className="w-3 h-3 text-rose-500" />
                            </div>
                            <div className="flex items-center gap-3">
                              <motion.span 
                                key={failureProbability}
                                initial={{ y: 5, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className={`text-4xl font-mono font-bold tabular-nums tracking-tighter ${failureProbability > 80 ? 'text-rose-500 text-glow-rose' : 'text-amber-500'}`}
                              >
                                {failureProbability.toFixed(1)}%
                              </motion.span>
                              <div className="flex flex-col border-l border-zinc-800 pl-3">
                                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Engine</span>
                                <span className="text-[10px] font-black text-zinc-300">PROPHET-v4</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics}>
                        <defs>
                          <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={activeMetric === 'cpu' ? "#10b981" : "#a855f7"} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={activeMetric === 'cpu' ? "#10b981" : "#a855f7"} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis 
                          dataKey="time" 
                          stroke="#52525b" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#52525b" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '12px' }}
                          itemStyle={{ color: '#f4f4f5' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey={activeMetric} 
                          stroke={activeMetric === 'cpu' ? "#10b981" : "#a855f7"} 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorMetric)" 
                          animationDuration={800}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Correlated Event Trace */}
              <AnimatePresence>
                {activeTrace && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="overflow-hidden"
                  >
                    <Card className="bg-[#0B1120]/60 backdrop-blur-2xl border-white/5 overflow-hidden border shadow-2xl rounded-[28px]">
                      <CardHeader className="bg-white/[0.01] py-4 px-6 flex flex-row items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-3.5">
                          <div className="p-2 bg-white/[0.03] rounded-xl border border-white/5 shadow-inner">
                            <History className="w-4 h-4 text-white/70" />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <CardTitle className="text-[14px] font-black uppercase tracking-[0.25em] text-white/90">
                              Active Incident Trace
                            </CardTitle>
                            <span className="text-[10px] text-white/30 font-mono tracking-tighter bg-white/[0.02] px-1.5 py-0.5 rounded border border-white/5 w-fit lowercase">{activeTrace.id}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#475569]">Contextual Stream</span>
                            <div className="flex gap-1.5">
                              {activeTrace.components.slice(0, 3).map(c => (
                                <span key={c} className="text-[8px] font-bold text-white/50 bg-white/[0.03] px-2 py-0.5 rounded border border-white/5">{c}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="h-[380px] bg-zinc-950/10 [mask-image:linear-gradient(to_bottom,transparent,black_40px,black_calc(100%-40px),black)]" ref={traceScrollRef}>
                          <div className="p-5 relative">
                            <div className="absolute left-8 top-0 bottom-0 w-px bg-white/[0.05]" />
                            <div className="space-y-6 relative">
                              <AnimatePresence initial={false}>
                                {activeTrace.logs.map((log) => (
                                  <motion.div 
                                    key={log.id}
                                    initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                    transition={{ 
                                      type: "spring",
                                      stiffness: 260,
                                      damping: 20,
                                      mass: 0.5
                                    }}
                                    className="relative pl-10 group"
                                  >
                                    <div className={`absolute left-[-2.5px] top-2 w-1.5 h-1.5 rounded-full border border-zinc-900 z-10 transition-all duration-300 group-hover:scale-150 ${
                                      log.level === 'ERROR' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 
                                      log.level === 'WARN' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]' : 
                                      log.level === 'SUCCESS' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 
                                      log.level === 'AI' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]' : 'bg-white/20'
                                    }`} />
                                    <div className="flex items-center gap-2.5 mb-1.5">
                                      <span className="text-[8px] font-mono text-zinc-600 tabular-nums tracking-tight">{log.timestamp}</span>
                                      <span className={`text-[7px] font-black uppercase tracking-[0.15em] px-1.5 py-0.5 rounded border ${getModuleColor(log.component).replace('bg-', 'bg-opacity-5 bg-')}`}>
                                        {log.component}
                                      </span>
                                    </div>
                                    <p className={`text-[13.5px] leading-snug tracking-tight transition-colors duration-300 ${
                                      log.level === 'ERROR' ? 'text-rose-200/90' : 
                                      log.level === 'WARN' ? 'text-amber-200/90' : 
                                      log.level === 'AI' ? 'text-blue-100/90 font-medium italic' : 
                                      log.level === 'SUCCESS' ? 'text-emerald-100/90' : 'text-zinc-500 group-hover:text-zinc-400'
                                    }`}>
                                      {log.message}
                                    </p>
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                            </div>
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AI Reasoning Section relocated from right column */}
              <AnimatePresence mode="wait">
                {(state === 'ANALYZING' || aiAnalysis) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="bg-[#0B1120] border-white/[0.06] rounded-[24px] overflow-hidden shadow-2xl mt-6">
                      <CardHeader className={`flex flex-row items-center justify-between py-5 px-6 border-b border-white/[0.06] transition-colors duration-500 ${state === 'CRITICAL' ? 'bg-rose-500/10 border-rose-500/20' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl border transition-colors duration-500 ${state === 'CRITICAL' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
                            <Brain className={`w-4 h-4 ${state === 'CRITICAL' ? 'text-rose-400' : 'text-emerald-400'}`} />
                          </div>
                          <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-[#F8FAFC]">Autonomous Reasoning</CardTitle>
                        </div>
                        <Badge variant="outline" className={`text-[10px] font-black uppercase tracking-[0.1em] py-1 px-3 rounded-full transition-colors duration-500 ${state === 'CRITICAL' ? 'border-rose-500/20 text-rose-400 bg-rose-500/5' : 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5'}`}>
                          {state === 'CRITICAL' ? 'RECOVERY_BLOCKED' : 'GEMINI-PRO-v4'}
                        </Badge>
                      </CardHeader>
                      <CardContent className="pt-8 px-6 pb-6">
                        {(state === 'ANALYZING' || state === 'VERIFYING') && !aiAnalysis ? (
                          <div className="space-y-4">
                            <div className="flex gap-2">
                              <div className="h-4 bg-emerald-500/10 rounded-full animate-pulse w-1/3" />
                              <div className="h-4 bg-emerald-500/10 rounded-full animate-pulse w-1/4" />
                            </div>
                            <div className="h-20 bg-emerald-500/5 rounded-xl border border-emerald-500/10 p-4 flex flex-col gap-2">
                               <div className="h-2 bg-emerald-500/10 rounded-full animate-pulse w-full" />
                               <div className="h-2 bg-emerald-500/10 rounded-full animate-pulse w-5/6" />
                               <div className="h-2 bg-emerald-500/10 rounded-full animate-pulse w-4/6" />
                            </div>
                          </div>
                        ) : aiAnalysis && (
                          <div className="space-y-8">
                            <div className="flex items-center justify-between gap-8">
                              <div className="flex-1 space-y-2">
                                <p className="text-[10px] font-black text-emerald-500/40 uppercase tracking-widest">Inferred Root Cause</p>
                                <p className="text-lg font-black text-white leading-tight tracking-tight">{aiAnalysis.rootCause}</p>
                              </div>
                              <div className="w-32 space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] font-black text-emerald-500/40 uppercase tracking-widest">Confidence</p>
                                  <span className="text-[11px] font-mono font-black text-emerald-400">{(aiAnalysis.confidence * 100).toFixed(0)}%</span>
                                </div>
                                <div className="h-2 bg-emerald-500/10 rounded-full overflow-hidden border border-emerald-500/5 shadow-inner">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${aiAnalysis.confidence * 100}%` }}
                                    transition={{ duration: 1.5, ease: "circOut" }}
                                    className={`h-full ${state === 'CRITICAL' ? 'bg-rose-500' : 'bg-emerald-500'} shadow-[0_0_15px_rgba(16,185,129,0.5)]`}
                                  />
                                </div>
                              </div>
                            </div>

                            <AnimatePresence>
                              {state === 'VERIFYING' && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="flex flex-col items-center justify-center py-4 bg-emerald-500/[0.02] rounded-3xl border border-emerald-500/10 shadow-[inner_0_0_20px_rgba(16,185,129,0.05)]"
                                >
                                  <motion.div 
                                    animate={{ 
                                      scale: [1, 1.1, 1],
                                      rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{ repeat: Infinity, duration: 3 }}
                                    className="relative"
                                  >
                                    <div className="absolute inset-0 bg-emerald-500/40 blur-2xl rounded-full animate-pulse" />
                                    <div className="relative p-4 bg-zinc-950 rounded-full border-2 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                                      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                                    </div>
                                  </motion.div>
                                  <p className="mt-4 text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400 animate-pulse">Action Approved: Safety Threshold Met</p>
                                </motion.div>
                              )}
                              {(state === 'EXECUTING' || state === 'LEARNING') && (
                                <motion.div 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="flex flex-col items-center justify-center py-4 bg-emerald-500/[0.05] rounded-3xl border border-emerald-500/20"
                                >
                                  <div className="relative p-4 bg-emerald-500 rounded-full shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                                    <RefreshCw className="w-8 h-8 text-white animate-spin" />
                                  </div>
                                  <p className="mt-4 text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400">Executing Recovery [HEALING]</p>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {state === 'CRITICAL' && (
                              <div className="flex items-center gap-5 p-5 rounded-2xl border bg-rose-500/[0.05] border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
                                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30">
                                  <XCircle className="w-5 h-5 text-rose-400" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-[#64748B] uppercase tracking-[0.2em] mb-1">System Escalation Path</p>
                                  <p className="text-[15px] font-black uppercase tracking-tight text-rose-400 animate-pulse">
                                    Manual Operator Intervention
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column: Logs & LLM Reasoning */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              
              {/* Live Logs */}
              <Card className="bg-[#0B1120] border-white/[0.06] h-[600px] flex flex-col rounded-[24px] shadow-2xl overflow-hidden">
                <CardHeader className="flex flex-col gap-4 border-b border-white/[0.06] py-5 px-6">
                  <div className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-[#F8FAFC] flex items-center gap-2.5">
                      <Terminal className="w-4 h-4 text-zinc-400" /> System Logs
                    </CardTitle>
                    <div className="flex items-center gap-2 bg-[#14F1D9]/5 px-2 py-1 rounded-full border border-[#14F1D9]/20 shadow-[0_0_10px_rgba(20,241,217,0.1)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#14F1D9] shadow-[0_0_8px_#14F1D9] animate-pulse" />
                      <span className="text-[10px] font-black text-[#14F1D9] uppercase tracking-tighter">Live</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Select value={levelFilter} onValueChange={setLevelFilter}>
                      <SelectTrigger className="h-8 w-fit min-w-[90px] text-[10px] bg-[#0F172A] border-white/[0.06] rounded-full px-3 transition-colors hover:bg-[#1E293B] focus:ring-0">
                        <Filter className="w-3 h-3 mr-2 text-[#94A3B8]" />
                        <SelectValue placeholder="Level" className="text-[#F8FAFC]" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F172A] border-white/[0.1] text-[10px] rounded-xl">
                        <SelectItem value="ALL">All Levels</SelectItem>
                        <SelectItem value="INFO">INFO</SelectItem>
                        <SelectItem value="WARN">WARN</SelectItem>
                        <SelectItem value="ERROR">ERROR</SelectItem>
                        <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                        <SelectItem value="AI">AI</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={compFilter} onValueChange={setCompFilter}>
                      <SelectTrigger className="h-8 w-fit min-w-[110px] text-[10px] bg-[#0F172A] border-white/[0.06] rounded-full px-3 transition-colors hover:bg-[#1E293B] focus:ring-0">
                        <SlidersHorizontal className="w-3 h-3 mr-2 text-[#94A3B8]" />
                        <SelectValue placeholder="Component" className="text-[#F8FAFC]" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F172A] border-white/[0.1] text-[10px] rounded-xl">
                        {uniqueComponents.map(comp => (
                          <SelectItem key={comp} value={comp}>{comp === "ALL" ? "All Components" : comp}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {(levelFilter !== "ALL" || compFilter !== "ALL") && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-3 text-[10px] text-[#94A3B8] hover:text-[#F8FAFC] rounded-full"
                        onClick={() => { setLevelFilter("ALL"); setCompFilter("ALL"); }}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden">
                  <ScrollArea className="h-full px-2 py-4">
                    <div className="space-y-1">
                      {filteredLogs.map((log) => (
                        <motion.div 
                          layout="position"
                          key={log.id} 
                          className={`text-[11px] font-mono group border-l-2 pl-4 py-2 transition-all duration-500 cursor-pointer relative rounded-r-xl mx-2 mb-1 ${
                            log.incidentId ? 'hover:bg-rose-500/[0.03] hover:border-rose-500/50' : 'hover:bg-white/[0.02] hover:border-white/10'
                          } border-transparent opacity-80 hover:opacity-100 ${
                            ['System', 'Gemini AI', 'Predictor', 'DecisionEngine', 'Veritas'].includes(log.component) && state !== 'NORMAL' ? 'bg-[#1E293B]/20' : ''
                          }`}
                          onClick={() => {
                            if (log.incidentId) {
                              setCurrentTraceId(log.incidentId);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3 mb-1.5 relative z-10">
                            <span className="text-[#64748B] tabular-nums text-[10px] leading-none">{log.timestamp}</span>
                            <div className="flex items-center gap-2 flex-1">
                              <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest leading-none ${getModuleColor(log.component)}`}>
                                {log.component}
                              </span>
                              {log.incidentId && (
                                <Badge variant="outline" className="text-[9px] py-0 h-4 border-rose-500/20 text-rose-500/80 bg-rose-500/5 font-black uppercase tracking-tighter rounded-md">
                                  TRACE {log.incidentId.split('-')[1]}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className={`leading-relaxed relative z-10 text-[13px] ${
                            log.level === 'ERROR' ? 'text-rose-400' : 
                            log.level === 'WARN' ? 'text-amber-400/90' : 
                            log.level === 'AI' ? 'text-blue-300 italic' : 
                            log.level === 'SUCCESS' ? 'text-emerald-400/90' : 'text-[#94A3B8]'
                          }`}>
                            {log.message}
                          </p>
                        </motion.div>
                      ))}
                      {filteredLogs.length === 0 && (
                        <div className="text-zinc-600 italic text-center py-10 text-[11px]">
                          No logs match the current filters.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* AI Reasoning Section REMOVED - Relocated to left column */}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-8 border-t border-zinc-900 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-zinc-500">© 2026 ProactiveHeal Autonomous Systems. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Documentation</a>
            <a href="#" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">API Reference</a>
            <a href="#" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">SRE Portal</a>
          </div>
        </div>
      </footer>

      {/* Notifications Overlay */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className={`
                pointer-events-auto w-80 p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex gap-4
                ${n.type === 'ERROR' ? 'bg-rose-950/80 border-rose-500/50 shadow-rose-950/40' : 
                  n.type === 'SUCCESS' ? 'bg-emerald-950/80 border-emerald-500/50 shadow-emerald-950/40' : 
                  'bg-zinc-900/80 border-zinc-700/50 shadow-black/40'}
              `}
            >
              <div className={`mt-0.5 p-1.5 rounded-lg h-fit ${
                n.type === 'ERROR' ? 'bg-rose-500/20 text-rose-500' : 
                n.type === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-500' : 
                'bg-zinc-800 text-zinc-400'
              }`}>
                {n.type === 'ERROR' ? <AlertTriangle className="w-4 h-4" /> : 
                 n.type === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4" /> : 
                 <Activity className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-100">{n.title}</h4>
                  <span className="text-[9px] font-mono text-zinc-500 tabular-nums">{n.timestamp}</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{n.message}</p>
                <div className="mt-3 h-0.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 8, ease: "linear" }}
                    className={`h-full ${
                      n.type === 'ERROR' ? 'bg-rose-500' : 
                      n.type === 'SUCCESS' ? 'bg-emerald-500' : 
                      'bg-zinc-600'
                    }`}
                  />
                </div>
              </div>
              <button 
                onClick={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))}
                className="text-zinc-600 hover:text-zinc-300 transition-colors h-fit p-1"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Sub-components ---

function StreamingText({ text, speed = 15, className }: { text: string, speed?: number, className?: string }) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return <p className={className}>{displayedText}</p>;
}

function StatusItem({ label, status, value }: { label: string, status: string, value: string }) {
  return (
    <div className="flex items-center justify-between group p-3 rounded-lg hover:bg-zinc-800/30 transition-all duration-300 border border-transparent hover:border-zinc-800 glass">
      <div className="space-y-0.5">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</p>
        <p className="text-xs font-semibold text-zinc-200">{value}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
        <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-tighter">{status}</span>
      </div>
    </div>
  );
}
