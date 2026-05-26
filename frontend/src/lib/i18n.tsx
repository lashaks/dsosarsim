import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Lang = "en" | "ar";

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  dir: "ltr" | "rtl";
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>((localStorage.getItem("dsos-lang") as Lang) || "en");

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    localStorage.setItem("dsos-lang", lang);
  }, [lang]);

  return (
    <Ctx.Provider
      value={{
        lang,
        setLang,
        toggle: () => setLang(lang === "en" ? "ar" : "en"),
        dir: lang === "ar" ? "rtl" : "ltr",
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
