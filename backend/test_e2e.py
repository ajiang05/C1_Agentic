import asyncio
import os
import sys

# Add the backend root to Python path so we can import src
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.services.learning import upload_course
from src.retrieval.passages import select_passages
from src.db.memory_store import get_store
from src.db.supabase_client import supabase_configured

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

async def run_test():
    print("🚀 Starting End-to-End RAG & Curriculum Pipeline Test...\n")
    
    if not supabase_configured():
        print("❌ Supabase is not configured! Check your .env file.")
        return

    # 1. Prepare inputs
    syllabus_bytes = b"Course: Intro to Python\n\n1. Variables\n2. Dictionaries\n3. Functions\n4. File I/O"
    
    pdf_path = "../docs/textbooks/Introduction_to_Python_Programming-WEB.pdf"
    if not os.path.exists(pdf_path):
        print(f"❌ Cannot find PDF at {pdf_path}")
        return
        
    print(f"📄 Loading textbook from {pdf_path}...")
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    from src.services.learning import create_student
    student_res = create_student(display_name="Test Student")
    student_id = student_res.student_id

    # 2. Run the main orchestration function
    print("⚙️ Running Ingestion, PyMuPDF Chunking, Embedding, and Curriculum Generation...")
    print("   (This might take a few moments as we embed chunks to Supabase!)")
    
    # We pass the real PDF bytes.
    res = await upload_course(
        student_id=student_id,
        course_name="E2E Python Test",
        syllabus_name="syllabus.txt",
        syllabus_bytes=syllabus_bytes,
        notes_name="python_book.pdf",
        notes_bytes=pdf_bytes
    )
    
    course_id = res.course_id
    print(f"\n✅ Course successfully ingested! ID: {course_id}")
    
    # Check generated Concepts (DAG)
    store = get_store()
    course = store.get_course(course_id)
    print("\n🧠 Generated Curriculum Concepts (DAG):")
    for c in course.concepts:
        prereqs = [p for p in c.prerequisite_ids]
        print(f"   - {c.name} (Prereqs: {prereqs})")
        
    # 3. Test Vector Retrieval from Supabase
    print("\n🔍 Testing Supabase pgvector Retrieval for 'Dictionaries'...")
    materials = [m.__dict__ for m in course.materials]
    
    passages = select_passages(
        concept_name="Dictionaries",
        materials=materials,
        limit=2
    )
    
    print("\n--- Top Retrieved Passages ---")
    for p in passages:
        print(f"\n📍 Location: {p.location}")
        # Print first 200 chars to avoid flooding the console
        print(f"📖 Excerpt: {p.excerpt[:200]}...")

if __name__ == "__main__":
    asyncio.run(run_test())
