import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { X, Menu, Github, Linkedin, Instagram, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { sidebarNavLinks, bottomNavLinks } from "@/constants/navigation";

interface MobileSidebarProps {
  hasEnrolledBatches?: boolean;
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({ hasEnrolledBatches = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  // Handle navigation
  const handleNavigation = (path: string, link: any) => {
    navigate(path);
    setIsOpen(false);
  };

  // Filter navigation based on enrollment status
  const filteredNavLinks = sidebarNavLinks.filter(link => {
    // If user has enrolled batches, show all links
    if (hasEnrolledBatches) {
      return true;
    }
    // If user has no enrolled batches, show all links (batches will be shown in sidebar)
    return true;
  });

  return (
    <>
      {/* Mobile Menu Button */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0 bg-background/90 backdrop-blur-md border-border/50 shadow-lg hover-lift btn-smooth focus-ring"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4.5 w-4.5 transition-transform duration-300 hover:rotate-90" />
          </Button>
        </SheetTrigger>
          <SheetContent side="left" className="w-80 max-w-[85vw] p-0 bg-background/95 backdrop-blur-xl border-border/50 z-[60] transition-all duration-300 flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="p-6 pb-4 border-b border-border/30 flex-shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Pie Wallah logo"
                  className="h-10 w-10 rounded-xl border border-border/50 bg-background object-cover shadow-elevation-1 transition-transform duration-300 hover:scale-110"
                />
                <div>
                  <h2 className="text-lg font-semibold text-foreground transition-colors duration-300">Pie Wallah</h2>
                  <p className="text-sm text-muted-foreground transition-colors duration-300">Learn with the Best</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 min-h-0">
              <nav className="space-y-2">
                {filteredNavLinks.map((link, index) => (
                  <div
                    key={link.path}
                    onClick={() => handleNavigation(link.path, link)}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-300 hover-lift card-hover cursor-pointer ${
                      isActive(link.path)
                        ? "bg-primary text-primary-foreground shadow-elevation-1"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                    style={{
                      animationDelay: `${index * 50}ms`
                    }}
                  >
                    <link.icon className="h-5 w-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                    <span className="flex-1 transition-all duration-300">{link.label}</span>
                    {isActive(link.path) && (
                      <div className="h-2 w-2 rounded-full bg-current transition-all duration-300" />
                    )}
                  </div>
                ))}
              </nav>
            </div>

            {/* Sidebar Footer */}
            <div className="p-6 border-t border-border/30 flex-shrink-0">
              {/* Social Media Links */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-foreground mb-3 transition-colors duration-300">Connect With Us</h3>
                <div className="flex items-center gap-3">
                  {[
                    { icon: Twitter, href: "https://twitter.com/satyamrojhax", label: "Twitter" },
                    { icon: Instagram, href: "https://instagram.com/satyamrojha.dev", label: "Instagram" },
                    { icon: Linkedin, href: "https://linkedin.com/in/satyamrojhax", label: "LinkedIn" },
                    { icon: Github, href: "https://github.com/satyamrojhax", label: "GitHub" }
                  ].map((social, index) => (
                    <Button
                      key={social.label}
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 hover-lift btn-smooth focus-ring"
                      onClick={() => window.open(social.href, "_blank")}
                      aria-label={social.label}
                      style={{
                        animationDelay: `${index * 50}ms`
                      }}
                    >
                      <social.icon className="h-4 w-4 transition-transform duration-300 hover:scale-110" />
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Credits */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground transition-colors duration-300">
                  Designed and Developed by
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs text-primary hover:text-primary/80 p-0 h-auto transition-all duration-300 hover:scale-105"
                  onClick={() => window.open("https://instagram.com/satyamrojha.dev", "_blank")}
                >
                  Satyam RojhaX
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

      {/* Overlay for mobile when sidebar is open */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 z-[50] backdrop-blur-smooth transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default MobileSidebar;
