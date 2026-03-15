
#training script
import os
import time
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from torchvision.transforms import functional as TF
from PIL import Image
from tqdm import tqdm
import matplotlib
matplotlib.use("Agg")           # headless — no display needed
import matplotlib.pyplot as plt
 
from models.super_resModel import create_model
 

class Config:
    # Paths
    train_dir      = "data/train"
    val_dir        = "data/val"
    checkpoint_dir = "data/checkpoints"

    # Model
    scale_factor         = 2
    num_residual_blocks  = 16

    # Training
    epochs     = 100
    batch_size = 16
    lr         = 1e-4
    lr_step    = 30       # halve LR every N epochs
    lr_gamma   = 0.5

    # Loss weights
    mse_weight        = 1.0
    perceptual_weight = 0.006   # set to 0 to disable VGG perceptual loss

    # Misc
    num_workers = 2
    save_every  = 10            # save checkpoint every N epochs
    patch_size  = 96            # high-res patch size cropped during training
    device      = "cuda" if torch.cuda.is_available() else "cpu"

cfg = Config()
