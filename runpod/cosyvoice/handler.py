"""
RunPod Serverless handler for CosyVoice 2 TTS.

Input:  {"text": "...", "voice": "日本語女性", "speed": 1.0}
Output: {"audio_base64": "...", "format": "mp3"}
"""

import base64
import io
import os

import runpod
import torch
import torchaudio
from pydub import AudioSegment

# Lazy-load model to share across warm invocations
_model = None

VOICE_MAP = {
    "日本語女性": "中文女",   # Chinese female — best quality, works for JP
    "日本語男性": "中文男",   # Chinese male
    "英語女性":   "英文女",
    "英語男性":   "英文男",
    "中国語女性": "中文女",
    "中国語男性": "中文男",
    "粤語女性":   "粤语女",
}


def get_model():
    global _model
    if _model is None:
        from cosyvoice.cli.cosyvoice import CosyVoice2
        model_dir = os.environ.get("MODEL_DIR", "/app/pretrained_models/CosyVoice2-0.5B")
        _model = CosyVoice2(model_dir, load_jit=False, load_trt=False)
    return _model


def wav_to_mp3(wav_tensor: torch.Tensor, sample_rate: int) -> bytes:
    """Convert a WAV tensor to MP3 bytes via pydub."""
    buf = io.BytesIO()
    torchaudio.save(buf, wav_tensor, sample_rate, format="wav")
    buf.seek(0)
    audio = AudioSegment.from_wav(buf)
    out = io.BytesIO()
    audio.export(out, format="mp3", bitrate="128k")
    return out.getvalue()


def handler(job: dict) -> dict:
    inp = job["input"]
    text = inp.get("text", "").strip()
    if not text:
        return {"error": "text is required"}

    voice_key = inp.get("voice", "日本語女性")
    speed = float(inp.get("speed", 1.0))

    sft_voice = VOICE_MAP.get(voice_key, "中文女")

    model = get_model()

    # Use SFT inference (pre-trained speaker)
    results = list(model.inference_sft(text, sft_voice, stream=False, speed=speed))
    if not results:
        return {"error": "No audio generated"}

    # Concatenate all chunks
    audio_chunks = [r["tts_speech"] for r in results]
    full_audio = torch.cat(audio_chunks, dim=-1)
    sample_rate = 22050  # CosyVoice default

    mp3_bytes = wav_to_mp3(full_audio, sample_rate)

    return {
        "audio_base64": base64.b64encode(mp3_bytes).decode("utf-8"),
        "format": "mp3",
    }


runpod.serverless.start({"handler": handler})
