# Predicts future saturation or potential failures.


def predict_risk(metrics):
    risk_score = metrics["cpu"] * 0.5 + metrics["memory"] * 0.3 + metrics["latency"] * 0.2
    if risk_score > 85:
        status = "CRITICAL"
    elif risk_score > 60:
        status = "WARNING"
    else:
        status = "NORMAL"
    return {"risk_score": round(risk_score, 2), "status": status}