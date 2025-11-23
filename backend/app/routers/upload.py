from fastapi import APIRouter, File, UploadFile, HTTPException, Form, Depends
from fastapi.responses import JSONResponse
from app.services.model_service import ModelService
from app.services.attack_service import AttackService
from app.services.auth import get_current_user
from app.models.schemas import ScanResponse
import uuid
from datetime import datetime
import os
import json

router = APIRouter()

# Directory to store scan results persistently
SCANS_DIR = "scans"
os.makedirs(SCANS_DIR, exist_ok=True)

def get_user_scans_file(user_id: str) -> str:
    """Get the path to user's scans file"""
    user_scans_dir = os.path.join(SCANS_DIR, user_id)
    os.makedirs(user_scans_dir, exist_ok=True)
    return os.path.join(user_scans_dir, "scans.json")

def save_scan_to_disk(user_id: str, scan_id: str, scan_data: dict):
    """Save scan result to disk"""
    scans_file = get_user_scans_file(user_id)
    
    # Load existing scans
    scans = {}
    if os.path.exists(scans_file):
        with open(scans_file, 'r') as f:
            scans = json.load(f)
    
    # Add new scan
    scans[scan_id] = scan_data
    
    # Save back to disk
    with open(scans_file, 'w') as f:
        json.dump(scans, f, indent=2)

def load_user_scans(user_id: str) -> dict:
    """Load all scans for a user from disk"""
    scans_file = get_user_scans_file(user_id)
    
    if not os.path.exists(scans_file):
        return {}
    
    with open(scans_file, 'r') as f:
        return json.load(f)

def get_scan_from_disk(user_id: str, scan_id: str):
    """Get a specific scan from disk"""
    scans = load_user_scans(user_id)
    return scans.get(scan_id)

@router.post("/upload-model")
async def upload_model(
    file: UploadFile = File(...),
    model_name: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload model - authenticated endpoint"""
    try:
        # Validate file type
        if not file.filename.endswith(('.pth', '.pt')):
            raise HTTPException(400, "Only PyTorch model files (.pth, .pt) are supported")
        
        # Save uploaded model to user's directory
        model_service = ModelService()
        model_path = await model_service.save_model(file, model_name, current_user["user_id"])
        
        return JSONResponse({
            "message": "Model uploaded successfully",
            "model_path": model_path,
            "model_name": model_name,
            "user_id": current_user["user_id"]
        })
    
    except Exception as e:
        raise HTTPException(500, f"Error uploading model: {str(e)}")

@router.post("/upload-data")
async def upload_test_data(
    files: list[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload test images - authenticated endpoint"""
    try:
        # Save test images to user's directory
        model_service = ModelService()
        saved_files = []
        
        for file in files:
            if not file.content_type.startswith('image/'):
                continue
            file_path = await model_service.save_test_image(file, current_user["user_id"])
            saved_files.append(file_path)
        
        return JSONResponse({
            "message": f"Uploaded {len(saved_files)} images",
            "files": saved_files,
            "user_id": current_user["user_id"]
        })
    
    except Exception as e:
        raise HTTPException(500, f"Error uploading data: {str(e)}")

@router.get("/models")
async def get_user_models(current_user: dict = Depends(get_current_user)):
    """Get all models for authenticated user"""
    try:
        model_service = ModelService()
        models = model_service.get_user_models(current_user["user_id"])
        
        return JSONResponse({
            "models": models,
            "count": len(models)
        })
    
    except Exception as e:
        raise HTTPException(500, f"Error retrieving models: {str(e)}")

@router.get("/images")
async def get_user_images(current_user: dict = Depends(get_current_user)):
    """Get all test images for authenticated user"""
    try:
        model_service = ModelService()
        images = model_service.get_user_images(current_user["user_id"])
        
        return JSONResponse({
            "images": images,
            "count": len(images)
        })
    
    except Exception as e:
        raise HTTPException(500, f"Error retrieving images: {str(e)}")

@router.post("/scan", response_model=ScanResponse)
async def run_vulnerability_scan(
    model_name: str = Form(...),
    attack_type: str = Form("fgsm"),
    epsilon: float = Form(0.1),
    current_user: dict = Depends(get_current_user)
):
    """Run vulnerability scan - authenticated endpoint"""
    try:
        scan_id = str(uuid.uuid4())
        user_id = current_user["user_id"]
        
        print(f"\n Starting scan for user: {user_id}")
        
        # Initialize services
        attack_service = AttackService()
        
        # Run the attack with user context
        results = await attack_service.run_attack(
            model_name=model_name,
            attack_type=attack_type,
            epsilon=epsilon,
            scan_id=scan_id,
            user_id=user_id
        )
        
        response = ScanResponse(
            scan_id=scan_id,
            status="completed",
            results=results,
            created_at=datetime.now(),
            message="Vulnerability scan completed successfully"
        )
        
        # Convert to JSON-serializable format
        scan_data = {
            "scan_id": response.scan_id,
            "status": response.status,
            "results": [result.dict() for result in response.results],
            "created_at": response.created_at.isoformat(),
            "message": response.message,
            "model_name": model_name,
            "attack_type": attack_type,
            "epsilon": epsilon
        }
        
        # Save to disk (persistent storage)
        save_scan_to_disk(user_id, scan_id, scan_data)
        print(f" Scan saved to disk for user: {user_id}")
        
        return response
    
    except Exception as e:
        print(f" Scan failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Error running scan: {str(e)}")

@router.get("/scan/{scan_id}")
async def get_scan_results(
    scan_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get scan results - authenticated endpoint with user isolation"""
    try:
        user_id = current_user["user_id"]
        
        print(f" Fetching scan {scan_id} for user: {user_id}")
        
        # Load from disk
        scan_data = get_scan_from_disk(user_id, scan_id)
        
        if not scan_data:
            raise HTTPException(404, f"Scan results not found for ID: {scan_id}")
        
        print(f" Scan data loaded from disk")
        return JSONResponse(scan_data)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f" Error retrieving results: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Error retrieving results: {str(e)}")

@router.get("/scans")
async def get_user_scans(current_user: dict = Depends(get_current_user)):
    """Get all scans for authenticated user"""
    try:
        user_id = current_user["user_id"]
        
        print(f" Fetching all scans for user: {user_id}")
        
        # Load from disk
        scans = load_user_scans(user_id)
        
        if not scans:
            print(f"No scans found for user: {user_id}")
            return JSONResponse({"scans": [], "count": 0})
        
        # Format response
        scan_list = []
        for scan_id, scan_data in scans.items():
            scan_list.append({
                "scan_id": scan_id,
                "status": scan_data.get("status", "completed"),
                "created_at": scan_data.get("created_at"),
                "results_count": len(scan_data.get("results", [])),
                "model_name": scan_data.get("model_name"),
                "attack_type": scan_data.get("attack_type")
            })
        
        # Sort by creation date (newest first)
        scan_list.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        print(f" Found {len(scan_list)} scans for user: {user_id}")
        
        return JSONResponse({
            "scans": scan_list,
            "count": len(scan_list)
        })
    
    except Exception as e:
        print(f" Error retrieving scans: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Error retrieving scans: {str(e)}")