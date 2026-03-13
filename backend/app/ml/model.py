"""
model.py
--------
Carga el modelo de IA (ResNet18 con Transfer Learning) y expone
la función predict_ai_score() para puntuar imágenes de atardeceres.

El modelo distingue entre dos clases: ['normal', 'spectacular'].
El score devuelto es la probabilidad (0-100) de que el atardecer
sea espectacular según el modelo entrenado.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms
from PIL import Image
from pathlib import Path

# Ruta al archivo de pesos entrenados (mismo directorio que este script)
MODEL_PATH = Path(__file__).parent / "skypalette_model_best.pth"

# Usa GPU si está disponible, si no cae a CPU automáticamente
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Índice de la clase "spectacular" en el array de salida del modelo
# El modelo se entrenó con clases: ['normal'=0, 'spectacular'=1]
SPECTACULAR_IDX = 1


def load_model():
    """
    Construye la arquitectura ResNet18 con la cabeza personalizada
    y carga los pesos guardados durante el entrenamiento.

    La cabeza reemplaza la capa FC original de ResNet18 por:
        Dropout(0.4) → Linear(512→128) → ReLU → Dropout(0.3) → Linear(128→2)

    Esto reduce el overfitting y adapta la red a la tarea binaria
    de clasificar atardeceres.
    """
    model = models.resnet18(weights=None)
    num_features = model.fc.in_features  # 512 en ResNet18
    model.fc = nn.Sequential(
        nn.Dropout(0.4),
        nn.Linear(num_features, 128),
        nn.ReLU(),
        nn.Dropout(0.3),
        nn.Linear(128, 2)
    )
    model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
    model.to(DEVICE)
    model.eval()  # Modo evaluación: desactiva Dropout y BatchNorm de entrenamiento
    return model


# Carga el modelo una sola vez al arrancar el servidor (no en cada petición)
MODEL = load_model()
print(f"✅ Modelo cargado en {DEVICE}")

# Transformaciones que preparan la imagen para ResNet18
# Debe coincidir exactamente con las usadas durante el entrenamiento
TRANSFORMS = transforms.Compose([
    transforms.Resize((224, 224)),         # ResNet18 espera 224x224
    transforms.ToTensor(),                  # PIL → Tensor [0,1]
    transforms.Normalize(                   # Normalización ImageNet estándar
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


def predict_ai_score(image: Image.Image) -> float:
    """
    Recibe una imagen PIL y devuelve la probabilidad (0-100) de que
    el atardecer sea espectacular según el modelo entrenado.

    Pasos:
        1. Convierte a RGB y aplica las transformaciones
        2. Añade dimensión de batch (unsqueeze)
        3. Pasa por el modelo en modo inferencia (sin gradientes)
        4. Aplica softmax para obtener probabilidades
        5. Devuelve la probabilidad de la clase 'spectacular' × 100
    """
    tensor = TRANSFORMS(image.convert("RGB")).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        probs = F.softmax(MODEL(tensor), dim=1)
    return round(probs[0][SPECTACULAR_IDX].item() * 100, 1)
