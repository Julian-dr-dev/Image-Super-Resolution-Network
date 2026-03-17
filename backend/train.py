
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
        img = transforms.RandomCrop(self.patch_size)(img)
 
        # Augmentation: random flips + 90° rotations
        if self.augment:
            if torch.rand(1) > 0.5:
                img = TF.hflip(img)
            if torch.rand(1) > 0.5:
                img = TF.vflip(img)
            angle = torch.randint(0, 4, (1,)).item() * 90
            img = TF.rotate(img, angle)
 
        
        lr_img = img.resize((self.lr_size, self.lr_size), Image.BICUBIC)
 
        # Convert to tensors [0, 1]
        to_tensor = transforms.ToTensor()
        hr = to_tensor(img)     
        lr = to_tensor(lr_img)   
 
        return lr, hr


    
#Loss
class PerceptualLoss(nn.Module):


    def __init__(self):
        super().__init__()
        vgg = models.vgg19(weights=models.VGG19_Weights.DEFAULT)
        self.feature_extractor = nn.Sequential(*list(vgg.features)[:18])
        for p in self.feature_extractor.parameters():
            p.requires_grad = False

    def forward(self, pred, target):
        return nn.functional.mse_loss(
            self.feature_extractor(pred),
            self.feature_extractor(target)
        )
    
def pnsr(pred, target, max_val=1.0):
    mse = torch.mean((pred - target) ** 2)
    
    if mse == 0:
        return float("inf")
    return 10 * torch.log10(torch.tensor(max_val ** 2) / mse).item()



#checkpoint helper methods:

def save_checkpoints(model, optimizer, epoch, loss, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)


    torch.save({
        "epoch":                epoch,
        "model_state_dict":     model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "loss":                 loss,
    }, path)
    print(f"  [ckpt] Saved → {path}")


def load_checkpoint(path, model, optimizer=None):
    ckpt = torch.load(path, mp_location=cfg.device)
    model.load_state_dict(ckpt["model_state_dict"])

    if optimizer:
        optimizer.load_state_dict(ckpt["optimizer_state_dict"])
    print(f"  [ckpt] Resumed from epoch {ckpt['epoch']} ({path})")
    return ckpt["epoch"]




#plotting:
def plot_curves(train_losses, val_losses, val_psnrs, out_dir):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
    ax1.plot(train_losses, label="train loss")
    ax1.plot(val_losses,   label="val loss")
    ax1.set_xlabel("Epoch"); ax1.set_ylabel("Loss")
    ax1.set_title("Loss curves"); ax1.legend()
    ax2.plot(val_psnrs, color="darkorange")
    ax2.set_xlabel("Epoch"); ax2.set_ylabel("PSNR (dB)")
    ax2.set_title("Validation PSNR")
    plt.tight_layout()
    path = os.path.join(out_dir, "training_curves.png")
    plt.savefig(path, dpi=120)
    plt.close()
    print(f"  [plot] Saved → {path}")




    #training an epoch:









    #validiating an epoch:















    # 9. MAIN TRAINING LOOP
# ─────────────────────────────────────────────────────────────────────────────
def main():
    print(f"\n{'='*52}")
    print(f"  Super-Resolution Training")
    print(f"  Scale: {cfg.scale_factor}x  |  Device: {cfg.device}")
    print(f"{'='*52}\n")
 
    # Datasets
    print("Loading datasets...")
    train_ds = SuperResDataset(cfg.train_dir, cfg.scale_factor,
                               cfg.patch_size, augment=True)
    val_ds   = SuperResDataset(cfg.val_dir,   cfg.scale_factor,
                               cfg.patch_size, augment=False)
 
    train_loader = DataLoader(train_ds, batch_size=cfg.batch_size,
                              shuffle=True,  num_workers=cfg.num_workers,
                              pin_memory=True)
    val_loader   = DataLoader(val_ds,   batch_size=cfg.batch_size,
                              shuffle=False, num_workers=cfg.num_workers,
                              pin_memory=True)
 
    # Model + optimizer + scheduler
    print("Building model...")
    model     = create_model(scale_factor=cfg.scale_factor, device=cfg.device)
    optimizer = optim.Adam(model.parameters(), lr=cfg.lr)
    scheduler = optim.lr_scheduler.StepLR(
        optimizer, step_size=cfg.lr_step, gamma=cfg.lr_gamma
    )
 
    # Loss functions
    mse_loss        = nn.MSELoss()
    perceptual_loss = None
    if cfg.perceptual_weight > 0:
        print("Loading VGG19 for perceptual loss...")
        perceptual_loss = PerceptualLoss().to(cfg.device)
 
    # Resume from checkpoint if available
    start_epoch = 0
    latest_ckpt = os.path.join(cfg.checkpoint_dir, f"latest_{cfg.scale_factor}x.pth")
    if os.path.exists(latest_ckpt):
        start_epoch = load_checkpoint(latest_ckpt, model, optimizer)
 
    # Tracking history
    train_losses, val_losses, val_psnrs = [], [], []
    best_psnr = 0.0
 
    print(f"\nStarting training from epoch {start_epoch + 1}/{cfg.epochs}\n")
 
    for epoch in range(start_epoch, cfg.epochs):
        t0 = time.time()
 
        train_loss            = train_epoch(model, train_loader, optimizer,
                                            mse_loss, perceptual_loss)
        val_loss, val_psnr_val = val_epoch(model, val_loader, mse_loss)
 
        scheduler.step()
 
        elapsed = time.time() - t0
        lr_now  = optimizer.param_groups[0]["lr"]
        print(
            f"Epoch [{epoch+1:3d}/{cfg.epochs}] "
            f"train={train_loss:.4f}  val={val_loss:.4f}  "
            f"PSNR={val_psnr_val:.2f}dB  "
            f"lr={lr_now:.2e}  t={elapsed:.1f}s"
        )
 
        train_losses.append(train_loss)
        val_losses.append(val_loss)
        val_psnrs.append(val_psnr_val)
 
        # Save best model
        if val_psnr_val > best_psnr:
            best_psnr = val_psnr_val
            save_checkpoint(
                model, optimizer, epoch, val_loss,
                os.path.join(cfg.checkpoint_dir, f"best_{cfg.scale_factor}x.pth")
            )
 
        # Periodic checkpoint
        if (epoch + 1) % cfg.save_every == 0:
            save_checkpoint(
                model, optimizer, epoch, val_loss,
                os.path.join(cfg.checkpoint_dir,
                             f"epoch_{epoch+1}_{cfg.scale_factor}x.pth")
            )
 
        # Latest checkpoint (for resuming)
        save_checkpoint(model, optimizer, epoch, val_loss, latest_ckpt)
 
    print(f"\nTraining complete. Best PSNR: {best_psnr:.2f} dB")
    plot_curves(train_losses, val_losses, val_psnrs, cfg.checkpoint_dir)
 
 
if __name__ == "__main__":
    main()




 

 
        