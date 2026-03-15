
#model
import torch 
import torch.nn as nn
import torch.nn.functional as F

class ResidualBlock(nn.Module):
    def __init__(self, channels):
        super(ResidualBlock, self).__init__()
        self.conv1 = nn.Conv2d(channels, channels, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(channels)
        self.prelu = nn.PReLU()
        self.conv2 = nn.Conv2d(channels, channels, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(channels)

    def forward(self, x):
        residual = x
        out = self.conv1(x)
        out = self.bn1(out)
        out = self.prelu(out)
        out = self.conv2(out)
        out = self.bn2(out)
        out = out + residual
        return out
    

class UpsampleBlock(nn.Module):
    def __init__(self, in_channels, scale_factor):
        super(UpsampleBlock, self).__init__()

        self.conv = nn.Conv2d(in_channels, in_channels * (scale_factor ** 2), kernel_size=3, padding=1)
        self.pixel_shuffle = nn.PixelShuffle(scale_factor)
        self.prelu = nn.PReLU()

        def forward(self, x):
            x = self.conv(x)
            x = self.pixel_shuffle(x)
            x = self.prelu(x)
            return x
        

class superResNet(nn.Module):

    #Super-Resolution CNN

    def __init__(self, scale_factor=2, num_channels=3, num_residual_blocks=16, base_channels=64):
        super(superResNet, self).__init__()

        self.scale_factor = scale_factor

        self.conv_input = nn.Conv2d(num_channels, base_channels, kernel_size=9, padding=4)
        self.prelu_input = nn.PReLU()

        self.residual_blocks = nn.Sequential(
            *[ResidualBlock(base_channels) for _ in range(num_residual_blocks)]
        )

        self.conv_mid = nn.Conv2d(base_channels, base_channels, kernel_size=3, padding=1)
        self.bn_mid = nn.BatchNorm2d(base_channels)

        num_upsample_blocks = int(torch.log2(torch.tensor(scale_factor)).item())
        self.upsample_blocks = nn.Sequential(
            *[UnsampleBlock(base_channels, 2) for _ in range(num_upsample_blocks)]
        )


        self.conv_output = nn.Conv2d(base_channels, num_channels, kernel_size=9, padding=4)


    def forward(self, x):

        input_bicubic = F.interpolate(x, scale_factor=self.scale_factor, mode="bicubic", align_corners=False)


        #encode:
        out = self.prelu_input(self.conv_input(x))
        residual = out


        out = self.residual_blocks(out)


        out = self.bn_mid(self.conv_mid(out))
        out = out + residual 

        
        #decoding:
        out = self.upsample_blocks(out)


        out = self.conv_output(out)

        out = out + input_bicubic
        return torch.clamp(out, 0, 1)
    

def load_model(checkpoint_path, scale_factor=2, device="cpu"):

    model = SuperResNet(scale_factor=scale_factor)


    if checkpoint_path:
        checkpoint = torch.load(checkpoint_path, map_location=device)
        model.load_state_dict(checkpoint["model_state_dict"])
        print(f"[superres] ✓ Loaded checkpoint: {checkpoint_path}")
    else:
        print(f"[superres] ⚠ No checkpoint for {scale_factor}× — using untrained model")
 
    model = model.to(device)
    model.eval()
    return model






def create_model(scale_factor=2, device="cpu"):
    """
    Create a fresh model with Kaiming weight initialisation.
    Used at the start of training.
    """
    model = SuperResNet(scale_factor=scale_factor)
 
    def init_weights(m):
        if isinstance(m, nn.Conv2d):
            nn.init.kaiming_normal_(m.weight, mode="fan_out", nonlinearity="relu")
            if m.bias is not None:
                nn.init.constant_(m.bias, 0)
        elif isinstance(m, nn.BatchNorm2d):
            nn.init.constant_(m.weight, 1)
            nn.init.constant_(m.bias, 0)
 
    model.apply(init_weights)
    model = model.to(device)
    return model



if __name__ == "__main__":
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")
 
    model = create_model(scale_factor=2, device=device)
 
    total_params     = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"\nTotal parameters:     {total_params:,}")
    print(f"Trainable parameters: {trainable_params:,}")
 
    # Simulate a batch of 4 low-res 32×32 images
    low_res = torch.randn(4, 3, 32, 32).to(device)
    print(f"\nInput shape:  {low_res.shape}")
 
    with torch.no_grad():
        high_res = model(low_res)
 
    print(f"Output shape: {high_res.shape}")   # expect (4, 3, 64, 64) for 2×
    print(f"\nModel is ready for training!")
 


        














#----------------------------main COOL runnings:

if __name__ == "__main__":
    # Test the model
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"Using device: {device}")
    
    # Create model
    model = create_model(scale_factor=2, device=device)
    
    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"\nTotal parameters: {total_params:,}")
    print(f"Trainable parameters: {trainable_params:,}")
    
    # Test forward pass with CIFAR-10 sized input (32x32)
    batch_size = 4
    low_res = torch.randn(batch_size, 3, 32, 32).to(device)
    
    print(f"\nInput shape: {low_res.shape}")
    
    with torch.no_grad():
        high_res = model(low_res)
    
    print(f"Output shape: {high_res.shape}")
    print(f"\nModel is ready for training!")

    
    




    
