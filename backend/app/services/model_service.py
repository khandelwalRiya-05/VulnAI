import os
import torch
import torchvision.transforms as transforms
from PIL import Image
from fastapi import UploadFile
import uuid

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
    
    async def save_model(self, file: UploadFile, model_name: str, user_id: str) -> str:
        """Save uploaded model file for specific user"""
        model_dir, _ = self._get_user_directories(user_id)
        
        # Clean the model name
        model_name_clean = model_name.strip().replace(" ", "_")
        file_extension = file.filename.split('.')[-1]
        
        # Save with exact name for easier retrieval
        model_filename = f"{model_name_clean}.{file_extension}"
        model_path = os.path.join(model_dir, model_filename)
        
        with open(model_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
    
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
    
    def get_user_models(self, user_id: str) -> list:
        """List all models for a specific user"""
        model_dir, _ = self._get_user_directories(user_id)
        
        models = []
        if os.path.exists(model_dir):
            for file in os.listdir(model_dir):
                if file.endswith(('.pth', '.pt')):
                    models.append({
                        "name": file.rsplit('.', 1)[0],
                        "filename": file,
                        "path": os.path.join(model_dir, file)
                    })
        
        return models
    
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
    
    def load_model(self, model_path: str):
        """Load PyTorch model"""
        try:
            model = torch.load(model_path, map_location='cpu')
            model.eval()
            return model
        except Exception as e:
            raise Exception(f"Error loading model: {str(e)}")
    
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