
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  LockKeyhole,
  Play,
  Server,
  ShieldCheck,
  Square,
  Zap,
} from "lucide-react";

import {
  checkServerHealth,
  getServerMetrics,
  getDetectionStatus,
  getMitigationStatus,
} from "../services/api";

const REFRESH_INTERVAL = 2000;

export default function AttackConsole() {
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [detection, setDetection] = useState(null);
  const [mitigation, setMitigation] = useState(null);

  const [scenario, setScenario] = useState("controlled");
  const [duration, setDuration] = useState(10);
  const [simulationState, setSimulationState] = useState("IDLE");

  useEffect(() => {
    let mounted = true;

    async function refreshData() {
      const [healthData, metricsData, detectionData, mitigationData] =
        await Promise.all([
          checkServerHealth(),
          getServerMetrics(),
          getDetectionStatus(),
          getMitigationStatus(),
        ]);

      if (!mounted) return;

      setHealth(healthData);
      setMetrics(metricsData);
      setDetection(detectionData);
      setMitigation(mitigationData);
    }

    refreshData();

    const interval = setInterval(refreshData, REFRESH_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const online = health?.status === "healthy";

  const detectionStatus = detection?.status || "UNKNOWN";

  const protectionActive = mitigation?.active === true;

  const statusColor =
    detectionStatus === "UNDER_ATTACK"
      ? "danger"
      : detectionStatus === "SUSPICIOUS"
        ? "warning"
        : detectionStatus === "NORMAL"
          ? "success"
          : "unknown";

  const cpu = metrics?.cpu_percent;
  const memory = metrics?.memory_mb;
  const responseTime = metrics?.average_response_time_ms;

  function startSimulation() {
    setSimulationState("READY");
  }

  function stopSimulation() {
    setSimulationState("STOPPED");
  }

  return (
    <main className="attack-console">
      <div className="container">
        <section className="attack-console-heading">
          <div>
            <span className="eyebrow">SECURITY LABORATORY</span>
            <h1>NEXORA Attack Console</h1>
            <p>
              Controlled local traffic simulation and real-time
              defense monitoring.
            </p>
          </div>

          <span className={`console-server-status ${online ? "online" : "offline"}`}>
            <span />
            {online ? "TARGET ONLINE" : "TARGET OFFLINE"}
          </span>
        </section>

        <section className="console-target-panel">
          <div className="console-target-icon">
            <Server size={23} />
          </div>

          <div className="console-target-info">
            <span>TARGET APPLICATION</span>
            <strong>NEXORA Web Server</strong>
            <small>127.0.0.1:8000 · Isolated Local Environment</small>
          </div>

          <div className="console-target-health">
            <CheckCircle2 size={18} />
            {online ? "Connected" : "Disconnected"}
          </div>
        </section>

        <div className="console-section-heading">
          <div>
            <span className="eyebrow">SIMULATION CONTROL</span>
            <h2>Traffic Scenario</h2>
          </div>
          <span className="console-mode-label">LOCAL LAB ONLY</span>
        </div>

        <section className="console-control-grid">
          <div className="console-control-panel">
            <label htmlFor="scenario">Simulation profile</label>

            <select
              id="scenario"
              value={scenario}
              onChange={(event) => setScenario(event.target.value)}
              disabled={simulationState === "RUNNING"}
            >
              <option value="controlled">Controlled traffic test</option>
              <option value="baseline">Normal traffic baseline</option>
            </select>

            <label htmlFor="duration">Test duration</label>

            <select
              id="duration"
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              disabled={simulationState === "RUNNING"}
            >
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
            </select>

            <div className="console-safety-note">
              <LockKeyhole size={17} />
              <p>
                Tests are restricted to the local target.
                Duration is limited to 15 seconds.
              </p>
            </div>

            <div className="console-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={startSimulation}
                disabled={!online || simulationState === "RUNNING"}
              >
                <Play size={17} />
                Start Test
              </button>

              <button
                type="button"
                className="button button-ghost"
                onClick={stopSimulation}
                disabled={simulationState !== "RUNNING"}
              >
                <Square size={16} />
                Stop
              </button>
            </div>
          </div>

          <div className="console-state-panel">
            <span className="eyebrow">SIMULATION STATUS</span>

            <div className={`console-state-indicator state-${simulationState.toLowerCase()}`}>
              <span />
              {simulationState}
            </div>

            <p>
              {simulationState === "IDLE"
                ? "No simulation has been started."
                : simulationState === "READY"
                  ? "Configuration selected. The simulation runner is not connected yet."
                  : simulationState === "STOPPED"
                    ? "The test was stopped."
                    : "Simulation is running."}
            </p>

            <div className="console-state-meta">
              <span>Profile</span>
              <strong>{scenario === "controlled" ? "Controlled" : "Baseline"}</strong>
            </div>

            <div className="console-state-meta">
              <span>Duration</span>
              <strong>{duration} seconds</strong>
            </div>
          </div>
        </section>

        <div className="console-section-heading">
          <div>
            <span className="eyebrow">LIVE TELEMETRY</span>
            <h2>Target Performance</h2>
          </div>

          <span className="console-refresh">
            <Activity size={15} />
            Refreshing every 2 seconds
          </span>
        </div>

        <section className="console-metrics-grid">
          <ConsoleMetric
            icon={<Gauge size={19} />}
            label="CPU Usage"
            value={cpu != null ? `${cpu}%` : "—"}
          />

          <ConsoleMetric
            icon={<Activity size={19} />}
            label="Memory"
            value={memory != null ? `${memory} MB` : "—"}
          />

          <ConsoleMetric
            icon={<Clock size={19} />}
            label="Avg Response Time"
            value={responseTime != null ? `${responseTime} ms` : "—"}
          />

          <ConsoleMetric
            icon={<Zap size={19} />}
            label="Total Requests"
            value={metrics?.request_count?.toLocaleString() ?? "—"}
          />
        </section>

        <div className="console-section-heading">
          <div>
            <span className="eyebrow">DEFENSE MONITORING</span>
            <h2>Detection & Mitigation</h2>
          </div>
        </div>

        <section className="console-defense-grid">
          <div className="console-defense-card">
            <div className="console-card-heading">
              <Activity size={19} />
              <span>DETECTION ENGINE</span>
            </div>

            <strong className={`console-detection-status ${statusColor}`}>
              {detectionStatus}
            </strong>

            <p>{detection?.message || "Waiting for detection data."}</p>

            <div className="console-state-meta">
              <span>Requests per second</span>
              <strong>{detection?.requests_per_second ?? "—"} RPS</strong>
            </div>
          </div>

          <div className="console-defense-card">
            <div className="console-card-heading">
              <ShieldCheck size={19} />
              <span>MITIGATION ENGINE</span>
            </div>

            <strong className={protectionActive ? "danger" : "success"}>
              {mitigation ? protectionActive ? "ACTIVE" : "STANDBY" : "UNKNOWN"}
            </strong>

            <p>
              {protectionActive
                ? "Automatic rate limiting is active."
                : "Protection is standing by."}
            </p>

            <div className="console-state-meta">
              <span>Blocked requests</span>
              <strong>{mitigation?.blocked_requests?.toLocaleString() ?? "—"}</strong>
            </div>
          </div>
        </section>

        <div className="console-disclaimer">
          <AlertTriangle size={17} />
          <p>
            Educational laboratory interface. The simulation runner
            will be connected after the monitoring interface is verified.
          </p>
        </div>
      </div>
    </main>
  );
}

function ConsoleMetric({ icon, label, value }) {
  return (
    <div className="console-metric-card">
      <div>
        {icon}
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
    </div>
  );
}
