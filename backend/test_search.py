import asyncio
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from src.retrieval.passages import select_passages

def run_search_test():
    print("🔍 Testing Supabase pgvector Retrieval for 'Dictionaries'...\n")
    passages = select_passages(concept_name="Dictionaries", materials=[])
    
    if not passages:
        print("No passages retrieved (or error occurred).")
        return
        
    print(f"✅ Retrieved {len(passages)} passages from Supabase!\n")
    print("--- Top Retrieved Passage ---")
    print(f"📍 Location: {passages[0].location}")
    print(f"📖 Excerpt: {passages[0].text[:300]}...\n")

if __name__ == "__main__":
    run_search_test()
