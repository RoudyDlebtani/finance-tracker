"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface AlertOptions {
  title: string;
  message?: string;
  dismissText?: string;
}

type DialogState =
  | { kind: "confirm"; opts: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: "alert"; opts: AlertOptions; resolve: () => void };

interface DialogContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  alert: (opts: AlertOptions) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

/**
 * Provides promise-based `confirm`/`alert` dialogs rendered as a single centered
 * modal — a styled replacement for the native `window.confirm`/`window.alert`.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setDialog({ kind: "confirm", opts, resolve });
      }),
    [],
  );

  const alert = useCallback(
    (opts: AlertOptions) =>
      new Promise<void>((resolve) => {
        setDialog({ kind: "alert", opts, resolve });
      }),
    [],
  );

  // Resolving as cancel/dismiss when the modal closes (backdrop, Escape, X).
  const handleClose = useCallback(() => {
    if (!dialog) return;
    if (dialog.kind === "confirm") dialog.resolve(false);
    else dialog.resolve();
    setDialog(null);
  }, [dialog]);

  const handleConfirm = useCallback(() => {
    if (dialog?.kind === "confirm") dialog.resolve(true);
    setDialog(null);
  }, [dialog]);

  const danger = dialog?.kind === "confirm" && dialog.opts.danger;

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      <Modal
        open={dialog !== null}
        onClose={handleClose}
        title={dialog?.opts.title ?? ""}
      >
        <div className="flex gap-3">
          <span
            className={`mt-0.5 shrink-0 ${danger ? "text-negative" : "text-muted-foreground"}`}
          >
            {danger ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <Info className="h-5 w-5" />
            )}
          </span>
          {dialog?.opts.message && (
            <p className="text-sm text-muted-foreground">{dialog.opts.message}</p>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          {dialog?.kind === "confirm" && (
            <Button variant="outline" onClick={handleClose}>
              {dialog.opts.cancelText ?? "Cancel"}
            </Button>
          )}
          {dialog?.kind === "confirm" ? (
            <Button
              variant={dialog.opts.danger ? "danger" : "primary"}
              onClick={handleConfirm}
              autoFocus
            >
              {dialog.opts.confirmText ?? "Confirm"}
            </Button>
          ) : (
            <Button onClick={handleClose} autoFocus>
              {dialog?.kind === "alert" ? (dialog.opts.dismissText ?? "OK") : "OK"}
            </Button>
          )}
        </div>
      </Modal>
    </DialogContext.Provider>
  );
}

function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx)
    throw new Error("useConfirm/useAlert must be used within a ConfirmProvider");
  return ctx;
}

/** Returns an async `confirm(opts) => Promise<boolean>` backed by a centered modal. */
export function useConfirm() {
  return useDialog().confirm;
}

/** Returns an async `alert(opts) => Promise<void>` backed by a centered modal. */
export function useAlert() {
  return useDialog().alert;
}
