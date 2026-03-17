
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



class SuperResDataset(Dataset):


    EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}

    def __init__(self, image_dir, scale_factor, patch_size, augment=True):
        self.scale_factor = scale_factor
        self.patch_size = patch_size
        self.augment = augment
        self.lr_size = patch_size 


        self.paths = [
            os.path.join(image_dir, f)
            for f in sorted(os.listdr(image_dir))
            if os.path.splitext(f)[1].lower() in self.EXTENSIONS


        ]
        if not self.paths:
            raise FileNotFoundError(f"No images found in {image_dir}")
        print(f"  Found {len(self.paths)} images in {image_dir}")




    def __len__(self):
        return len(self.paths)
 
    def __getitem__(self, idx):
        img = Image.open(self.paths[idx]).convert("RGB")
 
        