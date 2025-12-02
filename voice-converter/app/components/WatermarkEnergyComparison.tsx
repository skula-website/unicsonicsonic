'use client';

import { useEffect, useState } from 'react';
import { getApiPath } from '../lib/api';

interface WatermarkEnergyComparisonProps {
  originalFile: File | null;
  cleanedFile: File | null;
  originalAnalysisMetrics?: any; // Optional cached metrics from removal process
}

export default function WatermarkEnergyComparison({ 
  originalFile, 
  cleanedFile,
  originalAnalysisMetrics
}: WatermarkEnergyComparisonProps) {
  const [analyzing, setAnalyzing] = useState(true);
  const [originalEnergy, setOriginalEnergy] = useState(0);
  const [cleanedEnergy, setCleanedEnergy] = useState(0);
  const [reduction, setReduction] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!originalFile || !cleanedFile) {
      console.log('⏸️ Waiting for both files...');
      return;
    }
    
    console.log('✓ Both files ready, starting analysis');
    analyzeFiles();
  }, [originalFile, cleanedFile, originalAnalysisMetrics]);

  const analyzeFiles = async () => {
    if (!originalFile || !cleanedFile) {
      setErrorMsg('Missing files');
      setAnalyzing(false);
      return;
    }

    setAnalyzing(true);
    setErrorMsg('');

    try {
      // Check if we have cached pre-analysis metrics (much faster!)
      let origRatio: number;
      
      if (originalAnalysisMetrics && originalAnalysisMetrics.current_ratio !== undefined) {
        // Use cached metrics from removal process
        origRatio = originalAnalysisMetrics.current_ratio;
        console.log('✅ Using cached original metrics (skipping re-analysis)');
        console.log('   Original ratio from cache:', origRatio);
      } else {
        // Fallback: analyze original file
        console.log('📊 Analyzing original file...');
        const origAnalysis = await analyzeWithBackend(originalFile);
        origRatio = origAnalysis.watermarkToReferenceRatio || 0;
      }
      
      // Always analyze cleaned file to verify removal
      console.log('📊 Analyzing cleaned file...');
      const cleanAnalysis = await analyzeWithBackend(cleanedFile);
      const cleanRatio = cleanAnalysis.watermarkToReferenceRatio || 0;

      console.log('✓ Comparison:', { 
        original: origRatio.toFixed(4), 
        cleaned: cleanRatio.toFixed(4),
        reduction: origRatio > 0 ? ((origRatio - cleanRatio) / origRatio * 100).toFixed(1) + '%' : 'N/A'
      });

      setOriginalEnergy(origRatio);
      setCleanedEnergy(cleanRatio);

      // Calculate reduction percentage
      const reductionPercent = origRatio > 0 
        ? ((origRatio - cleanRatio) / origRatio) * 100 
        : 0;
      setReduction(Math.max(0, Math.min(100, reductionPercent)));

    } catch (error) {
      console.error('Energy analysis error:', error);
      let errMsg = 'Unknown error occurred during analysis';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('AbortError')) {
          errMsg = `Request timeout after 5 minutes. The file (${originalFile ? (originalFile.size / (1024 * 1024)).toFixed(1) : 'unknown'} MB) may be too large for energy analysis. The cleaning process completed successfully, but the comparison analysis timed out.`;
        } else if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
          errMsg = `Network error: ${error.message}. This may be due to connection issues or server timeout. Check your internet connection and try again.`;
        } else if (error.message.includes('Analysis failed')) {
          errMsg = `Backend analysis failed: ${error.message}. The Python analysis script may have encountered an error processing the file.`;
        } else {
          errMsg = `Analysis error: ${error.message}`;
        }
      }
      
      setErrorMsg(errMsg);
      setOriginalEnergy(0);
      setCleanedEnergy(0);
      setReduction(0);
      
      console.warn('⚠️ Energy comparison failed:', errMsg);
    }

    setAnalyzing(false);
  };

  const analyzeWithBackend = async (file: File) => {
    console.log('🔍 analyzeWithBackend called with file:', file.name, file.size, file.type);
    
    // Call analyze API (same as Analyzer component)
    // Skip PNG generation to save disk space and processing time
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('skipImage', 'true');  // Skip PNG for energy comparison
    
    console.log('📤 Sending to API:', getApiPath('/api/analyze-fingerprint'));
    
    let timeoutId: NodeJS.Timeout | null = null;
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout
      
      const apiResponse = await fetch(getApiPath('/api/analyze-fingerprint'), {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      console.log('📥 API response:', apiResponse.status, apiResponse.ok);
      
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('❌ API error:', errorText);
        
        // Handle timeout specifically
        if (apiResponse.status === 504) {
          throw new Error('Analysis timeout - file too large for comparison');
        }
        
        throw new Error(`Analysis failed: ${errorText.substring(0, 100)}`);
      }
      
      const result = await apiResponse.json();
      return result;
    } catch (err) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      console.error('❌ Fetch error:', err);
      if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
        throw new Error('Analysis timeout - file too large for comparison');
      }
      throw new Error(`Failed to analyze: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Slettet - bruger nu backend API i stedet

  // Calculate remaining percentage based on original
  // If original ratio is 0.5 and cleaned is 0.05, that's 10% remaining
  const origPercent = 100; // Original er altid reference (100%)
  // Calculate what percentage of original energy remains
  const cleanPercent = originalEnergy > 0 
    ? Math.round((cleanedEnergy / originalEnergy) * 100)
    : 0;
  
  // Debug logging
  console.log('🔍 Energy Comparison Debug:', {
    originalEnergy,
    cleanedEnergy,
    cleanPercent,
    reduction: originalEnergy > 0 ? ((originalEnergy - cleanedEnergy) / originalEnergy * 100).toFixed(1) + '%' : 'N/A'
  });

  // Define success categories based on detection risk (not perfection)
  // Focus: Can Spotify/AI detection systems still identify this as watermarked?
  const getResultCategory = (percent: number): { 
    label: string; 
    color: string; 
    bgColor: string; 
    borderColor: string;
    description: string;
    riskLevel: string;
  } => {
    if (percent <= 10) {
      return {
        label: '✓ Success',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-500',
        description: 'Very low detection risk - safe for upload',
        riskLevel: 'Very Low Risk'
      };
    } else if (percent <= 20) {
      return {
        label: '✓ Acceptable',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-400',
        description: 'Low detection risk - likely safe for most platforms',
        riskLevel: 'Low Risk'
      };
    } else if (percent <= 40) {
      return {
        label: '⚠ OK, but not convincing',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-500',
        description: 'Moderate detection risk - may be flagged by AI systems',
        riskLevel: 'Moderate Risk'
      };
    } else {
      return {
        label: '❌ Not satisfactory',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-500',
        description: 'High detection risk - likely to be identified as AI-generated',
        riskLevel: 'High Risk'
      };
    }
  };
  
  const resultCategory = getResultCategory(cleanPercent);

  return (
    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-lg p-4">
      <h4 className="text-base font-bold text-gray-800 mb-2">
        📊 Before/After Comparison
      </h4>
      <p className="text-xs text-gray-600 mb-3 italic">
        Watermark energy in 18-22 kHz region (relative to original)
      </p>
      
      {analyzing ? (
        <div className="text-center py-8">
          <div 
            className="mb-2 text-lg md:text-xl font-bold"
            style={{
              color: '#ea580c', // orange-600
              animation: 'pulse 1s ease-in-out infinite',
              textShadow: '0 0 8px rgba(234, 88, 12, 0.5)',
            }}
          >
            🔬 Analyzing/verifying result - please wait...
          </div>
          <p className="text-xs text-gray-500">Using STFT time-frequency analysis</p>
          <p className="text-xs text-gray-400 mt-2">This may take several minutes for large files...</p>
        </div>
      ) : originalEnergy === 0 && cleanedEnergy === 0 ? (
        <div className="text-center py-6 text-red-600 bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <p className="font-bold mb-2">⚠️ Energy Analysis Failed</p>
          <p className="text-sm mb-3">Could not calculate watermark energy levels</p>
          {errorMsg && (
            <div className="bg-white border border-red-300 rounded p-3 mb-3 text-left">
              <p className="text-xs font-semibold text-red-800 mb-1">Error Details:</p>
              <p className="text-xs text-red-700 font-mono">{errorMsg}</p>
            </div>
          )}
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>Possible causes:</strong></p>
            <ul className="list-disc list-inside text-left space-y-0.5">
              <li>Request timeout - file may be too large for analysis</li>
              <li>Network connection issue</li>
              <li>Server processing error</li>
              <li>File format not supported</li>
            </ul>
            <p className="mt-2 text-gray-500">
              <strong>Note:</strong> Audio cleaning completed successfully. This error only affects the energy comparison report.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Before */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-red-700">⚠️ Original (Before Cleaning)</span>
              <span className="text-xs font-bold text-red-600">HIGH ENERGY</span>
            </div>
            <div className="bg-white rounded-lg overflow-hidden border-2 border-red-400 h-16 relative">
              <div 
                className="bg-gradient-to-r from-red-500 to-red-600 h-full flex items-center justify-center transition-all duration-1000 shadow-lg"
                style={{ width: '100%' }}
              >
                <span className="text-white font-bold text-2xl drop-shadow-md">100%</span>
              </div>
            </div>
          </div>

          {/* After */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-green-700">✓ Cleaned (After Cleaning)</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${resultCategory.bgColor} ${resultCategory.color} border ${resultCategory.borderColor}`}>
                {resultCategory.label}
              </span>
            </div>
            <div className="relative">
              {/* Labels above the bar */}
              <div className="relative h-12 mb-1">
                {/* 10% marker */}
                <div className="absolute left-[10%] -top-1 transform -translate-x-1/2">
                  <div className="w-px h-4 bg-green-600 mx-auto"></div>
                  <div className="text-center mt-1">
                    <div className="text-[9px] font-bold text-green-700">10%</div>
                    <div className="text-[8px] text-green-600 font-semibold">Very Low Risk</div>
                    <div className="text-[7px] text-gray-600 mt-0.5">Safe for upload</div>
                  </div>
                </div>
                
                {/* 20% marker */}
                <div className="absolute left-[20%] -top-1 transform -translate-x-1/2">
                  <div className="w-px h-4 bg-green-500 mx-auto"></div>
                  <div className="text-center mt-1">
                    <div className="text-[9px] font-bold text-green-600">20%</div>
                    <div className="text-[8px] text-green-600 font-semibold">Low Risk</div>
                    <div className="text-[7px] text-gray-600 mt-0.5">Likely safe</div>
                  </div>
                </div>
                
                {/* 40% marker */}
                <div className="absolute left-[40%] -top-1 transform -translate-x-1/2">
                  <div className="w-px h-4 bg-yellow-500 mx-auto"></div>
                  <div className="text-center mt-1">
                    <div className="text-[9px] font-bold text-yellow-700">40%</div>
                    <div className="text-[8px] text-yellow-600 font-semibold">Moderate Risk</div>
                    <div className="text-[7px] text-gray-600 mt-0.5">May be flagged</div>
                  </div>
                </div>
                
                {/* 100% marker (for reference) */}
                <div className="absolute right-0 -top-1">
                  <div className="w-px h-4 bg-red-500 mx-auto"></div>
                  <div className="text-center mt-1">
                    <div className="text-[9px] font-bold text-red-700">100%</div>
                    <div className="text-[8px] text-red-600 font-semibold">High Risk</div>
                    <div className="text-[7px] text-gray-600 mt-0.5">Will be detected</div>
                  </div>
                </div>
              </div>
              
              {/* The actual bar with background zones */}
              <div className="bg-white rounded-lg overflow-hidden border-2 border-green-400 h-16 relative">
                {/* Background with gradient zones */}
                <div className="absolute inset-0 flex">
                  <div className="w-[10%] bg-gradient-to-r from-green-100 to-green-200 border-r-2 border-green-400"></div>
                  <div className="w-[10%] bg-gradient-to-r from-green-200 to-green-300 border-r-2 border-green-500"></div>
                  <div className="w-[20%] bg-gradient-to-r from-yellow-100 to-yellow-200 border-r-2 border-yellow-400"></div>
                  <div className="flex-1 bg-gradient-to-r from-red-100 to-red-200"></div>
                </div>
                
                {/* Vertical marker lines */}
                <div className="absolute inset-0">
                  <div className="absolute left-[10%] top-0 bottom-0 w-0.5 bg-green-600 opacity-50"></div>
                  <div className="absolute left-[20%] top-0 bottom-0 w-0.5 bg-green-500 opacity-50"></div>
                  <div className="absolute left-[40%] top-0 bottom-0 w-0.5 bg-yellow-500 opacity-50"></div>
                </div>
                
                {/* Actual result bar */}
                <div className="relative h-full flex items-center z-20">
                  <div 
                    className={`h-full flex items-center justify-end pr-2 transition-all duration-1000 shadow-lg ${
                      cleanPercent <= 10 
                        ? 'bg-gradient-to-r from-green-500 to-green-600' 
                        : cleanPercent <= 20
                        ? 'bg-gradient-to-r from-green-400 to-green-500'
                        : cleanPercent <= 40
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                        : 'bg-gradient-to-r from-red-400 to-red-500'
                    }`}
                style={{ width: `${Math.max(cleanPercent, 3)}%` }}
              >
                    <span className={`font-bold text-lg ${
                      cleanPercent <= 10 || cleanPercent <= 20
                        ? 'text-white'
                        : cleanPercent <= 40
                        ? 'text-white'
                        : 'text-white'
                    } drop-shadow-md`}>{cleanPercent}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Result Message */}
          <div className={`border-2 rounded-lg p-4 text-center ${resultCategory.bgColor} ${resultCategory.borderColor}`}>
            <p className={`text-3xl font-bold mb-2 ${resultCategory.color}`}>
              {resultCategory.label}
            </p>
            <p className={`text-sm font-semibold mb-1 ${resultCategory.color}`}>
              {cleanPercent <= 10
                ? `${cleanPercent}% remaining - ${resultCategory.riskLevel}: Safe for upload to Spotify/streaming platforms`
                : cleanPercent <= 20
                ? `${cleanPercent}% remaining - ${resultCategory.riskLevel}: Likely safe, but consider re-cleaning for maximum security`
                : cleanPercent <= 40
                ? `${cleanPercent}% remaining - ${resultCategory.riskLevel}: May be detected by AI systems - re-cleaning recommended`
                : `${cleanPercent}% remaining - ${resultCategory.riskLevel}: High chance of AI detection - re-cleaning strongly recommended`}
            </p>
            <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-300">
              Calculated with Python STFT (18-22 kHz analysis)
            </p>
          </div>
        </div>
      )}
      
    </div>
  );
}

