import * as ToastPrim from "@radix-ui/react-toast";
import { createContext, useContext, useState, ReactNode } from "react";
import { CheckCircle, AlertCircle, Info } from "lucide-react";

type Kind = "success" | "error" | "info";
interface Item { id: number; kind: Kind; title: string; description?: string; }

interface Ctx {
  push: (item: Omit<Item, "id">) => void;
}

const Ctx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const push = (i: Omit<Item, "id">) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { ...i, id }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 4500);
  };

  return (
    <Ctx.Provider value={{ push }}>
      <ToastPrim.Provider swipeDirection="right">
        {children}
        {items.map((i) => {
          const Icon = i.kind === "success" ? CheckCircle : i.kind === "error" ? AlertCircle : Info;
          const color = i.kind === "success" ? "var(--status-fmc-t)" : i.kind === "error" ? "var(--status-nmc-t)" : "var(--status-info-t)";
          return (
            <ToastPrim.Root key={i.id} className="panel px-4 py-3 flex items-start gap-3 min-w-[280px]">
              <Icon size={18} color={color} className="mt-0.5" />
              <div className="flex-1">
                <ToastPrim.Title className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{i.title}</ToastPrim.Title>
                {i.description && <ToastPrim.Description className="text-[12px] mt-1" style={{ color: "var(--text-body)" }}>{i.description}</ToastPrim.Description>}
              </div>
            </ToastPrim.Root>
          );
        })}
        <ToastPrim.Viewport className="fixed bottom-4 right-4 flex flex-col gap-2 z-[100]" />
      </ToastPrim.Provider>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
