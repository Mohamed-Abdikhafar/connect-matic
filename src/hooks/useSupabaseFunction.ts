
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UseFunctionResult<T> {
  loading: boolean;
  error: Error | null;
  execute: (payload?: object) => Promise<T | null>;
}

export function useSupabaseFunction<T = any>(functionName: string): UseFunctionResult<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const execute = async (payload: object = {}): Promise<T | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke<T>(functionName, {
        body: JSON.stringify({
          ...payload,
          userId: user?.id
        }),
      });

      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    } catch (err: any) {
      console.error(`Error calling ${functionName}:`, err);
      setError(err instanceof Error ? err : new Error(err.message || 'Unknown error'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, execute };
}
