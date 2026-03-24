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



def preprocess(pil_img: Image.Image) -> torch.Tensor:
    img = pil_img.convert("RGB")

    w, h = img.size

    if max(w, h) > MAX_INPUT_DIM:
        ratio = MAX_INPUT_DIM / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

    arr = np.array(img).astype(np.float32) / 255.0
    tensor = torch.from_numpy(arr).permute(2, 0, 1)
    return tensor.unsqueeze(0).to(DEVICE)