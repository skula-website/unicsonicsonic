'use client';

import { useState } from 'react';
import FingerprintAnalyzer from '../components/FingerprintAnalyzer';
import AudioCleaner from '../components/AudioCleaner';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [showCleaner, setShowCleaner] = useState(false);
  const [fileForCleaner, setFileForCleaner] = useState<File | null>(null);
  const [fileForAnalyzer, setFileForAnalyzer] = useState<File | null>(null);

  const handleWaitlistSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For nu: bare vis success
    // Senere: integrer med Mailchimp/SendGrid
    console.log('Waitlist signup:', email);
    setSubscribed(true);
    
    // TODO: Send til backend/Mailchimp
    // await fetch('/api/waitlist', { method: 'POST', body: JSON.stringify({ email }) });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Beta Banner */}
        <div className="mb-8 text-center">
          <span className="inline-block px-4 py-2 bg-yellow-100 border-2 border-yellow-400 rounded-full text-yellow-800 font-bold text-sm">
            🎉 FREE BETA - Limited Time Offer
          </span>
        </div>

        {/* Main Headline */}
        <div className="text-center mb-16">
          <div className="flex justify-center items-center gap-4 mb-6">
            <img src="/unicsonic-logo.svg" alt="UnicSonic" className="w-20 h-20" />
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
              UnicSonic
            </h1>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-700 mb-6">
            Professional Audio Tools
            <br />
            <span className="bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
              for Music Creators
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Analyze and process your AI-generated music with professional-grade tools.
            Free during beta, no signup required.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Fingerprint Analysis Tool */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow border-2 border-transparent hover:border-purple-200">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Fingerprint Analysis
            </h2>
            <p className="text-gray-600 mb-6">
              Detect AI watermarks in your audio using advanced STFT time-frequency analysis.
              Get professional spectrograms and detailed reports.
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-sm text-gray-700">Time-frequency spectral analysis</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-sm text-gray-700">Professional spectrograms & reports</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-sm text-gray-700">Verify premium subscriptions</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-sm text-gray-700">CD-quality processing (44.1kHz)</span>
              </div>
            </div>

            <button
              onClick={() => setShowAnalyzer(true)}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-[1.02]"
            >
              Launch Analyzer →
            </button>
          </div>

          {/* Fingerprint Removal Tool */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow border-2 border-transparent hover:border-blue-200">
            <div className="text-5xl mb-4">🧹</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Fingerprint Removal
            </h2>
            <p className="text-gray-600 mb-6">
              Remove AI-generated watermarks and prepare your music for professional distribution.
              No audible quality loss.
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-sm text-gray-700">Multi-layer fingerprint removal</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-sm text-gray-700">Spectral + metadata cleaning</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-sm text-gray-700">Distribution-ready output</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-sm text-gray-700">Before/after comparison</span>
              </div>
            </div>

            <button
              onClick={() => setShowCleaner(true)}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-[1.02]"
            >
              Launch Remover →
            </button>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Upload Your Audio</h3>
              <p className="text-sm text-gray-600">
                Drag and drop or select your AI-generated music file. Supports WAV, MP3, M4A, FLAC.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">2</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Process & Analyze</h3>
              <p className="text-sm text-gray-600">
                Our algorithms analyze or clean your audio using professional-grade processing.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">3</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Download Results</h3>
              <p className="text-sm text-gray-600">
                Get your analysis report or cleaned audio file. Ready for distribution.
              </p>
            </div>
          </div>
        </div>

        {/* Beta Limitations */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-6 mb-12">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-xl">⚡</span>
            Beta Limitations
          </h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p>• <strong>3 files per day</strong> per IP address (resets every 24 hours)</p>
            <p>• <strong>Max 5 minutes</strong> per file</p>
            <p>• <strong>Max 10MB</strong> file size</p>
            <p className="text-xs text-gray-600 mt-3">
              Join our waitlist below to be notified when we launch unlimited premium plans.
            </p>
          </div>
        </div>

        {/* Waitlist Signup */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">
            Join the Waitlist
          </h2>
          <p className="mb-6 text-blue-100">
            Be the first to know when we launch premium features: longer files, batch processing, 
            audio mastering, and more.
          </p>
          
          {!subscribed ? (
            <form onSubmit={handleWaitlistSignup} className="max-w-md mx-auto flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@email.dk"
                required
                className="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-white text-blue-600 rounded-lg font-bold hover:bg-blue-50 transition-colors"
              >
                Notify Me
              </button>
            </form>
          ) : (
            <div className="max-w-md mx-auto bg-white/20 rounded-lg p-4">
              <p className="font-bold">✓ You're on the list!</p>
              <p className="text-sm text-blue-100 mt-1">We'll email you when premium features launch.</p>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center text-sm text-gray-600">
          <p>
            <strong>Note:</strong> These tools are for quality assurance and verification purposes.
            Use only with your own content or properly licensed material.
          </p>
        </div>
      </div>

      {/* Modals */}
      {showAnalyzer && (
        <FingerprintAnalyzer 
          isOpen={showAnalyzer}
          onClose={() => {
            setShowAnalyzer(false);
            setFileForAnalyzer(null);
          }}
          onOpenCleaner={(file) => {
            setShowAnalyzer(false);
            setFileForCleaner(file || null);
            setShowCleaner(true);
          }}
          preloadedFile={fileForAnalyzer || undefined}
        />
      )}

      {showCleaner && (
        <AudioCleaner 
          onClose={() => {
            setShowCleaner(false);
            setFileForCleaner(null);
          }}
          onOpenAnalyzer={(file) => {
            setShowCleaner(false);
            setFileForAnalyzer(file || null);
            setShowAnalyzer(true);
          }}
          preloadedFile={fileForCleaner || undefined}
        />
      )}
    </div>
  );
}

