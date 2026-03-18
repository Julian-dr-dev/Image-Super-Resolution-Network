/**
 * SuperResApp.jsx  —  frontend/src/SuperResApp.jsx
 *
 * Darkroom photographic lab aesthetic:
 *   deep charcoal + amber accents + monospaced type
 *
 * Features:
 *   - Drag & drop / click upload
 *   - 2× / 4× scale selector
 *   - Side-by-side before/after with draggable divider
 *   - Download button for upscaled result
 *   - Error & loading states
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, Zap, Download, ImageIcon,
  AlertCircle, Loader, ScanSearch,
} from "lucide-react";

// ─── Config ──────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("File read failed"));
    r.readAsDataURL(file);
  });
}

function fmtBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

// ─── CSS-in-JS global styles injected once ───────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Playfair+Display:wght@400;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #0c0b09;
    --surface:   #161410;
    --surface2:  #1e1b17;
    --border:    #2e2924;
    --amber:     #d97c1a;
    --amber-dim: #7a4a10;
    --amber-glow:rgba(217,124,26,0.15);
    --text:      #e8dfc8;
    --muted:     #7a6e5e;
    --green:     #5a9e6f;
    --red:       #b05050;
    --mono:      'DM Mono', monospace;
    --serif:     'Playfair Display', Georgia, serif;
    --radius:    6px;
    --shadow:    0 4px 24px rgba(0,0,0,0.6);
  }

  html, body, #root {
    height: 100%;
    background: var(--bg);
    color: var(--text);
    font-family: var(--mono);
    font-size: 14px;
    line-height: 1.6;
  }

  ::selection { background: var(--amber-dim); color: var(--text); }

  /* Slider thumb */
  .divider-handle {
    position: absolute;
    top: 0; bottom: 0;
    width: 3px;
    background: var(--amber);
    cursor: col-resize;
    z-index: 10;
    box-shadow: 0 0 12px var(--amber);
  }
  .divider-handle::before {
    content: '◁ ▷';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--amber);
    color: var(--bg);
    font-size: 10px;
    padding: 4px 6px;
    border-radius: 3px;
    white-space: nowrap;
    letter-spacing: 0.1em;
  }

  @keyframes pulse-border {
    0%, 100% { border-color: var(--amber-dim); }
    50%       { border-color: var(--amber); }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .fade-up { animation: fadeUp 0.4s ease both; }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface2);
    color: var(--text);
    font-family: var(--mono);
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
  }
  .btn:hover:not(:disabled) {
    border-color: var(--amber);
    background: var(--amber-glow);
    box-shadow: 0 0 8px var(--amber-glow);
  }
  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .btn-primary {
    background: var(--amber);
    border-color: var(--amber);
    color: var(--bg);
    font-weight: 500;
  }
  .btn-primary:hover:not(:disabled) {
    background: #e8881f;
    border-color: #e8881f;
    box-shadow: 0 0 16px rgba(217,124,26,0.4);
  }

  .scale-btn {
    padding: 7px 18px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: transparent;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .scale-btn.active {
    border-color: var(--amber);
    color: var(--amber);
    background: var(--amber-glow);
  }
  .scale-btn:hover:not(.active) {
    border-color: var(--border);
    color: var(--text);
    background: var(--surface2);
  }
`;

function GlobalStyle() {
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);
  return null;
}

// ─── DropZone ─────────────────────────────────────────────────────────────────
function DropZone({ onFile, disabled }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    onFile(file);
  };

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
      style={{
        border: `2px dashed ${dragging ? "var(--amber)" : "var(--border)"}`,
        borderRadius: "8px",
        padding: "48px 24px",
        textAlign: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        background: dragging ? "var(--amber-glow)" : "var(--surface)",
        animation: dragging ? "pulse-border 1s infinite" : "none",
        transition: "border-color 0.2s, background 0.2s",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <Upload size={32} color="var(--amber)" style={{ marginBottom: 12 }} />
      <div style={{ color: "var(--text)", marginBottom: 4 }}>
        Drop an image here or <span style={{ color: "var(--amber)" }}>browse</span>
      </div>
      <div style={{ color: "var(--muted)", fontSize: 12 }}>PNG, JPG, WEBP — max 10 MB</div>
    </div>
  );
}

// ─── ComparisonSlider ─────────────────────────────────────────────────────────
function ComparisonSlider({ originalSrc, upscaledSrc }) {
  const [pos, setPos] = useState(50); // 0-100 %
  const containerRef = useRef(null);
  const dragging = useRef(false);

  const calcPos = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(2, Math.min(98, pct)));
  }, []);

  useEffect(() => {
    const onMove = (e) => dragging.current && calcPos(e.clientX ?? e.touches?.[0]?.clientX);
    const onUp   = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [calcPos]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        borderRadius: 8,
        overflow: "hidden",
        userSelect: "none",
        lineHeight: 0,
        border: "1px solid var(--border)",
        background: "#000",
        maxHeight: 520,
      }}
    >
      {/* Upscaled (full width behind) */}
      <img
        src={upscaledSrc}
        alt="Upscaled"
        style={{ width: "100%", display: "block", maxHeight: 520, objectFit: "contain" }}
      />

      {/* Original (clipped on left) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `inset(0 ${100 - pos}% 0 0)`,
        }}
      >
        <img
          src={originalSrc}
          alt="Original"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>

      {/* Labels */}
      <div style={{
        position: "absolute", top: 10, left: 12,
        background: "rgba(0,0,0,0.7)", color: "var(--muted)",
        fontSize: 11, padding: "2px 8px", borderRadius: 3,
        fontFamily: "var(--mono)", letterSpacing: "0.08em",
      }}>
        ORIGINAL
      </div>
      <div style={{
        position: "absolute", top: 10, right: 12,
        background: "rgba(0,0,0,0.7)", color: "var(--amber)",
        fontSize: 11, padding: "2px 8px", borderRadius: 3,
        fontFamily: "var(--mono)", letterSpacing: "0.08em",
      }}>
        UPSCALED
      </div>

      {/* Draggable divider */}
      <div
        className="divider-handle"
        style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
        onMouseDown={(e) => { e.preventDefault(); dragging.current = true; }}
        onTouchStart={() => { dragging.current = true; }}
      />
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function SuperResApp() {
  const [imageFile, setImageFile]       = useState(null);
  const [previewSrc, setPreviewSrc]     = useState(null);
  const [upscaledSrc, setUpscaledSrc]   = useState(null);
  const [scaleFactor, setScaleFactor]   = useState(2);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [meta, setMeta]                 = useState(null); // { original_size, upscaled_size }

  // When user picks a file — generate preview and reset results
  const handleFile = useCallback((file) => {
    setImageFile(file);
    setUpscaledSrc(null);
    setError(null);
    setMeta(null);
    const url = URL.createObjectURL(file);
    setPreviewSrc(url);
  }, []);

  // Cleanup preview object URLs on unmount
  useEffect(() => () => previewSrc && URL.revokeObjectURL(previewSrc), [previewSrc]);

  const handleUpscale = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);
    setUpscaledSrc(null);

    try {
      const b64 = await fileToBase64(imageFile);
      const res = await fetch(`${API_BASE}/upscale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64, scale_factor: scaleFactor }),
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? `Server error ${res.status}`);

      setUpscaledSrc(`data:image/png;base64,${json.upscaled}`);
      setMeta({
        original_size: json.original_size,
        upscaled_size: json.upscaled_size,
      });
    } catch (err) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!upscaledSrc) return;
    const a = document.createElement("a");
    a.href = upscaledSrc;
    a.download = `upscaled_${scaleFactor}x_${imageFile?.name ?? "image"}.png`;
    a.click();
  };

  return (
    <>
      <GlobalStyle />
      <div style={{
        minHeight: "100vh",
        maxWidth: 900,
        margin: "0 auto",
        padding: "48px 24px 80px",
        display: "flex",
        flexDirection: "column",
        gap: 40,
      }}>

        {/* ── Header ── */}
        <header style={{ textAlign: "center" }} className="fade-up">
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}>
            <ScanSearch size={28} color="var(--amber)" />
            <h1 style={{
              fontFamily: "var(--serif)",
              fontWeight: 700,
              fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
              letterSpacing: "0.02em",
              color: "var(--text)",
            }}>
              Super<span style={{ color: "var(--amber)" }}>Resolution</span>
            </h1>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13, letterSpacing: "0.06em" }}>
            CNN-POWERED IMAGE UPSCALING · 2× OR 4×
          </p>
        </header>

        {/* ── Upload card ── */}
        <section
          className="fade-up"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 20,
            animationDelay: "0.05s",
          }}
        >
          <DropZone onFile={handleFile} disabled={loading} />

          {/* File info strip */}
          {imageFile && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: "var(--surface2)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
            }}>
              <ImageIcon size={16} color="var(--amber)" />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {imageFile.name}
              </span>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>
                {fmtBytes(imageFile.size)}
              </span>
            </div>
          )}

          {/* Controls row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}>
            {/* Scale selector */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: "var(--muted)", fontSize: 12, letterSpacing: "0.06em" }}>SCALE</span>
              {[2, 4].map((s) => (
                <button
                  key={s}
                  className={`scale-btn ${scaleFactor === s ? "active" : ""}`}
                  onClick={() => setScaleFactor(s)}
                  disabled={loading}
                >
                  {s}×
                </button>
              ))}
            </div>

            <div style={{ flex: 1 }} />

            {/* Upscale button */}
            <button
              className="btn btn-primary"
              onClick={handleUpscale}
              disabled={!imageFile || loading}
            >
              {loading ? (
                <>
                  <Loader size={15} style={{ animation: "spin 1s linear infinite" }} />
                  Processing…
                </>
              ) : (
                <>
                  <Zap size={15} />
                  Upscale {scaleFactor}×
                </>
              )}
            </button>

            {/* Download button */}
            {upscaledSrc && (
              <button className="btn" onClick={handleDownload}>
                <Download size={15} />
                Download PNG
              </button>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: "rgba(176,80,80,0.12)",
              border: "1px solid var(--red)",
              borderRadius: "var(--radius)",
              color: "#d07070",
              fontSize: 13,
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </section>

        {/* ── Comparison viewer ── */}
        {(previewSrc || upscaledSrc) && (
          <section className="fade-up" style={{ animationDelay: "0.1s" }}>
            {/* Section label + meta */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              flexWrap: "wrap",
              gap: 8,
            }}>
              <span style={{ color: "var(--muted)", fontSize: 12, letterSpacing: "0.08em" }}>
                {upscaledSrc ? "DRAG THE DIVIDER TO COMPARE" : "PREVIEW"}
              </span>

              {meta && (
                <span style={{ color: "var(--muted)", fontSize: 12, fontStyle: "italic" }}>
                  {meta.original_size[0]}×{meta.original_size[1]}
                  {" "}<span style={{ color: "var(--amber)" }}>→</span>{" "}
                  {meta.upscaled_size[0]}×{meta.upscaled_size[1]} px
                </span>
              )}
            </div>

            {upscaledSrc ? (
              <ComparisonSlider originalSrc={previewSrc} upscaledSrc={upscaledSrc} />
            ) : (
              /* Plain preview while waiting */
              <div style={{
                border: "1px solid var(--border)",
                borderRadius: 8,
                overflow: "hidden",
                background: "#000",
                textAlign: "center",
              }}>
                <img
                  src={previewSrc}
                  alt="Preview"
                  style={{
                    maxWidth: "100%",
                    maxHeight: 480,
                    objectFit: "contain",
                    display: "block",
                    margin: "0 auto",
                  }}
                />
              </div>
            )}
          </section>
        )}

        {/* ── Empty state ── */}
        {!previewSrc && !upscaledSrc && (
          <div style={{
            textAlign: "center",
            color: "var(--muted)",
            fontSize: 13,
            padding: "40px 0",
            letterSpacing: "0.05em",
          }}>
            Upload an image above to get started
          </div>
        )}

        {/* ── Footer ── */}
        <footer style={{
          marginTop: "auto",
          textAlign: "center",
          color: "var(--muted)",
          fontSize: 11,
          letterSpacing: "0.08em",
          borderTop: "1px solid var(--border)",
          paddingTop: 20,
        }}>
          SRGAN-STYLE CNN · PYTORCH BACKEND · FLASK API
        </footer>
      </div>
    </>
  );
}