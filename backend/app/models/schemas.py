from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class AttackResult(BaseModel):
    original_image_path: str
    adversarial_image_path: str
    original_prediction: str
    adversarial_prediction: str
    confidence_original: float
    confidence_adversarial: float
    attack_success: bool
    perturbation_norm: float

class ScanRequest(BaseModel):
    model_name: str
    attack_type: str = "fgsm"
    epsilon: float = 0.1

class ScanResponse(BaseModel):
    scan_id: str
    status: str
    results: Optional[List[AttackResult]] = None
    created_at: datetime
    message: str