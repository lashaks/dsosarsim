import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { ReactNode } from "react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number | string;
}

export default function Modal({ open, onOpenChange, title, description, children, footer, width = 520 }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 panel z-50 max-h-[88vh] overflow-y-auto"
          style={{ width, maxWidth: "92vw" }}
        >
          <div className="px-5 py-4 flex items-start justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <Dialog.Title className="display text-lg" style={{ color: "var(--text-primary)" }}>{title}</Dialog.Title>
              {description && <Dialog.Description className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>{description}</Dialog.Description>}
            </div>
            <Dialog.Close className="btn btn-ghost" aria-label="Close"><X size={16} /></Dialog.Close>
          </div>
          <div className="px-5 py-5">{children}</div>
          {footer && (
            <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface SlideOverProps extends Omit<Props, "width"> { width?: number; }
export function SlideOver({ open, onOpenChange, title, description, children, footer, width = 480 }: SlideOverProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }} />
        <Dialog.Content
          className="fixed right-0 top-0 bottom-0 panel z-50 overflow-y-auto"
          style={{
            width, maxWidth: "94vw",
            borderRadius: 0, borderLeft: "1px solid var(--border)", borderRight: 0, borderTop: 0, borderBottom: 0,
          }}
        >
          <div className="px-5 py-4 flex items-start justify-between sticky top-0 z-10"
               style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
            <div>
              <Dialog.Title className="display text-lg" style={{ color: "var(--text-primary)" }}>{title}</Dialog.Title>
              {description && <Dialog.Description className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>{description}</Dialog.Description>}
            </div>
            <Dialog.Close className="btn btn-ghost" aria-label="Close"><X size={16} /></Dialog.Close>
          </div>
          <div className="px-5 py-5">{children}</div>
          {footer && (
            <div className="px-5 py-4 flex justify-end gap-2 sticky bottom-0"
                 style={{ borderTop: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
