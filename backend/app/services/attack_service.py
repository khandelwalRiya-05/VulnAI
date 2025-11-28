import torch
import numpy as np
from art.attacks.evasion import FastGradientMethod, ProjectedGradientDescent, CarliniL2Method,DeepFool
from art.estimators.classification import PyTorchClassifier
from app.services.model_service import ModelService
from app.models.schemas import AttackResult
import os
from PIL import Image
import torchvision.transforms as transforms
import uuid
import asyncio

class AttackService:
    def __init__(self):
        self.model_service = ModelService()
        self.results_dir = "results"
        os.makedirs(self.results_dir, exist_ok=True)
        self.ATTACKS = {
            "fgsm": (FastGradientMethod, {"eps": 0.1}),
            "pgd": (ProjectedGradientDescent, {"eps": 0.3, "eps_step": 0.01, "max_iter": 40}),
            "c_and_w": (CarliniL2Method, {"confidence": 0.0, "max_iter": 100, "batch_size": 1}),
            "deepfool": (DeepFool, {"max_iter": 50, "epsilon": 1e-6, "nb_grads": 1, "batch_size": 1}),
        }
    
    # Function to create a classifier dynamically
    def _create_classifier(self, model, nb_classes: int):
        """Creates an ART PyTorchClassifier dynamically based on model metadata."""
        # The PyTorchClassifier needs to know the correct input shape and class count.
        # We assume standard 3-channel (RGB) images, 224x224.
        return PyTorchClassifier(
            model=model,
            loss=torch.nn.CrossEntropyLoss(),
            input_shape=(3, 224, 224),
            nb_classes=nb_classes, # 👈 DYNAMICALLY set the number of classes
            clip_values=(0.0, 1.0), # Important for many attacks (normalized images are in [0, 1])
        )

    # 👈 New: Function to run a single attack for parallel execution
    async def _run_single_attack_task(self, attack_name: str, model_name: str, scan_id: str, user_id: str):
        """Task to run one specific adversarial attack."""
        print(f" Starting {attack_name.upper()} attack...")
        
        try:
            # 1. Load model and metadata
            model, metadata = self.model_service.load_model(model_name, user_id)
            nb_classes = metadata['nb_classes']

            # 2. Create ART classifier dynamically
            classifier = self._create_classifier(model, nb_classes)
            
            # 3. Create attack instance
            attack_class, params = self.ATTACKS[attack_name.lower()]
            
            attack = attack_class(classifier, **params)

            # 4. Get test images
            test_images = self._get_test_images(user_id)
            if not test_images:
                raise ValueError("No test images found. Please upload images first.")
            
            attack_results = []
            
            # Limit to 5 images for demo, but run attack per image
            for img_path in test_images[:5]:
                result = await self._attack_single_image(
                    img_path, attack, classifier, scan_id, user_id, attack_name
                )
                attack_results.append(result)
            
            print(f" {attack_name.upper()} attack completed with {len(attack_results)} results.")
            return attack_results
            
        except Exception as e:
            print(f" {attack_name.upper()} attack failed: {str(e)}")
            # Return an error result object or re-raise
            return [AttackResult(
                original_image_path="N/A",
                adversarial_image_path="N/A",
                original_prediction=f"{attack_name.upper()} Attack Failed",
                adversarial_prediction=f"Error: {str(e)}",
                attack_success=False,
                perturbation_norm=0.0,
                confidence_original=0.0, 
                confidence_adversarial=0.0
            )]


    # 👈 New: Function to orchestrate parallel attacks
    async def run_all_attacks_parallel(self, model_name: str, scan_id: str, user_id: str):
        """Runs all configured attacks in parallel."""
        
        # Create a list of attack tasks
        tasks = [
            self._run_single_attack_task(attack_name, model_name, scan_id, user_id)
            for attack_name in self.ATTACKS.keys()
        ]
        
        # Run tasks in parallel
        # Use a list to flatten results from all attacks
        all_results = []
        
        # asyncio.gather runs all tasks concurrently.
        # It waits for all attacks to complete before proceeding.
        results_from_all_attacks = await asyncio.gather(*tasks, return_exceptions=True) 

        for result_list in results_from_all_attacks:
            if isinstance(result_list, list):
                all_results.extend(result_list)
            else:
                # Handle unexpected exceptions from a task if return_exceptions=True
                print(f"An attack task returned an exception: {result_list}")
                # You might log this or add a specific error result to all_results
                
        return all_results

    # 👈 Modified: Add attack_name to the result
    async def _attack_single_image(self, image_path: str, attack, classifier, scan_id: str, user_id: str, attack_name: str): 
        """Attack a single image and return result."""
        
        original_tensor = self.model_service.preprocess_image(image_path)
        original_np = original_tensor.numpy()
        
        # Generate adversarial example
        adversarial_np = attack.generate(x=original_np)
        
        # Get predictions
        original_pred = classifier.predict(original_np)
        adversarial_pred = classifier.predict(adversarial_np)
        
        # Save adversarial image to user's results directory
        adv_image_path = self._save_adversarial_image(
            adversarial_np[0], scan_id, user_id, attack_name # Pass attack_name for unique path
        )
        
        # Calculate metrics
        original_class = np.argmax(original_pred[0])
        adversarial_class = np.argmax(adversarial_pred[0])
        attack_success = original_class != adversarial_class
        
        # L2 norm of the perturbation (difference between original and adversarial)
        perturbation = adversarial_np[0] - original_np[0]
        perturbation_norm = np.linalg.norm(perturbation)
        
        return AttackResult(
            attack_type=attack_name, # 👈 Added attack_type to schema/result
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
    
    def _get_user_results_dir(self, user_id: str): # 👈 ADD THIS METHOD
        """Get user-specific results directory"""
        # Ensure the user-specific directory is created inside the base 'results' folder
        user_results_dir = os.path.join(self.results_dir, user_id)
        os.makedirs(user_results_dir, exist_ok=True)
        return user_results_dir
    
    def _save_adversarial_image(self, adversarial_array, scan_id, user_id, attack_name): # Added attack_name
        """Save adversarial image to user-specific directory"""
        user_results_dir = self._get_user_results_dir(user_id)
        
        # Denormalization is crucial for viewing the image correctly.
        # This uses the inverse of the standard ImageNet normalization.
        denorm_transform = transforms.Compose([
            transforms.Normalize(mean=[0.0, 0.0, 0.0], std=[1/0.229, 1/0.224, 1/0.225]),
            transforms.Normalize(mean=[-0.485, -0.456, -0.406], std=[1.0, 1.0, 1.0]),
        ])
        
        tensor = torch.from_numpy(adversarial_array)
        # ART's output is often normalized. Clamp to [0, 1] after denormalization.
        denorm_tensor = denorm_transform(tensor) 
        denorm_tensor = torch.clamp(denorm_tensor, 0, 1)
        
        # Convert to PIL and save
        to_pil = transforms.ToPILImage()
        image = to_pil(denorm_tensor)
        
        # Include attack name in filename for organization
        filename = f"{attack_name}_{scan_id}_{uuid.uuid4().hex[:8]}.png"
        filepath = os.path.join(user_results_dir, filename)
        image.save(filepath)
        
        # Return the path for the API response
        return f"/results/{user_id}/{filename}"