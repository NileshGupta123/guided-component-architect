import { useState, useRef, useEffect } from "react";

const API_BASE = "http://localhost:8000";
const SESSION_ID = "session_" + Math.random().toString(36).slice(2, 9);

// ── Syntax highlighting (minimal, regex-based) ────────────────────────────
function highlight(code, lang) {
  if (!code) return "";
  let escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (lang === "ts") {
    escaped = escaped
      .replace(/(\/\/.*)/g, '<span style="color:#6a9955">$1</span>')
      .replace(/\b(import|export|class|const|let|var|return|if|else|for|while|function|async|await|new|this|true|false|null|undefined|from|default|interface|type|extends|implements|public|private|protected|readonly|static)\b/g, '<span style="color:#569cd6">$1</span>')
      .replace(/(@\w+)/g, '<span style="color:#4ec9b0">$1</span>')
      .replace(/('.*?'|".*?")/g, '<span style="color:#ce9178">$1</span>');
  } else {
    escaped = escaped
      .replace(/(&lt;\/?[\w-]+)/g, '<span style="color:#4ec9b0">$1</span>')
      .replace(/([\w-]+=)/g, '<span style="color:#9cdcfe">$1</span>')
      .replace(/(".*?")/g, '<span style="color:#ce9178">$1</span>')
      .replace(/(\*ngFor|\*ngIf|\[[\w.]+\]|\([\w.]+\))/g, '<span style="color:#c586c0">$1</span>');
  }
  return escaped;
}

// ── Components ─────────────────────────────────────────────────────────────

