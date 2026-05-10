from fastapi import FastAPI
from telemetry import get_server_metrics, inject_spike
from anamoly_detector import detect_anomaly
from predictor import predict_risk

app = FastAPI()

# -----------------------------------
# GET LIVE METRICS
# -----------------------------------

@app.get("/metrics")
def metrics():

    data = get_server_metrics()

    alerts = detect_anomaly(data)

    prediction = predict_risk(data)

    return {
        "metrics": data,
        "alerts": alerts,
        "prediction": prediction
    }


# -----------------------------------
# INJECT CPU SPIKE
# -----------------------------------

@app.post("/inject/cpu")
def inject_cpu():

    data = inject_spike("cpu")

    return {
        "message": "CPU spike injected",
        "metrics": data
    }


# -----------------------------------
# INJECT MEMORY SPIKE
# -----------------------------------

@app.post("/inject/memory")
def inject_memory():

    data = inject_spike("memory")

    return {
        "message": "Memory spike injected",
        "metrics": data
    }