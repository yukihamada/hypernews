FROM pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    runpod \
    qwen-tts \
    soundfile \
    pydub \
    numpy

COPY handler.py /app/handler.py

CMD ["python", "/app/handler.py"]
