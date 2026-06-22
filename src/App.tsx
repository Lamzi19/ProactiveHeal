import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  ShieldAlert,
  Terminal, 
  TrendingUp, 
  XCircle,
  Search,
  Filter,
  SlidersHorizontal,
  Download,
  Clock,
  Percent
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
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  ReferenceLine
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

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
import { SimState, MetricPoint, LogEntry, Incident, DetailedAnalysis, SimNotification, HistoricalIncident } from './types';
import { loadIncidentHistory, saveIncidentHistory } from './incidentHistory';

// --- Constants & Mock Data ---

const INITIAL_METRICS: MetricPoint[] = Array.from({ length: 20 }, (_, i) => ({
  time: `${10 + i}:00`,
  cpu: 20 + Math.random() * 8,
  memory: 42 + Math.random() * 4,
  latency: 110 + Math.random() * 15,
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

const BACKGROUND_LOG_SAMPLES = [
  { msg: "Scraping metrics from node-cluster-01...", comp: "Prometheus" },
  { msg: "Health check passed for 'auth-service' (200 OK)", comp: "K8s-Probe" },
  { msg: "Heartbeat received from worker-04", comp: "ControlPlane" },
  { msg: "Indexing telemetry data in time-series database", comp: "InfluxDB" },
  { msg: "Rebalancing traffic across 3 availability zones", comp: "ELB-Internal" },
  { msg: "Rotating session keys for 'api-gateway'", comp: "Vault" },
  { msg: "Vacuuming dead tuples in postgres-primary-db", comp: "Database" },
  { msg: "Flushing cache keys for user session repository", comp: "System" },
  { msg: "Garbage collection sweep completed (reclaimed 142MB)", comp: "System" }
];

export default function App() {
  const [state, setState] = useState<SimState>('NORMAL');
  const [metrics, setMetrics] = useState<MetricPoint[]>(INITIAL_METRICS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentIncident, setCurrentIncident] = useState<Incident | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<DetailedAnalysis | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [compFilter, setCompFilter] = useState<string>("ALL");
  const [currentTraceId, setCurrentTraceId] = useState<string | null>(null);
  const [failureProbability, setFailureProbability] = useState<number>(12.4);
  const [notifications, setNotifications] = useState<SimNotification[]>([]);
  const [activeMetric, setActiveMetric] = useState<'cpu' | 'memory' | 'latency'>('cpu');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [threatsIntercepted, setThreatsIntercepted] = useState<number>(0);
  const [showDevTools, setShowDevTools] = useState<boolean>(false);
  const [scenarioHistory, setScenarioHistory] = useState<Array<{
    id: string;
    scenarioName: string;
    startTime: string;
    startTimestamp: number;
    duration: number;
  }>>([
    {
      id: 'seg-init',
      scenarioName: 'NORMAL',
      startTime: new Date(Date.now() - 60000).toLocaleTimeString([], { hour12: false }),
      startTimestamp: Date.now() - 60000,
      duration: 60,
    }
  ]);

  // New Autonomous States
  const [currentScenario, setCurrentScenario] = useState<
    'NORMAL' | 'HIGH_CPU_LOAD' | 'MEMORY_LEAK' | 'NETWORK_CONGESTION' | 'CASCADING_FAILURE' | 'VERITAS_3X_FAIL'
  >('NORMAL');
  const [scenarioTimer, setScenarioTimer] = useState<number>(30); // 30-sec countdown during NORMAL
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(true);
  const [veritasAlert, setVeritasAlert] = useState<{
    header: string;
    reason: string;
    severity: 'HIGH' | 'CRITICAL';
    status: string;
  } | null>(null);
  
  const [veritasApproval, setVeritasApproval] = useState<{
    status: string;
    healing: string;
  } | null>(null);

  interface EngineerAlert {
    id: string;
    scenario: string;
    severity: 'HIGH' | 'CRITICAL';
    timestamp: string;
    reason: string;
    recommendedAction: string;
    assignedTo: string;
  }

  const [engineerAlerts, setEngineerAlerts] = useState<EngineerAlert[]>([
    {
      id: "PH-2041",
      scenario: "MEMORY_LEAK",
      severity: "CRITICAL",
      timestamp: "03:45 AM",
      reason: "Protected resource targeted",
      recommendedAction: "Manual investigation required",
      assignedTo: "SRE Team / Operator"
    },
    {
      id: "PH-1108",
      scenario: "NETWORK_CONGESTION",
      severity: "HIGH",
      timestamp: "01:22 AM",
      reason: "High blast radius remediation blocked",
      recommendedAction: "Awaiting Human Approval",
      assignedTo: "SRE Team"
    }
  ]);

  const [escalatedIncidents, setEscalatedIncidents] = useState<number>(7);
  const [manualInterventionCount, setManualInterventionCount] = useState<number>(5);

  const traceScrollRef = useRef<HTMLDivElement>(null);

  // --- Analytics & Evaluation States (Enterprise AI-Ops) ---
  const [activeTab, setActiveTab] = useState<'LIVE' | 'ANALYTICS' | 'LEARNING'>('LIVE');
  const [incidentHistory, setIncidentHistory] = useState<HistoricalIncident[]>(() => loadIncidentHistory());
  
  // configurable watchdog timeouts (Requirements 6 & 7)
  const [watchdogTimeouts, setWatchdogTimeouts] = useState({
    anomaly: 5, // Default: 5s
    veritas: 3, // Default: 3s
    healing: 10, // Default: 10s
    escalation: 15 // Default: 15s
  });
  
  // State for active watchdog warnings
  const [watchdogAlert, setWatchdogAlert] = useState<{
    stage: string;
    expected: number;
    actual: number;
    status: string;
    message: string;
    id: string;
  } | null>(null);

  const [selectedHistoricalIncident, setSelectedHistoricalIncident] = useState<HistoricalIncident | null>(null);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [totalAnomaliesGenerated, setTotalAnomaliesGenerated] = useState<number>(48);
  const [detectedAnomalies, setDetectedAnomalies] = useState<number>(44);
  const [successfulRecoveries, setSuccessfulRecoveries] = useState<number>(39);
  const [failedRecoveries, setFailedRecoveries] = useState<number>(5);
  const [totalSuggestedActions, setTotalSuggestedActions] = useState<number>(44);
  const [approvedActions, setApprovedActions] = useState<number>(37);
  const [rejectedActions, setRejectedActions] = useState<number>(7);
  const [falsePositives, setFalsePositives] = useState<number>(2);
  const [recoveryTimes, setRecoveryTimes] = useState<number[]>([3.1, 3.5, 2.8, 3.4, 3.2, 3.0, 3.3, 2.9, 3.1]);

  const [incidentDistribution, setIncidentDistribution] = useState({
    cpu: 18,
    memory: 14,
    latency: 11,
    network: 5
  });

  const [analyticsHistory, setAnalyticsHistory] = useState([
    { time: "09:00", detectionRate: 90, recoveryRate: 86, healthScore: 98, cpuCount: 12, memoryCount: 10, latencyCount: 8, networkCount: 4 },
    { time: "10:00", detectionRate: 91, recoveryRate: 86, healthScore: 97, cpuCount: 13, memoryCount: 11, latencyCount: 8, networkCount: 4 },
    { time: "11:00", detectionRate: 91, recoveryRate: 87, healthScore: 96, cpuCount: 14, memoryCount: 12, latencyCount: 9, networkCount: 5 },
    { time: "12:00", detectionRate: 91, recoveryRate: 87, healthScore: 95, cpuCount: 15, memoryCount: 12, latencyCount: 10, networkCount: 6 },
    { time: "13:00", detectionRate: 92, recoveryRate: 88, healthScore: 97, cpuCount: 15, memoryCount: 13, latencyCount: 11, networkCount: 7 },
    { time: "14:00", detectionRate: 92, recoveryRate: 88, healthScore: 96, cpuCount: 16, memoryCount: 14, latencyCount: 12, networkCount: 8 },
    { time: "15:00", detectionRate: 92, recoveryRate: 89, healthScore: 98, cpuCount: 17, memoryCount: 15, latencyCount: 12, networkCount: 8 },
    { time: "16:00", detectionRate: 92, recoveryRate: 89, healthScore: 99, cpuCount: 18, memoryCount: 15, latencyCount: 13, networkCount: 9 },
    { time: "17:00", detectionRate: 92, recoveryRate: 89, healthScore: 97, cpuCount: 19, memoryCount: 16, latencyCount: 14, networkCount: 9 },
  ]);

  // Derive live system health score from CPU, Memory, Latency, and failure rate
  const currentHealthScore = useMemo(() => {
    const latest = metrics[metrics.length - 1] || { cpu: 20, memory: 45, latency: 120 };
    
    // Normalize and subtract weight penalty
    const cpuFactor = Math.max(0, (latest.cpu - 30) / 70); 
    const memFactor = Math.max(0, (latest.memory - 45) / 55); 
    const latFactor = Math.max(0, (latest.latency - 120) / 730); 
    const riskFactor = failureProbability / 100;

    const penalty = (cpuFactor * 0.25 + memFactor * 0.25 + latFactor * 0.25 + riskFactor * 0.25) * 100;
    return parseFloat(Math.max(45, Math.min(100, 100 - penalty)).toFixed(1));
  }, [metrics, failureProbability]);

  // Dynamic search, filter and pagination for incident history (Requirements 8 & 10)
  const filteredHistory = useMemo(() => {
    return incidentHistory.filter(item => {
      const matchSearch = item.scenario.toLowerCase().includes(searchFilter.toLowerCase()) || 
                          item.assigned_engineer.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          item.incident_id.toLowerCase().includes(searchFilter.toLowerCase());
      const matchSeverity = severityFilter === 'ALL' || item.severity.toUpperCase() === severityFilter.toUpperCase();
      return matchSearch && matchSeverity;
    });
  }, [incidentHistory, searchFilter, severityFilter]);

  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * 10;
    return filteredHistory.slice(start, start + 10);
  }, [filteredHistory, historyPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredHistory.length / 10) || 1;
  }, [filteredHistory]);

  const downloadHistoryAsJSON = useCallback(() => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(incidentHistory, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `incident_history_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [incidentHistory]);

  const downloadHistoryAsCSV = useCallback(() => {
    if (incidentHistory.length === 0) return;
    const headers = ["incident_id", "timestamp", "scenario", "severity", "risk_score", "veritas_decision", "assigned_engineer", "remediation_status"];
    const rows = incidentHistory.map(item => [
      item.incident_id,
      item.timestamp,
      item.scenario,
      item.severity,
      item.risk_score,
      item.veritas_decision,
      item.assigned_engineer,
      item.resolution
    ].map(val => `"${('' + (val ?? '')).replace(/"/g, '""')}"`).join(","));
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `incident_history_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [incidentHistory]);

  // Dynamic predictive insights calculation based on real trends
  const predictiveInsight = useMemo(() => {
    const latest = metrics[metrics.length - 1] || { cpu: 20, memory: 45, latency: 120 };
    const prev = metrics[metrics.length - 5] || metrics[0] || { cpu: 20, memory: 45, latency: 120 };

    const cpuDelta = latest.cpu - prev.cpu;
    const memDelta = latest.memory - prev.memory;
    const latDelta = latest.latency - prev.latency;

    // Rate indicators
    const cpuTrendStr = cpuDelta > 0.5 ? `+${cpuDelta.toFixed(1)}%` : cpuDelta < -0.5 ? `${cpuDelta.toFixed(1)}%` : 'stable';
    const memTrendStr = memDelta > 0.5 ? `+${memDelta.toFixed(1)}%` : memDelta < -0.5 ? `${memDelta.toFixed(1)}%` : 'stable';

    if (currentScenario === 'NORMAL') {
      if (scenarioTimer > 15) {
        return {
          title: "DRIFT BASING",
          message: `Hardware telemetry stable. CPU ${cpuTrendStr}, Memory ${memTrendStr}. Optimal thermal margins.`,
          riskLevel: "LOW",
          riskColor: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
          borderStyle: "border-emerald-500/10 bg-emerald-950/10",
          iconColor: "text-emerald-400"
        };
      } else if (scenarioTimer > 5) {
        return {
          title: "SENSORY ANALYSIS",
          message: `Stochastic drift model parsing baseline telemetry (T-${scenarioTimer}s to scheduled load shift).`,
          riskLevel: "LOW",
          riskColor: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5",
          borderStyle: "border-cyan-500/10 bg-cyan-950/10",
          iconColor: "text-cyan-400"
        };
      } else {
        return {
          title: "BASELINE FLUX",
          message: `Minor telemetry fluctuation. Synthetic load balancer trigger preparing. Countdown: [${scenarioTimer}s]`,
          riskLevel: "MEDIUM",
          riskColor: "text-amber-400 border-amber-500/20 bg-amber-500/5",
          borderStyle: "border-amber-500/10 bg-amber-950/10",
          iconColor: "text-amber-400"
        };
      }
    }

    // Active scenario prepping
    if (state === 'NORMAL') {
      if (currentScenario === 'HIGH_CPU_LOAD') {
        return {
          title: "CPU EXHAUSTION",
          message: `Abrupt CPU gradient detected (${cpuTrendStr} change). Threat velocity suggests core scheduler lockup in T-15s.`,
          riskLevel: "CRITICAL",
          riskColor: "text-rose-400 border-rose-500/30 bg-rose-500/10 animate-pulse",
          borderStyle: "border-rose-500/20 bg-rose-950/10",
          iconColor: "text-rose-400 animate-bounce"
        };
      }
      if (currentScenario === 'MEMORY_LEAK') {
        return {
          title: "HEAP SATURATION",
          message: `Memory velocity rising (${memTrendStr}). Predicting active Out-of-Memory container crash on payment-service-v3.`,
          riskLevel: "HIGH",
          riskColor: "text-purple-400 border-purple-500/30 bg-purple-500/10 animate-pulse",
          borderStyle: "border-purple-500/20 bg-purple-950/10",
          iconColor: "text-purple-400"
        };
      }
      if (currentScenario === 'NETWORK_CONGESTION') {
        return {
          title: "LATENCY BACKLOG",
          message: `Buffer latency expanded by +${latDelta.toFixed(0)}ms. High risk of sliding-window overflow and 3x packet drops.`,
          riskLevel: "HIGH",
          riskColor: "text-blue-400 border-blue-500/30 bg-blue-500/10 animate-pulse",
          borderStyle: "border-blue-500/20 bg-[#0F172A]",
          iconColor: "text-blue-400"
        };
      }
      if (currentScenario === 'CASCADING_FAILURE') {
        return {
          title: "CASCADING SHUTDOWN",
          message: `Composite multi-tier backlog. Cross-dependency thread deadlock propagation to core database tables.`,
          riskLevel: "CRITICAL",
          riskColor: "text-rose-400 border-rose-500/30 bg-rose-500/10 animate-pulse",
          borderStyle: "border-rose-500/20 bg-rose-950/10",
          iconColor: "text-rose-400 animate-bounce"
        };
      }
      if (currentScenario === 'VERITAS_3X_FAIL') {
        return {
          title: "COMPLIANCE DRIFT",
          message: `Rogue TLS tunnel handshake signature on port 443 detected. Initiating Veritas boundary validation audits.`,
          riskLevel: "HIGH",
          riskColor: "text-amber-400 border-amber-500/30 bg-amber-500/10 animate-pulse",
          borderStyle: "border-amber-500/20 bg-[#0F172A]",
          iconColor: "text-amber-400"
        };
      }
    }

    // Active remediation state
    return {
      title: "REMEDIATION WINDOW",
      message: "Veritas Policy Engine locked boundary state. Awaiting SRE manual override restoration checklist.",
      riskLevel: "MITIGATING",
      riskColor: "text-[#14F1D9] border-[#14F1D9]/30 bg-[#14F1D9]/5",
      borderStyle: "border-[#14F1D9]/20 bg-[#14F1D9]/5",
      iconColor: "text-[#14F1D9]"
    };
  }, [metrics, currentScenario, scenarioTimer, state]);

  // Helper to trigger alert notifications
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
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 8000);
  };

  const addLog = (message: string, component: string, level: LogEntry['level'] = 'INFO', incidentId?: string) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message,
      component,
      level,
      incidentId: incidentId || (state !== 'NORMAL' ? currentTraceId || undefined : undefined)
    };
    
    // Add dynamically
    setLogs(prev => [newLog, ...prev].slice(0, 200));
  };

  const downloadLogs = (format: 'json' | 'csv') => {
    let content = '';
    let mimeType = '';
    let filename = `proactiveheal-logs-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'json') {
      content = JSON.stringify(filteredLogs, null, 2);
      mimeType = 'application/json';
      filename += '.json';
    } else {
      const headers = ['id', 'timestamp', 'component', 'level', 'message', 'incidentId'];
      const rows = filteredLogs.map(log => 
        headers.map(header => {
          const val = (log as any)[header] || '';
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',')
      );
      content = [headers.join(','), ...rows].join('\n');
      mimeType = 'text/csv';
      filename += '.csv';
    }

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addNotification("Export Successful", `Logs exported as ${format.toUpperCase()} (${filteredLogs.length} entries)`, "SUCCESS");
  };

  // Generate initial system logs and seed continuous log cycle
  useEffect(() => {
    // Seed initial logs so it's populated on load
    const times = ["02:00", "01:30", "01:00", "00:30", "00:00"];
    const initialLogs: LogEntry[] = BACKGROUND_LOG_SAMPLES.slice(0, 5).map((sample, idx) => ({
      id: Math.random().toString(36).substr(2, 9),
      timestamp: times[idx],
      message: sample.msg,
      component: sample.comp,
      level: 'INFO'
    }));
    setLogs(initialLogs);
  }, []);

  const activeTrace = useMemo(() => {
    if (!currentTraceId) return null;
    const incidentLogs = logs.filter(l => l.incidentId === currentTraceId).reverse();
    return {
      id: currentTraceId,
      logs: incidentLogs,
      components: Array.from(new Set(incidentLogs.map(l => l.component)))
    };
  }, [logs, currentTraceId]);

  const uniqueComponents = useMemo(() => {
    const comps = logs.map(l => l.component);
    return ["ALL", ...Array.from(new Set(comps))];
  }, [logs]);

  const getVeritasStatusMsg = (scenario: string) => {
    switch (scenario) {
      case 'HIGH_CPU_LOAD':
        return "Monitoring compute anomaly on worker-node-04";
      case 'MEMORY_LEAK':
        return "Memory pressure pattern isolated on DB connector";
      case 'NETWORK_CONGESTION':
        return "Packet loss signature flagged on router gw-01";
      case 'CASCADING_FAILURE':
        return "Cascading microservice failure signature isolated";
      case 'VERITAS_3X_FAIL':
        return "Critical failure trace in Remote governance compliance audit";
      default:
        return "No threats intercepted";
    }
  };

  const getScenarioColor = (name: string) => {
    switch (name) {
      case 'NORMAL':
        return { bg: 'bg-emerald-500', stroke: 'border-emerald-500/50', text: 'text-emerald-400', fill: '#10b981' };
      case 'HIGH_CPU_LOAD':
        return { bg: 'bg-rose-500', stroke: 'border-rose-500/50', text: 'text-rose-400', fill: '#ef4444' };
      case 'MEMORY_LEAK':
        return { bg: 'bg-amber-500', stroke: 'border-amber-500/50', text: 'text-amber-400', fill: '#f59e0b' };
      case 'NETWORK_CONGESTION':
        return { bg: 'bg-amber-400', stroke: 'border-amber-400/50', text: 'text-amber-300', fill: '#fbbf24' };
      case 'CASCADING_FAILURE':
        return { bg: 'bg-red-600', stroke: 'border-red-600/50', text: 'text-red-400', fill: '#dc2626' };
      case 'VERITAS_3X_FAIL':
        return { bg: 'bg-rose-600', stroke: 'border-rose-600/50', text: 'text-rose-400', fill: '#f43f5e' };
      default:
        return { bg: 'bg-zinc-500', stroke: 'border-zinc-500/50', text: 'text-zinc-400', fill: '#71717a' };
    }
  };

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
      'ENVOY', 'ISTIO', 'ALERTMANAGER', 'MONITOR', 'SYSTEM',
      'ANOMALYDETECTOR', 'PREDICTOR', 'CHROMADB', 'VERITAS',
      'GEMINI AI', 'DECISIONENGINE', 'VECTORDB', 'DATABASE'
    ];
    
    return logs.filter(log => {
      const isInfra = rawInfraComponents.includes(log.component.toUpperCase());
      const levelMatch = levelFilter === "ALL" || log.level === levelFilter;
      const compMatch = compFilter === "ALL" || log.component === compFilter;
      return isInfra && levelMatch && compMatch;
    });
  }, [logs, levelFilter, compFilter]);

  useEffect(() => {
    if (activeTrace && traceScrollRef.current) {
      const scrollContainer = traceScrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        requestAnimationFrame(() => {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth'
          });
        });
      }
    }
  }, [activeTrace?.logs.length]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // --- Continuous Telemetry Graph updating & dynamic baseline fluctuations ---
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => {
        const last = prev[prev.length - 1] || { cpu: 20, memory: 45, latency: 120 };
        let newCpu = last.cpu;
        let newMemory = last.memory;
        let newLatency = last.latency;

        const noise = (Math.random() - 0.5) * 3;
        const latNoise = (Math.random() - 0.5) * 8;

        if (currentScenario === 'NORMAL') {
          // Healthy range
          newCpu = Math.max(16, Math.min(32, last.cpu + noise));
          newMemory = Math.max(40, Math.min(48, last.memory + noise));
          newLatency = Math.max(90, Math.min(135, last.latency + latNoise));
        } else {
          if (state === 'NORMAL') {
            // Grading metrics upward to cross trigger thresholds
            if (currentScenario === 'HIGH_CPU_LOAD') {
              newCpu = Math.min(98, last.cpu + 6 + Math.random() * 3);
              newLatency = Math.min(480, last.latency + 20 + Math.random() * 10);
            } else if (currentScenario === 'MEMORY_LEAK') {
              newMemory = Math.min(95, last.memory + 4 + Math.random() * 2);
              newLatency = Math.min(170, last.latency + Math.random() * 3);
            } else if (currentScenario === 'NETWORK_CONGESTION') {
              newLatency = Math.min(850, last.latency + 80 + Math.random() * 20);
            } else if (currentScenario === 'CASCADING_FAILURE') {
              newCpu = Math.min(94, last.cpu + 5 + Math.random() * 2);
              newMemory = Math.min(92, last.memory + 4 + Math.random() * 2);
              newLatency = Math.min(820, last.latency + 40 + Math.random() * 10);
            } else if (currentScenario === 'VERITAS_3X_FAIL') {
              newCpu = Math.min(92, last.cpu + 4 + Math.random() * 2);
              newLatency = Math.min(420, last.latency + 35 + Math.random() * 10);
            }
          } else if (state === 'EXECUTING' || state === 'LEARNING') {
            // Healing / Operator Recovery decline
            newCpu = Math.max(22, last.cpu - 18);
            newMemory = Math.max(44, last.memory - 12);
            newLatency = Math.max(115, last.latency - 90);
          } else if (state === 'CRITICAL') {
            // Saturated blocked state
            newCpu = Math.min(98, Math.max(82, last.cpu + noise));
            newMemory = Math.min(96, Math.max(82, last.memory + noise));
            newLatency = Math.min(850, Math.max(380, last.latency + latNoise));
          } else {
            // Keep peak saturation while analyzing/verifying
            if (currentScenario === 'HIGH_CPU_LOAD') {
              newCpu = Math.min(98, Math.max(90, last.cpu + noise));
              newLatency = Math.min(520, Math.max(420, last.latency + latNoise));
            } else if (currentScenario === 'MEMORY_LEAK') {
              newMemory = Math.min(96, Math.max(88, last.memory + noise));
            } else if (currentScenario === 'NETWORK_CONGESTION') {
              newLatency = Math.min(890, Math.max(720, last.latency + latNoise));
            } else if (currentScenario === 'CASCADING_FAILURE') {
              newCpu = Math.min(95, Math.max(86, last.cpu + noise));
              newMemory = Math.min(93, Math.max(84, last.memory + noise));
              newLatency = Math.min(860, Math.max(690, last.latency + latNoise));
            } else if (currentScenario === 'VERITAS_3X_FAIL') {
              newCpu = Math.min(93, Math.max(84, last.cpu + noise));
              newLatency = Math.min(490, Math.max(390, last.latency + latNoise));
            }
          }
        }

        // Failure probability score calculation
        let risk = 12.4;
        if (currentScenario !== 'NORMAL') {
          if (state === 'NORMAL') {
            risk = Math.min(98.5, (newCpu * 0.4) + (newMemory * 0.3) + (newLatency * 0.05));
          } else if (state === 'CRITICAL' || state === 'REJECTED') {
            risk = 94.2;
          } else if (state === 'EXECUTING' || state === 'LEARNING') {
            risk = Math.max(2.4, risk * 0.2);
          } else {
            risk = 84.5 + Math.random() * 12;
          }
        }
        setFailureProbability(parseFloat(risk.toFixed(1)));

        return [...prev.slice(1), {
          time: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
          cpu: Math.round(newCpu),
          memory: Math.round(newMemory),
          latency: Math.round(newLatency)
        }];
      });

      // Regular continuous logs stream
      if (state === 'NORMAL' && currentScenario === 'NORMAL') {
        const coin = Math.random();
        if (coin > 0.8) {
          const sample = BACKGROUND_LOG_SAMPLES[Math.floor(Math.random() * BACKGROUND_LOG_SAMPLES.length)];
          addLog(sample.msg, sample.comp, 'INFO');
        } else if (coin > 0.5) {
          const telemetrySamples = [
            { msg: "[TELEMETRY] CPU utilization stable in healthy thresholds.", comp: "System" },
            { msg: "[TELEMETRY] RAM saturation baseline checked.", comp: "System" },
            { msg: "[ANOMALY_DETECTOR] Analyzing telemetry window... Passed.", comp: "AnomalyDetector" },
            { msg: "[PREDICTOR] Current risk score nominal (under 15%).", comp: "Predictor" },
            { msg: "[VERITAS] Verification passed. No remediation required.", comp: "Veritas" }
          ];
          const choice = telemetrySamples[Math.floor(Math.random() * telemetrySamples.length)];
          addLog(choice.msg, choice.comp, 'INFO');
        }
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [currentScenario, state]);

  // --- Scenario shifts tick countdown ---
  useEffect(() => {
    if (!isSimulationActive) return;

    const interval = setInterval(() => {
      if (currentScenario === 'NORMAL' && state === 'NORMAL') {
        setScenarioTimer(prev => {
          if (prev <= 1) {
            const list: ('HIGH_CPU_LOAD' | 'MEMORY_LEAK' | 'NETWORK_CONGESTION' | 'CASCADING_FAILURE')[] = [
              'HIGH_CPU_LOAD',
              'MEMORY_LEAK',
              'NETWORK_CONGESTION',
              'CASCADING_FAILURE'
            ];
            const next = list[Math.floor(Math.random() * list.length)];
            setCurrentScenario(next);
            addNotification("Scenario Initialized", `Continuous autonomous scenario shift: ${next.replace(/_/g, ' ')}`, "WARN");
            return 30;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentScenario, state, isSimulationActive]);

  // --- Threshold Watcher to launch AI-Ops flow ---
  useEffect(() => {
    if (state !== 'NORMAL' || currentScenario === 'NORMAL') return;

    const last = metrics[metrics.length - 1];
    if (!last) return;

    let trigger = false;
    if (currentScenario === 'HIGH_CPU_LOAD' && last.cpu > 80) trigger = true;
    if (currentScenario === 'MEMORY_LEAK' && last.memory > 80) trigger = true;
    if (currentScenario === 'NETWORK_CONGESTION' && last.latency > 380) trigger = true;
    if (currentScenario === 'CASCADING_FAILURE' && (last.cpu > 80 || last.memory > 80)) trigger = true;
    if (currentScenario === 'VERITAS_3X_FAIL' && last.latency > 200) trigger = true;

    if (trigger) {
      runIncidentOrchestrator(currentScenario);
    }
  }, [metrics, state, currentScenario]);

  // --- Scenario History Timeline Effects (Requirement 5) ---
  useEffect(() => {
    const now = Date.now();
    const timeStr = new Date().toLocaleTimeString([], { hour12: false });
    
    setScenarioHistory(prev => {
      if (prev.length === 0) {
        return [{
          id: `seg-${now}`,
          scenarioName: currentScenario,
          startTime: timeStr,
          startTimestamp: now,
          duration: 1
        }];
      }
      
      const updated = [...prev];
      const last = { ...updated[updated.length - 1] };
      
      if (last.scenarioName === currentScenario) {
        return prev;
      }
      
      // Finalize previous segment duration
      last.duration = Math.max(1, Math.round((now - last.startTimestamp) / 1000));
      updated[updated.length - 1] = last;
      
      // Push new segment
      updated.push({
        id: `seg-${now}`,
        scenarioName: currentScenario,
        startTime: timeStr,
        startTimestamp: now,
        duration: 1
      });
      
      return updated;
    });
  }, [currentScenario]);

  useEffect(() => {
    const timer = setInterval(() => {
      setScenarioHistory(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const now = Date.now();
        const curDuration = Math.max(1, Math.round((now - last.startTimestamp) / 1000));
        
        if (last.duration !== curDuration) {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...last,
            duration: curDuration
          };
          return updated;
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper to append dynamic point to Enterprise Analytics line charts
  const triggerHistoryUpdate = (scenario: string, isApproved: boolean) => {
    setAnalyticsHistory(prev => {
      const last = prev[prev.length - 1] || { time: "17:00", detectionRate: 92, recoveryRate: 89, healthScore: 97, cpuCount: 19, memoryCount: 16, latencyCount: 14, networkCount: 9 };
      const [hrs, mins] = last.time.split(':').map(Number);
      const newMins = (mins + 5) % 60;
      const newHrs = (hrs + (mins + 5 >= 60 ? 1 : 0)) % 24;
      const nextTime = `${String(newHrs).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;

      // Dynamic rates based on current states
      const totalGen = totalAnomaliesGenerated + 1;
      const detected = detectedAnomalies + 1;
      const approvedAct = approvedActions + (isApproved ? 1 : 0);
      const suggestions = totalSuggestedActions + 1;
      const recovered = successfulRecoveries + (isApproved ? 1 : 0);

      const newDetRate = Math.round((detected / totalGen) * 100);
      const newRecRate = Math.round((recovered / detected) * 100);
      const newHealth = isApproved ? 97 + Math.random() * 2 : 94 + Math.random() * 2;

      return [...prev.slice(1), {
        time: nextTime,
        detectionRate: newDetRate > 100 ? 100 : newDetRate,
        recoveryRate: newRecRate > 100 ? 100 : newRecRate,
        healthScore: parseFloat(newHealth.toFixed(1)),
        cpuCount: scenario === 'HIGH_CPU_LOAD' ? last.cpuCount + 1 : last.cpuCount,
        memoryCount: scenario === 'MEMORY_LEAK' ? last.memoryCount + 1 : last.memoryCount,
        latencyCount: scenario === 'CASCADING_FAILURE' ? last.latencyCount + 1 : last.latencyCount,
        networkCount: (scenario === 'NETWORK_CONGESTION' || scenario === 'VERITAS_3X_FAIL') ? last.networkCount + 1 : last.networkCount,
      }];
    });
  };

  const recordIncidentToHistory = (scenarioName: string, isApproved: boolean, traceId: string, actionStr: string) => {
    const severance = {
      HIGH_CPU_LOAD: { severity: 'HIGH' as const, risk: [75, 88], rec: 'Scale replica pods / restart worker nodes', eng: 'Infrastructure Engineer' },
      MEMORY_LEAK: { severity: 'CRITICAL' as const, risk: [80, 95], rec: 'Restart Authentication Service', eng: 'Backend Engineer' },
      NETWORK_CONGESTION: { severity: 'HIGH' as const, risk: [65, 82], rec: 'Rebalance routing tables on gw-01', eng: 'Network Operator' },
      CASCADING_FAILURE: { severity: 'CRITICAL' as const, risk: [90, 99], rec: 'Connection pool flush and force-drop db locks', eng: 'Lead Systems Architect' },
      VERITAS_3X_FAIL: { severity: 'CRITICAL' as const, risk: [92, 98], rec: 'Zero-trust route restrictions / credentials reset', eng: 'P1 Security SRE Lead' }
    };

    const info = severance[scenarioName as keyof typeof severance] || { severity: 'HIGH' as const, risk: [70, 85], rec: 'Restart service', eng: 'On-Call SRE' };
    const dec = isApproved ? 'APPROVED' as const : 'REJECTED' as const;
    const resolutions = {
      APPROVED: 'Automated Remediation Execution Successful',
      REJECTED: 'Manual Override - SRE Telemetry Stable'
    };

    const risk = Math.floor(info.risk[0] + Math.random() * (info.risk[1] - info.risk[0]));
    
    const newInc: HistoricalIncident = {
      incident_id: traceId.replace('TRC-', 'INC-'),
      timestamp: new Date().toISOString().replace(/\.\d+Z$/, '').replace('T', ' '),
      scenario: scenarioName,
      severity: info.severity,
      risk_score: risk,
      recommended_action: actionStr || info.rec,
      veritas_decision: dec,
      assigned_engineer: info.eng,
      resolution: resolutions[dec],
      timeline: [
        { stage: 'Incident Created', timestamp: new Date(Date.now() - 9000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), status: 'INFO' },
        { stage: 'Anomaly Detected', timestamp: new Date(Date.now() - 7500).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), status: 'WARN' },
        { stage: 'Prediction Generated', timestamp: new Date(Date.now() - 6000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), status: 'WARN' },
        { stage: 'Veritas Validation', timestamp: new Date(Date.now() - 4500).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), status: dec === 'APPROVED' ? 'SUCCESS' : 'ERROR' },
        { stage: dec === 'APPROVED' ? 'Healing' : 'Escalation', timestamp: new Date(Date.now() - 2500).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), status: dec === 'APPROVED' ? 'SUCCESS' : 'WARN' },
        { stage: 'Resolution', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), status: 'SUCCESS' }
      ]
    };

    setIncidentHistory(prev => {
      const updated = [newInc, ...prev];
      saveIncidentHistory(updated);
      return updated;
    });
  };

  // --- Incident Orchestrator flow ---
  const runIncidentOrchestrator = async (scenario: string) => {
    if (state !== 'NORMAL') return;

    // Increment Total Anomalies Generated and Distribution categories instantly
    setTotalAnomaliesGenerated(prev => prev + 1);
    setThreatsIntercepted(prev => prev + 1);
    setIncidentDistribution(prev => {
      const updated = { ...prev };
      if (scenario === 'HIGH_CPU_LOAD') updated.cpu += 1;
      else if (scenario === 'MEMORY_LEAK') updated.memory += 1;
      else if (scenario === 'NETWORK_CONGESTION') updated.network += 1;
      else if (scenario === 'CASCADING_FAILURE') { updated.cpu += 1; updated.latency += 1; }
      else if (scenario === 'VERITAS_3X_FAIL') updated.network += 1;
      return updated;
    });

    const incidentId = `TRC-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    setCurrentTraceId(incidentId);
    setAiAnalysis(null);
    setVeritasAlert(null);
    setVeritasApproval(null);
    setWatchdogAlert(null);

    // 1. ANOMALY_DETECTED
    setState('ANOMALY_DETECTED');
    if (scenario === 'HIGH_CPU_LOAD') {
      addLog("CRITICAL: CPU threshold exceeded (92.4%) on node 'worker-node-04'", "Prometheus", "ERROR", incidentId);
      addLog("Alerting: high_cpu_usage_detected -> PagerDuty", "AlertManager", "WARN", incidentId);
    } else if (scenario === 'MEMORY_LEAK') {
      addLog("WARNING: Memory saturation increasing (88.1%) on 'payment-service-v3'", "Prometheus", "WARN", incidentId);
      addLog("Alerting: memory_saturation_approaching_limit -> Slack", "AlertManager", "INFO", incidentId);
    } else if (scenario === 'NETWORK_CONGESTION') {
      addLog("CRITICAL: Handshake transit delay spike (raw TCP latency > 420ms) on router gw-01", "Prometheus", "ERROR", incidentId);
      addLog("Alerting: router_transit_timeout -> PagerDuty", "AlertManager", "WARN", incidentId);
    } else if (scenario === 'CASCADING_FAILURE') {
      addLog("CRITICAL: Cascading multi-tier failure detected. Compute core deadlocks multiplying.", "Prometheus", "ERROR", incidentId);
      addLog("Alerting: cascade_system_collapse_imminent -> PRE-ONCALL", "AlertManager", "ERROR", incidentId);
    } else if (scenario === 'VERITAS_3X_FAIL') {
      addLog("CRITICAL: Unregistered TLS proxy tunnel handshakes detected on port 443.", "Prometheus", "ERROR", incidentId);
      addLog("Alerting: rogue_tunnel_ingress_alert -> Slack-SecOps", "AlertManager", "WARN", incidentId);
    }

    await delay(1500);

    // Watchdog checking for Anomaly Detection Stage (Requirements 6 & 7)
    if (watchdogTimeouts.anomaly < 1.5) {
      setWatchdogAlert({
        id: incidentId,
        stage: 'Anomaly Detection',
        expected: watchdogTimeouts.anomaly,
        actual: 1.5,
        status: 'Investigation Required',
        message: `WATCHDOG ALERT: Anomaly detection scan exceeded expected window.`
      });
      addLog(`[WATCHDOG ALERT] Anomaly detection delay exceeded expected threshold. Expected: ${watchdogTimeouts.anomaly}s, Actual: 1.5s. Status: Investigation Required`, "Watchdog", "ERROR", incidentId);
      addNotification("WATCHDOG ALERT", "Anomaly Detection process delay exceeded watchdog limits.", "WARN");
    }

    // Isolation Forest Detected Anomaly! Increment detected anomaly count.
    setDetectedAnomalies(prev => prev + 1);
    addLog(`[ANOMALY_DETECTOR] Isolation Forest: Detected anomalous ${
      scenario === 'HIGH_CPU_LOAD' ? 'compute' : 
      scenario === 'MEMORY_LEAK' ? 'memory partition' : 
      scenario === 'NETWORK_CONGESTION' ? 'network routing' : 
      scenario === 'VERITAS_3X_FAIL' ? 'firewall compliance signature' : 'compound cluster system'
    } signature.`, "AnomalyDetector", "WARN", incidentId);

    // 2. PREDICTING
    setState('PREDICTING');
    await delay(1500);
    if (scenario === 'HIGH_CPU_LOAD') {
      addLog("Prophet: Predicted 100% compute exhaustion of node 'worker-node-04' in T-28s", "Predictor", "WARN", incidentId);
    } else if (scenario === 'MEMORY_LEAK') {
      addLog("Prophet: Memory leak detected. Out-of-memory container kill highly likely in T-40s", "Predictor", "WARN", incidentId);
    } else if (scenario === 'NETWORK_CONGESTION') {
      addLog("Prophet: Package drop count points toward total pipeline closure in T-32s", "Predictor", "WARN", incidentId);
    } else if (scenario === 'CASCADING_FAILURE') {
      addLog("Prophet: Cascading gateway thread exhaustion projects total pod lockup in T-15s", "Predictor", "ERROR", incidentId);
    } else if (scenario === 'VERITAS_3X_FAIL') {
      addLog("Prophet: Unvalidated route threat could compromise system isolation bounds in T-12s", "Predictor", "WARN", incidentId);
    }
    await delay(1000);

    // 3. RETRIEVING
    setState('RETRIEVING');
    addLog("DecisionEngine: Querying similar incident records inside active indexing databases...", "DecisionEngine", "AI", incidentId);
    addLog("VectorDB: Syncing historical vector metrics matching active logs from ChromaDB...", "ChromaDB", "INFO", incidentId);
    await delay(1500);
    const mockIncident = scenario === 'HIGH_CPU_LOAD' ? PAST_INCIDENTS[1] : 
                        scenario === 'MEMORY_LEAK' ? PAST_INCIDENTS[0] : PAST_INCIDENTS[2];
    setCurrentIncident(mockIncident);
    addLog(`ChromaDB: Found top signature match schema: ${mockIncident.id} (Mathematical similarity: ${
      scenario === 'HIGH_CPU_LOAD' ? '0.94' : 
      scenario === 'MEMORY_LEAK' ? '0.88' : '0.82'
    })`, "VectorDB", "SUCCESS", incidentId);

    // 4. ANALYZING
    setState('ANALYZING');
    addLog("Gemini AI: Processing system context, log anomalies and past recovery indexes...", "Gemini AI", "AI", incidentId);
    await delay(2000);

    let rc = "";
    let confidence = 0.90;
    let proposedAction = "";
    let reasoning = "";

    if (scenario === 'HIGH_CPU_LOAD') {
      rc = "Compute overload spike caused by abnormal thread throughput on worker pods.";
      confidence = 0.96;
      proposedAction = "Scale worker replicas / restart worker service";
      reasoning = "Live telemetry reveals highly anomalous local CPU spike with nominal routing layers. Historical index INC-7742 maps with 94% similarity and verifies horizontal scaling resolves compute lockups safely with low blast radius.";
    } else if (scenario === 'MEMORY_LEAK') {
      rc = "Uncontrolled memory heap expansion within transaction processing microservice.";
      confidence = 0.38;
      proposedAction = "Restart critical service";
      reasoning = "Linear memory leak verified. However, confidence (38%) is lower than automated safe margin thresholds. Forced container resets jeopardize active transactions on payment pods, potentially creating billing anomalies.";
    } else if (scenario === 'NETWORK_CONGESTION') {
      rc = "Primary ingress transit congestion on US-East cloud servers.";
      confidence = 0.89;
      proposedAction = "Restart gateway service";
      reasoning = "Compute loads are nominal. Routing layer anomalies isolate the bottleneck within regional gateway links. Transition route resolved transit delay cleanly but entails significant routing interruption risk.";
    } else if (scenario === 'CASCADING_FAILURE') {
      rc = "Active gateway pool deadlock propagating to physical database locked pools.";
      confidence = 0.82;
      proposedAction = "Perform total DB pool connection flush and completely drop main active lock tables.";
      reasoning = "Cascading lock timeouts have created complete node deadlock. Dropping DB lock indexes is proposed, but contains destructive physical tables risks that should clear Veritas manual approval firewalls.";
    } else if (scenario === 'VERITAS_3X_FAIL') {
      rc = "Intrusion threat vector bypassing perimeter firewalls via stale security certificates.";
      confidence = 0.55;
      proposedAction = "Inject zero-trust physical isolation rules on proxy interface cluster-gw-01.";
      reasoning = "Suspicious traffic detected from unregistered range. Restricting firewall routes is high confidence, but validation requires immediate active key handshakes which are failing credential lookup tables.";
    }

    setAiAnalysis({
      rootCause: rc,
      confidence: confidence,
      dataPoints: scenario === 'HIGH_CPU_LOAD' ? ["CPU Core Load: 92.4%", "HPA lag", "Gateway healthy"] : scenario === 'VERITAS_3X_FAIL' ? ["Proxy Ports: Open", "Handshake drift: +450ms", "Stale cert fingerprint"] : ["System RAM: 91.8%", "Lock derivative high"],
      proposedAction: proposedAction,
      reasoning: reasoning
    });

    // Suggested action generated! Increment suggested action counter.
    setTotalSuggestedActions(prev => prev + 1);
    addLog(`AI_REASONER: Action recommended -> "${proposedAction}" (Safety Confidence: ${Math.round(confidence * 100)}%)`, "Gemini AI", "SUCCESS", incidentId);
    await delay(1500);

    // 5. VERIFYING (Veritas)
    setState('VERIFYING');
    addLog("Veritas: Running security compliance validating audits on proposed action vectors...", "Veritas", "INFO", incidentId);
    await delay(1500);

    let approved = scenario === 'HIGH_CPU_LOAD';

    if (scenario === 'VERITAS_3X_FAIL') {
      // Consecutively fail 3 times
      addLog("[VERITAS-AUDIT-1] Compliance policy audit trace started (Attempt 1/3)...", "Veritas", "WARN", incidentId);
      await delay(1200);
      addLog("[VERITAS-AUDIT-1] FAIL: Remote governance verification registry handshake timed out.", "Veritas", "ERROR", incidentId);
      addNotification("Veritas Audit (1/3) Failed", "Remote compliance registry unavailable. Retrying in 1s...", "WARN");
      await delay(1000);

      addLog("[VERITAS-AUDIT-2] Re-initializing compliance audit trace (Attempt 2/3)...", "Veritas", "WARN", incidentId);
      await delay(1200);
      addLog("[VERITAS-AUDIT-2] FAIL: Security handshake credentials failed SHA-256 decryption bounds.", "Veritas", "ERROR", incidentId);
      addNotification("Veritas Audit (2/3) Failed", "System token validation breach. Final fail-safe retry in 1s...", "WARN");
      await delay(1000);

      addLog("[VERITAS-AUDIT-3] Critical fail-safe compliance audit trace (Attempt 3/3)...", "Veritas", "WARN", incidentId);
      await delay(1200);
      addLog("[VERITAS-AUDIT-3] CRITICAL FAILURE: Integrity and signature validation completely failed 3/3 times.", "Veritas", "ERROR", incidentId);
      addNotification("Veritas Shield Blocked (3/3)", "All validation boundary sequences failed. Dispatching Priority-1 Alert!", "ERROR");
      await delay(800);
    }

    // Veritas Validation Watchdog Check (Requirements 6 & 7)
    const veritasActualTime = scenario === 'VERITAS_3X_FAIL' ? 5.6 : 1.5;
    if (watchdogTimeouts.veritas < veritasActualTime) {
      setWatchdogAlert({
        id: incidentId,
        stage: 'Veritas Validation',
        expected: watchdogTimeouts.veritas,
        actual: veritasActualTime,
        status: 'Audit Constraint Breached',
        message: 'Veritas transaction compliance validations exceeded the target timeout boundary.'
      });
      addLog(`[WATCHDOG ALERT] Veritas compliance validation timeout exceeded (Expected: ${watchdogTimeouts.veritas}s, Actual: ${veritasActualTime}s). System degraded.`, "Watchdog", "WARN", incidentId);
      addNotification("WATCHDOG ALERT", "Veritas compliance policy execution exceeded watchdog timeout.", "ERROR");
    }

    if (approved) {
      // Action approved! Increment approved state.
      setApprovedActions(prev => prev + 1);
      setVeritasApproval({ status: "APPROVED", healing: "SUCCESSFUL" });
      
      addLog(`[VERITAS] VERITAS STATUS: APPROVED. Reason: Low blast radius and safe remediation action.`, "Veritas", "SUCCESS", incidentId);
      await delay(1000);
      setState('EXECUTING');
      addLog(`[EXECUTOR] AUTONOMOUS HEALING: SUCCESSFUL. Calling K8s-Controller: Scale worker replicas / restart worker service`, "K8s-Controller", "INFO", incidentId);
      await delay(2500);

      // Healing Timeout Watchdog Check (Requirements 6 & 7)
      if (watchdogTimeouts.healing < 2.5) {
        setWatchdogAlert({
          id: incidentId,
          stage: 'Healing Execution',
          expected: watchdogTimeouts.healing,
          actual: 2.5,
          status: 'Investigation Required',
          message: 'Healing execution exceeded expected recovery window.'
        });
        addLog(`[WATCHDOG ALERT] Healing execution stage timeout exceeded (Expected: ${watchdogTimeouts.healing}s, Actual: 2.5s). Manual audit prompted.`, "Watchdog", "ERROR", incidentId);
        addNotification("WATCHDOG EXCEEDED", "Autonomous healing controller response exceeded latency limits.", "ERROR");
      }

      setState('LEARNING');
      // Record completed incident to JSON-format persistent local history list!
      recordIncidentToHistory(scenario, true, incidentId, proposedAction);

      // Increment successful recoveries and logs recovery duration!
      setSuccessfulRecoveries(prev => prev + 1);
      const rectime = parseFloat((2.1 + Math.random() * 1.5).toFixed(1));
      setRecoveryTimes(prev => [...prev, rectime]);

      addLog("[MONITOR] CPU normalizes. Telemetry metrics stabilized. Recovery Success Rate updated successfully.", "Monitor", "SUCCESS", incidentId);
      await delay(1500);
      setState('NORMAL');
      setCurrentScenario('NORMAL');
      setScenarioTimer(30);
      addNotification("Autonomous Mitigation Success", `Mitigated ${scenario.replace(/_/g, ' ')} via AI-Ops orchestrator.`, "SUCCESS");
      
      // Update historical trend line charts live!
      triggerHistoryUpdate(scenario, true);
    } else {
      // Action rejected! Increment rejected counters.
      setRejectedActions(prev => prev + 1);
      setFailedRecoveries(prev => prev + 1);
      setEscalatedIncidents(prev => prev + 1);

      let verAlertHeader = "🚨 VERITAS BLOCKED ACTION";
      let verAlertReason = "Forbidden action detected";
      let verAlertSeverity: 'HIGH' | 'CRITICAL' = "CRITICAL";
      let verAlertStatus = "Escalated to SRE Team";

      if (scenario === 'MEMORY_LEAK') {
        verAlertHeader = "🚨 VERITAS BLOCKED ACTION";
        verAlertReason = "Protected resource targeted";
        verAlertSeverity = "HIGH";
        verAlertStatus = "Escalated to Engineer";
        
        addLog("Veritas: Automated security check failed. REJECTED: Protected resource targeted (Potential impact on protected service).", "Veritas", "ERROR", incidentId);
        addLog("System: Remediation BLOCKED by Veritas Policy Engine. Alert generated and escalated to Engineer.", "Veritas", "ERROR", incidentId);
      } else if (scenario === 'NETWORK_CONGESTION') {
        verAlertHeader = "🚨 CRITICAL ALERT";
        verAlertReason = "High blast radius remediation blocked";
        verAlertSeverity = "CRITICAL";
        verAlertStatus = "Manual Intervention Required";

        addLog("Veritas: Automated security check failed. REJECTED: High blast radius detected.", "Veritas", "ERROR", incidentId);
        addLog("System: Remediation BLOCKED by Veritas Policy Engine. Alert generated and escalated to SRE.", "Veritas", "ERROR", incidentId);
      } else if (scenario === 'VERITAS_3X_FAIL') {
        verAlertHeader = "🚨 VERITAS BLOCKED ACTION";
        verAlertReason = "3x Consecutive Governance Handshake Failure";
        verAlertSeverity = "CRITICAL";
        verAlertStatus = "🚨 Direct Priority-1 SLA Alert Dispatched to Lead Engineer";

        addLog("Veritas: 3x CONSECUTIVE POLICY COMPLIANCE Handshake Failures detected.", "Veritas", "ERROR", incidentId);
        addLog("System: Remediation BLOCKED. Dispatching DIRECT engineer SLA escalation pager alert.", "Veritas", "ERROR", incidentId);
      } else {
        addLog("Veritas: Automated security check failed. CONFIDENCE_UNDER_THRESHOLD triggered.", "Veritas", "ERROR", incidentId);
        addLog("System: Remediation BLOCKED by Veritas Policy Engine. Escalating to SRE.", "Veritas", "ERROR", incidentId);
      }
      
      setVeritasAlert({
        header: verAlertHeader,
        reason: verAlertReason,
        severity: verAlertSeverity,
        status: verAlertStatus
      });

      // Automatically create alert event for the alert engine!
      const newAlert: EngineerAlert = {
        id: `PH-${Math.floor(2040 + Math.random() * 8000)}`,
        scenario: scenario,
        severity: verAlertSeverity,
        timestamp: new Date().toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit' }),
        reason: verAlertReason,
        recommendedAction: scenario === 'MEMORY_LEAK' ? 'Manual investigation required' : scenario === 'NETWORK_CONGESTION' ? 'Manual investigation required' : 'Direct Priority-1 override required',
        assignedTo: 'SRE Team'
      };
      setEngineerAlerts(prev => [newAlert, ...prev]);

      setState('CRITICAL');
      addNotification("VERITAS POLICY BLOCK", `Remediation vector blocked by Veritas Governance Firewall. SRE summoned.`, "ERROR");

      if (scenario === 'VERITAS_3X_FAIL') {
        addLog("[CRITICAL ALERT] Dispatching PagerDuty P1 push notify to SRE Lead @chandrakala.200623...", "System", "ERROR", incidentId);
        addLog("[CRITICAL ALERT] GSM Gateway: Delivery confirmed to SRE cell endpoint +1 (555) 832-4412.", "System", "WARN", incidentId);
      }

      // Hold critical warning state
      await delay(8000);

      // Escalation Watchdog Check (Requirements 6 & 7)
      if (watchdogTimeouts.escalation < 8.0) {
        setWatchdogAlert({
          id: incidentId,
          stage: 'SRE Override Queue',
          expected: watchdogTimeouts.escalation,
          actual: 8.0,
          status: 'SLA Boundary Violation',
          message: 'SRE manual override action response timed out. Immediate priority escalation required.'
        });
        addLog(`[WATCHDOG FAILURE] SRE override delay exceeded expected limit (Expected: ${watchdogTimeouts.escalation}s, Actual: 8.0s). Priority-1 SLA breach logged!`, "Watchdog", "ERROR", incidentId);
        addNotification("SLA DEADLINE BREACHED", "Watchdog triggered: SRE manual override action response timed out.", "ERROR");
      }

      // Increment manual interventions
      setManualInterventionCount(prev => prev + 1);

      // Operator manual override recovery simulation
      if (scenario === 'VERITAS_3X_FAIL') {
        addLog("[MONITOR] SRE Lead @chandrakala.200623 established authenticated terminal bypass channel.", "System", "SUCCESS", incidentId);
        addLog("[MONITOR] Injecting secure compliance credentials and overriding lock tables successfully.", "System", "SUCCESS", incidentId);
        addLog("[MONITOR] SRE manual override restoration finalized. Perimeter gateway threat neutralized.", "Monitor", "SUCCESS", incidentId);
      } else if (scenario === 'MEMORY_LEAK') {
        addLog("[MONITOR] SRE completed transaction connection flush. Memory leaks purged.", "System", "SUCCESS", incidentId);
        addLog("[MONITOR] SRE manual override restoration sequence finalized. Telemetry stabilized.", "Monitor", "SUCCESS", incidentId);
      } else {
        addLog("[MONITOR] SRE Lead completed secure route bypass sequence.", "System", "SUCCESS", incidentId);
        addLog("[MONITOR] SRE manual override restoration sequence finalized. Telemetry stabilized.", "Monitor", "SUCCESS", incidentId);
      }
      
      setVeritasAlert(null);
      setState('LEARNING');
      // Record completed incident to JSON-format persistent local history list!
      recordIncidentToHistory(scenario, false, incidentId, proposedAction);

      await delay(1500);
      setState('NORMAL');
      setCurrentScenario('NORMAL');
      setScenarioTimer(30);
      addNotification("Manual Recovery Succeeded", "SRE manual override sequence resolved the deadlock successfully.", "SUCCESS");
      
      // Update historical trend line charts live!
      triggerHistoryUpdate(scenario, false);
    }
  };

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
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] animate-pulse ${getStatusColor(state)}`} />
              <span className="text-[11px] font-black uppercase tracking-[0.1em] text-[#94A3B8]">{state.replace('_', ' ')}</span>
            </div>
            <Separator orientation="vertical" className="h-5 bg-white/[0.06]" />

            {/* Glowing Autonomous Simulator Indicator */}
            <div className="flex items-center gap-3 bg-[#10B981]/5 px-4 h-10 rounded-full border border-[#10B981]/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Simulation Active</span>
            </div>

            {/* Dev Tools with subtle Icon & Label (Requirement 3) */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className={`h-10 px-4 rounded-full text-[10px] uppercase font-black tracking-widest flex items-center gap-1.5 transition-all border ${
                  showDevTools 
                    ? 'bg-[#10B981]/10 text-emerald-400 border-[#10B981]/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                    : 'text-[#64748B] hover:text-[#94A3B8] border-white/[0.04] bg-[#0F172A]'
                }`}
                onClick={() => setShowDevTools(!showDevTools)}
              >
                <span className="text-sm">⚙</span>
                <span>Dev</span>
              </Button>
              
              {/* Subtle Dev Tools popover/dropdown */}
              <AnimatePresence>
                {showDevTools && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2.5 w-72 bg-[#0B1120] border border-white/[0.08] rounded-xl shadow-2xl p-4 z-50 space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                      <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-zinc-500 font-black">
                        Dev Controls Panel
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full ${state === 'NORMAL' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase tracking-[0.15em] font-black text-zinc-400 block">
                        Force Scenario Load
                      </label>
                      <Select 
                        value={currentScenario === 'NORMAL' ? "" : currentScenario} 
                        onValueChange={(val) => {
                          if (state === 'NORMAL') {
                            setCurrentScenario(val as any);
                            setScenarioTimer(30);
                            addLog(`[SYSTEM] Operator manually triggered structural scenario sequence: ${val}`, "SYSTEM", "WARN");
                            addNotification("Scenario Switch", `Forced operational load trigger: ${val.replace(/_/g, ' ')}`, "INFO");
                            setShowDevTools(false);
                          }
                        }}
                        disabled={state !== 'NORMAL'}
                      >
                        <SelectTrigger className="h-9 text-[10px] bg-[#0F172A] border-white/[0.08] rounded-lg px-4 hover:bg-[#1E293B] text-zinc-300 w-full font-black uppercase tracking-wider focus:ring-0">
                          <SelectValue placeholder="Force Scenario" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0F172A] border-white/[0.1] text-[10px] rounded-xl text-zinc-300 font-bold max-h-60 overflow-y-auto">
                          <SelectItem value="HIGH_CPU_LOAD">HIGH CPU LOAD</SelectItem>
                          <SelectItem value="MEMORY_LEAK">MEMORY LEAK</SelectItem>
                          <SelectItem value="NETWORK_CONGESTION">NETWORK CONGESTION</SelectItem>
                          <SelectItem value="CASCADING_FAILURE">CASCADING FAILURE</SelectItem>
                          <SelectItem value="VERITAS_3X_FAIL">VERITAS 3X FAILURE SIMULATION</SelectItem>
                        </SelectContent>
                      </Select>
                      {state !== 'NORMAL' && (
                        <p className="text-[8px] font-mono text-rose-400 italic">
                          Bypassed: Simulation currently running active threat resolution.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 pt-2.5 border-t border-white/[0.04]">
                      <label className="text-[9px] uppercase tracking-[0.15em] font-black text-zinc-400 block flex items-center justify-between">
                        <span>Config watchdog timers</span>
                        <span className="text-[10px] text-emerald-400 font-bold">ONLINE</span>
                      </label>
                      
                      <div className="space-y-3 pt-1">
                        {/* Anomaly Detection */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[9px] font-mono">
                            <span className="text-zinc-500 font-bold">Anomaly scan delay:</span>
                            <span className="text-zinc-300 font-bold">{watchdogTimeouts.anomaly}s</span>
                          </div>
                          <input 
                            type="range" 
                            min="1" 
                            max="20" 
                            value={watchdogTimeouts.anomaly} 
                            onChange={(e) => setWatchdogTimeouts(prev => ({ ...prev, anomaly: parseInt(e.target.value) }))}
                            className="w-full h-1 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
                          />
                        </div>

                        {/* Veritas Validation */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[9px] font-mono">
                            <span className="text-zinc-500 font-bold">Veritas validations:</span>
                            <span className="text-zinc-300 font-bold">{watchdogTimeouts.veritas}s</span>
                          </div>
                          <input 
                            type="range" 
                            min="1" 
                            max="15" 
                            value={watchdogTimeouts.veritas} 
                            onChange={(e) => setWatchdogTimeouts(prev => ({ ...prev, veritas: parseInt(e.target.value) }))}
                            className="w-full h-1 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
                          />
                        </div>

                        {/* Healing Timeout */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[9px] font-mono">
                            <span className="text-zinc-500 font-bold">Healing recovery window:</span>
                            <span className="text-zinc-300 font-bold">{watchdogTimeouts.healing}s</span>
                          </div>
                          <input 
                            type="range" 
                            min="2" 
                            max="30" 
                            value={watchdogTimeouts.healing} 
                            onChange={(e) => setWatchdogTimeouts(prev => ({ ...prev, healing: parseInt(e.target.value) }))}
                            className="w-full h-1 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                          />
                        </div>

                        {/* Escalation Timeout */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[9px] font-mono">
                            <span className="text-zinc-500 font-bold">Escalation threshold limit:</span>
                            <span className="text-zinc-300 font-bold">{watchdogTimeouts.escalation}s</span>
                          </div>
                          <input 
                            type="range" 
                            min="5" 
                            max="45" 
                            value={watchdogTimeouts.escalation} 
                            onChange={(e) => setWatchdogTimeouts(prev => ({ ...prev, escalation: parseInt(e.target.value) }))}
                            className="w-full h-1 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="space-y-8">
          
          {/* Sub-Header stats bar with Multipage Navigation */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 bg-[#0F172A] border border-white/[0.06] p-1 rounded-full h-12 w-fit shadow-2xl">
                <button 
                  id="tab-live-operations"
                  onClick={() => setActiveTab('LIVE')}
                  className={`px-6 h-full flex items-center text-[11px] font-black uppercase tracking-widest rounded-full cursor-pointer transition-all duration-300 ${
                    activeTab === 'LIVE' 
                      ? 'bg-[#1E293B] text-[#F8FAFC] shadow-lg border border-white/[0.05]' 
                      : 'text-[#64748B] hover:text-[#94A3B8]'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 mr-2" />
                  Live Monitor
                </button>
                <button 
                  id="tab-system-analytics"
                  onClick={() => setActiveTab('ANALYTICS')}
                  className={`px-6 h-full flex items-center text-[11px] font-black uppercase tracking-widest rounded-full cursor-pointer transition-all duration-300 ${
                    activeTab === 'ANALYTICS' 
                      ? 'bg-[#1E293B] text-[#F8FAFC] shadow-lg border border-white/[0.05]' 
                      : 'text-[#64748B] hover:text-[#94A3B8]'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 mr-2" />
                  System Analytics
                </button>
                <button 
                  id="tab-learning-loop"
                  onClick={() => setActiveTab('LEARNING')}
                  className={`px-6 h-full flex items-center text-[11px] font-black uppercase tracking-widest rounded-full cursor-pointer transition-all duration-300 ${
                    activeTab === 'LEARNING' 
                      ? 'bg-[#1E293B] text-[#F8FAFC] shadow-lg border border-white/[0.05]' 
                      : 'text-[#64748B] hover:text-[#94A3B8]'
                  }`}
                >
                  <Brain className="w-3.5 h-3.5 mr-2" />
                  Learning Loop
                </button>
              </div>

              {activeTab === 'LIVE' && (
                <span className="text-xs text-[#94A3B8] font-black uppercase tracking-wider hidden sm:inline-block">
                  Current Scenario: <span className={currentScenario === 'NORMAL' ? "text-emerald-400 bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10" : "text-rose-400 bg-rose-500/5 px-2 py-1 rounded border border-rose-500/10 animate-pulse"}>{currentScenario.replace(/_/g, ' ')}</span>
                </span>
              )}
            </div>

            {currentScenario === 'NORMAL' && state === 'NORMAL' && (
              <div className="text-xs text-zinc-500 font-mono flex items-center gap-2.5 bg-[#0F172A]/50 border border-white/[0.04] px-4 py-2 rounded-full">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-600" />
                <span>Next Scenario shift in <span className="text-zinc-300 font-bold">{scenarioTimer}s</span></span>
              </div>
            )}
          </div>

          {activeTab === 'LIVE' && (
            <div className="space-y-6">
              {watchdogAlert && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-500/5 border-2 border-amber-500/20 rounded-[20px] p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex gap-4 items-start">
                    <div className="bg-amber-500/10 text-amber-400 p-2.5 rounded-xl border border-amber-500/20 mt-0.5">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black tracking-widest text-amber-500 uppercase bg-amber-500/15 border border-amber-500/20 px-2 py-0.5 rounded">WATCHDOG TIMER BREACHED</span>
                        <span className="text-xs font-mono font-black text-zinc-300">STAGE: {watchdogAlert.stage.toUpperCase()}</span>
                      </div>
                      <h4 className="text-sm font-black text-[#F8FAFC]">
                        {watchdogAlert.message}
                      </h4>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        Expected SLA Limit: <span className="text-amber-400 font-bold">{watchdogAlert.expected}s</span> &bull; 
                        Actual Processing Duration: <span className="text-rose-400 font-bold">{watchdogAlert.actual}s</span> &bull; 
                        Status: <span className="text-rose-400 underline font-bold uppercase">{watchdogAlert.status}</span>
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setWatchdogAlert(null)}
                    className="text-[9px] uppercase font-black tracking-wider text-zinc-400 hover:text-[#F8FAFC] border border-white/[0.04] bg-[#0E1526] px-4 rounded-full h-8"
                  >
                    Dismiss Alert
                  </Button>
                </motion.div>
              )}

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
                      <Button 
                        variant={activeMetric === 'latency' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        className={`h-7 text-[10px] font-black px-4 rounded-full transition-all duration-300 ${activeMetric === 'latency' ? 'bg-[#1E293B] text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'text-[#94A3B8]'}`}
                        onClick={() => setActiveMetric('latency')}
                      >
                        LATENCY / NETWORK
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full relative">
                    <AnimatePresence>
                      {currentScenario !== 'NORMAL' && (
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
                                {failureProbability}%
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
                            <stop offset="5%" stopColor={activeMetric === 'cpu' ? "#10b981" : activeMetric === 'memory' ? "#a855f7" : "#06b6d4"} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={activeMetric === 'cpu' ? "#10b981" : activeMetric === 'memory' ? "#a855f7" : "#06b6d4"} stopOpacity={0}/>
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
                          tickFormatter={(value) => activeMetric === 'latency' ? `${value}ms` : `${value}%`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '12px' }}
                          itemStyle={{ color: '#f4f4f5' }}
                          formatter={(value) => [activeMetric === 'latency' ? `${value}ms` : `${value}%`, activeMetric.toUpperCase()]}
                        />
                        <Area 
                          type="monotone" 
                          dataKey={activeMetric} 
                          stroke={activeMetric === 'cpu' ? "#10b981" : activeMetric === 'memory' ? "#a855f7" : "#06b6d4"} 
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
                                    className={`relative pl-10 pr-5 py-3 my-2 group rounded-r-xl border-l-[3px] transition-all duration-300 ${
                                      log.level === 'ERROR' ? 'border-l-[#ef4444] bg-[#ef4444]/[0.06]' : 
                                      log.level === 'WARN' ? 'border-l-[#f59e0b] bg-[#f59e0b]/[0.06]' : 
                                      'border-l-[#3b82f6] bg-[#3b82f6]/[0.06]'
                                    }`}
                                  >
                                    <div className={`absolute left-[-2.5px] top-[18px] w-1.5 h-1.5 rounded-full border border-zinc-900 z-10 transition-all duration-300 group-hover:scale-150 ${
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
            </div>

            {/* Right Column: Logs, Veritas Shield alerts, AI reasoning, and System Status */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              
              {/* SYSTEM STATUS CARD (Requirement 6) */}
              <Card className="bg-[#0B1120] border-white/[0.06] rounded-[24px] shadow-2xl p-6">
                <CardHeader className="p-0 pb-4 border-b border-white/[0.06]">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.25em] text-[#F8FAFC] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400 animate-pulse" /> System Status
                  </CardTitle>
                </CardHeader>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  {(() => {
                    const latest = metrics[metrics.length - 1] || { cpu: 0, memory: 0, latency: 0 };
                    return (
                      <>
                        <div className="bg-[#0F172A] border border-white/[0.04] rounded-2xl p-3.5 flex flex-col justify-between">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">CPU</span>
                            <span className="text-[11px] font-mono text-[#10b981] font-bold">{latest.cpu}%</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              currentScenario === 'HIGH_CPU_LOAD' || currentScenario === 'CASCADING_FAILURE' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                            }`} />
                            <span className={`text-[10px] font-black uppercase tracking-wider ${
                              currentScenario === 'HIGH_CPU_LOAD' || currentScenario === 'CASCADING_FAILURE' ? 'text-rose-400' : 'text-emerald-500'
                            }`}>
                              {currentScenario === 'HIGH_CPU_LOAD' || currentScenario === 'CASCADING_FAILURE' ? 'CRITICAL' : 'NORMAL'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-[#0F172A] border border-white/[0.04] rounded-2xl p-3.5 flex flex-col justify-between">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">MEMORY</span>
                            <span className="text-[11px] font-mono text-[#a855f7] font-bold">{latest.memory}%</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              currentScenario === 'MEMORY_LEAK' || currentScenario === 'CASCADING_FAILURE' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                            }`} />
                            <span className={`text-[10px] font-black uppercase tracking-wider ${
                              currentScenario === 'MEMORY_LEAK' || currentScenario === 'CASCADING_FAILURE' ? 'text-rose-400' : 'text-emerald-400'
                            }`}>
                              {currentScenario === 'MEMORY_LEAK' || currentScenario === 'CASCADING_FAILURE' ? 'CRITICAL' : 'NORMAL'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-[#0F172A] border border-white/[0.04] rounded-2xl p-3.5 flex flex-col justify-between">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">LATENCY</span>
                            <span className="text-[11px] font-mono text-[#06b6d4] font-bold">{latest.latency}ms</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              currentScenario === 'NETWORK_CONGESTION' || currentScenario === 'CASCADING_FAILURE' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                            }`} />
                            <span className={`text-[10px] font-black uppercase tracking-wider ${
                              currentScenario === 'NETWORK_CONGESTION' || currentScenario === 'CASCADING_FAILURE' ? 'text-rose-400' : 'text-emerald-400'
                            }`}>
                              {currentScenario === 'NETWORK_CONGESTION' || currentScenario === 'CASCADING_FAILURE' ? 'CRITICAL' : 'NORMAL'}
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  <div className="bg-[#0F172A] border border-white/[0.04] rounded-2xl p-3.5 flex flex-col justify-between">
                    <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">ANOMALIES</span>
                    <span className={`text-xs font-mono font-black mt-1 ${state !== 'NORMAL' ? 'text-rose-400 font-bold' : 'text-zinc-500'}`}>
                      {state !== 'NORMAL' ? '1 DETECTED' : '0 ACTIVE'}
                    </span>
                  </div>

                  {/* PREDICTIVE INSIGHT PILL BLOCK */}
                  <div className={`border rounded-2xl p-4 flex flex-col gap-2 col-span-2 transition-all duration-300 ${predictiveInsight.borderStyle}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className={`w-4 h-4 ${predictiveInsight.iconColor}`} />
                        <span className="text-[10px] font-black tracking-widest text-[#F8FAFC] uppercase">PREDICTIVE INSIGHT</span>
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${predictiveInsight.riskColor}`}>
                        {predictiveInsight.riskLevel} RISK
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black tracking-wider text-zinc-400 uppercase block mb-0.5">
                        {predictiveInsight.title}
                      </span>
                      <p className="text-[11px] text-zinc-300 font-medium leading-relaxed">
                        {predictiveInsight.message}
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#0F172A] border border-white/[0.04] rounded-2xl p-3.5 flex flex-col justify-between col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">RISK SCORE</span>
                      <span className={`text-xs font-mono font-black ${failureProbability > 60 ? 'text-rose-400' : 'text-zinc-400'}`}>{failureProbability}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-950 rounded-full mt-2 overflow-hidden border border-white/5">
                      <div 
                        className={`h-full transition-all duration-500 ${failureProbability > 60 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${Math.min(100, Math.max(2, failureProbability))}%` }} 
                      />
                    </div>
                  </div>

                  <div className="bg-[#0F172A] border border-white/[0.04] rounded-2xl p-4 flex flex-col justify-between col-span-2">
                    <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">VERITAS SHIELD STATUS</span>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          state === 'NORMAL' ? 'bg-[#10B981]' :
                          state === 'VERIFYING' ? 'bg-amber-500 animate-pulse' :
                          state === 'CRITICAL' ? 'bg-rose-500 animate-pulse' : 'bg-sky-500 shadow-[0_0_8px_#3b82f6]'
                        }`} />
                        <span className="text-xs font-black tracking-wider text-zinc-200">
                          {state === 'NORMAL' ? 'VERITAS: ACTIVE' :
                           state === 'VERIFYING' ? 'VERITAS: REVIEWING' :
                           state === 'CRITICAL' ? 'VERITAS: BLOCKED' : 'VERITAS: APPROVED'}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-mono border-white/10 text-zinc-400">
                        ENG v4.2
                      </Badge>
                    </div>
                    {/* Live Counter & Context Message */}
                    <div className="mt-3 pt-2.5 border-t border-white/[0.04] space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] font-mono">
                        <span className="text-[#64748B] font-black uppercase tracking-wider">Activity Telemetry</span>
                        <span className="text-rose-400 font-bold tracking-tight animate-pulse">{threatsIntercepted} threats intercepted</span>
                      </div>
                      <div className="text-[10px] font-medium text-zinc-400 leading-normal flex items-start gap-1.5 bg-zinc-950/20 px-2 py-1.5 rounded-lg border border-white/[0.02]">
                        <span className="text-[#10B981] font-bold mt-0.5 select-none">●</span>
                        <span className="flex-1 truncate">{getVeritasStatusMsg(currentScenario)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* LIVE LOGS PANEL (Requirement 4) */}
              <Card className="bg-[#0B1120] border-white/[0.06] h-[480px] flex flex-col rounded-[24px] shadow-2xl overflow-hidden">
                <CardHeader className="flex flex-col gap-4 border-b border-white/[0.06] py-5 px-6">
                  <div className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-[#F8FAFC] flex items-center gap-2.5">
                      <Terminal className="w-4 h-4 text-zinc-400 animate-pulse" /> System Logs
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      {/* Download Buttons */}
                      <div className="flex items-center gap-1 bg-[#0F172A] border border-white/[0.06] rounded-full p-0.5 shadow-inner">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => downloadLogs('json')}
                          className="h-6 px-2.5 text-[9px] font-black uppercase tracking-widest text-[#94A3B8] hover:text-[#14F1D9] hover:bg-[#14F1D9]/5 rounded-full flex items-center gap-1 border-0 transition-all"
                          title="Export Visible Logs as JSON"
                        >
                          <Download className="w-2.5 h-2.5" />
                          JSON
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => downloadLogs('csv')}
                          className="h-6 px-2.5 text-[9px] font-black uppercase tracking-widest text-[#94A3B8] hover:text-[#14F1D9] hover:bg-[#14F1D9]/5 rounded-full flex items-center gap-1 border-0 transition-all"
                          title="Export Visible Logs as CSV"
                        >
                          <Download className="w-2.5 h-2.5" />
                          CSV
                        </Button>
                      </div>

                      <div className="flex items-center gap-2 bg-[#14F1D9]/5 px-2 py-1 rounded-full border border-[#14F1D9]/20 shadow-[0_0_10px_rgba(20,241,217,0.1)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#14F1D9] shadow-[0_0_8px_#14F1D9] animate-pulse" />
                        <span className="text-[10px] font-black text-[#14F1D9] uppercase tracking-tighter">Live Stream</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Select value={levelFilter} onValueChange={setLevelFilter}>
                      <SelectTrigger className="h-8 w-fit min-w-[95px] text-[10px] bg-[#0F172A] border-white/[0.06] rounded-full px-3 text-[#94A3B8] font-black tracking-wider focus:ring-0">
                        <Filter className="w-3 h-3 mr-2" />
                        <SelectValue placeholder="Level" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F172A] border-white/[0.1] text-[10px] rounded-xl text-zinc-300 font-bold">
                        <SelectItem value="ALL">All Levels</SelectItem>
                        <SelectItem value="INFO">INFO</SelectItem>
                        <SelectItem value="WARN">WARN</SelectItem>
                        <SelectItem value="ERROR">ERROR</SelectItem>
                        <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                        <SelectItem value="AI">AI</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={compFilter} onValueChange={setCompFilter}>
                      <SelectTrigger className="h-8 w-fit min-w-[115px] text-[10px] bg-[#0F172A] border-white/[0.06] rounded-full px-3 text-[#94A3B8] font-black tracking-wider focus:ring-0">
                        <SlidersHorizontal className="w-3 h-3 mr-2" />
                        <SelectValue placeholder="Component" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F172A] border-white/[0.1] text-[10px] rounded-xl text-zinc-300 font-bold">
                        {uniqueComponents.map(comp => (
                          <SelectItem key={comp} value={comp}>{comp === "ALL" ? "All Components" : comp}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {(levelFilter !== "ALL" || compFilter !== "ALL") && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-3 text-[10px] text-[#94A3B8] hover:text-[#F8FAFC] rounded-full font-black uppercase tracking-widest bg-[#0F172A]"
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
                          className={`text-[11px] font-mono group border-l-2 pl-4 py-2 transition-all duration-300 cursor-pointer relative rounded-r-xl mx-2 mb-1 border-transparent opacity-80 hover:opacity-100 ${
                            log.incidentId ? 'bg-rose-500/[0.02] border-l-rose-500/30' : 'hover:bg-white/[0.02]'
                          }`}
                          onClick={() => {
                            setSelectedLog(log);
                            if (log.incidentId) {
                              setCurrentTraceId(log.incidentId);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3 mb-1 relative z-10">
                            <span className="text-[#64748B] tabular-nums text-[9px] leading-none">{log.timestamp}</span>
                            <div className="flex items-center gap-2 flex-1">
                              <span className={`px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-widest leading-none ${getModuleColor(log.component)}`}>
                                {log.component}
                              </span>
                              {log.incidentId && (
                                <Badge variant="outline" className="text-[8px] py-0 h-4 border-rose-500/20 text-rose-500/85 bg-rose-500/5 font-black uppercase tracking-tighter rounded-md">
                                  TRACE {log.incidentId.split('-')[1]}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className={`leading-relaxed relative z-10 text-[12px] truncate ${
                            log.level === 'ERROR' ? 'text-rose-400 font-bold' : 
                            log.level === 'WARN' ? 'text-amber-400' : 
                            log.level === 'AI' ? 'text-blue-300 italic' : 
                            log.level === 'SUCCESS' ? 'text-emerald-400' : 'text-[#94A3B8]'
                          }`}>
                            {log.message}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* VERITAS ALERT CARD (Requirement 5) */}
              <AnimatePresence>
                {veritasAlert && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                  >
                    <Card className="bg-rose-950/25 border-rose-500/40 rounded-[24px] p-5 shadow-[0_0_35px_rgba(244,63,94,0.15)] border-2">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-rose-500/20 rounded-xl border border-rose-500/30 text-rose-400 animate-pulse">
                          <AlertTriangle className="w-5 h-5 shadow-inner" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <h4 className="text-xs font-black text-rose-400 tracking-wider">🚨 VERITAS BLOCKED ACTION</h4>
                          <div className="space-y-1 text-xs">
                            <p className="text-zinc-300"><span className="font-black uppercase tracking-wider text-[9px] text-[#64748B] mr-2">Reason:</span>{veritasAlert.reason}</p>
                            <p className="text-zinc-300"><span className="font-black uppercase tracking-wider text-[9px] text-[#64748B] mr-2">Severity:</span><span className="font-black text-rose-400">{veritasAlert.severity}</span></p>
                            <p className="text-zinc-300"><span className="font-black uppercase tracking-wider text-[9px] text-[#64748B] mr-2">Status:</span><span className="bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded text-rose-300 animate-pulse font-bold">{veritasAlert.status}</span></p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AI REASONING CARD (Requirement 7) */}
              <Card className="bg-[#0B1120] border-white/[0.06] rounded-[24px] shadow-2xl p-6">
                <CardHeader className="p-0 pb-4 border-b border-white/[0.06] flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.25em] text-[#F8FAFC] flex items-center gap-2">
                    <Brain className="w-4 h-4 text-emerald-400 animate-pulse" /> AI Reasoning
                  </CardTitle>
                  <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2.5 py-0.5 rounded border border-white/5 uppercase font-bold tracking-wider">
                    {state === 'NORMAL' ? 'IDLE' : state}
                  </span>
                </CardHeader>
                <div className="pt-4 space-y-4">
                  {state === 'NORMAL' ? (
                    <div className="text-zinc-500 italic text-center py-6 text-[11px] leading-relaxed">
                      Monitoring system telemetry streams smoothly. No active anomalies requiring AI-Ops reasoning sequence.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {aiAnalysis ? (
                        <>
                          <div className="space-y-1">
                            <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">Root Cause</span>
                            <p className="text-xs text-zinc-200 bg-[#0F172A] border border-white/[0.04] p-3 rounded-xl leading-relaxed font-bold">
                              {aiAnalysis.rootCause}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">Confidence</span>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                                <div 
                                  className={`h-full transition-all duration-1000 ${
                                    aiAnalysis.confidence > 0.8 ? 'bg-[#10B981]' : 'bg-amber-400'
                                  }`}
                                  style={{ width: `${aiAnalysis.confidence * 100}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-mono font-black text-zinc-300">
                                {Math.round(aiAnalysis.confidence * 100)}%
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">Recommended Action</span>
                            <p className="text-xs text-[#E2E8F0] bg-[#0F172A] border border-white/[0.04] p-3 rounded-xl font-mono leading-relaxed text-wrap">
                              {aiAnalysis.proposedAction}
                            </p>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">VERITAS STATUS:</span>
                              <span className={`text-xs font-mono font-black uppercase ${
                                veritasAlert ? 'text-rose-400' : 'text-emerald-400'
                              }`}>
                                {veritasAlert ? 'REJECTED' : 'APPROVED'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">AUTONOMOUS HEALING:</span>
                              <span className={`text-xs font-mono font-black uppercase ${
                                veritasAlert ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                              }`}>
                                {veritasAlert ? 'BLOCKED' : 'SUCCESSFUL'}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-3 py-4">
                          <div className="h-3 bg-[#0F172A] rounded-full animate-pulse w-1/3" />
                          <div className="h-10 bg-[#0F172A] rounded-xl animate-pulse w-full" />
                          <div className="h-3 bg-[#0F172A] rounded-full animate-pulse w-1/2" />
                          <div className="h-10 bg-[#0F172A] rounded-xl animate-pulse w-full" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* ENGINEER ALERTS PANEL */}
              <Card className="bg-[#0B1120] border-white/[0.06] rounded-[24px] shadow-2xl p-6">
                <CardHeader className="p-0 pb-4 border-b border-white/[0.06] flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.25em] text-[#F8FAFC] flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" /> Engineer Alerts
                  </CardTitle>
                  <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2.5 py-0.5 rounded border border-white/5 uppercase font-bold tracking-wider">
                    {engineerAlerts.length} Active
                  </span>
                </CardHeader>
                <div className="pt-4 space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {engineerAlerts.length === 0 ? (
                    <div className="text-zinc-500 italic text-center py-4 text-[11px]">
                      No escalated active engineer pager alerts.
                    </div>
                  ) : (
                    engineerAlerts.map((alert) => (
                      <div key={alert.id} className="bg-zinc-950/40 p-3 rounded-xl border border-white/[0.04] space-y-2 hover:border-zinc-700 transition">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-[#F43F5E] font-black">{alert.id}</span>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                            alert.severity === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {alert.severity}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-200 font-bold leading-tight">{alert.scenario.replace(/_/g, ' ')} ALERT</p>
                          <p className="text-[10px] text-zinc-400 mt-1"><span className="text-zinc-500">Reason:</span> {alert.reason}</p>
                          <p className="text-[10px] text-zinc-400"><span className="text-zinc-500">Action:</span> {alert.recommendedAction}</p>
                        </div>
                        <div className="flex items-center justify-between text-[8px] text-zinc-500 border-t border-white/[0.02] pt-1.5 mt-1.5">
                          <span>Assignee: {alert.assignedTo}</span>
                          <span>{alert.timestamp}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

            </div>
          </div>
          </div>
          )}

          {activeTab === 'ANALYTICS' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Analytics Top summary tagline */}
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                <div>
                  <h2 className="text-[#F8FAFC] font-black text-lg tracking-tight uppercase">AI-Ops Analytics & Evaluation</h2>
                  <p className="text-xs text-[#64748B] mt-1">Measurable efficacy, governance, and recovery reliability matrix across continuous simulated system cycles.</p>
                </div>
                <div className="hidden md:flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse" />
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Enterprise Sync: Active</span>
                </div>
              </div>

              {/* MAIN CHARTS SECTION */}
              <div className="grid grid-cols-12 gap-6 mt-8">
                
                {/* Chart 1: Detection Performance Trend */}
                <Card id="analytics-chart-detection-performance" className="col-span-12 lg:col-span-6 bg-[#0B1120] border-white/[0.06] rounded-[24px] overflow-hidden shadow-2xl p-6">
                  <div className="mb-4">
                    <h3 className="text-xs font-black text-[#F8FAFC] uppercase tracking-[0.2em] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_rgb(16,185,129)]" />
                      Detection Performance Trend
                    </h3>
                    <p className="text-[10px] text-[#64748B] mt-1">Stochastic accuracy coefficient tracking over temporal telemetry boundaries.</p>
                  </div>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="detectionGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                        <XAxis dataKey="time" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis domain={[80, 100]} stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} unit="%" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0B1120', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '16px' }}
                          itemStyle={{ color: '#F8FAFC', fontSize: '11px', fontFamily: 'monospace' }}
                          labelStyle={{ color: '#94A3B8', fontSize: '10px', fontWeight: 'bold' }}
                        />
                        <Area type="monotone" dataKey="detectionRate" name="Detection Accuracy" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#detectionGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Chart 2: Recovery Success Trend */}
                <Card id="analytics-chart-recovery-success" className="col-span-12 lg:col-span-6 bg-[#0B1120] border-white/[0.06] rounded-[24px] overflow-hidden shadow-2xl p-6">
                  <div className="mb-4">
                    <h3 className="text-xs font-black text-[#F8FAFC] uppercase tracking-[0.2em] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block shadow-[0_0_8px_rgb(168,85,247)]" />
                      Recovery Success Trend
                    </h3>
                    <p className="text-[10px] text-[#64748B] mt-1">Autonomous remediation cycle performance and recovery margins index.</p>
                  </div>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="recoveryGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#A855F7" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                        <XAxis dataKey="time" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis domain={[80, 100]} stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} unit="%" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0B1120', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '16px' }}
                          itemStyle={{ color: '#F8FAFC', fontSize: '11px', fontFamily: 'monospace' }}
                          labelStyle={{ color: '#94A3B8', fontSize: '10px', fontWeight: 'bold' }}
                        />
                        <Area type="monotone" dataKey="recoveryRate" name="Remediation Rate" stroke="#A855F7" strokeWidth={2.5} fillOpacity={1} fill="url(#recoveryGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                  {/* Performance Summary Panel */}
                  <Card id="analytics-performance-summary" className="col-span-12 bg-[#0B1120] border-white/[0.06] rounded-[24px] shadow-2xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black text-[#F8FAFC] uppercase tracking-[0.25em] flex items-center gap-2 mb-2">
                      <Layers className="w-4 h-4 text-purple-400" />
                      SYSTEM PERFORMANCE SUMMARY
                    </h3>
                    <p className="text-[10px] text-[#64748B] mb-4">Enterprise-grade diagnostic audit matching running pipeline metrics and verification ratios.</p>
                    
                    <div className="space-y-3 mt-4">
                      
                      {/* Metric Row 1: Veritas Approval Rate */}
                      <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 text-xs">
                        <span className="text-[#64748B] font-bold uppercase tracking-wider text-[10px]">Veritas Approval Rate:</span>
                        <span className="font-mono font-black text-emerald-400">
                          {totalSuggestedActions === 0 ? "0%" : Math.round((approvedActions / totalSuggestedActions) * 100) + "%"}
                        </span>
                      </div>

                      {/* Metric Row 2: Veritas Rejection Rate */}
                      <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 text-xs">
                        <span className="text-[#64748B] font-bold uppercase tracking-wider text-[10px]">Veritas Rejection Rate:</span>
                        <span className="font-mono font-black text-rose-400">
                          {totalSuggestedActions === 0 ? "0%" : Math.round((rejectedActions / totalSuggestedActions) * 100) + "%"}
                        </span>
                      </div>

                      {/* Metric Row 3: Escalated Incidents */}
                      <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 text-xs">
                        <span className="text-[#64748B] font-bold uppercase tracking-wider text-[10px]">Escalated Incidents:</span>
                        <span className="font-mono font-black text-amber-400">
                          {escalatedIncidents}
                        </span>
                      </div>

                      {/* Metric Row 4: Autonomous Recovery Success Rate */}
                      <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 text-xs">
                        <span className="text-[#64748B] font-bold uppercase tracking-wider text-[10px]">Autonomous Recovery Success Rate:</span>
                        <span className="font-mono font-black text-purple-400">
                          {approvedActions === 0 ? "0%" : Math.round((successfulRecoveries / approvedActions) * 100) + "%"}
                        </span>
                      </div>

                      {/* Metric Row 5: Manual Intervention Count */}
                      <div className="flex items-center justify-between pb-2 text-xs">
                        <span className="text-[#64748B] font-bold uppercase tracking-wider text-[10px]">Manual Intervention Count:</span>
                        <span className="font-mono font-black text-cyan-400">
                          {manualInterventionCount}
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* Status Badge Block */}
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black tracking-widest text-[#64748B] uppercase">Status</span>
                      {(() => {
                        const healthInt = parseFloat(currentHealthScore as any);
                        let statusLabel = "HEALTHY";
                        let statusColor = "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.06)]";
                        if (state === 'CRITICAL') {
                          statusLabel = "CRITICAL / DISPATCHED";
                          statusColor = "text-rose-400 border-rose-500/30 bg-rose-500/10 animate-pulse";
                        } else if (state !== 'NORMAL') {
                          statusLabel = "MITIGATING / HEALING";
                          statusColor = "text-cyan-400 border-cyan-500/20 bg-cyan-500/5 animate-pulse";
                        } else if (healthInt < 95) {
                          statusLabel = "WARNING / DEGRADED";
                          statusColor = "text-amber-400 border-amber-500/20 bg-amber-500/5";
                        }
                        return (
                          <span className={`text-[10.5px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border ${statusColor}`}>
                            {statusLabel}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </Card>

              </div>

            </div>
          )}

          {activeTab === 'LEARNING' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Learning Analytics KPI Cards Row */}
              <div className="max-w-sm">
                <Card className="bg-[#0B1120] border-white/[0.05] p-5 rounded-[20px] shadow-2xl relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">TOTAL ARCHIVED ARCHIVE</span>
                      <div className="bg-[#10B981]/10 text-emerald-400 p-2 rounded-lg border border-emerald-500/20">
                        <History className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-black text-[#F8FAFC] font-mono mt-2">
                      {incidentHistory.length}
                    </h3>
                    <p className="text-[9px] text-[#64748B] mt-1 font-mono uppercase">Persistent log index count</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/[0.03] flex justify-between items-center text-[10px]">
                    <span className="text-[#10B981] font-bold">100% Retained</span>
                    <span className="text-zinc-500">LocalStorage JSON DB</span>
                  </div>
                </Card>
              </div>

              {/* Dynamic Learning Loop Flowchart Visualizer */}
              <Card className="bg-[#0B1120] border-white/[0.05] p-6 rounded-[24px] shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/[0.05] pb-4 mb-6 gap-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#F8FAFC] flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-400" /> Active learning feedback pathway loop
                    </h3>
                    <p className="text-[10px] text-[#64748B] mt-0.5">Real-time mapping highlight illustrating the pipeline state travel path during active incident mitigations.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9px] font-mono tracking-widest uppercase font-black text-emerald-400">Live Stage Tracker</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-7 gap-3 relative pb-2">
                  {[
                    { id: 'NORMAL', label: '1. Monitor', sub: 'Telemetry scans', active: state === 'NORMAL' },
                    { id: 'ANOMALY_DETECTED', label: '2. Anomaly', sub: 'Integrity drift', active: state === 'ANOMALY_DETECTED' },
                    { id: 'PREDICTING', label: '3. Predict', sub: 'Prophet profiles', active: state === 'PREDICTING' },
                    { id: 'RETRIEVING', label: '4. Retrieval', sub: 'ChromaDB match', active: state === 'RETRIEVING' },
                    { id: 'ANALYZING', label: '5. AI core', sub: 'Gemini reasoning', active: state === 'ANALYZING' },
                    { id: 'VERIFYING', label: '6. Veritas', sub: 'Compliance guard', active: state === 'VERIFYING' },
                    { id: 'RESOLVING', label: '7. Resolution', sub: 'Self-healed / SLA', active: ['EXECUTING', 'LEARNING', 'CRITICAL'].includes(state) }
                  ].map((step, sIdx) => (
                    <div key={step.id} className="relative flex flex-col items-center">
                      <div className={`w-full p-4 rounded-2xl border flex flex-col items-center text-center transition-all duration-500 h-full ${
                        step.active 
                          ? 'bg-purple-500/[0.07] border-purple-500 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)] scale-[1.03]' 
                          : 'bg-[#0F172A]/40 border-white/[0.04] text-[#64748B]'
                      }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-black mb-2 ${
                          step.active ? 'bg-purple-500 text-white animate-pulse' : 'bg-[#1E293B] text-zinc-500'
                        }`}>
                          {sIdx + 1}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${step.active ? 'text-purple-300' : 'text-zinc-400'}`}>{step.label}</span>
                        <span className="text-[8px] font-mono mt-1 text-zinc-500">{step.sub}</span>
                      </div>
                      
                      {sIdx < 6 && (
                        <div className="hidden md:block absolute top-1/2 -right-2 translate-x-1/2 -translate-y-1/2 z-10 text-zinc-600 font-bold text-sm pointer-events-none">
                          &rarr;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Paginated Incident History Section */}
              <Card className="bg-[#0B1120] border-white/[0.05] rounded-[24px] shadow-2xl p-6 relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.05] pb-4 mb-5">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#F8FAFC] flex items-center gap-2">
                      <History className="w-4 h-4 text-emerald-400" /> Persistent Incident Repository Archive
                    </h3>
                    <p className="text-[10px] text-[#64748B] mt-0.5">Double-click on any entry row to trigger deep visual diagnostics trace analytics overlays.</p>
                  </div>
                  
                  {/* Search and Filters Section */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Search Field */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                      <input 
                        type="text"
                        placeholder="Search scenario or engineer..."
                        value={searchFilter}
                        onChange={(e) => {
                          setSearchFilter(e.target.value);
                          setHistoryPage(1); // Reset page to first
                        }}
                        className="bg-[#0F172A] border border-white/[0.08] text-[10px] rounded-lg md:rounded-full pl-8.5 pr-4 h-9 font-bold text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition w-44 md:w-56"
                      />
                    </div>

                    {/* Filter Severity Level */}
                    <div className="flex items-center gap-1 bg-[#0F172A] border border-white/[0.08] rounded-lg md:rounded-full px-2.5 h-9">
                      <Filter className="w-3.5 h-3.5 text-zinc-500" />
                      <select 
                        value={severityFilter} 
                        onChange={(e) => {
                          setSeverityFilter(e.target.value);
                          setHistoryPage(1); // Reset page to first
                        }}
                        className="bg-transparent text-[10px] border-none font-black text-zinc-300 focus:outline-none h-full"
                      >
                        <option value="ALL">ALL SEVERITIES</option>
                        <option value="CRITICAL">CRITICAL</option>
                        <option value="HIGH">HIGH</option>
                        <option value="WARN">WARN</option>
                        <option value="INFO">INFO</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/[0.04]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#0F172A]/70 text-[10px] font-black uppercase text-zinc-500 tracking-wider font-mono border-b border-white/[0.04]">
                        <th className="py-3 px-4">Incident ID</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Scenario</th>
                        <th className="py-3 px-4">Severity</th>
                        <th className="py-3 px-4">Risk Score</th>
                        <th className="py-3 px-4">Veritas Decision</th>
                        <th className="py-3 px-4 font-mono select-none">Assigned Engineer</th>
                        <th className="py-3 px-4">Remediation Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03] text-[10.5px]">
                      {paginatedHistory.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-zinc-500 font-mono">
                            No persistent incidents matching query constraints detected.
                          </td>
                        </tr>
                      ) : (
                        paginatedHistory.map((item) => {
                          let borderClass = 'border-l-[3px] border-l-blue-500 bg-blue-500/[0.012]';
                          let badgeClass = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                          
                          if (item.severity === 'CRITICAL') {
                            borderClass = 'border-l-[3px] border-l-red-500 bg-red-500/[0.02]';
                            badgeClass = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                          } else if (item.severity === 'HIGH' || item.severity === 'WARN') {
                            borderClass = 'border-l-[3px] border-l-amber-500 bg-amber-500/[0.015]';
                            badgeClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                          }
                          
                          return (
                            <tr 
                              key={item.incident_id} 
                              onDoubleClick={() => setSelectedHistoricalIncident(item)}
                              className={`hover:bg-white/[0.015] cursor-pointer transition-colors ${borderClass}`}
                            >
                              <td className="py-3 px-4 font-mono font-black text-purple-400">
                                {item.incident_id}
                              </td>
                              <td className="py-3 px-4 text-zinc-400 font-mono">
                                {item.timestamp}
                              </td>
                              <td className="py-3 px-4 font-black uppercase text-zinc-200">
                                {item.scenario.replace(/_/g, ' ')}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded border ${badgeClass}`}>
                                  {item.severity}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-zinc-300">
                                {item.risk_score}%
                              </td>
                              <td className="py-3 px-4">
                                <span className={`text-[9.5px] font-black uppercase flex items-center gap-1.5 ${
                                  item.veritas_decision === 'APPROVED' ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                  {item.veritas_decision === 'APPROVED' ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> PASS
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-3 h-3 text-rose-400" /> BLOCK
                                    </>
                                  )}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-zinc-300 font-bold">
                                {item.assigned_engineer}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`text-[10px] font-bold ${
                                  item.resolution.includes('Success') || item.resolution.includes('Autonomous') || item.resolution.includes('restarted')
                                    ? 'text-[#00F0FF]' 
                                    : 'text-amber-400'
                                }`}>
                                  {item.resolution}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-1">
                    <span className="text-[10px] font-mono text-zinc-500 font-bold">
                      Showing {(historyPage - 1) * 10 + 1}-{Math.min(historyPage * 10, filteredHistory.length)} of {filteredHistory.length} incident records
                    </span>
                    
                    <div className="flex gap-1.5">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        disabled={historyPage === 1}
                        className="h-8 text-[10px] uppercase font-black px-4 rounded-full text-zinc-400 hover:text-white bg-[#0F172A] border border-white/[0.04]"
                        onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                      >
                        &larr; Prev
                      </Button>
                      <div className="h-8 px-4 rounded-full flex items-center justify-center bg-[#0F172A]/80 border border-white/[0.05] text-[10px] font-mono font-black text-purple-400">
                        PAGE {historyPage} OF {totalPages}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        disabled={historyPage === totalPages}
                        className="h-8 text-[10px] uppercase font-black px-4 rounded-full text-zinc-400 hover:text-white bg-[#0F172A] border border-white/[0.04]"
                        onClick={() => setHistoryPage(prev => Math.min(totalPages, prev + 1))}
                      >
                        Next &rarr;
                      </Button>
                    </div>
                  </div>
                )}
              </Card>

              {/* Download Persistent Archiveless Logs */}
              <div className="flex justify-end gap-2 select-none">
                <span className="text-[10px] text-zinc-500 font-mono self-center mr-1">Export Repository:</span>
                <Button 
                  onClick={downloadHistoryAsJSON}
                  variant="ghost"
                  size="sm"
                  className="bg-[#0B1120] hover:bg-white/5 border border-white/[0.05] hover:border-purple-500/20 text-[10px] uppercase font-black px-3.5 h-8 rounded-full text-purple-400 flex items-center gap-1.5"
                >
                  <Download className="w-3 h-3" />
                  Download JSON
                </Button>
                <Button 
                  onClick={downloadHistoryAsCSV}
                  variant="ghost"
                  size="sm"
                  className="bg-[#0B1120] hover:bg-white/5 border border-white/[0.05] hover:border-emerald-500/20 text-[10px] uppercase font-black px-3.5 h-8 rounded-full text-emerald-400 flex items-center gap-1.5"
                >
                  <Download className="w-3 h-3" />
                  Download CSV
                </Button>
              </div>

            </div>
          )}

          {/* Interactive Diagnostic Overlay Modal detailing Row Double-click visual timeline (Requirement 9) */}
          <AnimatePresence>
            {selectedHistoricalIncident && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 15 }}
                  className="bg-[#0B1120] border-2 border-purple-500/20 max-w-2xl w-full rounded-[28px] overflow-hidden shadow-2xl p-6 relative"
                >
                  <Button 
                    variant="ghost" 
                    className="absolute right-4 top-4 hover:bg-white/5 rounded-full text-zinc-400 hover:text-[#F8FAFC] p-2 h-9 w-9 text-xs"
                    onClick={() => setSelectedHistoricalIncident(null)}
                  >
                    &#10005;
                  </Button>

                  <div className="border-b border-white/[0.05] pb-4 mb-5">
                    <span className="text-[10px] font-black tracking-[0.25em] text-purple-400 uppercase font-mono">{selectedHistoricalIncident.incident_id} &bull; DIAGNOSTIC DEEP DUMP</span>
                    <h3 className="text-xl font-black text-[#F8FAFC] tracking-tight truncate mt-1">
                      {selectedHistoricalIncident.scenario.replace(/_/g, ' ')}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono text-zinc-400 pb-5">
                    <div className="bg-[#0F172A]/50 border border-white/[0.03] p-3 rounded-xl">
                      <span className="text-[9px] uppercase font-black text-zinc-500 tracking-wider">Timestamp</span>
                      <p className="mt-0.5 text-[#F8FAFC] font-bold">{selectedHistoricalIncident.timestamp}</p>
                    </div>
                    <div className="bg-[#0F172A]/50 border border-white/[0.03] p-3 rounded-xl">
                      <span className="text-[9px] uppercase font-black text-zinc-500 tracking-wider">Assigned Engineer</span>
                      <p className="mt-0.5 text-[#F8FAFC] font-bold">{selectedHistoricalIncident.assigned_engineer}</p>
                    </div>
                    <div className="bg-[#0F172A]/50 border border-white/[0.03] p-3 rounded-xl">
                      <span className="text-[9px] uppercase font-black text-zinc-500 tracking-wider">Veritas Decision</span>
                      <p className={`mt-0.5 font-bold uppercase ${selectedHistoricalIncident.veritas_decision === 'APPROVED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {selectedHistoricalIncident.veritas_decision}
                      </p>
                    </div>
                    <div className="bg-[#0F172A]/50 border border-white/[0.03] p-3 rounded-xl">
                      <span className="text-[9px] uppercase font-black text-zinc-500 tracking-wider">Threat Risk Score</span>
                      <p className="mt-0.5 text-zinc-200 font-bold">{selectedHistoricalIncident.risk_score}% Severity</p>
                    </div>
                  </div>

                  {/* Recommended Action & Action Profile */}
                  <div className="bg-[#0F172A] border border-white/[0.05] p-4 rounded-2xl mb-6">
                    <span className="text-[9px] font-black tracking-widest text-[#64748B] uppercase">RECOMMENDED REPAIR INTERACTION PATHWAY</span>
                    <p className="text-xs font-bold text-emerald-400 mt-1 uppercase tracking-wide">
                      {selectedHistoricalIncident.recommended_action}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 border-t border-white/[0.03] pt-2 mt-2">
                      <span>Mitigation Resolution Outcome:</span>
                      <span className="font-bold text-[#00F0FF] font-mono">{selectedHistoricalIncident.resolution}</span>
                    </div>
                  </div>

                  {/* Requirement 9: High-precision Pipeline visual trace timeline mapping checkpoint */}
                  <div className="space-y-3.5">
                    <span className="text-[9px] font-black tracking-widest text-[#64748B] uppercase font-mono block">Operational trace checkpoint timeline</span>
                    <div className="relative border-l border-white/[0.05] pl-4 ml-2.5 space-y-5">
                      {[
                        { title: 'Incident Initiated', desc: 'Continuous telemetry trigger recorded deviation constraints boundary exceedance.', done: true, time: 'T+0s' },
                        { title: 'Anomaly Verification', desc: 'Predictive Prophet baseline engines generated dynamic forecast threshold models.', done: true, time: 'T+1.2s' },
                        { title: 'Semantic Index Retrieval', desc: 'Query executed against local ChromaDB memory layer successfully matched signature clusters.', done: true, time: 'T+2.5s' },
                        { title: 'Policy Audits', desc: `Veritas compliance auditor analyzed action vector: Resolved with status ${selectedHistoricalIncident.veritas_decision}.`, done: true, time: 'T+4.0s' },
                        { title: 'Mitigation Executor Finalized', desc: `Workflow directed action path. Closed session status identifier: ${selectedHistoricalIncident.resolution}.`, done: true, time: 'T+5.5s' }
                      ].map((evt, eIdx) => (
                        <div key={evt.title} className="relative">
                          <div className="absolute -left-6.5 top-0.5 w-4 h-4 rounded-full bg-zinc-950 border-2 border-purple-500/80 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          </div>
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <h5 className="text-[11.5px] font-black text-[#F8FAFC] tracking-wide">{evt.title}</h5>
                              <p className="text-[10px] text-zinc-500 mt-0.5">{evt.desc}</p>
                            </div>
                            <span className="text-[9px] font-mono text-zinc-500 font-bold whitespace-nowrap">{evt.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/[0.04] flex justify-end">
                    <Button 
                      className="bg-[#0F172A] hover:bg-white/5 text-[10px] font-black tracking-wider uppercase h-9 px-6 rounded-full border border-white/[0.05] text-zinc-300"
                      onClick={() => setSelectedHistoricalIncident(null)}
                    >
                      Close Diagnostics Viewer
                    </Button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      </main>

      {/* Scenario History Timeline (Requirement 5) */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <Card className="bg-[#0B1120]/60 border-white/[0.04] p-5 rounded-[24px]">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="text-[10px] font-black tracking-widest text-[#64748B] uppercase flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-zinc-500" /> Scenario History Timeline
            </span>
            <span className="text-[10px] font-mono font-bold text-zinc-400">
              {scenarioHistory.length} operational phases recorded
            </span>
          </div>
          
          <div className="relative h-6 bg-zinc-950/40 rounded-xl overflow-hidden border border-white/[0.04] flex gap-[1px]">
            {scenarioHistory.map((seg, idx) => {
              const colors = getScenarioColor(seg.scenarioName);
              const durationSec = seg.duration || Math.max(1, Math.round((Date.now() - seg.startTimestamp) / 1000));
              
              // Calculate percentage width proportionally
              const totalSec = scenarioHistory.reduce((acc, s) => {
                const sDur = s.duration || Math.max(1, Math.round((Date.now() - s.startTimestamp) / 1000));
                return acc + sDur;
              }, 0);
              
              const pctWidth = totalSec > 0 ? (durationSec / totalSec) * 100 : 100;
              
              return (
                <div 
                  key={seg.id}
                  style={{ width: `${Math.max(4, pctWidth)}%` }}
                  className={`h-full relative group cursor-pointer transition-all ${colors.bg} hover:brightness-125 hover:scale-y-110`}
                >
                  {/* Label for larger segments */}
                  {pctWidth > 12 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[8.5px] font-mono font-black text-zinc-950 truncate px-1">
                      {seg.scenarioName === 'NORMAL' ? 'NORMAL' : seg.scenarioName.replace(/_LOAD|_CONGESTION/g, '').replace(/_/g, ' ')}
                    </span>
                  )}
                  
                  {/* Custom Tooltip on Hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-zinc-950 border border-white/10 rounded-xl p-3 shadow-2xl z-[90] min-w-48 font-mono select-none pointer-events-none">
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 border-b border-white/5 pb-1">
                      Phase Details
                    </div>
                    <div className="space-y-1 text-[10px]">
                      <div className="flex justify-between gap-4">
                        <span className="text-zinc-500">Scenario:</span>
                        <span className={`font-black uppercase ${colors.text}`}>
                          {seg.scenarioName.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-zinc-500">Triggered:</span>
                        <span className="text-zinc-300 font-bold">{seg.startTime}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-zinc-500">Duration:</span>
                        <span className="text-zinc-300 font-bold">{durationSec}s</span>
                      </div>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-950" />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-8 border-t border-zinc-900 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-zinc-500">© 2026 ProactiveHeal Autonomous Systems. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors">Documentation</a>
            <a href="#" className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors">API Reference</a>
            <a href="#" className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors">SRE Portal</a>
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
                className="text-[#64748B] hover:text-zinc-300 transition-colors h-fit p-1 pointer-events-auto"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Slide-out Drawer for System Logs (Requirement 4) */}
      <AnimatePresence>
        {selectedLog && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm shadow-none"
            />
            {/* Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-[#0F172A] border-l border-white/[0.08] shadow-2xl z-[101] flex flex-col h-full text-[#F8FAFC]"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/[0.06] bg-[#0B1120]/40">
                <div className="space-y-1">
                  <h3 className="text-xs font-black uppercase tracking-[0.25em] text-[#10B981]">Log Inspector</h3>
                  <p className="text-[10px] text-zinc-500 font-mono">ID: {selectedLog.id}</p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition"
                >
                  <span className="text-sm font-black">✕</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Severity Level badge */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black tracking-widest text-[#64748B] uppercase block">Severity Level</span>
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      selectedLog.level === 'ERROR' ? 'bg-[#ef4444]/10 text-rose-400 border-[#ef4444]/20' :
                      selectedLog.level === 'WARN' ? 'bg-[#f59e0b]/10 text-amber-400 border-[#f59e0b]/20' :
                      selectedLog.level === 'SUCCESS' ? 'bg-[#10b981]/10 text-emerald-400 border-[#10b981]/20' :
                      selectedLog.level === 'AI' ? 'bg-[#3b82f6]/10 text-blue-400 border-[#3b82f6]/20' :
                      'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        selectedLog.level === 'ERROR' ? 'bg-[#ef4444]' :
                        selectedLog.level === 'WARN' ? 'bg-[#f59e0b]' :
                        selectedLog.level === 'SUCCESS' ? 'bg-[#10b981]' :
                        selectedLog.level === 'AI' ? 'bg-[#3b82f6]' : 'bg-zinc-400'
                      }`} />
                      {selectedLog.level}
                    </span>
                  </div>
                </div>

                {/* Metadata Row: Timestamp & Component (Source Tag) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black tracking-widest text-[#64748B] uppercase block">Timestamp</span>
                    <span className="text-xs font-mono font-bold text-zinc-300">{selectedLog.timestamp}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black tracking-widest text-[#64748B] uppercase block">Source Component</span>
                    <div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-[9px] font-mono font-black uppercase tracking-wider border ${getModuleColor(selectedLog.component)}`}>
                        {selectedLog.component}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedLog.incidentId && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-black tracking-widest text-[#64748B] uppercase block">Incident Reference</span>
                    <span className="text-xs font-mono font-bold text-rose-400">{selectedLog.incidentId}</span>
                  </div>
                )}

                {/* Log Message Text Area */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black tracking-widest text-[#64748B] uppercase block">Message payload</span>
                  <div className="p-4 bg-zinc-950/40 border border-white/[0.04] rounded-xl font-mono text-[12px] leading-relaxed text-zinc-200 select-all whitespace-pre-wrap">
                    {selectedLog.message}
                  </div>
                </div>
              </div>

              {/* Copy & Close Footer */}
              <div className="p-6 border-t border-white/[0.06] bg-[#0B1120]/20 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-11 rounded-xl text-xs font-black uppercase tracking-widest border-white/[0.08] hover:bg-white/5 transition flex items-center justify-center gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedLog.message);
                    addNotification("Copied", "Log message copied successfully to clipboard.", "SUCCESS");
                  }}
                >
                  Copy Message
                </Button>
                <Button
                  className="flex-1 h-11 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition text-[#070b14] rounded-xl text-xs font-black uppercase tracking-widest"
                  onClick={() => setSelectedLog(null)}
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
