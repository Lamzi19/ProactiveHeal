# detector.py
# Anomaly Detection Module using Isolation Forest
# Purpose: Detect abnormal patterns in CPU, Memory, and Latency
# to trigger alerts for ProactiveHeal AI-Ops system

from sklearn.ensemble import IsolationForest
import numpy as np

# ----------------------------
# Historical metrics store
# ----------------------------
# Keeps recent telemetry to model normal system behavior
history = []

# ----------------------------
# Initialize Isolation Forest
# ----------------------------
# contamination: expected fraction of anomalies in the data
# random_state: ensures reproducible results
iso_forest = IsolationForest(contamination=0.05, random_state=42)

def detect_anomaly(metrics):
    """
    Detect anomalies based on recent metrics.

    Parameters:
        metrics (dict): {'cpu': int, 'memory': int, 'latency': int}

    Returns:
        alerts (list): Human-readable list of anomalies detected
                       e.g., ["HIGH_CPU", "HIGH_MEMORY"]
    """

    global history, iso_forest

    # ----------------------------
    # Record current metrics
    # ----------------------------
    # Append latest telemetry to the historical dataset
    history.append([metrics['cpu'], metrics['memory'], metrics['latency']])
    
    # ----------------------------
    # Wait until enough samples collected
    # ----------------------------
    # Isolation Forest requires a minimum number of samples to train properly
    if len(history) < 20:
        return []  # Not enough data for meaningful prediction

    # ----------------------------
    # Fit model on historical telemetry
    # ----------------------------
    X = np.array(history)
    iso_forest.fit(X)

    # ----------------------------
    # Predict if the latest metrics are anomalous
    # ----------------------------
    # Returns -1 if anomaly, 1 if normal
    latest = np.array([metrics['cpu'], metrics['memory'], metrics['latency']]).reshape(1, -1)
    pred = iso_forest.predict(latest)

    alerts = []

    if pred[0] == -1:  # Anomaly detected
        # Determine which specific metric triggered the anomaly
        if metrics['cpu'] > 85:
            alerts.append("HIGH_CPU")
        if metrics['memory'] > 85:
            alerts.append("HIGH_MEMORY")
        if metrics['latency'] > 300:
            alerts.append("HIGH_LATENCY")
        
        # If anomaly detected but none exceeds threshold, mark as general
        if not alerts:
            alerts.append("GENERAL_ANOMALY")
    
    # ----------------------------
    # Return alert list
    # ----------------------------
    return alerts