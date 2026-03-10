import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Profile, ChatbotProject } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Bot,
  LayoutDashboard,
  Wrench,
  MessageSquare,
  Settings,
  LogOut,
  Zap,
  Sparkles,
  Moon,
  Sun,
  GitBranch,
  Code2,
  Target,
  Gamepad2,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  profile: Profile | null;
  selectedProject?: ChatbotProject | null;
}

const navItems = [
  { id: 'overview', label: 'My Bots', icon: LayoutDashboard },
  { id: 'builder', label: 'Builder', icon: Wrench },
  { id: 'flow', label: 'Flow Builder', icon: GitBranch },
  { id: 'logs', label: 'Chat Logs', icon: MessageSquare },
  { id: 'api', label: 'API Guide', icon: Code2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function DashboardSidebar({
  activeTab,
  onTabChange,
  profile,
  selectedProject,
}: Omit<DashboardLayoutProps, 'children'>) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bf-theme') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'neon');
    if (theme === 'dark') root.classList.add('dark');
    if (theme === 'neon') root.classList.add('dark', 'neon');
    localStorage.setItem('bf-theme', theme);
  }, [theme]);

  const cycleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'neon' : 'light');
  };

  const getInitials = () => {
    if (profile?.display_name) return profile.display_name.slice(0, 2).toUpperCase();
    return 'U';
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo - click to toggle sidebar */}
        <div className={`h-16 flex items-center border-b border-sidebar-border ${collapsed ? 'justify-center px-0' : 'px-4'}`}>
          <button
            onClick={toggleSidebar}
            className={`flex items-center gap-2 hover:opacity-80 transition-opacity ${collapsed ? 'justify-center w-full' : ''}`}
          >
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="font-display font-bold text-lg whitespace-nowrap">BotForge</span>
            )}
          </button>
        </div>

        {/* Active Bot Indicator */}
        {!collapsed && selectedProject && (
          <div className="px-4 py-3 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md gradient-primary flex items-center justify-center shrink-0">
                <Bot className="h-3 w-3 text-primary-foreground" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-medium truncate">{selectedProject.bot_name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{selectedProject.mode}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => onTabChange(item.id)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools */}
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === 'tasks'}
                  onClick={() => onTabChange('tasks')}
                  tooltip="Tasks & Goals"
                >
                  <Target className="h-4 w-4" />
                  <span>Tasks & Goals</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === 'assistant'}
                  onClick={() => navigate('/assistant')}
                  tooltip="AI Assistant"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>AI Assistant</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === 'games'}
                  onClick={() => onTabChange('games')}
                  tooltip="Mini Games"
                >
                  <Gamepad2 className="h-4 w-4" />
                  <span>Mini Games</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Theme Toggle */}
        <div className={`px-4 py-2 ${collapsed ? 'flex justify-center' : ''}`}>
          <Button variant="ghost" size={collapsed ? 'icon' : 'sm'} onClick={cycleTheme} className="w-full justify-start gap-2">
            {theme === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {!collapsed && (
              <span className="text-xs capitalize">{theme} mode</span>
            )}
          </Button>
        </div>

        {/* Credits */}
        {!collapsed && (
          <div className="mt-auto p-4 border-t border-sidebar-border">
            <div className="rounded-lg bg-sidebar-accent/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-sidebar-foreground">Daily Credits</span>
                <Zap className="h-3 w-3 text-primary" />
              </div>
              <div className="text-2xl font-bold">{profile?.daily_credits ?? 50}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Resets daily
              </div>
            </div>
          </div>
        )}

        {/* User Menu */}
        <div className={`p-4 border-t border-sidebar-border ${collapsed ? 'mt-auto' : ''}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 hover:bg-sidebar-accent/50 rounded-lg p-2 transition-colors">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex-1 text-left overflow-hidden">
                    <div className="text-sm font-medium truncate">{profile?.display_name ?? 'User'}</div>
                    <div className="text-xs text-muted-foreground truncate">{profile?.company ?? 'Personal'}</div>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => onTabChange('settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export default function DashboardLayout({
  children,
  activeTab,
  onTabChange,
  profile,
  selectedProject,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          profile={profile}
          selectedProject={selectedProject}
        />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b px-4 gap-4 shrink-0">
            <SidebarTrigger />
            <h2 className="font-display font-semibold capitalize">
              {activeTab === 'assistant' ? 'AI Assistant' : navItems.find((n) => n.id === activeTab)?.label ?? 'Dashboard'}
            </h2>
          </header>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
