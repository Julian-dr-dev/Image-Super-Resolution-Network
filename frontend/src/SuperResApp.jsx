/**
 * SuperResApp.jsx  —  frontend/src/SuperResApp.jsx
 * Minimal, clean aesthetic — light, airy, precise
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, Zap, Download, ImageIcon,
  AlertCircle, Loader, ScanSearch,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

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

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=Syne:wght@400;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #f8f8f6;
    --surface:   #ffffff;
    --border:    #e4e4e0;
    --border2:   #d0d0ca;
    --accent:    #1a1a1a;
    --accent2:   #4a4a4a;
    --muted:     #9a9a94;
    --tag:       #f0f0ec;
    --sans:      'Inter', sans-serif;
    --display:   'Syne', sans-serif;
    --radius:    8px;
  }

  :root.dark {
    --bg:        #1a1a1a;
    --surface:   #242424;
    --border:    #333333;
    --border2:   #404040;
    --accent:    #eeeeee;
    --accent2:   #aaaaaa;
    --muted:     #666666;
    --tag:       #2a2a2a;
  }
  html, body, #root {
    height: 100%;
    background: var(--bg);
    color: var(--accent);
    font-family: var(--sans);
    font-size: 14px;
    line-height: 1.6;
  }

  .divider-handle {
    position: absolute;
    top: 0; bottom: 0;
    width: 2px;
    background: var(--accent);
    cursor: col-resize;
    z-index: 10;
  }
  .divider-handle::before {
    content: '◁ ▷';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--accent);
    color: #fff;
    font-size: 9px;
    padding: 4px 6px;
    border-radius: 4px;
    white-space: nowrap;
    letter-spacing: 0.08em;
    font-family: var(--sans);
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .fade-up { animation: fadeUp 0.35s ease both; }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 18px;
    border: 1px solid var(--border2);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--accent);
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 400;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .btn:hover:not(:disabled) {
    border-color: var(--accent);
    background: var(--tag);
  }
  .btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .btn-primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    font-weight: 500;
  }
  .btn-primary:hover:not(:disabled) {
    background: #333;
    border-color: #333;
  }

  .scale-btn {
    padding: 6px 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: transparent;
    color: var(--muted);
    font-family: var(--sans);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .scale-btn.active {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--tag);
  }
  .scale-btn:hover:not(.active) {
    color: var(--accent2);
    border-color: var(--border2);
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 28px;
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
        border: `1.5px dashed ${dragging ? "var(--accent)" : "var(--border2)"}`,
        borderRadius: "10px",
        padding: "44px 24px",
        textAlign: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        background: dragging ? "var(--tag)" : "var(--bg)",
        transition: "border-color 0.15s, background 0.15s",
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
      <Upload size={24} color="var(--muted)" style={{ marginBottom: 12 }} />
      <div style={{ color: "var(--accent2)", marginBottom: 4, fontSize: 13 }}>
        Drop an image here or{" "}
        <span style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: 3 }}>
          browse
        </span>
      </div>
      <div style={{ color: "var(--muted)", fontSize: 12 }}>PNG, JPG, WEBP</div>
    </div>
  );
}

function ComparisonSlider({ originalSrc, upscaledSrc }) {
  const [pos, setPos] = useState(50);
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
    const onUp = () => { dragging.current = false; };
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
        borderRadius: 10,
        overflow: "hidden",
        userSelect: "none",
        lineHeight: 0,
        border: "1px solid var(--border)",
        background: "var(--tag)",
        maxHeight: 520,
      }}
    >
      <img
        src={upscaledSrc}
        alt="Upscaled"
        style={{ width: "100%", display: "block", maxHeight: 520, objectFit: "contain" }}
      />
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img
          src={originalSrc}
          alt="Original"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>

      {/* Labels */}
      <div style={{
        position: "absolute", top: 10, left: 12,
        background: "rgba(255,255,255,0.85)",
        color: "var(--muted)",
        fontSize: 10, padding: "2px 8px", borderRadius: 4,
        fontFamily: "var(--sans)", letterSpacing: "0.08em",
        fontWeight: 500,
      }}>
        ORIGINAL
      </div>
      <div style={{
        position: "absolute", top: 10, right: 12,
        background: "rgba(26,26,26,0.8)",
        color: "#fff",
        fontSize: 10, padding: "2px 8px", borderRadius: 4,
        fontFamily: "var(--sans)", letterSpacing: "0.08em",
        fontWeight: 500,
      }}>
        UPSCALED
      </div>

      <div
        className="divider-handle"
        style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
        onMouseDown={(e) => { e.preventDefault(); dragging.current = true; }}
        onTouchStart={() => { dragging.current = true; }}
      />
    </div>
  );
}

