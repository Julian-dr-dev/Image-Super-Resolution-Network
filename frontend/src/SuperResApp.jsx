/**
 * SuperResApp.jsx — frontend/src/SuperResApp.jsx
 * Ultra-minimal, refined aesthetic
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Zap, Download, AlertCircle, Loader } from "lucide-react";

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
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:      #f5f5f3;
    --surface: #ffffff;
    --border:  #e0e0dc;
    --accent:  #111111;
    --muted:   #aaaaaa;
    --subtle:  #f0f0ee;
    --sans:    'Inter', sans-serif;
    --radius:  6px;
  }

  :root.dark {
    --bg:      #141414;
    --surface: #1c1c1c;
    --border:  #2a2a2a;
    --accent:  #efefef;
    --muted:   #555555;
    --subtle:  #222222;
  }

  html, body, #root {
    height: 100%;
    background: var(--bg);
    color: var(--accent);
    font-family: var(--sans);
    font-size: 13px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .fade { animation: fadeIn 0.3s ease both; }

  .divider-handle {
    position: absolute;
    top: 0; bottom: 0;
    width: 1px;
    background: #fff;
    cursor: col-resize;
    z-index: 10;
    opacity: 0.7;
  }

  .divider-handle::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #fff;
    border: 1px solid rgba(0,0,0,0.1);
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
        border: `1px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
        borderRadius: "var(--radius)",
        padding: "40px 20px",
        textAlign: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        background: dragging ? "var(--subtle)" : "transparent",
        transition: "all 0.15s",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <Upload
        size={18}
        color="var(--muted)"
        style={{ marginBottom: 10, display: "block", margin: "0 auto 10px" }}
      />
      <div style={{ color: "var(--muted)", fontSize: 12 }}>
        Drop image or{" "}
        <span style={{
          color: "var(--accent)",
          borderBottom: "1px solid var(--accent)",
          paddingBottom: 1,
          cursor: "pointer",
        }}>
          browse
        </span>
      </div>
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
    setPos(Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100)));
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
        borderRadius: "var(--radius)",
        overflow: "hidden",
        userSelect: "none",
        lineHeight: 0,
        background: "#000",
        maxHeight: 500,
      }}
    >
      <img
        src={upscaledSrc}
        alt="Upscaled"
        style={{ width: "100%", display: "block", maxHeight: 500, objectFit: "contain" }}
      />
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img
          src={originalSrc}
          alt="Original"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
      <div style={{
        position: "absolute", bottom: 10, left: 12,
        color: "rgba(255,255,255,0.5)",
        fontSize: 9, letterSpacing: "0.1em",
      }}>
        BEFORE
      </div>
      <div style={{
        position: "absolute", bottom: 10, right: 12,
        color: "rgba(255,255,255,0.5)",
        fontSize: 9, letterSpacing: "0.1em",
      }}>
        AFTER
      </div>
      <div
        className="divider-handle"
        style={{ left: `${pos}%` }}
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
  const [dark, setDark]               = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const handleFile = useCallback((file) => {
    setImageFile(file);
    setUpscaledSrc(null);
    setError(null);
    setMeta(null);
    setPreviewSrc(URL.createObjectURL(file));
  }, []);

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

  const btn = (onClick, children, primary = false, disabled = false) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 14px",
        border: `1px solid ${primary ? "var(--accent)" : "var(--border)"}`,
        borderRadius: "var(--radius)",
        background: primary ? "var(--accent)" : "transparent",
        color: primary ? "var(--bg)" : "var(--accent)",
        fontSize: 12,
        fontFamily: "var(--sans)",
        fontWeight: primary ? 500 : 400,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1,
        transition: "opacity 0.15s",
      }}
    >
      {children}
    </button>
  );

  return (
    <>
      <GlobalStyle />
      <div style={{
        minHeight: "100vh",
        maxWidth: 720,
        margin: "0 auto",
        padding: "60px 24px 80px",
        display: "flex",
        flexDirection: "column",
        gap: 28,
      }}>

        {/* Header */}
        <div className="fade" style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          paddingBottom: 20,
          borderBottom: "1px solid var(--border)",
        }}>
          <div>
            <div style={{
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--accent)",
              marginBottom: 2,
            }}>
              Super Resolution
            </div>
            <div style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.03em" }}>
              AI image upscaling · 2× or 4×
            </div>
          </div>
          <button
            onClick={() => setDark(!dark)}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              fontSize: 11,
              cursor: "pointer",
              letterSpacing: "0.04em",
              padding: "4px 0",
            }}
          >
            {dark ? "light" : "dark"}
          </button>
        </div>

        {/* Upload area */}
        <div className="fade" style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}>
          <DropZone onFile={handleFile} disabled={loading} />

          {imageFile && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 10px",
              background: "var(--subtle)",
              borderRadius: "var(--radius)",
              fontSize: 12,
            }}>
              <span style={{
                color: "var(--accent)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "70%",
              }}>
                {imageFile.name}
              </span>
              <span style={{ color: "var(--muted)" }}>{fmtBytes(imageFile.size)}</span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{
              display: "flex",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
            }}>
              {[2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setScaleFactor(s)}
                  disabled={loading}
                  style={{
                    padding: "5px 14px",
                    border: "none",
                    borderRight: s === 2 ? "1px solid var(--border)" : "none",
                    background: scaleFactor === s ? "var(--accent)" : "transparent",
                    color: scaleFactor === s ? "var(--bg)" : "var(--muted)",
                    fontSize: 12,
                    fontFamily: "var(--sans)",
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {s}×
                </button>
              ))}
            </div>

            <div style={{ flex: 1 }} />

            {btn(handleUpscale,
              loading
                ? <><Loader size={12} style={{ animation: "spin 1s linear infinite" }} /> Processing</>
                : <><Zap size={12} /> Upscale {scaleFactor}×</>,
              true,
              !imageFile || loading
            )}

            {upscaledSrc && btn(handleDownload, <><Download size={12} /> Save</>)}
          </div>

          {error && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 10px",
              background: "var(--subtle)",
              borderRadius: "var(--radius)",
              color: "#d05050",
              fontSize: 12,
            }}>
              <AlertCircle size={13} />
              {error}
            </div>
          )}
        </div>

        {/* Image viewer */}
        {(previewSrc || upscaledSrc) && (
          <div className="fade">
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}>
              <span style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.06em" }}>
                {upscaledSrc ? "DRAG TO COMPARE" : "PREVIEW"}
              </span>
              {meta && (
                <span style={{ color: "var(--muted)", fontSize: 10 }}>
                  {meta.original_size[0]}×{meta.original_size[1]} → {meta.upscaled_size[0]}×{meta.upscaled_size[1]}
                </span>
              )}
            </div>

            {upscaledSrc ? (
              <ComparisonSlider originalSrc={previewSrc} upscaledSrc={upscaledSrc} />
            ) : (
              <div style={{
                borderRadius: "var(--radius)",
                overflow: "hidden",
                background: "#000",
                textAlign: "center",
              }}>
                <img
                  src={previewSrc}
                  alt="Preview"
                  style={{ maxWidth: "100%", maxHeight: 460, objectFit: "contain", display: "block", margin: "0 auto" }}
                />
              </div>
            )}
          </div>
        )}

        {!previewSrc && !upscaledSrc && (
          <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, padding: "20px 0" }}>
            Upload an image to begin
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: "auto",
          paddingTop: 20,
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          color: "var(--muted)",
          fontSize: 10,
          letterSpacing: "0.05em",
        }}>
          <span>SUPER RESOLUTION</span>
          <span>EDSR · FLASK · REACT</span>
        </div>

      </div>
    </>
  );
}