import os
import torch
import torchvision.transforms as transforms
from PIL import Image
from fastapi import UploadFile
import uuid
import json # New import
from datetime import datetime

class ModelService:
    def __init__(self):
        self.upload_dir = "uploads"
    
    def _get_user_directories(self, user_id: str):
        """Get user-specific directories"""
        user_dir = os.path.join(self.upload_dir, user_id)
        model_dir = os.path.join(user_dir, "models")
        data_dir = os.path.join(user_dir, "data")
        
        # Create directories if they don't exist
        os.makedirs(model_dir, exist_ok=True)
        os.makedirs(data_dir, exist_ok=True)
        
        return model_dir, data_dir
    
    async def save_model(self, file: UploadFile, model_name: str, nb_classes: int, user_id: str) -> str: # Added nb_classes
        """Save uploaded model file and metadata for specific user"""
        model_dir, _ = self._get_user_directories(user_id)
        
        model_name_clean = model_name.strip().replace(" ", "_")
        file_extension = file.filename.split('.')[-1]
        
        model_filename = f"{model_name_clean}.{file_extension}"
        model_path = os.path.join(model_dir, model_filename)
        
        # 1. Save model file
        with open(model_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
            
        # 2. Save metadata (REQUIRED for loading the model correctly)
        metadata_path = os.path.join(model_dir, f"{model_name_clean}.json")
        metadata = {
            "model_name": model_name_clean,
            "nb_classes": nb_classes,
            "filename": model_filename,
            "upload_time": str(datetime.now())
        }
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)

        return model_path

    async def save_test_image(self, file: UploadFile, user_id: str) -> str:
        """Save uploaded test image for specific user"""
        _, data_dir = self._get_user_directories(user_id)
        
        file_extension = file.filename.split('.')[-1]
        image_filename = f"test_{uuid.uuid4().hex[:8]}.{file_extension}"
        image_path = os.path.join(data_dir, image_filename)
        
        with open(image_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        return image_path
    
    def get_user_images(self, user_id: str) -> list:
        """List all test images for a specific user"""
        _, data_dir = self._get_user_directories(user_id)
        
        images = []
        if os.path.exists(data_dir):
            for file in os.listdir(data_dir):
                if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                    images.append({
                        "filename": file,
                        "path": os.path.join(data_dir, file)
                    })
        
        return images

    def get_model_metadata(self, model_name: str, user_id: str) -> dict: # New helper function
        """Retrieve model metadata"""
        model_dir, _ = self._get_user_directories(user_id)
        model_name_clean = model_name.strip().replace(" ", "_")
        metadata_path = os.path.join(model_dir, f"{model_name_clean}.json")

        if not os.path.exists(metadata_path):
            raise FileNotFoundError(f"Metadata not found for model: {model_name}")

        with open(metadata_path, 'r') as f:
            return json.load(f)

    def load_model(self, model_name: str, user_id: str): # Modified to take name and user_id
        """Load PyTorch model"""

        try:
            model_dir, _ = self._get_user_directories(user_id)
            metadata = self.get_model_metadata(model_name, user_id)
            model_path = os.path.join(model_dir, metadata['filename'])

            model = torch.load(model_path, map_location='cpu')
            model.eval()
            return model, metadata
        except Exception as e:
            raise Exception(f"Error loading model: {str(e)}")
            
    # ... (rest of ModelService is the same)
    def preprocess_image(self, image_path: str):
        """Preprocess image for model input"""
        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                               std=[0.229, 0.224, 0.225])
        ])
        
        image = Image.open(image_path).convert('RGB')
        return transform(image).unsqueeze(0)