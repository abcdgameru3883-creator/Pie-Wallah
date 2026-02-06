import { Link, useLocation } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import MobileSidebar from "./MobileSidebar";
import { bottomNavLinks, sidebarNavLinks } from "@/constants/navigation";

// Dark mode state and logic
const useDarkMode = () => {
  const [isDark, setIsDark] = useState(() => {
    // Initialise from localStorage or system preference
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored) return stored === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return { isDark, setIsDark };
};

// Dark mode toggle component
const DarkModeToggle = ({ isDark, setIsDark }: { isDark: boolean; setIsDark: (value: boolean) => void }) => {
  return (
    <button
      onClick={() => setIsDark(!isDark)}
      aria-label="Toggle dark mode"
      className="rounded-full p-2 hover:bg-muted/50 transition-all duration-300 hover-lift focus-ring"
    >
      <div className="relative w-5 h-5">
        <Sun className={`absolute inset-0 h-5 w-5 text-foreground transition-all duration-300 ${isDark ? 'opacity-0 scale-0 rotate-90' : 'opacity-100 scale-100 rotate-0'}`} />
        <Moon className={`absolute inset-0 h-5 w-5 text-foreground transition-all duration-300 ${!isDark ? 'opacity-0 scale-0 -rotate-90' : 'opacity-100 scale-100 rotate-0'}`} />
      </div>
    </button>
  );
};

const Navbar = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasEnrolledBatches, setHasEnrolledBatches] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { isDark, setIsDark } = useDarkMode();

  // Check if user has enrolled batches (you can implement this logic based on your auth/user data)
  useEffect(() => {
    // This is a placeholder - implement based on your actual user data
    const checkEnrolledBatches = () => {
      // Example: check from localStorage, context, or API
      const userBatches = localStorage.getItem('user_batches');
      setHasEnrolledBatches(!!userBatches && JSON.parse(userBatches).length > 0);
    };
    
    checkEnrolledBatches();
    // Listen for storage changes in case batches are updated
    window.addEventListener('storage', checkEnrolledBatches);
    return () => window.removeEventListener('storage', checkEnrolledBatches);
  }, []);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled 
          ? 'border-b border-border/50 bg-background/90 backdrop-blur-xl shadow-elevation-1' 
          : 'border-b border-transparent bg-background/60 backdrop-blur-sm'
      } supports-[backdrop-filter]:bg-background/60`}>
        <div className="container mx-auto px-6">
          <div className="flex h-14 items-center justify-between">
            {/* Mobile Sidebar Button */}
            <div className="md:hidden">
              <MobileSidebar hasEnrolledBatches={hasEnrolledBatches} />
            </div>
            
            {/* Logo/Text */}
            <div className="flex items-center gap-2 group md:ml-0 ml-2">
  <Link to="/" className="flex items-center gap-2 transition-transform duration-300">
    <img
      src="/logo.png"
      alt="Epic Verse logo"
      className="hidden md:block h-8 w-8 rounded-xl border border-border/50 bg-background"
    />
    <span className="text-lg font-semibold tracking-tight text-foreground leading-none">
      Epic Verse
    </span>
  </Link>
</div>


            {/* Desktop Navigation */}
            <div className="hidden rounded-full border border-border/40 bg-background/60 px-1.5 py-1 shadow-elevation-1 backdrop-blur-sm md:flex md:items-center md:gap-0.5 transition-all duration-300 hover:shadow-elevation-2">
              {sidebarNavLinks.map((link, index) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300 hover-lift ${
                    isActive(link.path)
                      ? "bg-foreground text-background shadow-elevation-1"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                  style={{
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  <link.icon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110" />
                  <span className="hidden lg:inline transition-all duration-300">{link.label}</span>
                </Link>
              ))}
            </div>

            {/* Dark Mode Toggle */}
            <DarkModeToggle isDark={isDark} setIsDark={setIsDark} />
          </div>

        </div>
      </nav>

      {/* Mobile Bottom Navigation - Flutter Style */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-background border-t border-border/20 md:hidden">
        <div className="flex items-center justify-around py-1">
          {bottomNavLinks.map((link, index) => (
            <Link
              key={link.path}
              to={link.path}
              className={`group relative flex flex-col items-center justify-center min-w-0 flex-1 py-2 transition-all duration-200 ${
                isActive(link.path) 
                  ? "text-primary" 
                  : "text-muted-foreground"
              }`}
            >
              {/* Icon container */}
              <div className={`relative mb-1 transition-all duration-200 ${
                isActive(link.path) 
                  ? "scale-110" 
                  : "scale-100 group-hover:scale-105"
              }`}>
                <link.icon className={`h-6 w-6 transition-all duration-200 ${
                  isActive(link.path) 
                    ? "text-primary" 
                    : "text-muted-foreground group-hover:text-foreground"
                }`} />
                
                {/* Active indicator - subtle dot */}
                {isActive(link.path) && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </div>
              
              {/* Label */}
              <span className={`text-xs transition-all duration-200 ${
                isActive(link.path) 
                  ? "text-primary font-medium" 
                  : "text-muted-foreground group-hover:text-foreground"
              }`}>
                {link.label}
              </span>
            </Link>
          ))}
        </div>
        
        {/* Safe area inset for notched screens */}
        <div className="h-4 bg-background" style={{ height: 'env(safe-area-inset-bottom, 16px)' }} />
      </div>
    </>
  );
};

export default Navbar;
