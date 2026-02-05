import { useEffect, useRef, useCallback } from 'react';

// Detect if device is mobile (strict check - only true mobile devices)
const isMobileDevice = () => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  
  // Only check user agent - don't use touch or screen size to avoid false positives on desktop
  return mobileRegex.test(userAgent);
};

// Pre-create styles to avoid repeated DOM operations
const toastStyles = `
  #back-exit-toast {
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-weight: 500;
    letter-spacing: 0.3px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    opacity: 0;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
  }
  #back-exit-toast.show {
    opacity: 1;
    transform: translateX(-50%) translateY(-5px);
  }
`;

// Cache exit methods to avoid repeated checks
const getExitMethod = (() => {
  let cachedMethod: (() => void) | null = null;
  
  return () => {
    if (cachedMethod) return cachedMethod;
    
    // Method 1: Android PWA
    if ('app' in navigator && 'exitApp' in (navigator as any).app) {
      cachedMethod = () => (navigator as any).app.exitApp();
      return cachedMethod;
    }
    
    // Method 2: Cordova/PhoneGap
    if ('device' in window && (window as any).device.platform) {
      cachedMethod = () => {
        if ((window as any).navigator?.app) {
          (window as any).navigator.app.exitApp();
        }
      };
      return cachedMethod;
    }
    
    // Method 3: PWA installed on mobile
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  window.matchMedia('(display-mode: minimal-ui)').matches ||
                  ('standalone' in window.navigator && (window.navigator as any).standalone);
    
    if (isPWA) {
      cachedMethod = () => {
        window.close();
        setTimeout(() => window.location.href = 'about:blank', 50);
      };
      return cachedMethod;
    }
    
    // Method 4: Regular browsers
    cachedMethod = () => {
      window.close();
      setTimeout(() => window.location.href = 'about:blank', 50);
    };
    
    return cachedMethod;
  };
})();

export const useBackButtonExit = () => {
  const lastBackPressedRef = useRef<number>(0);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isToastShowingRef = useRef<boolean>(false);

  const showToast = useCallback(() => {
    if (isToastShowingRef.current) return;
    
    isToastShowingRef.current = true;
    
    // Add styles once
    if (!document.querySelector('#back-exit-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'back-exit-styles';
      styleEl.textContent = toastStyles;
      document.head.appendChild(styleEl);
    }
    
    // Get or create toast element
    let toast = document.querySelector('#back-exit-toast') as HTMLElement;
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'back-exit-toast';
      toast.textContent = 'Press back again to exit';
      document.body.appendChild(toast);
    }
    
    // Show toast with animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    
    // Auto-hide after 2 seconds
    toastTimeoutRef.current = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        isToastShowingRef.current = false;
      }, 200);
    }, 2000);
  }, []);

  const exitApp = useCallback(() => {
    // Clear any pending toast
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    // Hide toast immediately
    const toast = document.querySelector('#back-exit-toast') as HTMLElement;
    if (toast) {
      toast.classList.remove('show');
    }
    
    // Show confirmation and exit
    if (window.confirm('Exit app?')) {
      const exitMethod = getExitMethod();
      exitMethod();
    } else {
      // Reset state if user cancels
      isToastShowingRef.current = false;
      lastBackPressedRef.current = 0;
    }
  }, []);

  useEffect(() => {
    // Only initialize back button functionality on mobile devices
    if (!isMobileDevice()) {
      return;
    }
    
    const handleBackButton = (event: PopStateEvent) => {
      event.preventDefault();
      
      const currentTime = Date.now();
      const timeSinceLastBack = currentTime - lastBackPressedRef.current;
      
      if (timeSinceLastBack < 2000) {
        // Double back button pressed
        exitApp();
      } else {
        // First back button press
        lastBackPressedRef.current = currentTime;
        showToast();
      }
      
      // Prevent default back navigation
      window.history.pushState(null, '', window.location.pathname);
    };

    // Add initial history entry
    window.history.pushState(null, '', window.location.pathname);
    
    // Listen for popstate events
    window.addEventListener('popstate', handleBackButton, { passive: false });
    
    // Cleanup
    return () => {
      window.removeEventListener('popstate', handleBackButton);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [showToast, exitApp]);
};
