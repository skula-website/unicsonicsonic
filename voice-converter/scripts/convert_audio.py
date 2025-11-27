#!/usr/bin/env python3
"""
Audio Conversion Script
Converts audio files between WAV and MP3 formats with optional sample rate and bit depth conversion.
"""

import sys
import json
from pydub import AudioSegment
from pydub.utils import which

def convert_audio(input_path, output_path, output_format, sample_rate=None, bit_depth=None, bitrate='320k'):
    """
    Convert audio file to specified format.
    
    Args:
        input_path: Path to input audio file
        output_path: Path to output audio file
        output_format: 'wav' or 'mp3'
        sample_rate: Optional sample rate (e.g., 44100, 48000, 96000)
        bit_depth: Optional bit depth for WAV (16 or 24)
        bitrate: Bitrate for MP3 (default: '320k')
    """
    try:
        # Check if ffmpeg is available
        if not which("ffmpeg"):
            return {"success": False, "error": "ffmpeg not found. Please install ffmpeg."}
        
        # Load audio file
        print(f"Loading audio from: {input_path}")
        audio = AudioSegment.from_file(input_path)
        
        # Apply sample rate conversion if specified
        if sample_rate:
            print(f"Converting sample rate to: {sample_rate} Hz")
            audio = audio.set_frame_rate(int(sample_rate))
        
        # Convert to specified format
        if output_format.lower() == 'mp3':
            print(f"Exporting as MP3 with bitrate: {bitrate}")
            audio.export(output_path, format="mp3", bitrate=bitrate)
        elif output_format.lower() == 'wav':
            # For WAV, we can specify bit depth
            if bit_depth:
                print(f"Exporting as WAV with {bit_depth}-bit depth")
                audio.export(output_path, format="wav", parameters=["-acodec", "pcm_s" + str(bit_depth) + "le"])
            else:
                print("Exporting as WAV")
                audio.export(output_path, format="wav")
        else:
            return {"success": False, "error": f"Unsupported output format: {output_format}"}
        
        print(f"Conversion successful: {output_path}")
        result = {"success": True, "output_path": output_path}
        print(json.dumps(result))
        return result
        
    except Exception as e:
        error_msg = f"Conversion error: {str(e)}"
        print(error_msg, file=sys.stderr)
        result = {"success": False, "error": error_msg}
        print(json.dumps(result))
        return result

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({"success": False, "error": "Usage: convert_audio.py <input> <output> <format> [sample_rate] [bit_depth] [bitrate]"}))
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    output_format = sys.argv[3]
    
    # Parse optional arguments intelligently
    # API sends: [script, input, output, format, sampleRate?, bitDepth?, bitrate]
    # But filters out empty sampleRate/bitDepth, so bitrate position varies
    sample_rate = None
    bit_depth = None
    bitrate = '320k'
    
    # Check remaining arguments (starting from index 4)
    remaining_args = sys.argv[4:] if len(sys.argv) > 4 else []
    
    for arg in remaining_args:
        # Check if it's a number (sample_rate or bit_depth)
        # Numbers are typically 44100, 48000, 16, 24, etc.
        # Bitrate is always a string like '320k', '192k', etc.
        if arg.endswith('k') or arg.endswith('K'):
            # This is bitrate (e.g., '320k')
            bitrate = arg
        else:
            # Try to parse as number
            try:
                num = int(arg)
                # If we haven't set sample_rate yet, this is probably sample_rate
                # Sample rates are typically large numbers (44100, 48000, 96000)
                if sample_rate is None:
                    sample_rate = num
                # Otherwise it's bit_depth (typically 16 or 24)
                elif bit_depth is None:
                    bit_depth = num
            except ValueError:
                # Not a number and not bitrate format - might be bitrate without 'k'
                # Default to bitrate
                bitrate = arg
    
    result = convert_audio(input_path, output_path, output_format, sample_rate, bit_depth, bitrate)
    sys.exit(0 if result.get("success") else 1)

