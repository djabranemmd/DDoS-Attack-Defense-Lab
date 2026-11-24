
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleHelp,
  Gauge,
  Globe,
  LockKeyhole,
  LogIn,
  LogOut,
  Menu,
  ShieldCheck,
  UserPlus,
  X,
  Zap,
} from "lucide-react";

import {
  checkServerHealth,
  getApplicationStatus,
} from "./services/api";

import { AuthProvider } from "./context/AuthContext.jsx";
import { useAuth } from "./context/useAuth";


function StatusIndicator() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadHealth() {
      const result = await checkServerHealth();

      if (mounted) {
        setHealth(result);
      }
    }

    loadHealth();

    const interval = setInterval(loadHealth, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const online = health?.status === "healthy";

  return (
    <span className={`status-indicator ${online ? "online" : "offline"}`}>
      <span className="status-dot" />
      {health === null
        ? "Checking server"
        : online
          ? "All systems operational"
          : "Server unavailable"}
    </span>
  );
}


function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate("/login");
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link
          to="/"
          className="brand"
          onClick={() => setMenuOpen(false)}
        >
          <span className="brand-icon">
            <ShieldCheck size={21} />
          </span>
          <span>
            NEXORA<span className="brand-dot">.</span>
          </span>
        </Link>

        <button
          className="mobile-menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav className={`nav-links ${menuOpen ? "nav-open" : ""}`}>
          <NavLink
            to="/"
            end
            onClick={() => setMenuOpen(false)}
          >
            Home
          </NavLink>

          <a
            href="/#features"
            onClick={() => setMenuOpen(false)}
          >
            Features
          </a>

          <NavLink
            to="/dashboard"
            onClick={() => setMenuOpen(false)}
          >
            Dashboard
          </NavLink>

          <div className="nav-actions">
            {isAuthenticated ? (
              <>
                <span className="nav-user">
                  {user?.username}
                </span>

                <button
                  type="button"
                  className="button button-ghost button-small"
                  onClick={handleLogout}
                >
                  <LogOut size={15} />
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="button button-ghost button-small"
                  onClick={() => setMenuOpen(false)}
                >
                  Log in
                </Link>

                <Link
                  to="/register"
                  className="button button-primary button-small"
                  onClick={() => setMenuOpen(false)}
                >
                  Get started <ArrowRight size={15} />
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}


function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <>
      <section className="hero">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />

        <div className="container hero-content">
          <div className="hero-badge">
            <span className="badge-dot" />
            Reliable. Secure. Built for performance.
          </div>

          <h1>
            Your digital world,
            <br />
            <span>without limits.</span>
          </h1>

          <p className="hero-description">
            Experience a modern digital platform designed for performance,
            reliability, and a seamless user experience.
          </p>

          <div className="hero-actions">
            <Link
              to={isAuthenticated ? "/dashboard" : "/register"}
              className="button button-primary"
            >
              {isAuthenticated ? "Open your workspace" : "Create your account"}
              <ArrowRight size={17} />
            </Link>

            <Link
              to="/dashboard"
              className="button button-secondary"
            >
              Explore dashboard
            </Link>
          </div>

          <div className="hero-trust">
            <StatusIndicator />
            <span className="trust-divider" />
            <span>Local laboratory environment</span>
          </div>
        </div>

        <div className="container hero-preview">
          <div className="preview-window">
            <div className="preview-topbar">
              <div className="window-dots">
                <span />
                <span />
                <span />
              </div>

              <span className="preview-address">
                app.nexora.local/dashboard
              </span>

              <ShieldCheck size={16} />
            </div>

            <div className="preview-content">
              <div className="preview-sidebar">
                <div className="preview-logo">
                  <ShieldCheck size={19} />
                </div>

                <span className="preview-nav active">
                  <Gauge size={17} />
                </span>

                <span className="preview-nav">
                  <Activity size={17} />
                </span>

                <span className="preview-nav">
                  <Globe size={17} />
                </span>
              </div>

              <div className="preview-main">
                <div className="preview-heading">
                  <div>
                    <span className="preview-eyebrow">OVERVIEW</span>
                    <h3>
                      {isAuthenticated
                        ? `Welcome, ${user?.username}`
                        : "Welcome back"}
                    </h3>
                  </div>

                  <span className="preview-avatar">A</span>
                </div>

                <div className="preview-stats">
                  <div className="preview-stat">
                    <span>System status</span>
                    <strong className="preview-green">Operational</strong>
                    <CheckCircle2 size={17} />
                  </div>

                  <div className="preview-stat">
                    <span>Performance</span>
                    <strong>Excellent</strong>
                    <Zap size={17} />
                  </div>

                  <div className="preview-stat">
                    <span>Security</span>
                    <strong>Protected</strong>
                    <ShieldCheck size={17} />
                  </div>
                </div>

                <div className="preview-chart">
                  <div className="chart-heading">
                    <div>
                      <span>ACTIVITY</span>
                      <strong>System performance</strong>
                    </div>

                    <span className="chart-period">Last 24 hours</span>
                  </div>

                  <div className="chart-bars">
                    {[
                      34, 48, 40, 62, 53, 72, 47, 58,
                      78, 64, 85, 69, 91, 73, 82, 60,
                      75, 88, 67, 95, 79, 70, 86, 74,
                    ].map((height, index) => (
                      <span
                        key={index}
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>

                  <div className="chart-labels">
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>24:00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section" id="features">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">BUILT FOR YOU</span>
            <h2>Everything in one place.</h2>
            <p>
              A simple and reliable experience, backed by a real application server.
            </p>
          </div>

          <div className="features-grid">
            <FeatureCard
              icon={<Activity size={22} />}
              title="Performance"
              description="A responsive platform designed to provide a smooth experience."
            />

            <FeatureCard
              icon={<ShieldCheck size={22} />}
              title="Security first"
              description="A foundation built around secure access and system reliability."
            />

            <FeatureCard
              icon={<Gauge size={22} />}
              title="Live status"
              description="Check the availability of the application and its database."
            />
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}


function FeatureCard({ icon, title, description }) {
  return (
    <article className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      <ArrowUpRight className="feature-arrow" size={18} />
    </article>
  );
}


function AuthPage({ mode }) {
  const isRegister = mode === "register";

  const navigate = useNavigate();

  const {
    login,
    register,
    isAuthenticated,
    loading,
  } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      if (isRegister) {
        await register({
          username: username.trim(),
          email: email.trim(),
          password,
        });
      } else {
        await login({
          email: email.trim(),
          password,
        });
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.message || "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-section">
      <div className="auth-card">
        <Link to="/" className="brand auth-brand">
          <span className="brand-icon">
            <ShieldCheck size={21} />
          </span>

          <span>
            NEXORA<span className="brand-dot">.</span>
          </span>
        </Link>

        <div className="auth-heading">
          <span className="eyebrow">
            {isRegister ? "GET STARTED" : "WELCOME BACK"}
          </span>

          <h1>
            {isRegister ? "Create your account" : "Welcome back"}
          </h1>

          <p>
            {isRegister
              ? "Join Nexora and explore your workspace."
              : "Enter your credentials to access your workspace."}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <label>
              Username

              <input
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                minLength={3}
                maxLength={50}
                pattern="[a-zA-Z0-9_.-]+"
                title="Use letters, numbers, dots, underscores, or hyphens."
                autoComplete="username"
              />
            </label>
          )}

          <label>
            Email address

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label>
            Password

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              maxLength={128}
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
          </label>

          <button
            type="submit"
            className="button button-primary auth-submit"
            disabled={submitting}
          >
            {isRegister
              ? <UserPlus size={17} />
              : <LogIn size={17} />}

            {submitting
              ? "Please wait..."
              : isRegister
                ? "Create account"
                : "Log in"}

            {!submitting && <ArrowRight size={17} />}
          </button>
        </form>

        {error && (
          <p className="auth-notice" role="alert">
            {error}
          </p>
        )}

        <div className="auth-switch">
          {isRegister
            ? "Already have an account?"
            : "Don't have an account?"}

          {" "}

          <Link to={isRegister ? "/login" : "/register"}>
            {isRegister ? "Log in" : "Create account"}
          </Link>
        </div>

        <div className="auth-security">
          <LockKeyhole size={14} />
          Your information is handled by the local lab application.
        </div>
      </div>
    </main>
  );
}


function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <main className="auth-section">
        <div className="auth-card">
          <p>Restoring your session...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}


