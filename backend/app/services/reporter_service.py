import json
from google import genai
from app.models.schemas import ScanResponse # Import your full schema
import os
class ReporterService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            # Fallback or raise an explicit local error if you prefer
            raise ValueError("GEMINI_API_KEY environment variable is not set.")
            
        # 2. Initialize Gemini client by explicitly passing the API key
        self.client = genai.Client(api_key=api_key)

    def generate_report_prompt(self, scan_results_json: dict) -> str:
        """Constructs the prompt for Gemini, instructing it how to act."""
        
        # 1. Define the Persona and Goal
        prompt = (
            "You are a highly experienced AI/ML Security Analyst. "
            "Your task is to analyze the following JSON data containing adversarial attack results on a PyTorch model. "
            "The model is a 1000-class image classifier and the 'confidence' values are raw model logits. "
        )
        
        # 2. Define the Required Output Structure
        prompt += (
            "Generate a comprehensive, collaborative security report in Markdown format. "
            "The report MUST include the following three sections:\n\n"
            "## 1. Executive Summary & Security Score\n"
            "- Provide an overall security score (CRITICAL, HIGH, MEDIUM, or LOW).\n"
            "- State the overall Attack Success Rate (ASR) across all tests.\n\n"
            "## 2. Attack Analysis & Breakpoints\n"
            "- For each attack type (FGSM, PGD, C&W, DeepFool), calculate the **Average Perturbation Norm ($\ell_2$)** and the **Average Confidence Change** ($\text{Adversarial Logit} - \text{Original Logit}$).\n"
            "- Identify the most successful attack (highest ASR/lowest Norm).\n"
            "- Explain the model's primary vulnerability (e.g., linear loss landscape, easily defeated defenses).\n\n"
            "## 3. Mitigation Recommendations\n"
            "- Recommend the single most effective defense (e.g., PGD Adversarial Training).\n"
            "- Provide at least two other actionable steps to improve robustness.\n\n"
        )
        
        # 3. Inject the Raw Data
        prompt += "--- RAW SCAN RESULTS (JSON) ---\n"
        # Use json.dumps to format the results neatly for the LLM
        prompt += json.dumps(scan_results_json, indent=2)
        prompt += "\n--------------------------------\n"
        
        return prompt

    async def generate_security_report(self, scan_results: dict) -> str:
        """Sends the raw results to Gemini and returns the formatted report."""
        
        prompt = self.generate_report_prompt(scan_results)
        
        try:
            # Call the Gemini API
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',  # Good model for complex text generation
                contents=prompt
            )
            return response.text
            
        except Exception as e:
            return f"Error generating report via Gemini: {str(e)}"