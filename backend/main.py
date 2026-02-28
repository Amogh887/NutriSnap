from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

# 1. CORS Setup: Allows your frontend (running on a different port) to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Fine for local hackathon testing, restrict before going live
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Health Check Route
@app.get("/api/test")
async def test_connection():
    return {"message": "Hello from the FastAPI backend!"}

# 3. The AI Processing Route
@app.post("/api/analyze-food")
async def analyze_food(image: UploadFile = File(...)):
    # Read the uploaded image into memory
    file_bytes = await image.read()
    
    # [VERTEX AI CODE WILL GO HERE LATER]
    
    # Return a success message for now
    return {
        "filename": image.filename, 
        "content_type": image.content_type,
        "status": "Image received successfully! Ready to forward to Gemini."
    }
