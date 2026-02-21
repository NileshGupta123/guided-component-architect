import { useState, useRef, useEffect } from "react";

const API_BASE = "http://localhost:8000";
const SESSION_ID = "session_" + Math.random().toString(36).slice(2, 9);

function highlight(code, lang) {
  if (!code) return "";
  let escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "<")
    .replace(/>/g, ">");

  if (lang === "ts") {
    escaped = escaped
      .replace(/(\/\/.*)/g, '<span style="color:#6a9955">$1</span>')
      .replace(
        /\b(import|export|class|const|let|var|return|if|else|for|function|async|await|new|this|true|false|null|undefined|from|default|interface|type|extends|implements|public|private|protected|readonly|static)\b/g,
        '<span style="color:#569cd6">$1</span>'
      )
      .replace(/(@\w+)/g, '<span style="color:#4ec9b0">$1</span>')
      .replace(/('.*?'|".*?")/g, '<span style="color:#ce9178">$1</span>');
  } else {
    escaped = escaped
      .replace(/(<\/?[\w-]+)/g, '<span style="color:#4ec9b0">$1</span>')
      .replace(/([\w-]+=)/g, '<span style="color:#9cdcfe">$1</span>')
      .replace(/(".*?")/g, '<span style="color:#ce9178">$1</span>');
  }
  return escaped;
}

function CodeBlock({ code, lang, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ marginBottom: 20, animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {label}
        </span>
        <button
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{ 
            background: copied ? "rgba(16,185,129,0.2)" : "rgba(99,102,241,0.15)", 
            border: `1px solid ${copied ? "#10b981" : "rgba(99,102,241,0.4)"}`, 
            color: copied ? "#10b981" : "#a5b4fc", 
            padding: "3px 10px", 
            borderRadius: 6, 
            cursor: "pointer", 
            fontSize: 11,
            transition: "all 0.2s ease"
          }}
        >
          {copied ? "✓ Copied!" : "Copy"}
        </button>
      </div>
      <pre style={{ 
        background: "linear-gradient(145deg, #0d1117 0%, #161b22 100%)", 
        borderRadius: 12, 
        padding: "16px 20px", 
        overflow: "auto", 
        fontSize: 12.5, 
        lineHeight: 1.7, 
        margin: 0, 
        border: "1px solid #30363d", 
        fontFamily: "'Fira Code', 'JetBrains Mono', monospace", 
        maxHeight: 450,
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
      }}>
        <code dangerouslySetInnerHTML={{ __html: highlight(code, lang) }} />
      </pre>
    </div>
  );
}