function DashboardPage() {
  const { user } = useAuth();

  const [serverStatus, setServerStatus] = useState(null);
  const [appStatus, setAppStatus] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const [health, application] = await Promise.all([
        checkServerHealth(),
        getApplicationStatus(),
      ]);

      if (mounted) {
        setServerStatus(health);
        setAppStatus(application);
      }
    }

    loadData();

    const interval = setInterval(loadData, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const healthy = serverStatus?.status === "healthy";

  return (
    <main className="dashboard-section">
      <div className="container">
        <div className="dashboard-heading">
          <div>
            <span className="eyebrow">WORKSPACE</span>
            <h1>Welcome, {user?.username}</h1>
            <p>Monitor the current state of your application.</p>
          </div>

          <span className="dashboard-live">
            <span className="status-dot" />
            Live monitoring
          </span>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <div className="dashboard-card-top">
              <span>Backend status</span>
              <Activity size={19} />
            </div>

            <strong className={healthy ? "value-success" : "value-danger"}>
              {serverStatus === null
                ? "Checking..."
                : healthy
                  ? "Online"
                  : "Offline"}
            </strong>

            <p>FastAPI application server</p>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card-top">
              <span>Database</span>
              <Globe size={19} />
            </div>

            <strong
              className={
                serverStatus?.database === "connected"
                  ? "value-success"
                  : "value-danger"
              }
            >
              {serverStatus?.database === "connected"
                ? "Connected"
                : serverStatus === null
                  ? "Checking..."
                  : "Unavailable"}
            </strong>

            <p>PostgreSQL database service</p>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card-top">
              <span>Application</span>
              <ShieldCheck size={19} />
            </div>

            <strong>
              {appStatus?.status === "operational"
                ? "Operational"
                : "Unknown"}
            </strong>

            <p>Target Website service</p>
          </div>
        </div>

        <section className="system-panel">
          <div className="panel-heading">
            <div>
              <h2>Service health</h2>
              <p>Live information retrieved from the backend API.</p>
            </div>

            <StatusIndicator />
          </div>

          <div className="service-row">
            <div className="service-info">
              <span className="service-icon">
                <Activity size={18} />
              </span>

              <div>
                <strong>Target Server</strong>
                <small>127.0.0.1:8000</small>
              </div>
            </div>

            <span
              className={`service-state ${
                healthy ? "state-online" : "state-offline"
              }`}
            >
              {healthy
                ? "Healthy"
                : serverStatus === null
                  ? "Checking"
                  : "Unhealthy"}
            </span>
          </div>

          <div className="service-row">
            <div className="service-info">
              <span className="service-icon">
                <Globe size={18} />
              </span>

              <div>
                <strong>PostgreSQL</strong>
                <small>Database connection</small>
              </div>
            </div>

            <span
              className={`service-state ${
                serverStatus?.database === "connected"
                  ? "state-online"
                  : "state-offline"
              }`}
            >
              {serverStatus?.database === "connected"
                ? "Connected"
                : "Unavailable"}
            </span>
          </div>
        </section>

        <div className="dashboard-note">
          <CircleHelp size={18} />

          <p>
            This dashboard currently displays real backend health information.
            CPU, memory, traffic metrics, and protection controls will be added
            in the monitoring and defense stages.
          </p>
        </div>
      </div>
    </main>
  );
}


function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <Link to="/" className="brand">
          <span className="brand-icon">
            <ShieldCheck size={19} />
          </span>

          <span>
            NEXORA<span className="brand-dot">.</span>
          </span>
        </Link>

        <span>© 2026 NEXORA. Local laboratory project.</span>
      </div>
    </footer>
  );
}


function AppLayout() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/login"
          element={<AuthPage mode="login" />}
        />

        <Route
          path="/register"
          element={<AuthPage mode="register" />}
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}


export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}
