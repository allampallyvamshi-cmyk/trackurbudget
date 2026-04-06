import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SharedAccessContextType {
  accessCode: string | null;
  ownerName: string | null;
  currency: string;
  isSharedAccess: boolean;
  validateCode: (code: string) => Promise<boolean>;
  clearAccess: () => void;
  callSharedAction: (action: string, payload?: Record<string, unknown>) => Promise<any>;
}

const SharedAccessContext = createContext<SharedAccessContextType | null>(null);

export const useSharedAccess = () => {
  const ctx = useContext(SharedAccessContext);
  if (!ctx) throw new Error("useSharedAccess must be used within SharedAccessProvider");
  return ctx;
};

export const SharedAccessProvider = ({ children }: { children: ReactNode }) => {
  const [accessCode, setAccessCode] = useState<string | null>(() => sessionStorage.getItem("shared_access_code"));
  const [ownerName, setOwnerName] = useState<string | null>(() => sessionStorage.getItem("shared_owner_name"));
  const [currency, setCurrency] = useState(() => sessionStorage.getItem("shared_currency") || "USD");

  const callSharedAction = useCallback(async (action: string, payload?: Record<string, unknown>) => {
    const code = accessCode || sessionStorage.getItem("shared_access_code");
    if (!code) throw new Error("No access code");

    const { data, error } = await supabase.functions.invoke("shared-access", {
      body: { code, action, payload },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }, [accessCode]);

  const validateCode = useCallback(async (code: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("shared-access", {
        body: { code, action: "get_profile" },
      });

      if (error || data?.error) return false;

      const name = `${data.data.first_name} ${data.data.last_name}`.trim() || "User";
      const cur = data.data.currency || "USD";

      setAccessCode(code);
      setOwnerName(name);
      setCurrency(cur);
      sessionStorage.setItem("shared_access_code", code);
      sessionStorage.setItem("shared_owner_name", name);
      sessionStorage.setItem("shared_currency", cur);
      return true;
    } catch {
      return false;
    }
  }, []);

  const clearAccess = useCallback(() => {
    setAccessCode(null);
    setOwnerName(null);
    setCurrency("USD");
    sessionStorage.removeItem("shared_access_code");
    sessionStorage.removeItem("shared_owner_name");
    sessionStorage.removeItem("shared_currency");
  }, []);

  return (
    <SharedAccessContext.Provider value={{
      accessCode,
      ownerName,
      currency,
      isSharedAccess: !!accessCode,
      validateCode,
      clearAccess,
      callSharedAction,
    }}>
      {children}
    </SharedAccessContext.Provider>
  );
};