function ValidationBadge({ validation }) {
  if (!validation) return null;
  const { is_valid, errors, warnings, passed } = validation;
  return (
    <div style={{ 
      background: is_valid ? "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.03) 100%)" : "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.03) 100%)", 
      border: `1px solid ${is_valid ? "#10b981" : "#ef4444"}`, 
      borderRadius: 12, 
      padding: "16px 20px", 
      marginBottom: 20,
      animation: 'slideIn 0.3s ease-out'
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>{is_valid ? "✨" : "⚠️"}</span>
        <strong style={{ color: is_valid ? "#10b981" : "#ef4444", fontSize: 14, fontWeight: 600 }}>
          {is_valid ? "All validation checks passed!" : `${errors.length} error(s) found — self-correction triggered`}
        </strong>
      </div>
      {errors.map((e, i) => <div key={i} style={{ color: "#ef4444", fontSize: 12, marginBottom: 4, paddingLeft: 10 }}>✗ {e}</div>)}
      {warnings.map((w, i) => <div key={i} style={{ color: "#f59e0b", fontSize: 12, marginBottom: 4, paddingLeft: 10 }}>⚠ {w}</div>)}
      {passed.map((p, i) => <div key={i} style={{ color: "#10b981", fontSize: 12, marginBottom: 4, paddingLeft: 10 }}>✓ {p}</div>)}
    </div>
  );
}

function AuditTrail({ trail }) {
  const [open, setOpen] = useState(false);
  if (!trail?.length) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <button 
        onClick={() => setOpen(o => !o)} 
        style={{ 
          background: open ? "rgba(99,102,241,0.15)" : "transparent", 
          border: "1px solid #30363d", 
          color: open ? "#a5b4fc" : "#6e7681", 
          padding: "8px 16px", 
          borderRadius: 8, 
          cursor: "pointer", 
          fontSize: 12,
          transition: "all 0.2s ease",
          fontWeight: 500
        }}
      >
        {open ? "▲" : "▼"} Audit Trail ({trail.length} attempt{trail.length > 1 ? "s" : ""})
      </button>
      {open && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10, animation: 'slideDown 0.2s ease-out' }}>
          {trail.map((t, i) => (
            <div key={i} style={{ 
              background: "linear-gradient(145deg, #0d1117 0%, #161b22 100%)", 
              border: "1px solid #30363d", 
              borderRadius: 10, 
              padding: "12px 16px",
              transition: "all 0.2s ease"
            }}>
              <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ 
                  padding: "2px 8px", 
                  borderRadius: 4, 
                  background: t.validation.is_valid ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                  color: t.validation.is_valid ? "#10b981" : "#ef4444",
                  fontSize: 10,
                  fontWeight: 600
                }}>
                  #{t.attempt}
                </span>
                Attempt {t.attempt} — {t.validation.is_valid ? "✅ Valid" : `❌ ${t.validation.errors?.length} error(s)`}
              </div>
              {t.validation.errors?.map((e, j) => (
                <div key={j} style={{ fontSize: 11, color: "#ef4444", paddingLeft: 10 }}>✗ {e}</div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("template");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  const EXAMPLES = [
    "A login card with glassmorphism effect",
    "A pricing table with 3 tiers",
    "A dark mode notification toast",
    "A user profile card with avatar and stats",
    "A file upload dropzone",
  ];

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    const currentPrompt = prompt;
    setPrompt("");
    setLoading(true);
    setError(null);
    setHistory(h => [...h, { role: "user", content: currentPrompt }]);

    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: currentPrompt, session_id: SESSION_ID }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setResult(data);
      setHistory(h => [...h, { role: "assistant", content: data }]);
      setActiveTab("template");
    } catch (e) {
      setError(e.message + " — Is your backend running? Run: python -m uvicorn api:app --reload --port 8000");
      setHistory(h => h.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const exportFile = () => {
    if (!result) return;
    const content = `<!-- Angular Template -->\n${result.template}\n\n/* TypeScript Component */\n${result.typescript}`;
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "generated-component.ts";
    a.click();
  };

  const latestResult = history.filter(h => h.role === "assistant").at(-1)?.content;

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(180deg, #0a0f1e 0%, #030712 100%)", 
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", 
      display: "flex", 
      flexDirection: "column", 
      color: "#f1f5f9" 
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        textarea:focus, button:focus {
          outline: none;
        }
        textarea::placeholder {
          color: #4a5568;
        }
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #0a0f1e;
        }
        ::-webkit-scrollbar-thumb {
          background: #30363d;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #484f58;
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ 
        padding: "16px 32px", 
        borderBottom: "1px solid #1e293b", 
        background: "rgba(10, 15, 30, 0.95)", 
        backdropFilter: "blur(10px)",
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 12, 
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #0ea5e9 100%)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            fontSize: 20, 
            fontWeight: "bold",
            boxShadow: "0 4px 15px rgba(99, 102, 241, 0.4)"
          }}>G</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Guided Component Architect</div>
            <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.05em" }}>Gen AI Engineer</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["Prompt Engineering", "Linter-Agent", "Self-Correction", "Multi-Turn"].map((t, i) => (
            <span key={t} style={{ 
              fontSize: 10.5, 
              padding: "4px 12px", 
              borderRadius: 20, 
              background: i === 0 ? "rgba(139, 92, 246, 0.15)" : "rgba(99,102,241,0.08)", 
              border: `1px solid ${i === 0 ? "rgba(139, 92, 246, 0.4)" : "rgba(99,102,241,0.2)"}`, 
              color: i === 0 ? "#c4b5fd" : "#818cf8",
              fontWeight: 500
            }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", height: "calc(100vh - 73px)" }}>

        {/* ── Left Sidebar: Chat ── */}
        <div style={{ 
          width: 380, 
          borderRight: "1px solid #1e293b", 
          display: "flex", 
          flexDirection: "column", 
          background: "linear-gradient(180deg, #0a0f1e 0%, #0d1220 100%)", 
          flexShrink: 0 
        }}>

          {/* Example prompts */}
          <div style={{ padding: "20px", borderBottom: "1px solid #1e293b" }}>
            <div style={{ 
              fontSize: 10.5, 
              fontWeight: 600, 
              color: "#475569", 
              textTransform: "uppercase", 
              letterSpacing: "0.1em", 
              marginBottom: 12 
            }}>
              ✨ Example Prompts
            </div>
            {EXAMPLES.map((e, i) => (
              <button 
                key={i} 
                onClick={() => setPrompt(e)} 
                style={{ 
                  width: "100%", 
                  textAlign: "left", 
                  background: "transparent", 
                  border: "1px solid transparent",
                  color: "#64748b", 
                  padding: "10px 12px", 
                  borderRadius: 8, 
                  cursor: "pointer", 
                  fontSize: 12.5, 
                  marginBottom: 4, 
                  transition: "all 0.2s ease",
                  fontWeight: 500
                }}
                onMouseEnter={ev => { 
                  ev.target.style.background = "rgba(99, 102, 241, 0.08)"; 
                  ev.target.style.borderColor = "rgba(99, 102, 241, 0.2)";
                  ev.target.style.color = "#a5b4fc"; 
                }}
                onMouseLeave={ev => { 
                  ev.target.style.background = "transparent"; 
                  ev.target.style.borderColor = "transparent";
                  ev.target.style.color = "#64748b"; 
                }}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
            {history.length === 0 && (
              <div style={{ 
                textAlign: "center", 
                marginTop: "30%", 
                color: "#1e293b",
                animation: 'fadeIn 0.5s ease-out'
              }}>
                <div style={{ 
                  fontSize: 48, 
                  marginBottom: 16,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}>⚡</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Describe your component</div>
                <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                  The agentic loop generates, validates<br />and self-corrects automatically.
                </div>
              </div>
            )}

            {history.map((msg, i) => (
              <div key={i} style={{ marginBottom: 16, animation: 'slideIn 0.3s ease-out' }}>
                {msg.role === "user" ? (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ 
                      background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", 
                      color: "#fff", 
                      padding: "12px 16px", 
                      borderRadius: "18px 18px 4px 18px", 
                      fontSize: 13, 
                      maxWidth: "88%", 
                      lineHeight: 1.5,
                      boxShadow: "0 2px 10px rgba(99, 102, 241, 0.3)"
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)", 
                    border: "1px solid #30363d", 
                    borderRadius: 14, 
                    padding: "14px 16px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: 6, 
                        background: "linear-gradient(135deg, #6366f1, #0ea5e9)",
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12
                      }}>✨</div>
                      <span style={{ fontSize: 12, color: "#8b949e", fontWeight: 500 }}>Component generated</span>
                      <span style={{ 
                        fontSize: 10, 
                        padding: "3px 10px", 
                        borderRadius: 20, 
                        background: msg.content.iterations === 1 ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", 
                        border: `1px solid ${msg.content.iterations === 1 ? "#10b981" : "#f59e0b"}`, 
                        color: msg.content.iterations === 1 ? "#10b981" : "#f59e0b",
                        fontWeight: 600
                      }}>
                        {msg.content.iterations} {msg.content.iterations === 1 ? "pass" : "iterations"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: msg.content.success ? "#10b981" : "#f59e0b", display: 'flex', alignItems: 'center', gap: 6 }}>
                      {msg.content.success ? "✅ Passed all checks" : "⚠️ Generated with warnings"}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", animation: 'fadeIn 0.3s ease-out' }}>
                <div style={{ 
                  width: 24, 
                  height: 24, 
                  borderRadius: 6, 
                  background: "linear-gradient(135deg, #6366f1, #0ea5e9)",
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{ 
                    width: 12, 
                    height: 12, 
                    border: "2px solid rgba(255,255,255,0.3)", 
                    borderTopColor: "white",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }} />
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ 
                      width: 6, 
                      height: 6, 
                      borderRadius: 3, 
                      background: "#6366f1", 
                      animation: `pulse 1.2s ease-in-out ${i * 0.15}s infinite` 
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 12, color: "#6e7681", fontWeight: 500 }}>Running agentic loop…</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "16px 20px", borderTop: "1px solid #1e293b", background: "rgba(10, 15, 30, 0.5)" }}>
            {error && (
              <div style={{ 
                color: "#f87171", 
                fontSize: 12, 
                marginBottom: 12, 
                padding: "10px 14px", 
                background: "rgba(239,68,68,0.1)", 
                borderRadius: 10, 
                lineHeight: 1.5,
                border: "1px solid rgba(239,68,68,0.2)"
              }}>
                ⚠️ {error}
              </div>
            )}
            <div style={{ position: "relative" }}>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate(); }}
                placeholder="Describe your component… (Ctrl+Enter to generate)"
                rows={3}
                style={{ 
                  width: "100%", 
                  boxSizing: "border-box", 
                  background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)", 
                  border: "1px solid #30363d", 
                  borderRadius: 14, 
                  padding: "14px 16px 44px", 
                  color: "#f1f5f9", 
                  fontSize: 13, 
                  resize: "none", 
                  fontFamily: "inherit", 
                  lineHeight: 1.6, 
                  outline: "none",
                  transition: "all 0.2s ease",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)"
                }}
                onFocus={e => {
                  e.target.style.borderColor = "#6366f1";
                  e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)";
                }}
                onBlur={e => {
                  e.target.style.borderColor = "#30363d";
                  e.target.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.1)";
                }}
              />
              <button 
                onClick={generate} 
                disabled={loading || !prompt.trim()}
                style={{ 
                  position: "absolute", 
                  bottom: 10, 
                  right: 10, 
                  background: loading || !prompt.trim() ? "#1e293b" : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", 
                  border: "none", 
                  borderRadius: 10, 
                  color: "#fff", 
                  padding: "8px 18px", 
                  fontSize: 13, 
                  fontWeight: 600, 
                  cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: loading || !prompt.trim() ? "none" : "0 4px 15px rgba(99, 102, 241, 0.4)"
                }}
              >
                {loading ? "..." : "Generate →"}
              </button>
            </div>
            {history.length > 0 && (
              <div style={{ fontSize: 11, color: "#475569", marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                Multi-turn active — follow up to edit component
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Code Output ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "linear-gradient(180deg, #0d1220 0%, #030712 100%)" }}>
          {latestResult ? (
            <>
              {/* Tab bar */}
              <div style={{ 
                display: "flex", 
                borderBottom: "1px solid #1e293b", 
                background: "rgba(10, 15, 30, 0.8)", 
                padding: "0 24px", 
                alignItems: "center",
                backdropFilter: "blur(10px)"
              }}>
                {[
                  { id: "template", label: "📄 HTML Template" },
                  { id: "typescript", label: "📜 TypeScript" },
                  { id: "validation", label: "✅ Validation" },
                ].map(tab => (
                  <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id)} 
                    style={{ 
                      background: "transparent", 
                      borderBottom: activeTab === tab.id ? "2px solid #8b5cf6" : "2px solid transparent", 
                      borderLeft: "none", 
                      borderRight: "none", 
                      borderTop: "none", 
                      color: activeTab === tab.id ? "#c4b5fd" : "#6e7681", 
                      padding: "16px 20px", 
                      fontSize: 13, 
                      cursor: "pointer", 
                      fontFamily: "inherit",
                      fontWeight: activeTab === tab.id ? 600 : 500,
                      transition: "all 0.2s ease"
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ 
                    fontSize: 11, 
                    padding: "4px 12px", 
                    borderRadius: 20, 
                    background: latestResult.iterations === 1 ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", 
                    border: `1px solid ${latestResult.iterations === 1 ? "#10b981" : "#f59e0b"}`, 
                    color: latestResult.iterations === 1 ? "#10b981" : "#f59e0b",
                    fontWeight: 600
                  }}>
                    {latestResult.iterations} iteration{latestResult.iterations > 1 ? "s" : ""}
                  </span>
                  <button 
                    onClick={exportFile} 
                    style={{ 
                      background: "linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.2) 100%)", 
                      border: "1px solid rgba(139, 92, 246, 0.4)", 
                      color: "#c4b5fd", 
                      padding: "8px 16px", 
                      borderRadius: 10, 
                      cursor: "pointer", 
                      fontSize: 12, 
                      fontFamily: "inherit",
                      fontWeight: 500,
                      transition: "all 0.2s ease"
                    }}
                  >
                    ↓ Export .ts
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
                {activeTab === "validation" && (
                  <>
                    <ValidationBadge validation={latestResult.validation} />
                    <AuditTrail trail={latestResult.audit_trail} />
                  </>
                )}
              </div>
            </>
          ) : (
            <div style={{ 
              flex: 1, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              flexDirection: "column",
              animation: 'fadeIn 0.5s ease-out'
            }}>
              <div style={{ 
                fontSize: 72, 
                marginBottom: 24, 
                opacity: 0.1,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}>{"</>"}</div>
              <div style={{ fontSize: 16, color: "#475569", fontWeight: 500 }}>Generated component will appear here</div>
              <div style={{ fontSize: 13, color: "#334155", marginTop: 8 }}>Try an example prompt from the left panel</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
