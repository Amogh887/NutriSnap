
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')

project_id = os.getenv("GCP_PROJECT_ID")
credentials_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')

# Manually set the env var just like main.py does
if credentials_path:
    cred_file = Path(credentials_path)
    if not cred_file.is_absolute():
        cred_file = BASE_DIR / cred_file
    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = str(cred_file.resolve())

print(f"Project ID: {project_id}")
print(f"Credentials Env: {os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')}")

try:
    client = genai.Client(vertexai=True, project=project_id, location="us-central1")
    
    image_path = Path("/Users/amogh/.gemini/antigravity/brain/ac622c11-e33b-4d76-923b-24459ab7ab45/test_ingredients_png_1772354010674.png")
    with open(image_path, "rb") as f:
        image_bytes = f.read()
    
    image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/png")
    
    print("Sending multimodal request...")
    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents=[image_part, "Identify the food in this image."],
    )
    print("Gemini Multimodal Response:", response.text)
except Exception as e:
    import traceback
    print("ERROR DURING MULTIMODAL CALL:")
    print(traceback.format_exc())
