"""
RunPod Serverless handler for Qwen2.5-Omni (multimodal with audio output).

Input:  {"text": "...", "voice": "Chelsie", "system_prompt": "..."}
Output: {"audio_base64": "...", "format": "mp3", "text_response": "..."}

Supports conversational AI with audio output for podcast-style generation.
"""

import base64
import io
import os

import runpod
import soundfile as sf
import torch
from pydub import AudioSegment

_processor = None
_model = None

VALID_VOICES = {"Chelsie", "Ethan"}


def get_model():
    global _processor, _model
    if _model is None:
        from transformers import AutoProcessor
        from transformers import Qwen2_5OmniModel

        model_id = os.environ.get("MODEL_ID", "Qwen/Qwen2.5-Omni-7B")
        _processor = AutoProcessor.from_pretrained(model_id, trust_remote_code=True)
        _model = Qwen2_5OmniModel.from_pretrained(
            model_id,
            torch_dtype=torch.bfloat16,
            device_map="auto",
            trust_remote_code=True,
        )
    return _processor, _model


def wav_to_mp3(audio_array, sample_rate: int) -> bytes:
    """Convert audio numpy array to MP3 bytes."""
    buf = io.BytesIO()
    sf.write(buf, audio_array, sample_rate, format="WAV")
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

    voice = inp.get("voice", "Chelsie")
    if voice not in VALID_VOICES:
        voice = "Chelsie"

    system_prompt = inp.get("system_prompt", "You are a helpful assistant.")

    processor, model = get_model()

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": [{"type": "text", "text": text}]},
    ]

    inputs = processor.apply_chat_template(
        messages,
        return_tensors="pt",
        add_generation_prompt=True,
        tokenize=True,
    ).to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=2048,
            return_audio=True,
            speaker=voice,
        )

    # Extract text and audio
    text_ids = outputs.sequences[0]
    text_response = processor.decode(text_ids, skip_special_tokens=True)

    result = {
        "text_response": text_response,
        "format": "mp3",
    }

    if hasattr(outputs, "audio") and outputs.audio is not None:
        audio_array = outputs.audio[0].cpu().numpy()
        sample_rate = getattr(outputs, "sampling_rate", 24000)
        mp3_bytes = wav_to_mp3(audio_array, sample_rate)
        result["audio_base64"] = base64.b64encode(mp3_bytes).decode("utf-8")
    else:
        result["audio_base64"] = ""

    return result


runpod.serverless.start({"handler": handler})