function ValidationBadge({ validation }) {
  if (!validation) return null;
  const { is_valid, errors, warnings, passed } = validation;
  return (
    <div style={{
      background: is_valid ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
      border: `1px solid ${is_valid ? "#10b981" : "#ef4444"}`,
      borderRadius: 8, padding: "12px 16px", marginTop: 12, fontSize: 13,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>{is_valid ? "✅" : "⚠️"}</span>
        <strong style={{ color: is_valid ? "#10b981" : "#ef4444" }}>
          {is_valid ? "All checks passed" : `${errors.length} error(s) found`}
        </strong>
      </div>
      {errors.map((e, i) => (
        <div key={i} style={{ color: "#ef4444", marginBottom: 2 }}>✗ {e}</div>
      ))}
      {warnings.map((w, i) => (
        <div key={i} style={{ color: "#f59e0b", marginBottom: 2 }}>⚠ {w}</div>
      ))}
      {passed.slice(0, 3).map((p, i) => (
        <div key={i} style={{ color: "#10b981", marginBottom: 2 }}>✓ {p}</div>
      ))}
    </div>
  );
}

function CodeBlock({ code, lang, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {label}
        </span>
        <button onClick={copy} style={{
          background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.4)",
          color: "#a5b4fc", padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12,
          transition: "all 0.15s ease",
        }}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre style={{
        background: "#0d1117", borderRadius: 10, padding: "16px 20px", overflow: "auto",
        fontSize: 13, lineHeight: 1.7, margin: 0, border: "1px solid #1e293b",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        maxHeight: 400,
      }}>
        <code dangerouslySetInnerHTML={{ __html: highlight(code, lang) }} />
      </pre>
    </div>
  );
}

function AuditTrail({ trail }) {
  const [open, setOpen] = useState(false);
  if (!trail || !trail.length) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: "transparent", border: "1px solid #334155", color: "#64748b",
        padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12,
      }}>
        {open ? "▲" : "▼"} Audit trail ({trail.length} attempt{trail.length > 1 ? "s" : ""})
      </button>
      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {trail.map((t, i) => (
            <div key={i} style={{
              background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: 12,
            }}>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>
                Attempt {t.attempt} — {t.validation.is_valid ? "✅ Valid" : `❌ ${t.validation.errors?.length} error(s)`}
              </div>
              {t.validation.errors?.map((e, j) => (
                <div key={j} style={{ fontSize: 12, color: "#ef4444" }}>✗ {e}</div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IterationBadge({ n }) {
  const colors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444"];
  return (
    <span style={{
      background: colors[Math.min(n - 1, 3)] + "22",
      border: `1px solid ${colors[Math.min(n - 1, 3)]}`,
      color: colors[Math.min(n - 1, 3)],
      fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
    }}>
      {n} {n === 1 ? "pass" : "iterations"}
    </span>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]); // chat history
  const [activeTab, setActiveTab] = useState("template");
  const [apiMode, setApiMode] = useState(false);
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  const EXAMPLE_PROMPTS = [
    "A login card with glassmorphism effect",
    "A pricing table with 3 tiers",
    "A dark-mode notification toast",
    "A file upload dropzone with drag support",
    "A user profile card with avatar and stats",
  ];

  const generate = async () => {
    if (!prompt.trim()) return;
    const currentPrompt = prompt;
    setPrompt("");
    setLoading(true);
    setError(null);

    const newMessage = { role: "user", content: currentPrompt };
    setHistory(h => [...h, newMessage]);

    if (!apiMode) {
      // Simulate with dummy data for demo
      await new Promise(r => setTimeout(r, 2000));
      const mockResult = {
        template: `<div class="flex items-center justify-center min-h-screen" style="background: #0f172a;">
  <div class="relative p-8 rounded-2xl" style="
    background: rgba(255,255,255,0.05);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    width: 380px;
  ">
    <h2 class="text-2xl font-bold text-center mb-2" style="color: #ffffff; font-family: 'Inter', sans-serif;">
      Welcome Back
    </h2>
    <p class="text-center mb-8" style="color: #94a3b8; font-size: 0.875rem;">Sign in to your account</p>

    <div class="mb-5">
      <label style="color: #cbd5e1; font-size: 0.875rem; font-weight: 500; display:block; margin-bottom:6px;">
        Email
      </label>
      <input type="email" placeholder="you@example.com"
        style="width:100%; padding:10px 14px; background:rgba(255,255,255,0.07);
        border:1px solid rgba(255,255,255,0.12); border-radius:8px;
        color:#ffffff; font-family:'Inter',sans-serif; box-sizing:border-box; outline:none;" />
    </div>

    <div class="mb-6">
      <label style="color: #cbd5e1; font-size: 0.875rem; font-weight: 500; display:block; margin-bottom:6px;">
        Password
      </label>
      <input type="password" placeholder="••••••••"
        style="width:100%; padding:10px 14px; background:rgba(255,255,255,0.07);
        border:1px solid rgba(255,255,255,0.12); border-radius:8px;
        color:#ffffff; font-family:'Inter',sans-serif; box-sizing:border-box; outline:none;" />
    </div>

    <button (click)="onLogin()"
      style="width:100%; padding:12px; background:#6366f1; color:#ffffff;
      border:none; border-radius:8px; font-weight:600; font-size:1rem;
      font-family:'Inter',sans-serif; cursor:pointer;
      box-shadow: 0 0 20px rgba(99,102,241,0.4); transition:200ms ease;">
      Sign In
    </button>

    <p class="text-center mt-6" style="color:#64748b; font-size:0.875rem;">
      No account? <a style="color:#6366f1; cursor:pointer;">Create one</a>
    </p>
  </div>
</div>`,
        typescript: `import { Component } from '@angular/core';

@Component({
  selector: 'app-login-card',
  templateUrl: './login-card.component.html',
  styleUrls: ['./login-card.component.scss']
})
export class LoginCardComponent {
  email: string = '';
  password: string = '';

  onLogin(): void {
    console.log('Login attempted', { email: this.email });
  }
}`,
        success: true,
        iterations: 1,
        validation: {
          is_valid: true,
          errors: [],
          warnings: ["Design system fonts not explicitly referenced (applied via global styles)"],
          passed: ["Curly braces balanced", "Component class exported", "All colors comply with design system"],
        },
        audit_trail: [{ attempt: 1, validation: { is_valid: true, errors: [], warnings: [] } }],
      };

      setResult(mockResult);
      setHistory(h => [...h, {
        role: "assistant",
        content: mockResult,
        prompt: currentPrompt,
      }]);
      setLoading(false);
      return;
    }

    // Real API call
    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: currentPrompt, session_id: SESSION_ID }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setResult(data);
      setHistory(h => [...h, { role: "assistant", content: data, prompt: currentPrompt }]);
    } catch (e) {
      setError(e.message);
      setHistory(h => h.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
  };

  const latestResult = history.filter(h => h.role === "assistant").at(-1)?.content;

  return (
    <div style={{
      minHeight: "100vh", background: "#030712",
      fontFamily: "'Inter', -apple-system, sans-serif", display: "flex",
    }}>
      {/* ── Sidebar ── */}
      <div style={{
        width: 280, background: "#0a0f1e", borderRight: "1px solid #1e293b",
        display: "flex", flexDirection: "column", padding: "24px 0", flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: "0 24px 24px", borderBottom: "1px solid #1e293b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1, #0ea5e9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: "bold", color: "#fff",
            }}>G</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Component Architect</div>
              <div style={{ fontSize: 11, color: "#475569" }}>by Pythrust</div>
            </div>
          </div>
        </div>

        {/* Example prompts */}
        <div style={{ padding: "20px 24px", flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
            Example Prompts
          </div>
          {EXAMPLE_PROMPTS.map((p, i) => (
            <button key={i} onClick={() => setPrompt(p)} style={{
              width: "100%", textAlign: "left", background: "transparent",
              border: "none", color: "#64748b", padding: "8px 10px", borderRadius: 6,
              cursor: "pointer", fontSize: 12.5, lineHeight: 1.4, marginBottom: 4,
              transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.target.style.background = "#1e293b"; e.target.style.color = "#cbd5e1"; }}
              onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#64748b"; }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* API toggle */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #1e293b" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "#475569" }}>Live API mode</span>
            <button onClick={() => setApiMode(m => !m)} style={{
              width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
              background: apiMode ? "#6366f1" : "#1e293b", transition: "0.2s",
              position: "relative", padding: 0,
            }}>
              <span style={{
                display: "block", width: 16, height: 16, borderRadius: 8,
                background: "#fff", position: "absolute", top: 3,
                left: apiMode ? 21 : 3, transition: "0.2s",
              }} />
            </button>
          </div>
          {!apiMode && (
            <div style={{ fontSize: 10.5, color: "#334155", marginTop: 6 }}>
              Demo mode — mock output shown
            </div>
          )}
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          padding: "16px 28px", borderBottom: "1px solid #1e293b",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(10,15,30,0.8)", backdropFilter: "blur(12px)",
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#f1f5f9" }}>
              Guided Component Architect
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: "#475569", marginTop: 2 }}>
              Natural language → Validated Angular components with design system compliance
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["Design Tokens", "Validator", "Self-Correction"].map(tag => (
              <span key={tag} style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 20,
                background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)",
                color: "#a5b4fc",
              }}>{tag}</span>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Chat / History panel */}
          <div style={{ flex: "0 0 38%", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Messages */}
            <div style={{ flex: 1, overflow: "auto", padding: "20px 20px 0" }}>
              {history.length === 0 && (
                <div style={{
                  textAlign: "center", marginTop: "15%", color: "#334155",
                }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                    Describe your component
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                    The agentic loop will generate, validate, and<br />
                    self-correct until it passes all design system checks.
                  </div>
                </div>
              )}

              {history.map((msg, i) => (
                <div key={i} style={{ marginBottom: 20 }}>
                  {msg.role === "user" ? (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div style={{
                        background: "#6366f1", color: "#fff", padding: "10px 14px",
                        borderRadius: "18px 18px 4px 18px", fontSize: 13.5, maxWidth: "85%",
                        lineHeight: 1.5,
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12,
                      padding: "14px 16px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: 5,
                          background: "linear-gradient(135deg, #6366f1, #0ea5e9)",
                          fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#fff", fontWeight: "bold",
                        }}>G</div>
                        <span style={{ fontSize: 12, color: "#64748b" }}>Generated component</span>
                        <IterationBadge n={msg.content.iterations} />
                      </div>
                      <div style={{ fontSize: 12, color: "#475569" }}>
                        {msg.content.success
                          ? "✅ Passed all validation checks"
                          : "⚠️ Generated with warnings — review output"}
                      </div>
                      <ValidationBadge validation={msg.content.validation} />
                      <AuditTrail trail={msg.content.audit_trail} />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 5,
                    background: "linear-gradient(135deg, #6366f1, #0ea5e9)",
                  }} />
                  <div style={{ display: "flex", gap: 5 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: 8, height: 8, borderRadius: 4, background: "#334155",
                        animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }} />
                    ))}
                    <style>{`@keyframes pulse { 0%,80%,100%{opacity:.3} 40%{opacity:1} }`}</style>
                  </div>
                  <span style={{ fontSize: 12, color: "#475569" }}>Running agentic loop...</span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "16px 20px", borderTop: "1px solid #1e293b" }}>
              {error && (
                <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 10, padding: "8px 12px", background: "rgba(239,68,68,0.08)", borderRadius: 8 }}>
                  ⚠ {error}
                </div>
              )}
              <div style={{ position: "relative" }}>
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Describe your component… (⌘+Enter to generate)"
                  rows={3}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "#0a0f1e", border: "1px solid #1e293b",
                    borderRadius: 10, padding: "12px 14px 36px", color: "#f1f5f9",
                    fontSize: 13.5, resize: "none", fontFamily: "inherit",
                    lineHeight: 1.5, outline: "none",
                  }}
                />
                <button
                  onClick={generate}
                  disabled={loading || !prompt.trim()}
                  style={{
                    position: "absolute", bottom: 10, right: 10,
                    background: loading || !prompt.trim() ? "#1e293b" : "#6366f1",
                    border: "none", borderRadius: 8, color: "#fff",
                    padding: "6px 14px", fontSize: 12.5, fontWeight: 600,
                    cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
                    transition: "0.15s",
                  }}
                >
                  {loading ? "..." : "Generate →"}
                </button>
              </div>
              {history.length > 0 && (
                <div style={{ fontSize: 11, color: "#334155", marginTop: 6 }}>
                  Multi-turn session active — follow up with "Make the button rounded" etc.
                </div>
              )}
            </div>
          </div>

          {/* Code output panel */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {latestResult ? (
              <>
                {/* Tab bar */}
                <div style={{
                  display: "flex", gap: 0, borderBottom: "1px solid #1e293b",
                  background: "#0a0f1e", padding: "0 24px",
                }}>
                  {[
                    { id: "template", label: "HTML Template" },
                    { id: "typescript", label: "TypeScript" },
                    { id: "tokens", label: "Design Tokens" },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                      background: "transparent",
                      borderBottom: activeTab === tab.id ? "2px solid #6366f1" : "2px solid transparent",
                      borderLeft: "none", borderRight: "none", borderTop: "none",
                      color: activeTab === tab.id ? "#a5b4fc" : "#475569",
                      padding: "14px 16px", fontSize: 13, cursor: "pointer",
                      fontFamily: "inherit", transition: "0.15s",
                    }}>
                      {tab.label}
                    </button>
                  ))}

                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    <IterationBadge n={latestResult.iterations} />
                    <button
                      onClick={() => {
                        const blob = new Blob([
                          `<!-- Template -->\n${latestResult.template}\n\n/* TypeScript */\n${latestResult.typescript}`
                        ], { type: "text/plain" });
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = "generated-component.ts";
                        a.click();
                      }}
                      style={{
                        background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
                        color: "#a5b4fc", padding: "5px 12px", borderRadius: 6,
                        cursor: "pointer", fontSize: 12, fontFamily: "inherit",
                      }}
                    >
                      ↓ Export
                    </button>
                  </div>
                </div>

                {/* Code content */}
                <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
                  {activeTab === "template" && (
                    <CodeBlock code={latestResult.template} lang="html" label="Angular HTML Template" />
                  )}
                  {activeTab === "typescript" && (
                    <CodeBlock code={latestResult.typescript} lang="ts" label="TypeScript Component Class" />
                  )}
                  {activeTab === "tokens" && (
                    <div>
                      <div style={{ fontSize: 12, color: "#475569", marginBottom: 16 }}>
                        These tokens are injected into every generation prompt. All output is validated against them.
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                        {[
                          { label: "Primary", hex: "#6366f1" },
                          { label: "Primary Dark", hex: "#4f46e5" },
                          { label: "Secondary", hex: "#0ea5e9" },
                          { label: "Accent", hex: "#f59e0b" },
                          { label: "Success", hex: "#10b981" },
                          { label: "Error", hex: "#ef4444" },
                          { label: "Neutral 50", hex: "#f8fafc" },
                          { label: "Neutral 900", hex: "#0f172a" },
                        ].map(c => (
                          <div key={c.hex} style={{
                            background: "#0f172a", border: "1px solid #1e293b",
                            borderRadius: 8, padding: 12, display: "flex", alignItems: "center", gap: 10,
                          }}>
                            <div style={{ width: 28, height: 28, borderRadius: 6, background: c.hex, flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>{c.label}</div>
                              <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>{c.hex}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 20, padding: 14, background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b" }}>
                        <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>Token constants</div>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                          {[
                            ["border-radius", "8px"], ["font", "Inter"], ["shadow-glow", "rgba(99,102,241,0.4)"],
                            ["transition", "200ms ease"],
                          ].map(([k, v]) => (
                            <div key={k} style={{ fontSize: 11, fontFamily: "monospace" }}>
                              <span style={{ color: "#9cdcfe" }}>{k}</span>
                              <span style={{ color: "#475569" }}>: </span>
                              <span style={{ color: "#ce9178" }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                color: "#1e293b",
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 60, marginBottom: 16, opacity: 0.4 }}>{'</>'}</div>
                  <div style={{ fontSize: 14, color: "#334155" }}>Generated component will appear here</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
