"""
Super-Resolution Flask Backend
File: backend/app.py
Uses super-image pretrained models — no training required.

Endpoints:
  POST /api/upscale  — accepts base64 image + scale_factor, returns upscaled image
  GET  /api/health   — health check
"""

import io
import base64
import torch
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
from super_image import EdsrModel, ImageLoader

app = Flask(__name__)
CORS(app)

# ── Config ────────────────────────────────────────────────────────────────────
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MAX_INPUT_DIM = 1024

# ── Load Models ───────────────────────────────────────────────────────────────
print(f"[superres] Loading super-image models on {DEVICE}...")

model_2x = EdsrModel.from_pretrained("eugenesiow/edsr-base", scale=2).to(DEVICE)
model_4x = EdsrModel.from_pretrained("eugenesiow/edsr-base", scale=4).to(DEVICE)
model_2x.eval()
model_4x.eval()

MODELS = {2: model_2x, 4: model_4x}
print("[superres] Models ready.")


# ── Image utilities ───────────────────────────────────────────────────────────

def pil_to_base64(img: Image.Image, fmt: str = "PNG") -> str:
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def base64_to_pil(b64_str: str) -> Image.Image:
    data = base64.b64decode(b64_str)
    return Image.open(io.BytesIO(data))


def resize_if_too_large(img: Image.Image) -> Image.Image:
    w, h = img.size
    if max(w, h) > MAX_INPUT_DIM:
        ratio = MAX_INPUT_DIM / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    return img


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "device": DEVICE,
        "available_scales": list(MODELS.keys()),
        "model": "EDSR (super-image)",
    })


@app.route("/api/upscale", methods=["POST"])
def upscale():
    data = request.get_json(force=True, silent=True)

    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400
    if "image" not in data:
        return jsonify({"error": "Missing required field: 'image'"}), 400

    scale_factor = int(data.get("scale_factor", 2))
    if scale_factor not in MODELS:
        return jsonify({"error": f"scale_factor must be 2 or 4, got {scale_factor}"}), 400

    try:
        pil_input = base64_to_pil(data["image"]).convert("RGB")
    except Exception as exc:
        return jsonify({"error": f"Could not decode image: {exc}"}), 400

    pil_input = resize_if_too_large(pil_input)
    original_size = list(pil_input.size)

    try:
        model = MODELS[scale_factor]
        inputs = ImageLoader.load_image(pil_input)
        inputs = inputs.to(DEVICE)

        with torch.no_grad():
            preds = model(inputs)

        pil_output = ImageLoader.save_image(preds, None)

    except Exception as exc:
        return jsonify({"error": f"Inference failed: {exc}"}), 500

    upscaled_size = list(pil_output.size)

    return jsonify({
        "upscaled": pil_to_base64(pil_output),
        "original_size": original_size,
        "upscaled_size": upscaled_size,
        "scale_factor": scale_factor,
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)