import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface CreditInfo {
  groq_credits: number;
  advanced_credits: number;
  plan: "free" | "pro";
}

export function useCredits() {
  const { user } = useAuth();
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!user) { setCreditInfo(null); setLoading(false); return; }
    
    const { data, error } = await supabase.rpc("get_credits_info", { p_user_id: user.id });
    if (error) {
      console.error("Credits fetch error:", error);
      setCreditInfo({ groq_credits: 0, advanced_credits: 0, plan: "free" });
    } else {
      const info = typeof data === "string" ? JSON.parse(data) : data;
      setCreditInfo(info as CreditInfo);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const useCredit = useCallback(async (type: "groq" | "advanced" = "groq"): Promise<boolean> => {
    if (!user) return false;
    
    const { data, error } = await supabase.rpc("use_credit_typed", { p_user_id: user.id, p_type: type });
    if (error || !data) {
      if (type === "advanced") {
        toast.error("No advanced AI credits remaining! Free: 3/day, Pro: 10/day.");
      } else {
        toast.error("No AI credits remaining! Free: 10/day, Pro: 25/day.");
      }
      return false;
    }
    
    setCreditInfo((prev) => {
      if (!prev) return prev;
      if (type === "advanced") {
        return { ...prev, advanced_credits: Math.max(0, prev.advanced_credits - 1) };
      }
      return { ...prev, groq_credits: Math.max(0, prev.groq_credits - 1) };
    });
    return true;
  }, [user]);

  // Backward compat
  const credits = creditInfo ? creditInfo.groq_credits + creditInfo.advanced_credits : null;

  return { credits, creditInfo, loading, useCredit, refetch: fetchCredits };
}
