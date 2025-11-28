from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class AttackConfig(BaseModel):
    """Configuration for a single adversarial attack job."""
    attack_type: str = "fgsm"
    epsilon: float = 0.1

class AttackResult(BaseModel):
    """Detailed result for a single image within an attack."""
    attack_type: str
    original_image_path: str
    adversarial_image_path: str
    original_prediction: str
    adversarial_prediction: str
    confidence_original: float
    confidence_adversarial: float
    attack_success: bool
    perturbation_norm: float

class PipelineRequest(BaseModel):
    """The request model for launching a multi-attack pipeline."""
    model_name: str
    attacks: List[AttackConfig]

class ScanResponse(BaseModel):
    """The detailed response/result for one individual attack job."""
    scan_id: str
    status: str
    results: Optional[List[AttackResult]] = None
    created_at: datetime
    message: str
    # Fields tied back to the attack configuration
    model_name: str
    attack_type: str
    epsilon: float