FROM pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    git ffmpeg sox libsox-dev && \
    rm -rf /var/lib/apt/lists/*

# Install CosyVoice 2 and dependencies
RUN pip install --no-cache-dir \
    runpod \
    pydub \
    torchaudio \
    onnxruntime-gpu \
    conformer \
    diffusers \
    gdown \
    hydra-core \
    hyperpyyaml \
    inflect \
    librosa \
    lightning \
    matplotlib \
    modelscope \
    networkx \
    omegaconf \
    openai-whisper \
    oss2 \
    protobuf \
    rich \
    soundfile \
    tensorboardX \
    wget

# Clone CosyVoice repository
RUN git clone --depth 1 https://github.com/FunAudioLLM/CosyVoice.git /app/CosyVoice
ENV PYTHONPATH="/app/CosyVoice:/app/CosyVoice/third_party/Matcha-TTS:${PYTHONPATH}"

# Download CosyVoice2-0.5B model
RUN python -c "from modelscope import snapshot_download; snapshot_download('iic/CosyVoice2-0.5B', local_dir='/app/pretrained_models/CosyVoice2-0.5B')"

COPY handler.py /app/handler.py

CMD ["python", "/app/handler.py"]
