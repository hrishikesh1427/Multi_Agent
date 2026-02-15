from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint
from dotenv import load_dotenv
import os

load_dotenv()  # <-- loads .env

HF_TOKEN = os.getenv("HUGGINGFACEHUB_API_TOKEN")
if not HF_TOKEN:
    raise RuntimeError("Missing HUGGINGFACEHUB_API_TOKEN")

# Create the base endpoint with a currently supported model
# Using Meta's Llama 3.1 8B (free on HuggingFace inference API)
base_llm = HuggingFaceEndpoint(
    repo_id="meta-llama/Meta-Llama-3.1-8B-Instruct",
    temperature=0.2,
    max_new_tokens=1024,
)

# Wrap it in ChatHuggingFace for proper conversational format
llm = ChatHuggingFace(llm=base_llm)
