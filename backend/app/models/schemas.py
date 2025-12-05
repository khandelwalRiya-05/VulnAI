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

class LLMSecurityResult(BaseModel):
    """Individual LLM security test result"""
    test_type: str  # prompt_injection, jailbreak, pii_leakage, bias_toxicity, harmful_content
    test_name: str
    test_input: str
    vulnerability_detected: bool
    severity: str  # low, medium, high, critical
    details: str
    score: float

class LLMScanResponse(BaseModel):
    """Response for LLM security scan initiation"""
    scan_id: str
    message: str
    security_score: float
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    vulnerabilities_found: int
    total_tests: int

class LLMScanDetail(BaseModel):
    """Detailed LLM scan results"""
    scan_id: str
    model_name: str
    user_id: str
    created_at: str
    results: List[LLMSecurityResult]
    total_tests: int
    vulnerabilities_found: int
    security_score: float
    risk_level: str
    test_categories: dict[str, int]

class ScanModeRequest(BaseModel):
    """Request for initiating a scan (either adversarial or LLM)"""
    model_name: str
    scan_mode: str  # "adversarial" or "llm"
    nb_classes: Optional[int] = None  # Required for adversarial scans