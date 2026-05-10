# telemetry.py
# Simulates server metrics (CPU, Memory, Latency) for ProactiveHeal demo
# Includes random spikes, slow degradation, and short-term anomalies

import random

# Initial baseline values
cpu, memory = 25, 40

def get_server_metrics():
    """
    Returns current simulated server metrics.
    Introduces normal fluctuations and occasional random anomalies.
    """
    global cpu, memory

    # Normal small fluctuations
    cpu += random.randint(-3, 3)
    memory += random.randint(-2, 2)
    latency += random.randint(-5, 5)

    # Occasionally simulate a random small anomaly
    if random.random() < 0.05:  # 5% chance per tick
        cpu += random.randint(5, 10)
    if random.random() < 0.05:
        memory += random.randint(5, 10)
    if random.random() < 0.05:
        latency += random.randint(20, 50)

    # Keep values within realistic bounds
    cpu = max(10, min(cpu, 100))
    memory = max(20, min(memory, 100))
    

    return {"cpu": cpu, "memory": memory}


def inject_spike(metric="cpu"):
    """
    Injects a sudden spike for demonstration purposes.
    metric: 'cpu' or 'memory'
    """
    global cpu, memory

    if metric == "cpu":
        cpu = random.randint(90, 98)
    elif metric == "memory":
        memory = random.randint(90, 98)
    

    return get_server_metrics()


def normalize_metrics():
    """
    Slowly brings metrics back to baseline values after a spike.
    Simulates system recovery.
    """
    global cpu, memory

    # Gradual decay to normal baseline
    cpu = max(25, cpu - random.randint(5, 10))
    memory = max(40, memory - random.randint(5, 10))
    

def random_background_load():
    """
    Simulate background activity load that randomly increases metrics.
    Called periodically to make the telemetry more realistic.
    """
    global cpu, memory

    cpu += random.randint(0, 5)
    memory += random.randint(0, 3)
   

    # Keep within bounds
    cpu = min(cpu, 100)
    memory = min(memory, 100)



def get_simulated_tick(metric_spike=None):
    """
    Wrapper function for one tick of simulation.
    Optionally inject a spike in 'cpu', 'memory', or 'latency'.
    """
    if metric_spike:
        metrics = inject_spike(metric_spike)
    else:
        metrics = get_server_metrics()
        random_background_load()  # small random background variation
    return metrics