#!/usr/bin/env python3
"""
Audio Fingerprint Removal Script
Removes AI watermarks by applying a low-pass filter at 16 kHz to remove frequencies above 18 kHz.
"""

import sys
import os
import numpy as np
import librosa
import soundfile as sf
from pydub import AudioSegment

def remove_fingerprint(input_path, output_path):
    """
    Remove audio fingerprint by filtering out frequencies above 18 kHz.
    
    Args:
        input_path: Path to input audio file
        output_path: Path to output cleaned audio file
    """
    try:
        print(f"Loading audio: {input_path}")
        # Load audio file
        y, sr = librosa.load(input_path, sr=None)
        duration = len(y) / sr
        print(f"Sample rate: {sr} Hz, Duration: {duration:.2f}s")
        
        # Apply low-pass filter at 16 kHz to remove watermark frequencies (18-22 kHz)
        # This preserves audio quality while removing watermarks
        cutoff_freq = 16000  # 16 kHz cutoff
        
        # Design a low-pass filter
        from scipy import signal
        
        # Normalize frequency to Nyquist frequency (0-1 range)
        nyquist = sr / 2
        normalized_cutoff = cutoff_freq / nyquist
        
        # Design Butterworth filter
        b, a = signal.butter(4, normalized_cutoff, btype='low', analog=False)
        
        # Apply filter
        print(f"Applying low-pass filter at {cutoff_freq} Hz...")
        if y.ndim == 1:
            # Mono audio
            y_filtered = signal.filtfilt(b, a, y)
        else:
            # Stereo audio - apply filter to each channel
            y_filtered = np.zeros_like(y)
            for channel in range(y.shape[1]):
                y_filtered[:, channel] = signal.filtfilt(b, a, y[:, channel])
        
        # Save cleaned audio
        # soundfile can only write WAV, FLAC, OGG - not MP3
        # So we need to detect format and convert if necessary
        output_ext = os.path.splitext(output_path)[1].lower()
        print(f"DEBUG: Output path: '{output_path}'", flush=True)
        print(f"DEBUG: Detected output extension: '{output_ext}' (type: {type(output_ext)}, len: {len(output_ext)})", flush=True)
        print(f"DEBUG: Extension == '.mp3': {output_ext == '.mp3'}", flush=True)
        print(f"DEBUG: Extension repr: {repr(output_ext)}", flush=True)
        
        if output_ext == '.mp3':
            # Save as WAV first, then convert to MP3
            temp_wav_path = output_path.replace('.mp3', '.wav')
            print(f"Saving cleaned audio as WAV (temporary): {temp_wav_path}", flush=True)
            try:
                sf.write(temp_wav_path, y_filtered, sr)
                print(f"WAV file saved successfully", flush=True)
            except Exception as e:
                print(f"Error saving WAV: {e}", file=sys.stderr, flush=True)
                raise
            
            # Convert WAV to MP3 using pydub
            print(f"Converting WAV to MP3: {output_path}", flush=True)
            try:
                audio = AudioSegment.from_wav(temp_wav_path)
                audio.export(output_path, format="mp3", bitrate="320k")
                print(f"MP3 conversion successful", flush=True)
            except Exception as e:
                print(f"Error converting to MP3: {e}", file=sys.stderr, flush=True)
                # Clean up temp file even on error
                if os.path.exists(temp_wav_path):
                    os.remove(temp_wav_path)
                raise
            
            # Clean up temporary WAV file
            if os.path.exists(temp_wav_path):
                os.remove(temp_wav_path)
                print(f"Temporary WAV file removed", flush=True)
        else:
            # For WAV, FLAC, OGG - save directly
            print(f"Saving cleaned audio: {output_path}", flush=True)
            try:
                sf.write(output_path, y_filtered, sr)
                print(f"Audio saved successfully", flush=True)
            except Exception as e:
                print(f"Error saving audio: {e}", file=sys.stderr, flush=True)
                raise
        
        print(f"Fingerprint removal successful: {output_path}")
        return True
        
    except Exception as e:
        error_msg = f"Fingerprint removal error: {str(e)}"
        print(error_msg, file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: remove_audio_fingerprint.py <input> <output>", file=sys.stderr)
        sys.exit(1)
    
    # Strip any extra quotes from paths (sometimes paths come with extra quotes)
    input_path = sys.argv[1].strip('"\'')
    output_path = sys.argv[2].strip('"\'')
    
    print(f"DEBUG: Script started with input_path: '{input_path}'", flush=True)
    print(f"DEBUG: Script started with output_path: '{output_path}'", flush=True)
    print(f"DEBUG: sys.argv = {sys.argv}", flush=True)
    
    success = remove_fingerprint(input_path, output_path)
    sys.exit(0 if success else 1)

