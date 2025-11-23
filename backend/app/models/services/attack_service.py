import torch
import numpy as np
from art.attacks.evasion import FastGradientMethod, ProjectedGradientDescent
from art.estimators.classification import PyTorchClassifier
from app.services.model_service import ModelService
from app.models.schemas import AttackResult
import os
from PIL import Image
import torchvision.transforms as transforms
import uuid

class AttackService:
    def __init__(self):
        self.model_service = ModelService()
        self.results_dir = "results"
        os.makedirs(self.results_dir, exist_ok=True)
    
    def _get_user_results_dir(self, user_id: str):
        """Get user-specific results directory"""
        user_results_dir = os.path.join(self.results_dir, user_id)
        os.makedirs(user_results_dir, exist_ok=True)
        return user_results_dir
    
    async def run_attack(self, model_name: str, attack_type: str, epsilon: float, scan_id: str, user_id: str):
        """Run adversarial attack on the model for specific user"""
        try:
            # Load model from user's directory
            model_path = os.path.join("uploads", user_id, "models", f"{model_name}.pth")
            
            if not os.path.exists(model_path):
                raise ValueError(f"Model not found: {model_name}")
            
            model = self.model_service.load_model(model_path)
            
            # Create ART classifier
            classifier = PyTorchClassifier(
                model=model,
                loss=torch.nn.CrossEntropyLoss(),
                input_shape=(3, 224, 224),
                nb_classes=1000,
            )
            
            # Create attack
            if attack_type.lower() == "fgsm":
                attack = FastGradientMethod(estimator=classifier, eps=epsilon)
            elif attack_type.lower() == "pgd":
                attack = ProjectedGradientDescent(estimator=classifier, eps=epsilon)
            else:
                raise ValueError(f"Unsupported attack type: {attack_type}")
            
            # Get test images from user's directory
            test_images = self._get_test_images(user_id)
            
            if not test_images:
                raise ValueError("No test images found. Please upload images first.")
            
            results = []
            
            for img_path in test_images[:5]:  # Limit to 5 images for demo
                result = await self._attack_single_image(
                    img_path, attack, classifier, scan_id, user_id
                )
                results.append(result)
            
            return results
            
        except Exception as e:
            raise Exception(f"Attack failed: {str(e)}")
    
    async def _attack_single_image(self, image_path: str, attack, classifier, scan_id: str, user_id: str):
        """Attack a single image"""
        # Load and preprocess image
        original_tensor = self.model_service.preprocess_image(image_path)
        original_np = original_tensor.numpy()
        
        # Generate adversarial example
        adversarial_np = attack.generate(x=original_np)
        
        # Get predictions
        original_pred = classifier.predict(original_np)
        adversarial_pred = classifier.predict(adversarial_np)
        
        # Save adversarial image to user's results directory
        adv_image_path = self._save_adversarial_image(
            adversarial_np[0], scan_id, user_id
        )
        
        # Calculate metrics
        original_class = np.argmax(original_pred[0])
        adversarial_class = np.argmax(adversarial_pred[0])
        attack_success = original_class != adversarial_class
        
        perturbation_norm = np.linalg.norm(
            adversarial_np[0] - original_np[0]
        )
        
        return AttackResult(
            original_image_path=image_path,
            adversarial_image_path=adv_image_path,
            original_prediction=f"Class {original_class}",
            adversarial_prediction=f"Class {adversarial_class}",
            confidence_original=float(np.max(original_pred[0])),
            confidence_adversarial=float(np.max(adversarial_pred[0])),
            attack_success=attack_success,
            perturbation_norm=float(perturbation_norm)
        )
    
    def _get_test_images(self, user_id: str):
        """Get list of test images for specific user"""
        data_dir = os.path.join("uploads", user_id, "data")
        if not os.path.exists(data_dir):
            return []
        
        images = []
        for file in os.listdir(data_dir):
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                images.append(os.path.join(data_dir, file))
        
        return images
    
    def _save_adversarial_image(self, adversarial_array, scan_id, user_id):
        """Save adversarial image to user-specific directory"""
        user_results_dir = self._get_user_results_dir(user_id)
        
        # Denormalize and convert to PIL Image
        denorm_transform = transforms.Normalize(
            mean=[-0.485/0.229, -0.456/0.224, -0.406/0.225],
            std=[1/0.229, 1/0.224, 1/0.225]
        )
        
        tensor = torch.from_numpy(adversarial_array)
        denorm_tensor = denorm_transform(tensor)
        denorm_tensor = torch.clamp(denorm_tensor, 0, 1)
        
        # Convert to PIL and save
        to_pil = transforms.ToPILImage()
        image = to_pil(denorm_tensor)
        
        filename = f"adversarial_{scan_id}_{uuid.uuid4().hex[:8]}.png"
        filepath = os.path.join(user_results_dir, filename)
        image.save(filepath)
        
        return filepath