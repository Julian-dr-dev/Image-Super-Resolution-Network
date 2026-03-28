#----------------------------------------------


import io
import base64
import os
import torch
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
 
# Matches your actual file: backend/models/super_resModel.py
from models.super_resModel import load_model
 
app = Flask(__name__)
CORS(app)  # Allow requests from React dev server (localhost:5173)
 
# ── Config ────────────────────────────────────────────────────────────────────
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
 
# Set these env vars to point to trained .pth checkpoints, e.g.:
#   export CHECKPOINT_2X=data/model_2x.pth
#   export CHECKPOINT_4X=data/model_4x.pth
CHECKPOINT_2X = os.getenv("CHECKPOINT_2X", "")
CHECKPOINT_4X = os.getenv("CHECKPOINT_4X", "")
 
# Cap input size to avoid OOM on large images
MAX_INPUT_DIM = 1024
 
# ── Load models at startup ────────────────────────────────────────────────────
print(f"[superres] Loading models on device: {DEVICE}")
model_2x = load_model(CHECKPOINT_2X, scale_factor=2, device=DEVICE)
model_4x = load_model(CHECKPOINT_4X, scale_factor=4, device=DEVICE)
MODELS = {2: model_2x, 4: model_4x}
print("[superres] Models ready.")
 
 
# ── Image utilities ───────────────────────────────────────────────────────────


@app.route("/api/health", methods=["GET"])
def health():
    """Quick health check — confirms models are loaded and device."""
    return jsonify({
        "status": "ok",
        "device": DEVICE,
        "available_scales": list(MODELS.keys()),
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
        return jsonify({
            "error": f"Invalid scale_factor '{scale_factor}'. Must be 2 or 4."
        }), 400
 
    # Decode the incoming image
    try:
        pil_input = base64_to_pil(data["image"])
    except Exception as exc:
        return jsonify({"error": f"Could not decode image: {exc}"}), 400
 
    original_size = list(pil_input.size)  # [w, h]
 
    # Run inference
    try:
        model = MODELS[scale_factor]
        with torch.no_grad():
            tensor_in = preprocess(pil_input)
            tensor_out = model(tensor_in)
        pil_output = postprocess(tensor_out)
    except Exception as exc:
        return jsonify({"error": f"Model inference failed: {exc}"}), 500
 
    upscaled_size = list(pil_output.size)
 
    return jsonify({
        "upscaled": pil_to_base64(pil_output),
        "original_size": original_size,
        "upscaled_size": upscaled_size,
        "scale_factor": scale_factor,
    })
 
 
# ── Entry point ───────────────────────────────────────────────────────────────
 
if __name__ == "__main__":
    # Run from project root: python backend/app.py
    app.run(host="0.0.0.0", port=5000, debug=True)
 
def preprocess(pil_img: Image.Image) -> torch.Tensor:
    img = pil_img.convert("RGB")

    w, h = img.size

    if max(w, h) > MAX_INPUT_DIM:
        ratio = MAX_INPUT_DIM / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

    arr = np.array(img).astype(np.float32) / 255.0
    tensor = torch.from_numpy(arr).permute(2, 0, 1)
    return tensor.unsqueeze(0).to(DEVICE)


def postprocess(tensor: torch.Tensor) -> Image.Image:
    arr = tensor.squeeze(0).permute(1, 2, 0).cpu().numpy()
    arr = (arr * 255).clip(0, 255).astype(np.uint8)
    return Image.fromarray(arr)




def pil_to_based64(img: Image.Image, fmt: str = "PNG") -> str:
    buf = io.BytesIO()
    img.sav(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode("utf-8")

def based64_to_pil(b64_str: str) -> Image.Image:
    data = base64.b64decode(b64_str)
    return Image.open(io.BytesIO(data))

    
