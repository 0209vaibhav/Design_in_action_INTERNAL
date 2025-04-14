import json
import requests
import random
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Pexels API Key from environment
PEXELS_API_KEY = os.getenv('PEXELS_API_KEY')
if not PEXELS_API_KEY:
    raise ValueError("PEXELS_API_KEY not found in environment variables")

# Pexels API Endpoint
PEXELS_API_URL = "https://api.pexels.com/v1/search"

# Load dataset file
with open("public-memento-markers_without-media.json", "r", encoding="utf-8") as f:
    dataset = json.load(f)

# Function to fetch an image from Pexels
def fetch_pexels_image(query):
    headers = {"Authorization": PEXELS_API_KEY}
    params = {"query": query, "per_page": 1}

    response = requests.get(PEXELS_API_URL, headers=headers, params=params)
    if response.status_code == 200:
        data = response.json()
        if data.get("photos"):
            return data["photos"][0]["src"]["medium"]  # Fetch medium-sized image
    return None

# Update dataset with real images
for event in dataset["events"]:
    image_url = fetch_pexels_image(event["name"])
    if image_url:
        event["media"] = [image_url]

# Save the updated dataset
output_path = "public-memento-markers.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(dataset, f, indent=4)

print(f"Dataset updated with real images! File saved as '{output_path}'")
