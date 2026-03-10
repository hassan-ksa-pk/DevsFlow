import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { ChatbotProject, Profile } from "@/types/database";

import DashboardOverview from "@/components/dashboard/DashboardOverview";
import ChatbotBuilder from "@/components/dashboard/ChatbotBuilder";
import CreateBotWizard from "@/components/dashboard/CreateBotWizard";

type LocationState = {
  tab?: string;
  projectId?: string;
  openWizard?: boolean;
};

export default function ChatBotMaker() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state as LocationState) || {};
  const [activeTab, setActiveTab] = useState<"overview" | "builder">(() => (state.tab === "builder" ? "builder" : "overview"));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<ChatbotProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<ChatbotProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(!!state.openWizard);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const nextTab = state.tab;
    if (nextTab === "builder" || nextTab === "overview") setActiveTab(nextTab);
    if (state.openWizard) setWizardOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  useEffect(() => {
    if (user) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();

      if (profileError && (profileError as any).code !== "PGRST116") throw profileError;
      setProfile((profileData as Profile) || null);

      const { data: projectsData, error: projectsError } = await supabase
        // Supabase types in this repo may not include BotForge tables.
        .from("chatbot_projects" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (projectsError) throw projectsError;
      const bots = (projectsData as ChatbotProject[]) || [];
      setProjects(bots);

      // Apply a selection requested via navigation state.
      const desiredId = state.projectId;
      if (desiredId) {
        setSelectedProject(bots.find((b) => b.id === desiredId) || null);
        setActiveTab("builder");
        // Clear nav state so refresh/back doesn't keep forcing selection.
        navigate("/chatbot-maker", { replace: true, state: { tab: "builder" } });
        return;
      }

      // Keep current selection if still valid after refresh.
      if (selectedProject) {
        const still = bots.find((b) => b.id === selectedProject.id);
        setSelectedProject(still || null);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      const looksLikeMissingTable =
        typeof errorMessage === "string" &&
        (errorMessage.includes("chatbot_projects") || errorMessage.toLowerCase().includes("does not exist"));
      toast({
        title: "Error loading bots",
        description: looksLikeMissingTable
          ? "Chatbot maker tables are missing in Supabase. Apply the new migration in `supabase/migrations` and refresh."
          : errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = () => {
    setWizardOpen(true);
  };

  const handleWizardComplete = (newProject: ChatbotProject) => {
    setProjects((prev) => [newProject, ...prev]);
    setSelectedProject(newProject);
    setActiveTab("builder");
  };

  const handleSelectProject = (project: ChatbotProject) => {
    setSelectedProject(project);
    setActiveTab("builder");
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase.from("chatbot_projects" as any).delete().eq("id", projectId);
      if (error) throw error;
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
        setActiveTab("overview");
      }
      toast({ title: "Bot deleted" });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast({ title: "Error deleting bot", description: errorMessage, variant: "destructive" });
    }
  };

  const handleBackToOverview = () => {
    setSelectedProject(null);
    setActiveTab("overview");
  };

  const updateProject = async (updates: Partial<ChatbotProject>) => {
    if (!selectedProject) return;
    try {
      const { data, error } = await supabase
        .from("chatbot_projects" as any)
        .update(updates)
        .eq("id", selectedProject.id)
        .select()
        .single();
      if (error) throw error;
      const updated = data as ChatbotProject;
      setSelectedProject(updated);
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast({ title: "Saved!", description: "Your changes have been saved." });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast({ title: "Error saving", description: errorMessage, variant: "destructive" });
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <DashboardOverview
            profile={profile}
            projects={projects}
            onCreateProject={handleCreateProject}
            onSelectProject={handleSelectProject}
            onDeleteProject={handleDeleteProject}
          />
        );
      case "builder":
        return (
          <ChatbotBuilder
            project={selectedProject}
            onCreateProject={handleCreateProject}
            onUpdateProject={updateProject}
            onBack={handleBackToOverview}
          />
        );
      default:
        return (
          <div className="max-w-2xl">
            <h1 className="text-2xl font-display font-bold mb-2">Not available</h1>
            <p className="text-muted-foreground">
              This section isn&apos;t part of the DevsFlow chatbot maker integration yet. Use <span className="font-medium">My Bots</span>{" "}
              and <span className="font-medium">Builder</span>.
            </p>
          </div>
        );
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="p-6">
        {renderContent()}
      </div>
      <CreateBotWizard open={wizardOpen} onOpenChange={setWizardOpen} onComplete={handleWizardComplete} />
    </>
  );
}
