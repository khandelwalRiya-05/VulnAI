from fastapi import APIRouter, File, UploadFile, HTTPException, Form, Depends
from fastapi.responses import JSONResponse, PlainTextResponse
from app.services.model_service import ModelService
from app.services.attack_service import AttackService
from app.services.reporter_service import ReporterService
from app.services.auth import get_current_user
from app.services.llm_security_service import LLMSecurityService
from app.models.schemas import LLMSecurityResult, LLMScanResponse
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
    nb_classes: int = Form(1000),
    current_user: dict = Depends(get_current_user)
):
    """Upload model - authenticated endpoint"""
    try:
        # Validate file type
        if not file.filename.endswith(('.pth', '.pt')):
            raise HTTPException(400, "Only PyTorch model files (.pth, .pt) are supported")
        
        # Save uploaded model to user's directory
        model_service = ModelService()
        model_path = await model_service.save_model(file, model_name, nb_classes, current_user["user_id"])
        
        return JSONResponse({
            "message": "Model uploaded successfully",
            "model_path": model_path,
            "model_name": model_name,
            "nb_classes": nb_classes,
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

@router.get("/report/{scan_id}")
async def get_full_security_report(
    scan_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves the full generated Markdown security report for a completed scan.
    """
    try:
        user_id = current_user["user_id"]
        
        # Load scan data from disk using your existing function
        scan_data = get_scan_from_disk(user_id, scan_id)
        
        if not scan_data:
            raise HTTPException(404, f"Scan results not found for ID: {scan_id}")
            
        # Check if the report content exists in the stored data
        report_content = scan_data.get("full_report_markdown")
        
        if not report_content:
            # Fallback for old scans or incomplete data
            return JSONResponse({
                "message": "Report content not yet available for this scan.",
                "status": "pending"
            }, status_code=404)

        # Return the report as plain text (Markdown)
        return PlainTextResponse(report_content)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error retrieving report: {str(e)}")
    
@router.post("/scan")
async def run_vulnerability_scan(
    model_name: str = Form(...),
    # Removed attack_type and epsilon, as we will run all in parallel
    current_user: dict = Depends(get_current_user)
):
    """Run comprehensive, parallel vulnerability scan - authenticated endpoint"""
    try:
        scan_id = str(uuid.uuid4())
        user_id = current_user["user_id"]
        
        print(f"\n Starting comprehensive scan for user: {user_id}")
        
        attack_service = AttackService()
        
        # 👈 Use the new run_all_attacks_parallel function
        raw_results = await attack_service.run_all_attacks_parallel(
            model_name=model_name,
            scan_id=scan_id,
            user_id=user_id
        )
        
        # Consolidate results into a single ScanResponse
        response = ScanResponse(
            scan_id=scan_id,
            status="completed",
            results=raw_results,
            created_at=datetime.now(),
            message="Comprehensive vulnerability scan completed successfully across all attacks",
            model_name=model_name, 
            attack_type="Comprehensive (5 attacks)", 
            epsilon=0.0 
        )
        
        scan_data = {
            "scan_id": response.scan_id,
            "status": response.status,
            "results": [result.dict() for result in response.results],
            "created_at": response.created_at.isoformat(),
            "message": response.message,
            "model_name": model_name,
            "model_name": model_name,
            "attack_type": "Comprehensive (FGSM, PGD, C&W, DeepFool)",
            "epsilon": 0.0, # Match the value used above
            "results": [result.dict() for result in raw_results]
        }
        
        # Generate the human-readable report via ReporterService
        reporter_service = ReporterService()
        report_markdown = await reporter_service.generate_security_report(scan_data)

        scan_data["full_report_markdown"] = report_markdown
        save_scan_to_disk(user_id, scan_id, scan_data)
        print(f" Comprehensive scan saved to disk for user: {user_id}")
        
        # return JSONResponse(scan_data) # Return JSONResponse instead of Pydantic model for simplicity
        return JSONResponse({
            "scan_id": scan_id,
            "status": "completed",
            "model_name": model_name,
            "raw_results_count": len(raw_results),
            "generated_report_preview": report_markdown[:500] + "...", # Preview the start
            "full_report_url": f"/api/v1/report/{scan_id}" # Suggest a new endpoint
        }) # Return JSONResponse instead of Pydantic model for simplicity
    
    except Exception as e:
        print(f" Comprehensive scan failed: {str(e)}")
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
    
    # llm_security_service = LLMSecurityService()

# In-memory storage (replace with database in production)
llm_scans_db = {}
llm_security_service = LLMSecurityService()

@router.post("/llm-security/scan", response_model=LLMScanResponse)
async def run_llm_security_scan(
    model_name: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Run comprehensive LLM security scan
    Tests for: prompt injection, jailbreaking, PII leakage, bias/toxicity, harmful content
    """
    try:
        user_id = current_user["user_id"]
        scan_id = str(uuid.uuid4())
        
        print(f"\n🔒 LLM SECURITY SCAN INITIATED")
        print(f"Scan ID: {scan_id}")
        print(f"Model: {model_name}")
        print(f"User: {user_id}")
        
        # Run all security tests
        results = await llm_security_service.run_all_security_tests(
            model_name=model_name,
            scan_id=scan_id,
            user_id=user_id
        )
        
        # Calculate overall metrics
        total_tests = len(results)
        vulnerabilities_found = sum(1 for r in results if r["vulnerability_detected"])
        security_score = ((total_tests - vulnerabilities_found) / total_tests) * 100
        
        # Determine overall risk level
        if security_score >= 90:
            risk_level = "LOW"
        elif security_score >= 70:
            risk_level = "MEDIUM"
        elif security_score >= 50:
            risk_level = "HIGH"
        else:
            risk_level = "CRITICAL"
        
        # Store scan results
        scan_data = {
            "scan_id": scan_id,
            "model_name": model_name,
            "user_id": user_id,
            "created_at": datetime.now().isoformat(),
            "results": results,
            "total_tests": total_tests,
            "vulnerabilities_found": vulnerabilities_found,
            "security_score": security_score,
            "risk_level": risk_level,
            "test_categories": {
                "prompt_injection": len([r for r in results if r["test_type"] == "prompt_injection"]),
                "jailbreak": len([r for r in results if r["test_type"] == "jailbreak"]),
                "pii_leakage": len([r for r in results if r["test_type"] == "pii_leakage"]),
                "bias_toxicity": len([r for r in results if r["test_type"] == "bias_toxicity"]),
                "harmful_content": len([r for r in results if r["test_type"] == "harmful_content"]),
            }
        }
        
        llm_scans_db[scan_id] = scan_data
        
        print(f"\n✅ LLM SECURITY SCAN COMPLETED")
        print(f"Security Score: {security_score:.1f}%")
        print(f"Risk Level: {risk_level}")
        print(f"Vulnerabilities: {vulnerabilities_found}/{total_tests}")
        
        return LLMScanResponse(
            scan_id=scan_id,
            message="LLM security scan completed successfully",
            security_score=security_score,
            risk_level=risk_level,
            vulnerabilities_found=vulnerabilities_found,
            total_tests=total_tests
        )
        
    except Exception as e:
        print(f"❌ LLM Security Scan Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"LLM security scan failed: {str(e)}"
        )


@router.get("/llm-security/scan/{scan_id}", response_model=dict)
async def get_llm_scan_results(
    scan_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieve detailed results for a specific LLM security scan
    """
    if scan_id not in llm_scans_db:
        raise HTTPException(
            status_code=404,
            detail=f"Scan {scan_id} not found"
        )
    
    scan_data = llm_scans_db[scan_id]
    
    # Verify ownership
    if scan_data["user_id"] != current_user["user_id"]:
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )
    
    return scan_data


@router.get("/llm-security/scans", response_model=dict)
async def list_llm_scans(
    current_user: dict = Depends(get_current_user)
):
    """
    List all LLM security scans for the current user
    """
    user_id = current_user["user_id"]
    
    user_scans = [
        {
            "scan_id": scan_id,
            "model_name": scan["model_name"],
            "created_at": scan["created_at"],
            "security_score": scan["security_score"],
            "risk_level": scan["risk_level"],
            "vulnerabilities_found": scan["vulnerabilities_found"],
            "total_tests": scan["total_tests"],
        }
        for scan_id, scan in llm_scans_db.items()
        if scan["user_id"] == user_id
    ]
    
    return {
        "scans": sorted(user_scans, key=lambda x: x["created_at"], reverse=True)
    }


@router.delete("/llm-security/scan/{scan_id}")
async def delete_llm_scan(
    scan_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a specific LLM security scan
    """
    if scan_id not in llm_scans_db:
        raise HTTPException(
            status_code=404,
            detail=f"Scan {scan_id} not found"
        )
    
    scan_data = llm_scans_db[scan_id]
    
    # Verify ownership
    if scan_data["user_id"] != current_user["user_id"]:
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )
    
    del llm_scans_db[scan_id]
    
    return {"message": f"Scan {scan_id} deleted successfully"}