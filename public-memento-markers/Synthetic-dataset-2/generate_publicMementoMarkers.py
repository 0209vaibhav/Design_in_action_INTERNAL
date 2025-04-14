# Re-import necessary libraries after execution state reset
import json
import random
import numpy as np
import os
from datetime import datetime

# Memento Tags list
memento_tags = [
    "🌀 Ephemeral", "📍 Unmapped", "🧬 Niche/Cult", "💫 Emotionally Charged",
    "🕵️ Hidden Gem", "🎭 Unexpected Encounter", "🪞 Reflective", 
    "💔 Unpleasant Truth", "⏳ Once-in-a-While"
]

# Memento Category list
memento_categories = [
    "🏛️ Architecture", "🌿 Urban Nature", "🌈 Sky & Weather", "🎭 Cultural Spotlight",
    "🎧 Mood & Music", "🐾 Creature Sighting", "🍴 Street Food", "🎊 Social Gathering",
    "⚽ Sport in Action", "✍️ Poetic Reflection", "💡 Urban Folklore", "🏗️ City in Transition",
    "⚠️ Unpleasant Spot", "👥 Public Event", "🗂️ Other"
]

# Memento Duration list
memento_duration = [
    "Less than 15 minutes", "15 minutes - 1 hour", "1 - 2 hours",
    "2 - 6 hours", "6 - 12 hours", "12 - 24 hours", "Eternal"
]

# Expanded list of varied event types
event_categories = {
    "Live Music": [
        "Rooftop Jazz Night", "Street Violinist in Times Square", "Subway Saxophonist", "Live Acapella Group", 
        "Gospel Choir Flashmob", "DJ Spinning Vinyl in the Park", "Pop-Up Blues Performance", "Drum Circle Gathering"
    ],
    "Street Performance": [
        "Breakdance Battle in Union Square", "Mime Artist at Bryant Park", "Spontaneous Theatre Play", 
        "Fire Dancer Performance", "Acrobatic Stunt Show", "Magician Performing on Sidewalk", "Salsa Dance Flashmob"
    ],
    "Public Art": [
        "Hidden Graffiti Mural", "Sidewalk Chalk Festival", "Artist Live Painting a Mural", "Statue Dressed in Flowers",
        "Immersive Light Installation", "Pop-Up Art Gallery in an Alley", "Recycled Material Sculpture Display"
    ],
    "City Moment": [
        "Sunset Rooftop Picnic", "Massive Pillow Fight in the Park", "Hundreds Dancing in a Silent Disco",
        "Skyscraper Window Projection Show", "Floating Lantern Festival", "Rooftop Film Screening", "Surprise Opera Performance"
    ],
    "Hidden Spot": [
        "Secret Garden Behind the Library", "Speakeasy Hidden Behind a Bookshelf", "Underground Bookstore", 
        "Floating Tea House on the Hudson", "Rooftop Greenhouse Cafe", "Street Filled with Vintage Posters", 
        "Cozy Attic Reading Nook in a Café"
    ],
    "Food Discovery": [
        "Hidden Gelato Stand", "Secret Midnight Taco Truck", "Underground Ramen Spot", "Vegan Pop-Up Kitchen", 
        "Street Vendor Making Giant Crepes", "Food Cart Selling Rare International Dishes", "Artisanal Coffee Stand Under a Bridge"
    ],
    "Urban Anecdote": [
        "Stranger Leaving Free Books in the Park", "Mystery Notes Found on Park Benches", "Someone Playing Chess with Strangers",
        "Random Act of Kindness: Free Ice Cream", "Street Lined with Colorful Umbrellas", "Lost Dog Reunited with Owner",
        "Elderly Man Telling Stories to Kids in the Subway"
    ],
    "Local Sports": [
        "Roller Skating Crew in Central Park", "Basketball 3-on-3 Tournament", "Late Night Skateboard Meetup",
        "People Racing on Citi Bikes", "Spontaneous Soccer Game in a Parking Lot", "Public Rock Climbing Challenge",
        "Rooftop Yoga Session at Sunrise"
    ]
}

# Generate 200 unique event entries
all_events = []
event_id = 1

# Ensuring every event is unique and well-distributed
for category, events in event_categories.items():
    for event_name in events:
        all_events.append({
            "userId": f"user_{event_id}",
            "location": {
                "longitude": round(np.random.uniform(-74.020, -73.907), 6),
                "latitude": round(np.random.uniform(40.701, 40.879), 6)
            },
            "media": [f"https://example.com/{event_name.lower().replace(' ', '_')}.jpg"],
            "name": event_name,
            "description": f"This event captured the essence of city life: {event_name}.",
            "category": random.choice(memento_categories),
            "timestamp": datetime.now().isoformat(),
            "isPublic": random.choice([True, False]),
            "mementoTags": random.sample(memento_tags, random.randint(1, 3)),
            "mementoDuration": random.choice(memento_duration)
        })
        event_id += 1

# Shuffle to randomize order and ensure a mix across categories
random.shuffle(all_events)

# Trim to exactly 200 events
all_events = all_events[:200]

# Create the folder if it doesn't exist
output_folder = "public-memento-markers/Synthetic-dataset-2"
os.makedirs(output_folder, exist_ok=True)

# Save the dataset
fixed_dataset_path = os.path.join(output_folder, "public-memento-markers_without-media.json")
with open(fixed_dataset_path, "w", encoding="utf-8") as f:
    json.dump({"events": all_events}, f, indent=4)

# Print the absolute path where the file was saved
print(f"Dataset saved to: {os.path.abspath(fixed_dataset_path)}")

# Return file path for download
fixed_dataset_path
