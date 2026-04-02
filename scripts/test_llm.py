import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

BASE_URL = os.getenv("LLM_BASE_URL", "http://localhost:20128/v1")
API_KEY = os.getenv("LLM_API_KEY", "9router-test-dat")
MODEL_NAME = os.getenv("LLM_MODEL_NAME", "gemini-unlimited")

def test_llm_connection():
    print(f"--- Testing LLM Connection (9router) ---")
    print(f"Endpoint: {BASE_URL}")
    print(f"Model:    {MODEL_NAME}")
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "user", "content": "Say '9router connection successful!' if you can hear me."}
        ],
        "temperature": 0.7,
        "stream": False
    }
    
    url = f"{BASE_URL}/chat/completions"
    print(f"Target URL: {url}")
    
    try:
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                print("\n✅ SUCCESS!")
                print(f"Response: {content}")
            except Exception as json_err:
                print(f"\n❌ JSON PARSE ERROR: {str(json_err)}")
                print(f"Raw Response: {response.text}")
        else:
            print(f"\n❌ FAILED! (Status: {response.status_code})")
            print(f"Error Body: {response.text}")
            
    except Exception as e:
        print(f"\n❌ REQUEST ERROR: {str(e)}")

if __name__ == "__main__":
    test_llm_connection()
