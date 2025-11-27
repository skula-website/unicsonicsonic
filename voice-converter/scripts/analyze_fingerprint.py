#!/usr/bin/env python3
"""
Fingerprint Analysis Script
Analyzes audio files for AI watermarks using STFT analysis of 18-22 kHz frequency range.
"""

import sys
import json
import numpy as np
import librosa
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt

def analyze_fingerprint(input_path, output_path=None, skip_image=False):
    """
    Analyze audio file for AI watermarks.
    
    Args:
        input_path: Path to input audio file
        output_path: Optional path for spectrogram image
        skip_image: If True, skip image generation
    """
    try:
        # Load audio file
        print(f"Loading audio: {input_path}")
        y, sr = librosa.load(input_path, sr=None)
        duration = len(y) / sr
        nyquist_freq = sr / 2
        
        print(f"Sample rate: {sr} Hz, Duration: {duration:.2f}s, Nyquist: {nyquist_freq:.1f} Hz")
        
        # Compute STFT with reduced resolution for faster processing
        # n_fft=1024 gives 513 frequency bins (vs 1025 with 2048) - still enough for 18-22kHz range
        # hop_length=1024 gives fewer time bins - faster and still clear for visualization
        n_fft = 1024
        hop_length = 1024
        stft = librosa.stft(y, n_fft=n_fft, hop_length=hop_length)
        magnitude = np.abs(stft)
        frequencies = librosa.fft_frequencies(sr=sr, n_fft=n_fft)
        
        # Define frequency ranges
        # Watermark range: 18-22 kHz
        # Reference range: 14-18 kHz
        watermark_min = 18000
        watermark_max = 22000
        reference_min = 14000
        reference_max = 18000
        
        # Find frequency indices
        watermark_idx = (frequencies >= watermark_min) & (frequencies <= watermark_max)
        reference_idx = (frequencies >= reference_min) & (frequencies <= reference_max)
        
        # Calculate energy in each range
        watermark_energy = np.mean(magnitude[watermark_idx, :])
        reference_energy = np.mean(magnitude[reference_idx, :])
        
        # Calculate ratios
        energy_ratio = watermark_energy / reference_energy if reference_energy > 0 else 0
        
        # Calculate frame-by-frame ratios
        watermark_frames = magnitude[watermark_idx, :]
        reference_frames = magnitude[reference_idx, :]
        
        frame_ratios = []
        for i in range(watermark_frames.shape[1]):
            wm_energy = np.mean(watermark_frames[:, i])
            ref_energy = np.mean(reference_frames[:, i]) if reference_frames.shape[1] > i else 0
            if ref_energy > 0:
                frame_ratios.append(wm_energy / ref_energy)
        
        frame_ratios = np.array(frame_ratios)
        
        # Calculate statistics
        mean_frame_ratio = np.mean(frame_ratios) if len(frame_ratios) > 0 else 0
        median_frame_ratio = np.median(frame_ratios) if len(frame_ratios) > 0 else 0
        max_frame_ratio = np.max(frame_ratios) if len(frame_ratios) > 0 else 0
        
        # Watermark to reference ratio
        watermark_to_reference_ratio = watermark_energy / reference_energy if reference_energy > 0 else 0
        median_watermark_to_reference = np.median(frame_ratios) if len(frame_ratios) > 0 else 0
        
        # Calculate frame percentages
        baseline_ratio = 0.18  # Clean audio baseline
        very_low_threshold = 0.10
        elevated_threshold = 0.25
        higher_threshold = 0.35
        
        frames_above_very_low = np.sum(frame_ratios > very_low_threshold) / len(frame_ratios) * 100 if len(frame_ratios) > 0 else 0
        frames_above_baseline = np.sum(frame_ratios > baseline_ratio) / len(frame_ratios) * 100 if len(frame_ratios) > 0 else 0
        frames_watermark_higher = np.sum(frame_ratios > higher_threshold) / len(frame_ratios) * 100 if len(frame_ratios) > 0 else 0
        frames_watermark_elevated = np.sum(frame_ratios > elevated_threshold) / len(frame_ratios) * 100 if len(frame_ratios) > 0 else 0
        suspicious_frames = np.sum(frame_ratios > 0.5) / len(frame_ratios) * 100 if len(frame_ratios) > 0 else 0
        
        # Determine status
        if watermark_to_reference_ratio > 0.35 or frames_watermark_higher > 15:
            status = "watermarked"
        elif watermark_to_reference_ratio > 0.25 or frames_watermark_elevated > 10:
            status = "suspicious"
        else:
            status = "clean"
        
        # Prepare result FIRST (before spectrogram generation)
        result = {
            "sampleRate": int(sr),
            "duration": round(duration, 2),
            "nyquistFreq": round(nyquist_freq, 1),
            "watermarkEnergy": round(float(watermark_energy), 6),
            "energyRatio": round(float(energy_ratio), 4),
            "meanFrameRatio": round(float(mean_frame_ratio), 4),
            "medianFrameRatio": round(float(median_frame_ratio), 4),
            "maxFrameRatio": round(float(max_frame_ratio), 4),
            "watermarkToReferenceRatio": round(float(watermark_to_reference_ratio), 4),
            "medianWatermarkToReference": round(float(median_watermark_to_reference), 4),
            "framesWatermarkHigherPercent": round(float(frames_watermark_higher), 2),
            "framesWatermarkElevatedPercent": round(float(frames_watermark_elevated), 2),
            "framesAboveVeryLowPercent": round(float(frames_above_very_low), 2),
            "framesAboveBaselinePercent": round(float(frames_above_baseline), 2),
            "suspiciousFramesPercent": round(float(suspicious_frames), 2),
            "status": status
        }
        
        # Generate spectrogram if requested (AFTER calculating results)
        if not skip_image and output_path:
            try:
                print(f"Generating spectrogram: {output_path}", flush=True)
                # Use smaller figure and lower DPI for faster generation
                fig, ax = plt.subplots(figsize=(8, 4))  # Smaller figure
                
                # Downsample for faster rendering - limit to 300 time bins max
                # This gives ~150,000-200,000 points instead of millions - still clear for visualization
                max_time_bins = 300  # Reduced from 1000 - enough for musician visualization
                if magnitude.shape[1] > max_time_bins:
                    step = magnitude.shape[1] // max_time_bins
                    magnitude_display = magnitude[:, ::step]
                    hop_display = hop_length * step
                else:
                    magnitude_display = magnitude
                    hop_display = hop_length
                
                img = librosa.display.specshow(
                    librosa.amplitude_to_db(magnitude_display, ref=np.max),
                    y_axis='hz',
                    x_axis='time',
                    sr=sr,
                    hop_length=hop_display,
                    ax=ax,
                    cmap='viridis'  # Clear colormap: dark purple/blue = low, yellow/green = high
                )
                
                # Add frequency range markers
                ax.axhline(y=watermark_min, color='r', linestyle='--', linewidth=1.5, label='Watermark (18-22 kHz)')
                ax.axhline(y=watermark_max, color='r', linestyle='--', linewidth=1.5)
                ax.axhline(y=reference_min, color='g', linestyle='--', linewidth=1.5, label='Reference (14-18 kHz)')
                ax.axhline(y=reference_max, color='g', linestyle='--', linewidth=1.5)
                ax.set_ylim([0, 24000])
                
                # Add status text with dark theme colors
                status_text = f"Status: {status.upper()}\nRatio: {watermark_to_reference_ratio:.3f}"
                ax.text(0.02, 0.98, status_text, transform=ax.transAxes, 
                       verticalalignment='top', bbox=dict(boxstyle='round', facecolor='black', alpha=0.6, ec='none'),
                       fontsize=10, fontweight='bold', color='white')
                
                # Colorbar with white text
                cbar = plt.colorbar(img, ax=ax, format='%+2.0f dB')
                cbar.ax.yaxis.set_tick_params(color='white')
                cbar.ax.yaxis.label.set_color('white')
                plt.setp(plt.getp(cbar.ax.axes, 'yticklabels'), color='white')
                
                ax.set_title('Audio Spectrogram - Watermark Analysis', fontsize=12, fontweight='bold', color='white')
                ax.set_xlabel('Time', color='white')
                ax.set_ylabel('Frequency (Hz)', color='white')
                ax.tick_params(axis='x', colors='white')
                ax.tick_params(axis='y', colors='white')
                ax.spines['bottom'].set_color('white')
                ax.spines['top'].set_color('white')
                ax.spines['left'].set_color('white')
                ax.spines['right'].set_color('white')
                
                ax.legend(loc='upper right', fontsize=9, framealpha=0.7, facecolor='black', edgecolor='white', labelcolor='white')
                plt.tight_layout()
                
                # Save with lower DPI for faster generation and smaller file size
                plt.savefig(output_path, dpi=60, bbox_inches='tight', facecolor='#1e293b')  # slate-800 background
                plt.close(fig)
                print(f"Spectrogram saved: {output_path}", flush=True)
            except Exception as e:
                print(f"Warning: Could not generate spectrogram: {e}", file=sys.stderr, flush=True)
                # Continue even if spectrogram fails
        
        # Print JSON result LAST (so API can parse it)
        print(json.dumps(result), flush=True)
        return result
        
    except Exception as e:
        error_msg = f"Analysis error: {str(e)}"
        print(error_msg, file=sys.stderr)
        result = {"success": False, "error": error_msg}
        print(json.dumps(result))
        return result

if __name__ == "__main__":
    # Parse arguments correctly
    # API sends: [script, input, output, '--json'] OR [script, input, '--json']
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Usage: analyze_fingerprint.py <input> [output_image] [--json]"}))
        sys.exit(1)
    
    input_path = sys.argv[1]
    
    # Determine output_path and skip_image
    # --json flag means output JSON, but we still generate image if output_path is provided
    has_json_flag = '--json' in sys.argv
    
    # Find output_path (it's the argument that's not --json and not the script name or input)
    output_path = None
    for arg in sys.argv[2:]:
        if arg != '--json' and not arg.startswith('-'):
            output_path = arg
            break
    
    # Only skip image if output_path is not provided (or explicitly skipped)
    skip_image = (output_path is None)
    
    result = analyze_fingerprint(input_path, output_path, skip_image)
    sys.exit(0 if "error" not in result else 1)

