import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserProfile {
  display_name: string | null;
  about: string | null;
  custom_instructions: string | null;
}

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    supabase
      .from("profiles")
      .select("display_name, about, custom_instructions")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data as UserProfile);
      });
  }, [user]);

  return profile;
}
