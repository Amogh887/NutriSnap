import os
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv

# Import the NEW GenAI SDK
from google import genai
from google.genai import types

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

project_id = os.getenv("GCP_PROJECT_ID")

# 1. Initialize the new Client (This handles the complex routing automatically)
client = genai.Client(vertexai=True, project=project_id, location="us-central1")

@app.get("/api/test")
async def test_connection():
    return {"message": "Hello from the FastAPI backend!"}

@app.post("/api/analyze-food")
async def analyze_food(image: UploadFile = File(...)):
    try:
        file_bytes = await image.read()
        
        # 2. Convert image bytes using the new SDK's format
        image_part = types.Part.from_bytes(data=file_bytes, mime_type=image.content_type)
        
        # PASTE YOUR EXACT NUTRISNAP PROMPT HERE
        prompt = """
        You are NutriSnap AI, an advanced multimodal nutrition and cooking assistant built to help users create healthy meals from available ingredients.

        Your task is to analyze an image of food ingredients and generate healthy, personalized recipe suggestions.

        ---
        ### STEP 1: INGREDIENT DETECTION
        Carefully analyze the provided image and identify all visible food ingredients.
        - Only include ingredients you are reasonably confident about.
        - Use generic names (e.g., "tomato", "chicken breast", "spinach", "rice").
        - Ignore non-food items.
        - If uncertain, include with "possible" tag.

        Return ingredients as a clean JSON array:
        {
          "ingredients": ["item1", "item2", "item3"]
        }

        ---
        ### STEP 2: CONTEXT & USER PROFILE
        Use the following user preferences when generating recipes:
        - Health Goal: balanced
        - Diet Type: non-vegetarian
        - Allergies: none
        - Cooking Time Preference: moderate

        ---
        ### STEP 3: RECIPE GENERATION
        Generate 3 to 5 recipe suggestions using the detected ingredients.
        Rules:
        - Prioritize recipes that use MOST of the detected ingredients.
        - Minimize need for extra ingredients.
        - If additional ingredients are required, list them clearly.
        - Focus on HEALTHY cooking methods (grilling, baking, steaming, sautéing with minimal oil).
        - Avoid ultra-processed foods unless necessary.

        ---
        ### STEP 4: HEALTH OPTIMIZATION
        Each recipe must be optimized for health:
        - Prefer high-protein, high-fiber, nutrient-dense meals
        - Limit added sugars and excessive fats
        - Suggest healthier substitutions if applicable
        - Adjust recipes based on user's health goal.

        ---
        ### STEP 5: HEALTH SCORING SYSTEM
        Assign each recipe a Health Score (1–10) based on:
        - Nutrient density
        - Macronutrient balance
        - Cooking method
        - Use of whole vs processed ingredients
        Also include a short explanation: Why the score is high or low.

        ---
        ### STEP 6: OUTPUT FORMAT
        Return ONLY valid JSON in the following structure:
        {
          "detected_ingredients": [],
          "recipes": [
            {
              "name": "",
              "description": "",
              "ingredients_used": [],
              "additional_ingredients": [],
              "instructions": [
                "step 1",
                "step 2"
              ],
              "nutrition": {
                "calories_kcal": "",
                "protein_g": "",
                "carbs_g": "",
                "fat_g": ""
              },
              "health_score": "",
              "health_explanation": "",
              "diet_tags": ["high-protein", "low-carb", "vegan"],
              "estimated_time_minutes": ""
            }
          ],
          "ranking": [
            "recipe_name_1",
            "recipe_name_2",
            "recipe_name_3"
          ]
        }

        ---
        ### STEP 7: RANKING
        Sort recipes from healthiest to least healthy based on health_score.

        ---
        ### STEP 8: EDGE CASE HANDLING
        - If ingredients are insufficient, suggest 2–3 missing ingredients to create viable recipes.
        - If the image is unclear, make best reasonable assumptions.
        - Always provide useful output.

        ---
        ### FINAL INSTRUCTION
        Your response MUST be valid JSON only. No extra text, no explanations outside JSON.
        """
        
        # 3. Call the preview model using the exact preview string
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[image_part, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        
        response_text = response.text.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        recipe_data = json.loads(response_text)
        return recipe_data
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"ERROR calling Vertex AI: {error_details}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)