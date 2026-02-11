"""
RunPod Serverless handler for Qwen3-TTS.

Input:  {"text": "...", "speaker": "Vivian", "language": "Japanese"}
Output: {"audio_base64": "...", "format": "mp3"}

Uses qwen-tts package with Qwen3-TTS-12Hz-0.6B-Base + CustomVoice model.
"""

import base64
import io
import os
import traceback

import runpod
import soundfile as sf
import torch
from pydub import AudioSegment

_model = None
_model_id = os.environ.get("MODEL_ID", "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice")


def get_model():
    global _model
    if _model is None:
        from qwen_tts import Qwen3TTSModel
        print(f"Loading model: {_model_id}")
        _model = Qwen3TTSModel.from_pretrained(
            _model_id,
            device_map="cuda:0",
            dtype=torch.bfloat16,
        )
        print("Model loaded successfully")
    return _model


def wav_to_mp3(audio_array, sample_rate: int) -> bytes:
    """Convert audio array to MP3 bytes."""
    buf = io.BytesIO()
    sf.write(buf, audio_array, sample_rate, format="WAV")
    buf.seek(0)
    audio = AudioSegment.from_wav(buf)
    out = io.BytesIO()
    audio.export(out, format="mp3", bitrate="128k")
    return out.getvalue()


def handler(job: dict) -> dict:
    try:
        inp = job["input"]
        text = inp.get("text", "").strip()
        if not text:
            return {"error": "text is required"}

        language = inp.get("language", "Japanese")
        speaker = inp.get("speaker", "Vivian")

        model = get_model()

        # Try generate_custom_voice first (CustomVoice model)
        # Falls back to generate_voice_design for Base model
        try:
            wavs, sr = model.generate_custom_voice(
                text=text,
                language=language,
                speaker=speaker,
            )
        except (AttributeError, TypeError):
            # Base model might use generate_voice_design
            try:
                wavs, sr = model.generate_voice_design(
                    text=text,
                    language=language,
                    instruct=f"A natural {language} speaking voice, clear and pleasant.",
                )
            except (AttributeError, TypeError):
                # Last resort: try any available generate method
                wavs, sr = model.generate_voice_clone(
                    text=text,
                    language=language,
                    ref_audio=None,
                    ref_text="",
                )

        if not wavs or len(wavs) == 0:
            return {"error": "No audio generated"}

        mp3_bytes = wav_to_mp3(wavs[0], sr)

        return {
            "audio_base64": base64.b64encode(mp3_bytes).decode("utf-8"),
            "format": "mp3",
        }
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}


runpod.serverless.start({"handler": handler})
