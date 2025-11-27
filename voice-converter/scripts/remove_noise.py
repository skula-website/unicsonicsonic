#!/usr/bin/env python3
"""
Audio Noise Removal Script
Removes background noise from audio files using spectral gating.
"""

import sys
import os
import numpy as np
import librosa
import soundfile as sf
from pydub import AudioSegment
import noisereduce as nr

def remove_noise(input_path, output_path, reduction_strength=0.5, stationary=False):
    """
    Remove noise from audio file using spectral gating.
    
    Args:
        input_path: Path to input audio file
        output_path: Path to output cleaned audio file
        reduction_strength: Strength of noise reduction (0.0-1.0, default 0.5)
        stationary: If True, assumes stationary noise (default False for non-stationary)
    """
    print(f"DEBUG: Script started with input_path: '{input_path}'", flush=True)
    print(f"DEBUG: Script started with output_path: '{output_path}'", flush=True)
    print(f"DEBUG: reduction_strength: {reduction_strength}, stationary: {stationary}", flush=True)

    # Strip any extra quotes
    input_path = input_path.strip('"\'')
    output_path = output_path.strip('"\'')

    try:
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file does not exist: {input_path}")

        print(f"Loading audio: {input_path}", flush=True)
        # Load audio file
        y, sr = librosa.load(input_path, sr=None)
        duration = len(y) / sr
        print(f"Sample rate: {sr} Hz, Duration: {duration:.2f}s", flush=True)
        
        # Apply noise reduction
        # prop_decrease controls how much noise to reduce (0.0 = no reduction, 1.0 = maximum)
        # We map reduction_strength (0.0-1.0) to prop_decrease
        prop_decrease = float(reduction_strength)
        
        print(f"Applying noise reduction (strength: {prop_decrease:.2f}, stationary: {stationary})...", flush=True)
        
        # noisereduce can handle both mono and stereo
        if y.ndim == 1:
            # Mono audio
            y_reduced = nr.reduce_noise(y=y, sr=sr, prop_decrease=prop_decrease, stationary=stationary)
        else:
            # Stereo audio - process each channel separately
            y_reduced = np.zeros_like(y)
            for channel in range(y.shape[1]):
                print(f"Processing channel {channel + 1}...", flush=True)
                y_reduced[:, channel] = nr.reduce_noise(y=y[:, channel], sr=sr, prop_decrease=prop_decrease, stationary=stationary)
        
        print(f"Noise reduction complete", flush=True)
        
        # Save cleaned audio
        output_ext = os.path.splitext(output_path)[1].lower()
        print(f"DEBUG: Output path: '{output_path}'", flush=True)
        print(f"DEBUG: Detected output extension: '{output_ext}'", flush=True)
        
        if output_ext == '.mp3':
            # Save as WAV first, then convert to MP3
            temp_wav_path = output_path.replace('.mp3', '.wav')
            print(f"Saving cleaned audio as WAV (temporary): {temp_wav_path}", flush=True)
            try:
                sf.write(temp_wav_path, y_reduced, sr)
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
                sf.write(output_path, y_reduced, sr)
                print(f"Audio saved successfully", flush=True)
            except Exception as e:
                print(f"Error saving audio: {e}", file=sys.stderr, flush=True)
                raise
        
        print(f"Noise removal successful: {output_path}", flush=True)
        return True
        
    except Exception as e:
        error_msg = f"Noise removal error: {str(e)}"
        print(error_msg, file=sys.stderr, flush=True)
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: remove_noise.py <input> <output> [reduction_strength] [stationary]", file=sys.stderr, flush=True)
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    # Parse optional arguments
    reduction_strength = 0.5  # Default
    stationary = False  # Default
    
    if len(sys.argv) > 3:
        try:
            reduction_strength = float(sys.argv[3])
            # Clamp to 0.0-1.0 range
            reduction_strength = max(0.0, min(1.0, reduction_strength))
        except ValueError:
            print(f"Warning: Invalid reduction_strength '{sys.argv[3]}', using default 0.5", file=sys.stderr, flush=True)
    
    if len(sys.argv) > 4:
        stationary = sys.argv[4].lower() in ('true', '1', 'yes', 'on')
    
    success = remove_noise(input_path, output_path, reduction_strength, stationary)
    sys.exit(0 if success else 1)

