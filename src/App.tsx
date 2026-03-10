import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useMetadata } from "@/hooks/useMetadata";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import ChatBotMaker from "./pages/ChatBotMaker";
import ChatBotEditor from "./pages/ChatBotEditor";
import ChatBotPreview from "./pages/ChatBotPreview";
import BotHosted from "./pages/BotHosted";
import VibeCoder from "./pages/VibeCoder";
import EditorPage from "./pages/EditorPage";
import AISnippets from "./pages/AISnippets";
import AIAnalysis from "./pages/AIAnalysis";
import AIConverter from "./pages/AIConverter";
import Courses from "./pages/Courses";
import Roadmap from "./pages/Roadmap";
import Profile from "./pages/Profile";
import PublishedProject from "./pages/PublishedProject";
import CodeGoals from "./pages/CodeGoals";
import URLShortener from "./pages/URLShortener";
import RedirectPage from "./pages/RedirectPage";
import Debug from "./pages/Debug";
import GenerationHistory from "./pages/GenerationHistory";
import FlowBuilder from "./pages/FlowBuilder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  useMetadata();
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chatbot-maker" element={<ChatBotMaker />} />
        <Route path="/chatbot-maker/new" element={<ChatBotEditor />} />
        <Route path="/chatbot-maker/edit/:id" element={<ChatBotEditor />} />
        <Route path="/chatbot-maker/preview/:id" element={<ChatBotPreview />} />
        <Route path="/editor" element={<VibeCoder />} />
        <Route path="/flow" element={<FlowBuilder />} />
        <Route path="/ai/snippets" element={<AISnippets />} />
        <Route path="/ai/analysis" element={<AIAnalysis />} />
        <Route path="/ai/converter" element={<AIConverter />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/goals" element={<CodeGoals />} />
        <Route path="/shortener" element={<URLShortener />} />
        <Route path="/debug" element={<Debug />} />
        <Route path="/history" element={<GenerationHistory />} />
        <Route path="/settings" element={<Profile />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="/editor/:id" element={<EditorPage />} />
      <Route path="/bot/:slug" element={<BotHosted />} />
      <Route path="/p/:slug" element={<PublishedProject />} />
      <Route path="/p/:slug/:page" element={<PublishedProject />} />
      <Route path="/dev/:code" element={<RedirectPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
