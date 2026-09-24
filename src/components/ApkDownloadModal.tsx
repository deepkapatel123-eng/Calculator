import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Download,
  Github,
  ExternalLink,
  CheckCircle2,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ApkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkDownloadModal: React.FC<ApkDownloadModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert(
        'To install directly on Android: Open Chrome menu (⋮) and tap "Install app" or "Add to Home screen".'
      );
    }
  };

  if (!isOpen) return null;

  const currentUrl = window.location.origin;
  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(currentUrl)}`;
  const githubRepoUrl = 'https://github.com/deepkapatel123-eng/Calculator';

  return (
    <div
      id="apk-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="apk-modal-container"
        className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight leading-tight">
                Download Application &amp; APK
              </h2>
              <p className="text-xs text-emerald-100/90">Download full project or install on phone</p>
            </div>
          </div>
          <button
            id="apk-modal-close-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 text-stone-800 text-xs">
          {/* Option 1: Direct Source Code & Project ZIP Download */}
          <div className="bg-emerald-50/80 border border-emerald-300 rounded-2xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
                <Download className="w-4 h-4 text-emerald-700" />
                <span>1. Download Application (.ZIP)</span>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                Instant ZIP
              </span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              Download the complete, ready-to-run application source code with all components, styles, UPI features, and Android build configs:
            </p>
            <a
              id="download-app-zip-btn"
              href="/calculator-app.zip"
              download="calculator-app.zip"
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all text-center"
            >
              <Download className="w-4 h-4" />
              <span>Download calculator-app.zip</span>
            </a>
          </div>

          {/* Option 2: Direct Android Install (100% Offline App, No Play Store needed) */}
          <div className="bg-emerald-50/70 border border-emerald-300 rounded-2xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>1. ફોનમાં સીધી ઑફલાઇન App ઇન્સ્ટોલ કરો</span>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                100% Offline
              </span>
            </div>
            <p className="text-stone-700 leading-relaxed text-xs">
              ઇન્ટરનેટ કે ડેટા વગર <strong>સંપૂર્ણપણે ઑફલાઇન (Airplane Mode માં પણ)</strong> ચલાવવા માટે નીચેના બટન પર ક્લિક કરીને નવી ટેબ ખોલો:
            </p>
            <a
              id="open-standalone-app-btn"
              href={window.location.origin}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all text-center"
            >
              <ExternalLink className="w-4 h-4" />
              <span>નવી ટેબમાં ખોલો (Open in New Tab)</span>
            </a>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-[11px] text-stone-700 space-y-1">
              <p className="font-semibold text-emerald-900">કેવી રીતે ઇન્સ્ટોલ કરવું:</p>
              <p>૧. નવી ટેબમાં Chrome ના ઉપર જમણી બાજુના <strong>ત્રણ ટપકાં (⋮)</strong> પર ક્લિક કરો.</p>
              <p>૨. <strong>&quot;Install app&quot;</strong> અથવા <strong>&quot;Add to Home screen&quot;</strong> પર ટેપ કરો.</p>
              <p className="text-emerald-700 font-medium">✓ ફોનમાં સેમસંગ કેલ્ક્યુલેટર જેવી ઓરિજિનલ એપ બની જશે અને નેટ વગર પણ ચાલશે!</p>
            </div>
          </div>

          {/* Option 3: GitHub Releases Direct .APK Download */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
                <Github className="w-4 h-4 text-stone-800" />
                <span>2. GitHub પરથી સીધી Calculator.apk મેળવો</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 font-semibold px-2 py-0.5 rounded">
                .APK File
              </span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              તમારા GitHub રિપોઝિટરી <strong>deepkapatel123-eng/Calculator</strong> માં ઑટોમેટિક એન્ડ્રોઇડ એક્શન જોડાયેલું છે જે સીધી <strong>.apk</strong> ફાઇલ જનરેટ કરે છે:
            </p>
            <div className="bg-white p-2.5 rounded-xl border border-stone-200 space-y-1 text-[11px] text-stone-600">
              <div className="flex items-start gap-1.5">
                <span className="font-bold text-emerald-700">૧.</span>
                <span>GitHub પર જઈને ઉપર <strong>Releases</strong> અથવા <strong>Actions</strong> ટેબ પર ક્લિક કરો.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="font-bold text-emerald-700">૨.</span>
                <span>ત્યાંથી <strong>Calculator.apk</strong> સીધી ફોનમાં ડાઉનલોડ કરી Install કરો.</span>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                id="apk-github-releases-link"
                href={`${githubRepoUrl}/releases`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-black active:scale-[0.99] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all text-center"
              >
                <Download className="w-4 h-4" />
                <span>GitHub Releases (APK)</span>
              </a>
              <a
                id="apk-github-actions-link"
                href={`${githubRepoUrl}/actions`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium text-xs flex items-center justify-center gap-1.5 border border-stone-300 transition-all text-center"
              >
                <Github className="w-4 h-4" />
                <span>Actions</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
