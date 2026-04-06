import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", INR: "₹", JPY: "¥", CAD: "C$", AUD: "A$",
};

const CURRENCY_LOCALES: Record<string, string> = {
  USD: "en-US", EUR: "de-DE", GBP: "en-GB", INR: "en-IN", JPY: "ja-JP", CAD: "en-CA", AUD: "en-AU",
};

export const formatCurrency = (amount: number, currency: string = "USD") => {
  const locale = CURRENCY_LOCALES[currency] || "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Math.abs(amount));
};

export const getCurrencySymbol = (currency: string) => CURRENCY_SYMBOLS[currency] || "$";

export const useCurrency = () => {
  const [currency, setCurrency] = useState("USD");

  const fetchCurrency = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("currency")
      .eq("user_id", user.id)
      .single();
    if (profile?.currency) setCurrency(profile.currency);
  }, []);

  useEffect(() => { fetchCurrency(); }, [fetchCurrency]);

  const fmt = useCallback((amount: number) => formatCurrency(amount, currency), [currency]);

  return { currency, fmt, symbol: getCurrencySymbol(currency), refetch: fetchCurrency };
};
