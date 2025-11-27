#!/usr/bin/env python3
"""
Audio Trimming Script
Trims audio files to specified start and end times.
"""

import sys
import os
import json
from pydub import AudioSegment

def trim_audio(input_path, output_path, start_seconds, end_seconds):
    """
    Trim audio file to specified time range.
    
    Args:
        input_path: Path to input audio file
        output_path: Path to output trimmed audio file
        start_seconds: Start time in seconds (float)
        end_seconds: End time in seconds (float)
    
    Returns:
        dict with success status and output path
    """
    try:
        print(f"Loading audio: {input_path}", flush=True)
        audio = AudioSegment.from_file(input_path)
        
        duration_seconds = len(audio) / 1000.0
        print(f"Original duration: {duration_seconds:.2f} seconds", flush=True)
        
        # Validate time range
        if start_seconds < 0:
            start_seconds = 0
        if end_seconds > duration_seconds:
            end_seconds = duration_seconds
        if start_seconds >= end_seconds:
            raise ValueError(f"Start time ({start_seconds}s) must be less than end time ({end_seconds}s)")
        
        # Convert seconds to milliseconds (pydub uses milliseconds)
        start_ms = int(start_seconds * 1000)
        end_ms = int(end_seconds * 1000)
        
        print(f"Trimming from {start_seconds:.2f}s to {end_seconds:.2f}s", flush=True)
        
        # Trim audio
        trimmed = audio[start_ms:end_ms]
        
        trimmed_duration = len(trimmed) / 1000.0
        print(f"Trimmed duration: {trimmed_duration:.2f} seconds", flush=True)
        
        # Detect output format from extension
        output_ext = os.path.splitext(output_path)[1].lower()
        output_format = output_ext[1:] if output_ext else 'wav'  # Remove dot
        
        # Export trimmed audio
        print(f"Exporting trimmed audio: {output_path} (format: {output_format})", flush=True)
        
        if output_format == 'mp3':
            trimmed.export(output_path, format="mp3", bitrate="320k")
        else:
            trimmed.export(output_path, format=output_format)
        
        print(f"Trim successful: {output_path}", flush=True)
        
        return {
            "success": True,
            "output_path": output_path,
            "original_duration": round(duration_seconds, 2),
            "trimmed_duration": round(trimmed_duration, 2),
            "start_time": round(start_seconds, 2),
            "end_time": round(end_seconds, 2)
        }
        
    except Exception as e:
        error_msg = f"Audio trimming failed: {str(e)}"
        print(error_msg, file=sys.stderr, flush=True)
        return {
            "success": False,
            "error": error_msg
        }

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print(json.dumps({
            "success": False,
            "error": "Usage: trim_audio.py <input> <output> <start_seconds> <end_seconds>"
        }))
        sys.exit(1)
    
    input_path = sys.argv[1].strip('"\'')
    output_path = sys.argv[2].strip('"\'')
    
    try:
        start_seconds = float(sys.argv[3])
        end_seconds = float(sys.argv[4])
    except ValueError:
        print(json.dumps({
            "success": False,
            "error": "Start and end times must be numbers"
        }))
        sys.exit(1)
    
    result = trim_audio(input_path, output_path, start_seconds, end_seconds)
    print(json.dumps(result), flush=True)
    sys.exit(0 if result.get("success") else 1)

