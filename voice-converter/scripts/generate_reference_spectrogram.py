#!/usr/bin/env python3
"""
Generate Reference Spectrogram
Creates an example spectrogram showing clean audio without watermarks.
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import librosa.display

def generate_reference_spectrogram(output_path):
    """
    Generate a reference spectrogram showing clean audio pattern.
    This represents what a clean audio file should look like.
    """
    # Create synthetic clean audio data
    # Simulate 3 seconds of audio at 44.1 kHz
    sr = 44100
    duration = 3.0
    t = np.linspace(0, duration, int(sr * duration))
    
    # Generate clean audio with energy primarily in lower frequencies
    # (typical of clean audio - no high frequency watermarks)
    y = (
        0.5 * np.sin(2 * np.pi * 440 * t) +  # A4 note
        0.3 * np.sin(2 * np.pi * 880 * t) +  # A5 note
        0.2 * np.sin(2 * np.pi * 1320 * t) + # E6 note
        0.1 * np.random.randn(len(t)) * 0.1  # Small noise
    )
    
    # Normalize
    y = y / np.max(np.abs(y))
    
    # Compute STFT with reduced resolution for faster generation
    n_fft = 1024  # Reduced from 2048 - still enough for visualization
    hop_length = 1024  # Increased from 512 - fewer time bins, faster
    stft = librosa.stft(y, n_fft=n_fft, hop_length=hop_length)
    magnitude = np.abs(stft)
    
    # Downsample time bins for faster rendering (max 300 bins)
    max_time_bins = 300
    if magnitude.shape[1] > max_time_bins:
        step = magnitude.shape[1] // max_time_bins
        magnitude = magnitude[:, ::step]
        hop_length = hop_length * step
    
    # Create figure - smaller for faster generation
    fig, ax = plt.subplots(figsize=(8, 4))
    
    # Display spectrogram
    img = librosa.display.specshow(
        librosa.amplitude_to_db(magnitude, ref=np.max),
        y_axis='hz',
        x_axis='time',
        sr=sr,
        hop_length=hop_length,
        ax=ax,
        cmap='viridis'  # Clear colormap: dark purple/blue = low, yellow/green = high
    )
    
    # Add frequency range markers
    watermark_min = 18000
    watermark_max = 22000
    reference_min = 14000
    reference_max = 18000
    
    ax.axhline(y=watermark_min, color='r', linestyle='--', linewidth=1.5, label='Watermark (18-22 kHz)')
    ax.axhline(y=watermark_max, color='r', linestyle='--', linewidth=1.5)
    ax.axhline(y=reference_min, color='g', linestyle='--', linewidth=1.5, label='Reference (14-18 kHz)')
    ax.axhline(y=reference_max, color='g', linestyle='--', linewidth=1.5)
    ax.set_ylim([0, 24000])
    
    # Add title and labels with dark theme colors
    ax.set_title('Reference: Clean Audio (No Watermarks)', fontsize=12, fontweight='bold', color='white')
    ax.set_xlabel('Time', color='white')
    ax.set_ylabel('Frequency (Hz)', color='white')
    ax.tick_params(axis='x', colors='white')
    ax.tick_params(axis='y', colors='white')
    ax.spines['bottom'].set_color('white')
    ax.spines['top'].set_color('white')
    ax.spines['left'].set_color('white')
    ax.spines['right'].set_color('white')
    
    ax.text(0.02, 0.98, 'Status: CLEAN\nLow energy above 18 kHz', 
            transform=ax.transAxes, verticalalignment='top',
            bbox=dict(boxstyle='round', facecolor='black', alpha=0.6, ec='none'),
            fontsize=10, fontweight='bold', color='white')
    
    # Colorbar with white text
    cbar = plt.colorbar(img, ax=ax, format='%+2.0f dB')
    cbar.ax.yaxis.set_tick_params(color='white')
    cbar.ax.yaxis.label.set_color('white')
    plt.setp(plt.getp(cbar.ax.axes, 'yticklabels'), color='white')
    
    ax.legend(loc='upper right', fontsize=9, framealpha=0.7, facecolor='black', edgecolor='white', labelcolor='white')
    plt.tight_layout()
    
    # Save with lower DPI for faster generation and smaller file size
    plt.savefig(output_path, dpi=60, bbox_inches='tight', facecolor='#1e293b')  # slate-800 background
    plt.close(fig)
    print(f"Reference spectrogram saved: {output_path}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: generate_reference_spectrogram.py <output_path>")
        sys.exit(1)
    
    output_path = sys.argv[1]
    generate_reference_spectrogram(output_path)
    print("✓ Reference spectrogram generated successfully")

