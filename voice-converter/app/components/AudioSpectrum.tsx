'use client';

import { useEffect, useRef, useState } from 'react';

interface AudioSpectrumProps {
  audioUrl: string;
  label: string;
  color: 'red' | 'green';
}

export default function AudioSpectrum({ audioUrl, label, color }: AudioSpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analyzeAudio();
  }, [audioUrl]);

  const analyzeAudio = async () => {
    if (!canvasRef.current) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Fetch audio file
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();

      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Get audio data (use first channel)
      const audioData = audioBuffer.getChannelData(0);
      
      // Calculate FFT (use smaller size for speed)
      const fftSize = 4096; // Good balance between resolution and speed
      const frequencyData = calculateFFT(audioData, fftSize, audioBuffer.sampleRate);

      // Draw spectrum
      drawSpectrum(frequencyData, audioBuffer.sampleRate);

      setIsAnalyzing(false);
    } catch (err) {
      console.error('Audio analysis error:', err);
      setError('Kunne ikke analysere audio');
      setIsAnalyzing(false);
    }
  };

  const calculateFFT = (audioData: Float32Array, fftSize: number, sampleRate: number): Float32Array => {
    // Fast approximation: Take single sample from middle
    const offset = Math.floor(audioData.length / 2);
    const slice = audioData.slice(offset, offset + fftSize);
    
    // Apply Hanning window
    const windowed = new Float32Array(fftSize);
    for (let i = 0; i < slice.length; i++) {
      const windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / (slice.length - 1)));
      windowed[i] = slice[i] * windowValue;
    }
    
    // Calculate magnitude spectrum - optimized
    const magnitudes = new Float32Array(fftSize / 2);
    const step = 8; // Only calculate every 8th bin for speed
    
    for (let k = 0; k < fftSize / 2; k += step) {
      let sumReal = 0;
      let sumImag = 0;
      
      // Subsample for speed (every 4th sample)
      for (let n = 0; n < windowed.length; n += 4) {
        const angle = (2 * Math.PI * k * n) / fftSize;
        sumReal += windowed[n] * Math.cos(angle);
        sumImag -= windowed[n] * Math.sin(angle);
      }
      
      const magnitude = Math.sqrt(sumReal * sumReal + sumImag * sumImag);
      
      // Fill in this bin and interpolate neighbors
      for (let j = 0; j < step && k + j < magnitudes.length; j++) {
        magnitudes[k + j] = magnitude;
      }
    }

    // Smooth the spectrum for better visualization
    const smoothed = new Float32Array(magnitudes.length);
    for (let i = 0; i < magnitudes.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, i - 2); j < Math.min(magnitudes.length, i + 3); j++) {
        sum += magnitudes[j];
        count++;
      }
      smoothed[i] = sum / count;
    }

    return smoothed;
  };

  const drawSpectrum = (frequencyData: Float32Array, sampleRate: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = color === 'red' ? '#FEF2F2' : '#F0FDF4';
    ctx.fillRect(0, 0, width, height);

    // Calculate frequency bins
    const nyquist = sampleRate / 2;
    const binSize = nyquist / frequencyData.length;

    // ZOOM IN: Only show high frequency range (14-24 kHz) for visibility
    const displayMinFreq = 14000; // Start at 14 kHz
    const displayMaxFreq = Math.min(24000, nyquist); // End at Nyquist or 24 kHz
    
    const minBin = Math.floor(displayMinFreq / binSize);
    const maxBin = Math.ceil(displayMaxFreq / binSize);
    const displayData = frequencyData.slice(minBin, maxBin);

    // Find max magnitude IN DISPLAY RANGE ONLY
    let maxMag = 0;
    for (let i = 0; i < displayData.length; i++) {
      if (displayData[i] > maxMag) maxMag = displayData[i];
    }

    // Watermark region boundaries
    const watermarkStartFreq = 18000;
    const watermarkEndFreq = 22000;
    
    // Calculate positions in display range
    const getXPosition = (freq: number) => {
      return ((freq - displayMinFreq) / (displayMaxFreq - displayMinFreq)) * width;
    };
    
    const watermarkStartX = getXPosition(watermarkStartFreq);
    const watermarkEndX = getXPosition(watermarkEndFreq);

    // Highlight watermark zone
    ctx.fillStyle = color === 'red' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)';
    ctx.fillRect(watermarkStartX, 0, watermarkEndX - watermarkStartX, height);

    // Draw spectrum with LOG SCALE for better visibility
    ctx.beginPath();
    ctx.strokeStyle = color === 'red' ? '#DC2626' : '#16A34A';
    ctx.lineWidth = 2.5;

    for (let i = 0; i < displayData.length; i++) {
      const freq = displayMinFreq + (i * binSize);
      const x = getXPosition(freq);
      
      const magnitude = displayData[i];
      // Use log scale to amplify small differences
      const logMag = magnitude > 0 ? Math.log10(magnitude * 1000 + 1) : 0;
      const maxLogMag = Math.log10(maxMag * 1000 + 1);
      const normalizedMag = logMag / (maxLogMag + 0.0001);
      const y = height - (normalizedMag * height * 0.85);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Fill area under curve for better visibility
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = color === 'red' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(22, 163, 74, 0.1)';
    ctx.fill();

    // Draw watermark region labels (larger text)
    ctx.fillStyle = color === 'red' ? '#991B1B' : '#166534';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('← 18 kHz', watermarkStartX + 5, 25);
    ctx.fillText('22 kHz →', watermarkEndX - 65, 25);

    // Draw frequency axis labels
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('14 kHz', 5, height - 8);
    ctx.fillText(`${(displayMaxFreq / 1000).toFixed(0)} kHz`, width - 40, height - 8);

    // Draw prominent dashed lines for watermark boundaries
    ctx.setLineDash([8, 4]);
    ctx.strokeStyle = color === 'red' ? '#DC2626' : '#16A34A';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(watermarkStartX, 0);
    ctx.lineTo(watermarkStartX, height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(watermarkEndX, 0);
    ctx.lineTo(watermarkEndX, height);
    ctx.stroke();

    ctx.setLineDash([]);

    // Add "WATERMARK ZONE" label
    ctx.fillStyle = color === 'red' ? '#DC2626' : '#16A34A';
    ctx.font = 'bold 12px sans-serif';
    const zoneLabel = 'WATERMARK ZONE';
    const labelWidth = ctx.measureText(zoneLabel).width;
    const labelX = watermarkStartX + (watermarkEndX - watermarkStartX - labelWidth) / 2;
    ctx.fillText(zoneLabel, labelX, height - 25);
  };

  return (
    <div className={`border-2 rounded-lg p-3 ${
      color === 'red' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`font-bold text-sm ${
          color === 'red' ? 'text-red-700' : 'text-green-700'
        }`}>
          {label}
        </span>
        {isAnalyzing && (
          <span className="text-xs text-gray-600">Analyserer spektrum...</span>
        )}
      </div>
      
      {error ? (
        <div className="h-32 flex items-center justify-center text-red-600 text-sm">
          {error}
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          className="w-full h-auto"
        />
      )}

      <p className={`text-xs mt-2 font-semibold ${
        color === 'red' ? 'text-red-700' : 'text-green-700'
      }`}>
        {color === 'red' 
          ? '⚠️ Højere energi i 18-22 kHz = Fingerprints til stede' 
          : '✓ Lavere energi i 18-22 kHz = Fingerprints fjernet'}
      </p>
    </div>
  );
}

