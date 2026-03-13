
import torch
from torchvision import transforms, datasets
from PIL import Image
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path

from models.super_resModel import SuperResolutionNet, create_model


def load_model(checkpoint_path, scale_factor=2, device='cpu'):
    """Load trained model from checkpoint"""
    model = create_model(scale_factor=scale_factor, device=device)
    
    checkpoint = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    
    print(f"Loaded model from {checkpoint_path}")
    print(f"Trained for {checkpoint['epoch']+1} epochs")
    
    return model