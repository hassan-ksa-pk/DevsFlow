import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { streamChat, ChatMessage } from "@/lib/streaming";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userProfile = useUserProfile();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: upsert,
        onDone: () => setIsLoading(false),
        onError: (err) => {
          toast.error(err);
          setIsLoading(false);
        },
        userProfile,
      });
    } catch {
      toast.error("Failed to connect to AI");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="px-3 py-2 border-b border-sidebar-border">
        <span className="text-xs font-mono text-sidebar-foreground uppercase tracking-wider">AI Chat</span>
      </div>

      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="h-8 w-8 mx-auto mb-3 text-primary/40" />
            <p className="text-xs text-muted-foreground">Ask me anything about your code</p>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2`}>
              <div className={`shrink-0 h-6 w-6 rounded-md flex items-center justify-center ${
                m.role === "user" ? "bg-secondary" : "bg-primary/10"
              }`}>
                {m.role === "user" ? (
                  <User className="h-3.5 w-3.5 text-secondary-foreground" />
                ) : (
                  <Bot className="h-3.5 w-3.5 text-primary" />
                )}
              </div>
              <div className={`text-sm leading-relaxed whitespace-pre-wrap break-words min-w-0 ${
                m.role === "assistant" ? "text-foreground" : "text-secondary-foreground"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-2">
              <div className="shrink-0 h-6 w-6 rounded-md flex items-center justify-center bg-primary/10">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <Loader2 className="h-4 w-4 animate-spin text-primary mt-0.5" />
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-sidebar-border">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask the AI..."
            className="resize-none bg-secondary border-border text-sm pr-10 min-h-[60px] max-h-32 font-mono"
            rows={2}
          />
          <Button
            size="sm"
            className="absolute bottom-2 right-2 h-7 w-7 p-0"
            onClick={send}
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
