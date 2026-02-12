"""
RunPod Serverless handler for Qwen3-TTS.

Mode 1 (TTS):   {"text": "...", "language": "Japanese"}
Mode 2 (Clone): {"text": "...", "language": "Japanese", "ref_audio": "<base64>", "ref_text": "..."}

Output: {"audio_base64": "...", "format": "mp3"}

CustomVoice model for standard TTS, Base model for voice cloning.
"""

import base64
import io
import os
import tempfile
import traceback

import runpod
import soundfile as sf
import torch
from pydub import AudioSegment

_cv_model = None  # CustomVoice model (standard TTS)
_base_model = None  # Base model (voice cloning)


def get_cv_model():
    global _cv_model
    if _cv_model is None:
        from qwen_tts import Qwen3TTSModel
        model_id = os.environ.get("CV_MODEL_ID", "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice")
        print(f"Loading CustomVoice model: {model_id}")
        _cv_model = Qwen3TTSModel.from_pretrained(
            model_id, device_map="cuda:0", dtype=torch.bfloat16,
        )
        print("CustomVoice model loaded")
    return _cv_model


def get_base_model():
    global _base_model
    if _base_model is None:
        from qwen_tts import Qwen3TTSModel
        model_id = os.environ.get("BASE_MODEL_ID", "Qwen/Qwen3-TTS-12Hz-0.6B-Base")
        print(f"Loading Base model: {model_id}")
        _base_model = Qwen3TTSModel.from_pretrained(
            model_id, device_map="cuda:0", dtype=torch.bfloat16,
        )
        print("Base model loaded")
    return _base_model


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
        ref_audio_b64 = inp.get("ref_audio")
        ref_text = inp.get("ref_text", "")

        if ref_audio_b64:
            # --- Voice Clone mode (Base model) ---
            model = get_base_model()

            # Decode base64 audio to temp file
            audio_bytes = base64.b64decode(ref_audio_b64)
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name

            try:
                wavs, sr = model.generate_voice_clone(
                    text=text,
                    language=language,
                    ref_audio=tmp_path,
                    ref_text=ref_text,
                )
            finally:
                os.unlink(tmp_path)
        else:
            # --- Standard TTS mode (CustomVoice model) ---
            model = get_cv_model()
            speaker = inp.get("speaker", "Vivian")

            wavs, sr = model.generate_custom_voice(
                text=text,
                language=language,
                speaker=speaker,
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
