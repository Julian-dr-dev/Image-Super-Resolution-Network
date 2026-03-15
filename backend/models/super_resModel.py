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
    

class UnsampleBlock(nn.Module):
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
        

        residual = out



       


        #decoding:
        














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

    
    




    