export default function SuperResApp() {
  const [imageFile, setImageFile]     = useState(null);
  const [previewSrc, setPreviewSrc]   = useState(null);
  const [upscaledSrc, setUpscaledSrc] = useState(null);
  const [scaleFactor, setScaleFactor] = useState(2);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [meta, setMeta]               = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  const handleFile = useCallback((file) => {
    setImageFile(file);
    setUpscaledSrc(null);
    setError(null);
    setMeta(null);
    setPreviewSrc(URL.createObjectURL(file));
  }, []);

  useEffect(() => () => previewSrc && URL.revokeObjectURL(previewSrc), [previewSrc]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode)
  }, [darkMode])

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
      setMeta({ original_size: json.original_size, upscaled_size: json.upscaled_size });
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
        maxWidth: 820,
        margin: "0 auto",
        padding: "56px 24px 80px",
        display: "flex",
        flexDirection: "column",
        gap: 32,
      }}>

        {/* Header */}
        <header className="fade-up" style={{ marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <ScanSearch size={20} color="var(--muted)" />
            <h1 style={{
              fontFamily: "var(--display)",
              fontWeight: 600,
              fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
              letterSpacing: "-0.01em",
              color: "var(--accent)",
            }}>
              Super Resolution
            </h1>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 12, letterSpacing: "0.04em" }}>
            CNN-powered image upscaling — 2× or 4×
          </p>
          <div style={{ marginTop: 20, height: 1, background: "var(--border)" }} />
          <div style={{marginTop: 16 , display: "flex", justifyContent: "flex-end"}}>
            <button
              className="btn"
              onClick={() => setDarkMode(!darkMode)}
              style={{ fontSize: 11, padding: "5px 12px", letterSpacing: "0.05em" }}
              >
            {darkMode ? "Light mode" : "Dark mode"}
            </button>

          </div>
        </header>

        {/* Upload card */}
        <section className="card fade-up" style={{ animationDelay: "0.05s" }}>
          <DropZone onFile={handleFile} disabled={loading} />

          {/* File info */}
          {imageFile && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 14,
              padding: "8px 12px",
              background: "var(--tag)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
            }}>
              <ImageIcon size={14} color="var(--muted)" />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
                {imageFile.name}
              </span>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>
                {fmtBytes(imageFile.size)}
              </span>
            </div>
          )}

          {/* Controls */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 16,
            flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.06em" }}>SCALE</span>
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

            <button
              className="btn btn-primary"
              onClick={handleUpscale}
              disabled={!imageFile || loading}
            >
              {loading ? (
                <>
                  <Loader size={13} style={{ animation: "spin 1s linear infinite" }} />
                  Processing
                </>
              ) : (
                <>
                  <Zap size={13} />
                  Upscale {scaleFactor}×
                </>
              )}
            </button>

            {upscaledSrc && (
              <button className="btn" onClick={handleDownload}>
                <Download size={13} />
                Download
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 14,
              padding: "9px 12px",
              background: "#fff5f5",
              border: "1px solid #f0c0c0",
              borderRadius: "var(--radius)",
              color: "#c05050",
              fontSize: 13,
            }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </section>

        {/* Comparison viewer */}
        {(previewSrc || upscaledSrc) && (
          <section className="fade-up" style={{ animationDelay: "0.1s" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}>
              <span style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.06em" }}>
                {upscaledSrc ? "DRAG TO COMPARE" : "PREVIEW"}
              </span>
              {meta && (
                <span style={{ color: "var(--muted)", fontSize: 11 }}>
                  {meta.original_size[0]}×{meta.original_size[1]}
                  {" → "}
                  {meta.upscaled_size[0]}×{meta.upscaled_size[1]} px
                </span>
              )}
            </div>

            {upscaledSrc ? (
              <ComparisonSlider originalSrc={previewSrc} upscaledSrc={upscaledSrc} />
            ) : (
              <div style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                overflow: "hidden",
                background: "var(--tag)",
                textAlign: "center",
              }}>
                <img
                  src={previewSrc}
                  alt="Preview"
                  style={{ maxWidth: "100%", maxHeight: 480, objectFit: "contain", display: "block", margin: "0 auto" }}
                />
              </div>
            )}
          </section>
        )}

        {/* Empty state */}
        {!previewSrc && !upscaledSrc && (
          <div style={{
            textAlign: "center",
            color: "var(--muted)",
            fontSize: 13,
            padding: "32px 0",
          }}>
            Upload an image to get started
          </div>
        )}

        {/* Footer */}
        <footer style={{
          marginTop: "auto",
          textAlign: "center",
          color: "var(--muted)",
          fontSize: 11,
          letterSpacing: "0.06em",
          paddingTop: 20,
          borderTop: "1px solid var(--border)",
        }}>
          SRGAN-STYLE CNN · PYTORCH · FLASK
        </footer>
      </div>
    </>
  );
}