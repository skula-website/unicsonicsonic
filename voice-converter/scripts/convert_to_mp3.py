#!/usr/bin/env python3
"""
MP3 Conversion Script (Optimization)
Quickly converts audio to MP3 for faster processing of large files.
"""

import sys
import json
from pydub import AudioSegment
from pydub.utils import which

def convert_to_mp3(input_path, output_path, bitrate='320k'):
    """
    Convert audio file to MP3 format.
    
    Args:
        input_path: Path to input audio file
        output_path: Path to output MP3 file
        bitrate: MP3 bitrate (default: '320k')
    """
    try:
        # Check if ffmpeg is available
        if not which("ffmpeg"):
            return {"success": False, "error": "ffmpeg not found. Please install ffmpeg."}
        
        # Load audio file
        print(f"Converting to MP3: {input_path}")
        audio = AudioSegment.from_file(input_path)
        
        # Export as MP3
        print(f"Exporting as MP3 with bitrate: {bitrate}")
        audio.export(output_path, format="mp3", bitrate=bitrate)
        
        print(f"MP3 conversion successful: {output_path}")
        result = {"success": True, "output_path": output_path}
        print(json.dumps(result))
        return result
        
    except Exception as e:
        error_msg = f"MP3 conversion error: {str(e)}"
        print(error_msg, file=sys.stderr)
        result = {"success": False, "error": error_msg}
        print(json.dumps(result))
        return result

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: convert_to_mp3.py <input> <output> [bitrate]"}))
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    bitrate = sys.argv[3] if len(sys.argv) > 3 else '320k'
    
    result = convert_to_mp3(input_path, output_path, bitrate)
    sys.exit(0 if result.get("success") else 1)

