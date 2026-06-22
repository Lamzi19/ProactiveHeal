import { HistoricalIncident } from './types';

// Let's programmatically generate 128 rich historical incidents.
export function generateInitialHistory(): HistoricalIncident[] {
  const scenarios = ['HIGH_CPU_LOAD', 'MEMORY_LEAK', 'NETWORK_CONGESTION', 'CASCADING_FAILURE', 'VERITAS_3X_FAIL'];
  const severance = {
    HIGH_CPU_LOAD: { severity: 'HIGH' as const, risk: [75, 88], rec: 'Scale replica pods / restart worker nodes', eng: 'Infrastructure Engineer' },
    MEMORY_LEAK: { severity: 'CRITICAL' as const, risk: [80, 95], rec: 'Restart Authentication Service', eng: 'Backend Engineer' },
    NETWORK_CONGESTION: { severity: 'HIGH' as const, risk: [65, 82], rec: 'Rebalance routing tables on gw-01', eng: 'Network Operator' },
    CASCADING_FAILURE: { severity: 'CRITICAL' as const, risk: [90, 99], rec: 'Connection pool flush and force-drop db locks', eng: 'Lead Systems Architect' },
    VERITAS_3X_FAIL: { severity: 'CRITICAL' as const, risk: [92, 98], rec: 'Zero-trust route restrictions / credentials reset', eng: 'P1 Security SRE Lead' }
  };

  const veritasDecisions = ['APPROVED', 'REJECTED'];
  const resolutions = {
    APPROVED: 'Automated Remediation Execution Successful',
    REJECTED: 'Manual Override - SRE Telemetry Stable'
  };

  const history: HistoricalIncident[] = [];
  // Generating from June 1st up to June 21st, 2026
  const baseTime = new Date('2026-06-01T08:00:00Z').getTime();
  const timeStep = 3.5 * 60 * 60 * 1000; // ~3.5 hours spacing

  for (let i = 1; i <= 128; i++) {
    const sc = scenarios[Math.floor(Math.sin(i) * 5 + 5) % scenarios.length] as keyof typeof severance;
    const info = severance[sc];
    const dec = (sc === 'HIGH_CPU_LOAD') ? 'APPROVED' : 'REJECTED';
    
    const risk = Math.floor(info.risk[0] + (Math.sin(i * 10) * 0.5 + 0.5) * (info.risk[1] - info.risk[0]));
    const timeVal = new Date(baseTime + i * timeStep);
    const timeStr = timeVal.toISOString().replace(/\.\d+Z$/, '').replace('T', ' ');

    const incId = `INC-${1000 + i}`;

    const item: HistoricalIncident = {
      incident_id: incId,
      timestamp: timeStr,
      scenario: sc,
      severity: info.severity,
      risk_score: risk,
      recommended_action: info.rec,
      veritas_decision: dec as any,
      assigned_engineer: info.eng,
      resolution: resolutions[dec as keyof typeof resolutions],
      timeline: [
        { stage: 'Incident Created', timestamp: new Date(timeVal.getTime()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), status: 'INFO' },
        { stage: 'Anomaly Detected', timestamp: new Date(timeVal.getTime() + 1500).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), status: 'WARN' },
        { stage: 'Prediction Generated', timestamp: new Date(timeVal.getTime() + 3000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), status: 'WARN' },
        { stage: 'Veritas Validation', timestamp: new Date(timeVal.getTime() + 4500).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), status: dec === 'APPROVED' ? 'SUCCESS' : 'ERROR' },
        { stage: dec === 'APPROVED' ? 'Healing' : 'Escalation', timestamp: new Date(timeVal.getTime() + 6500).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), status: dec === 'APPROVED' ? 'SUCCESS' : 'WARN' },
        { stage: 'Resolution', timestamp: new Date(timeVal.getTime() + 9000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), status: 'SUCCESS' }
      ]
    };
    
    // Unshift so latest index is at beginning
    history.unshift(item);
  }

  return history;
}

export function loadIncidentHistory(): HistoricalIncident[] {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('proactiveheal_incident_history') : null;
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed parsing stored incidents", e);
    }
  }
  const initial = generateInitialHistory();
  saveIncidentHistory(initial);
  return initial;
}

export function saveIncidentHistory(history: HistoricalIncident[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('proactiveheal_incident_history', JSON.stringify(history));
  }
}
