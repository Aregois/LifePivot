'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, PlusSquare, X, Download, AlertCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useLanguage } from './language-provider';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaInstallPrompt() {
  const { t } = useLanguage();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isChromeIOS, setIsChromeIOS] = useState(false);
  const [isFirefoxIOS, setIsFirefoxIOS] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  
  const pathname = usePathname();

  useEffect(() => {
    // 1. Check if already in standalone mode
    const isStandalone = 
      (window.navigator as any).standalone || 
      window.matchMedia('(display-mode: standalone)').matches;

    if (isStandalone) {
      return;
    }

    // 2. Check if dismissed recently (hide for 3 days after dismissal)
    const lastDismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (lastDismissed) {
      const parsedTime = parseInt(lastDismissed, 10);
      const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() - parsedTime < threeDaysInMs) {
        return;
      }
    }

    // 3. Detect iOS and specific browser engines
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);
    
    const chrome = /crios/.test(userAgent);
    const firefox = /fxios/.test(userAgent);
    setIsChromeIOS(chrome);
    setIsFirefoxIOS(firefox);

    // Detect general iOS in-app browsers (Telegram, Discord, Instagram, etc. which don't support Add to Home Screen directly)
    const inApp = ios && !chrome && !firefox && (
      /telegram|instagram|fb_iab|messenger|line|twitter|discord/.test(userAgent) || 
      (!/safari/.test(userAgent) && /applewebkit/.test(userAgent))
    );
    setIsInAppBrowser(inApp);

    if (ios) {
      // For iOS, show the prompt after a short delay (e.g. 3 seconds) so it doesn't interrupt loading
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // 4. Capture Android/Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a short delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeBeforeInstallPrompt);
    };
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
    function handleBeforeBeforeInstallPrompt(e: Event) {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the browser's install dialog
    await deferredPrompt.prompt();
    
    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA Install] User response: ${outcome}`);
    
    // Clear deferred prompt and hide ours
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  const getShareInstruction = () => {
    if (isChromeIOS) {
      return t('pwa.chrome_ios_share');
    }
    if (isFirefoxIOS) {
      return t('pwa.firefox_ios_share');
    }
    return t('pwa.safari_share');
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop with strong blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="absolute inset-0 bg-black/85 backdrop-blur-lg"
          />

          {/* Modal Content Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 150 }}
            className="relative overflow-hidden rounded-[2.5rem] bg-[#0E111F]/95 backdrop-blur-2xl border border-white/10 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_40px_rgba(0,240,255,0.08)] w-full max-w-sm mx-auto text-center z-10"
          >
            {/* Subtle top neon border accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-electric-blue via-neon-violet to-electric-blue opacity-80" />
            
            <button
              onClick={handleDismiss}
              className="absolute top-6 right-6 p-2 rounded-full text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              aria-label={t('pwa.dismiss_label')}
            >
              <X className="h-5 w-5" />
            </button>

            {/* Premium Icon */}
            <div className="mx-auto h-20 w-20 rounded-[2rem] bg-gradient-to-br from-electric-blue/20 to-neon-violet/20 border border-electric-blue/30 flex items-center justify-center text-electric-blue shadow-[0_0_30px_rgba(0,240,255,0.2)] mb-6">
              <Download className="h-9 w-9 text-white animate-pulse" />
            </div>

            <h3 className="font-black text-2xl text-white tracking-tight mb-2">{t('pwa.title')}</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              {t('pwa.desc')}
            </p>

            {/* Custom Instructions for iOS Users */}
            {isIOS ? (
              isInAppBrowser ? (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs rounded-[1.8rem] p-5 flex gap-3 items-start text-left">
                  <AlertCircle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                  <span className="leading-relaxed">
                    {t('pwa.in_app_warning')}
                  </span>
                </div>
              ) : (
                <div className="space-y-4 bg-white/[0.02] border border-white/5 rounded-[1.8rem] p-5 text-left">
                  <div className="flex items-start gap-4 text-xs text-gray-300">
                    <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0 mt-0.5 border border-white/5">
                      <Share className="h-4 w-4 text-electric-blue" />
                    </div>
                    <span className="leading-relaxed">
                      {t('pwa.step_share').replace('{shareInstruction}', getShareInstruction())}
                    </span>
                  </div>
                  
                  <div className="flex items-start gap-4 text-xs text-gray-300">
                    <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0 mt-0.5 border border-white/5">
                      <PlusSquare className="h-4 w-4 text-neon-violet" />
                    </div>
                    <span className="leading-relaxed">
                      {t('pwa.step_add')}
                    </span>
                  </div>
                </div>
              )
            ) : (
              /* Direct Install Trigger for Android/Chrome */
              deferredPrompt && (
                <div className="mt-4">
                  <button
                    onClick={handleInstallClick}
                    className="w-full bg-gradient-to-r from-electric-blue to-neon-violet hover:from-electric-blue/90 hover:to-neon-violet/90 text-white font-extrabold py-4 px-6 rounded-[1.8rem] text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_0_25px_rgba(0,240,255,0.3)] active:scale-[0.98]"
                  >
                    {t('pwa.install_now')}
                  </button>
                </div>
              )
            )}

            <button
              onClick={handleDismiss}
              className="mt-6 text-xs text-gray-500 hover:text-gray-400 font-bold uppercase tracking-widest transition-colors"
            >
              {t('pwa.maybe_later')}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
