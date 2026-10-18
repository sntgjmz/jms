import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { createNavigation } from '@/config/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
  category: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(0);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const navItems = createNavigation(user?.role);
  
  const commands: CommandItem[] = navItems.flatMap(item => {
    const items: CommandItem[] = [];
    
    if (item.path) {
      items.push({
        id: item.path,
        label: item.label,
        path: item.path,
        icon: item.icon,
        category: 'Pages',
      });
    }
    
    if (item.children) {
      item.children.forEach(child => {
        if (child.path) {
          items.push({
            id: child.path,
            label: `${item.label} > ${child.label}`,
            path: child.path,
            icon: child.icon,
            category: item.label,
          });
        }
      });
    }
    
    return items;
  });

  const filteredCommands = commands.filter(command =>
    command.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(open => !open);
      }
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
      
      if (open) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelected(s => (s + 1) % filteredCommands.length);
        }
        
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelected(s => (s - 1 + filteredCommands.length) % filteredCommands.length);
        }
        
        if (e.key === 'Enter') {
          e.preventDefault();
          const command = filteredCommands[selected];
          if (command) {
            navigate(command.path);
            setOpen(false);
            setSearch('');
            setSelected(0);
          }
        }
        
        if (e.key === 'Escape') {
          setOpen(false);
          setSearch('');
          setSelected(0);
        }
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, filteredCommands, selected, navigate]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelected(0);
    }
  }, [open]);

  const groupedCommands = filteredCommands.reduce((acc, command) => {
    if (!acc[command.category]) {
      acc[command.category] = [];
    }
    acc[command.category].push(command);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
        aria-label="Open command palette"
      >
        <Search className="h-4 w-4" />
        <span>Search...</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          <div className="flex items-center border-b border-slate-200 dark:border-slate-700 px-4">
            <Search className="h-5 w-5 text-gray-400 dark:text-slate-400 mr-2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for pages..."
              className="h-12 border-0 focus-visible:ring-0 text-base dark:text-slate-100"
              autoFocus
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto p-2">
            {filteredCommands.length === 0 ? (
               <div className="py-12 text-center text-sm text-gray-500 dark:text-slate-300">
                No results found for "{search}"
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, items]) => (
                <div key={category} className="mb-4 last:mb-0">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {category}
                  </div>
                  <div className="space-y-1">
                    {items.map((command) => {
                      const globalIndex = filteredCommands.indexOf(command);
                      return (
                        <button
                          key={command.id}
                          onClick={() => {
                            navigate(command.path);
                            setOpen(false);
                            setSearch('');
                            setSelected(0);
                          }}
                          onMouseEnter={() => setSelected(globalIndex)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors',
                            selected === globalIndex
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                              : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                          )}
                        >
                          {command.icon && (
                            <div className={cn(
                              'flex-shrink-0',
                              selected === globalIndex ? 'text-blue-600 dark:text-blue-300' : 'text-gray-400 dark:text-slate-500'
                            )}>
                              {command.icon}
                            </div>
                          )}
                          <span className="flex-1 text-sm font-medium">{command.label}</span>
                          {selected === globalIndex && (
                             <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span>Use arrow keys to navigate, Enter to select, Esc to close, ? for shortcuts</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Open command palette</span>
              <kbd className="rounded border px-2 py-1 text-xs">Ctrl/Cmd + K</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Navigate results</span>
              <kbd className="rounded border px-2 py-1 text-xs">Arrow Up/Down</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Go to selected page</span>
              <kbd className="rounded border px-2 py-1 text-xs">Enter</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Close dialogs</span>
              <kbd className="rounded border px-2 py-1 text-xs">Esc</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Open this shortcuts help</span>
              <kbd className="rounded border px-2 py-1 text-xs">?</kbd>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
