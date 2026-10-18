import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';
import { CommandPalette } from './CommandPalette';
import { useAuth } from '@/contexts/AuthContext';

type NavbarProps = {
  publicTheme?: 'dark' | 'light';
  onTogglePublicTheme?: () => void;
};

export default function Navbar({ publicTheme, onTogglePublicTheme }: NavbarProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setHasScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLoginClick = () => navigate('/login');
  const handleLogoClick = () => {
    if (location.pathname !== '/home') {
      navigate('/home');
    }
  };

  const isPublicPage = location.pathname === '/home';
  const isAuthPage = location.pathname === '/login' || isPublicPage;

  return (
    <nav
      className={`fixed top-0 z-40 w-full transition-all duration-300 ${
        hasScrolled
          ? 'border-b border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900'
          : 'bg-white/80 backdrop-blur-md dark:bg-slate-900/80'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          className="flex items-center gap-2 text-left"
          onClick={handleLogoClick}
          aria-label="Go to homepage"
        >

          <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-2xl font-bold text-transparent dark:from-blue-300 dark:to-cyan-300">
            Isla Sakay
          </span>
        </button>

        <div className="flex items-center gap-4">
          {!isAuthPage && user && <CommandPalette />}
          {isPublicPage && publicTheme && onTogglePublicTheme && (
            <button
              type="button"
              onClick={onTogglePublicTheme}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Toggle theme"
            >
              <span className="inline-flex items-center gap-1 uppercase tracking-wide">
                {publicTheme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                {publicTheme === 'dark' ? 'Dark' : 'Light'}
              </span>
              <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${publicTheme === 'dark' ? 'bg-blue-600' : 'bg-cyan-400'}`}>
                <span
                  className={`absolute h-5 w-5 rounded-full bg-white shadow transition-transform ${publicTheme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </span>
            </button>
          )}
          {isAuthPage && (
            <Button
              onClick={handleLoginClick}
              className="bg-blue-600 text-white transition-all duration-300 hover:bg-blue-700"
            >
              Explore dashboard
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
