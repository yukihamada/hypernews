FROM pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    runpod \
    transformers>=4.51.0 \
    accelerate \
    soundfile \
    pydub \
    sentencepiece \
    qwen-omni-utils

# Pre-download model weights (7B — fits in 48GB VRAM with bf16)
RUN python -c "from transformers import AutoProcessor, Qwen2_5OmniModel; \
    AutoProcessor.from_pretrained('Qwen/Qwen2.5-Omni-7B', trust_remote_code=True); \
    Qwen2_5OmniModel.from_pretrained('Qwen/Qwen2.5-Omni-7B', trust_remote_code=True)"

COPY handler.py /app/handler.py

CMD ["python", "/app/handler.py"]
