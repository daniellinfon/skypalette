import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms
from PIL import Image
from pathlib import Path

MODEL_PATH      = Path(__file__).parent / "skypalette_model_best.pth"
DEVICE          = torch.device("cuda" if torch.cuda.is_available() else "cpu")
SPECTACULAR_IDX = 1  # ['normal', 'spectacular'] → spectacular = índice 1

def load_model():
    model = models.resnet18(weights=None)
    num_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.4),
        nn.Linear(num_features, 128),
        nn.ReLU(),
        nn.Dropout(0.3),
        nn.Linear(128, 2)
    )
    model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
    model.to(DEVICE)
    model.eval()
    return model

MODEL = load_model()
print(f"✅ Modelo cargado en {DEVICE}")

TRANSFORMS = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

def predict_ai_score(image: Image.Image) -> float:
    tensor = TRANSFORMS(image.convert("RGB")).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        probs = F.softmax(MODEL(tensor), dim=1)
    return round(probs[0][SPECTACULAR_IDX].item() * 100, 1)