
export type SimState = 
  | 'NORMAL'
  | 'ANOMALY_DETECTED'
  | 'PREDICTING'
  | 'RETRIEVING'
  | 'ANALYZING'
  | 'DECIDING'
  | 'VERIFYING'
  | 'EXECUTING'
  | 'REJECTED'
  | 'LEARNING'
  | 'WARNING'
  | 'CRITICAL';

export interface MetricPoint {
  time: string;
  cpu: number;
  memory: number;
  latency: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'AI';
  message: string;
  component: string;
  incidentId?: string;
}

export interface Trace {
  incidentId: string;
  startTime: string;
  endTime?: string;
  logs: LogEntry[];
  status: 'ACTIVE' | 'RESOLVED' | 'FAILED';
}

export interface DetailedAnalysis {
  rootCause: string;
  confidence: number;
  dataPoints: string[];
  proposedAction: string;
  reasoning: string;
}

export interface SimNotification {
  id: string;
  type: 'ERROR' | 'SUCCESS' | 'INFO' | 'WARN';
  title: string;
  message: string;
  timestamp: string;
}

export interface Incident {
  id: string;
  rootCause: string;
  action: string;
  outcome: string;
  similarity: number;
}
