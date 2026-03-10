import { Terminal, LayoutDashboard, Code2, Search, ArrowRightLeft, GraduationCap, Sparkles, Map, Settings, LogOut, Zap, Target, Link2, Bug, History, GitBranch, Bot } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "ChatBot Maker", url: "/chatbot-maker", icon: Bot },
  { title: "Vibe Coder", url: "/editor", icon: Sparkles },
  { title: "Flow Builder", url: "/flow", icon: GitBranch },
];

const aiItems = [
  { title: "Code Snippets", url: "/ai/snippets", icon: Code2 },
  { title: "Code Analysis", url: "/ai/analysis", icon: Search },
  { title: "Code Converter", url: "/ai/converter", icon: ArrowRightLeft },
  { title: "Debug", url: "/debug", icon: Bug },
  { title: "History", url: "/history", icon: History },
];

const learnItems = [
  { title: "AI Courses", url: "/courses", icon: GraduationCap },
  { title: "Roadmap", url: "/roadmap", icon: Map },
  { title: "Code Goals", url: "/goals", icon: Target },
  { title: "URL Shortener", url: "/shortener", icon: Link2 },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { credits } = useCredits();

  const isActive = (path: string) => {
    if (path === "/editor") return location.pathname.startsWith("/editor");
    return location.pathname === path;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Brand */}
        <button
          onClick={toggleSidebar}
          className="flex items-center gap-2 px-4 py-4 w-full hover:bg-muted/50 transition-colors"
        >
          <Terminal className="h-5 w-5 text-primary shrink-0" />
          {!collapsed && (
            <span className="font-bold font-mono text-foreground text-sm">
              Devs<span className="text-primary">Flow</span>
            </span>
          )}
        </button>

        {/* Credits */}
        {credits !== null && !collapsed && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan/10 border border-cyan/20 w-fit">
              <Zap className="h-3 w-3 text-cyan" />
              <span className="text-xs font-mono text-cyan font-medium">{credits}</span>
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>AI Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {aiItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Learn</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {learnItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/settings"
                    className="hover:bg-muted/50"
                    activeClassName="bg-muted text-primary font-medium"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Settings</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && user && (
          <p className="text-xs text-muted-foreground truncate px-2 mb-1">{user.email}</p>
        )}
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-muted-foreground gap-2 text-xs">
          <LogOut className="h-3.5 w-3.5" />
          {!collapsed && "Sign out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
