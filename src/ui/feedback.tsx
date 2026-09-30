import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { create } from 'zustand';
import { useT } from '../i18n';
import { newId } from '../model/ids';
import { Modal } from './Modal';

/* ---------------- toasts ---------------- */

export interface ToastAction {
  label: string;
  primary?: boolean;
  onClick: () => void;
}

interface Toast {
  id: string;
  text: ReactNode;
  actions?: ToastAction[];
  timeout: number;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id' | 'timeout'> & { timeout?: number }) => string;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = newId(6);
    const timeout = t.timeout ?? (t.actions?.length ? 12000 : 2600);
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id, timeout }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const toast = (text: ReactNode, actions?: ToastAction[], timeout?: number) => useToasts.getState().push({ text, actions, timeout });

function ToastItem({ t }: { t: Toast }) {
  const dismiss = useToasts((s) => s.dismiss);
  useEffect(() => {
    const h = setTimeout(() => dismiss(t.id), t.timeout);
    return () => clearTimeout(h);
  }, [t, dismiss]);
  return (
    <motion.div
      className="toast"
      layout
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
    >
      <span>{t.text}</span>
      {t.actions && (
        <div className="actions">
          {t.actions.map((a) => (
            <button
              key={a.label}
              className={`btn sm ${a.primary ? 'primary' : ''}`}
              onClick={() => {
                a.onClick();
                dismiss(t.id);
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- confirm / prompt dialogs ---------------- */

interface DialogReq {
  kind: 'confirm' | 'prompt';
  title: string;
  body?: ReactNode;
  confirm?: string;
  danger?: boolean;
  value?: string;
  resolve: (v: string | boolean | null) => void;
}

const useDialog = create<{ req: DialogReq | null; set: (r: DialogReq | null) => void }>((set) => ({
  req: null,
  set: (req) => set({ req }),
}));

export function confirmDialog(opts: { title: string; body?: ReactNode; confirm?: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) =>
    useDialog.getState().set({ kind: 'confirm', ...opts, resolve: (v) => resolve(v === true) }),
  );
}

export function promptDialog(opts: { title: string; value?: string; confirm?: string }): Promise<string | null> {
  return new Promise((resolve) =>
    useDialog.getState().set({ kind: 'prompt', ...opts, resolve: (v) => resolve(typeof v === 'string' ? v : null) }),
  );
}

export function Dialogs() {
  const t = useT();
  const { req, set } = useDialog();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (req?.kind === 'prompt') {
      setValue(req.value ?? '');
      setTimeout(() => inputRef.current?.select(), 60);
    }
  }, [req]);
  const close = (v: string | boolean | null) => {
    req?.resolve(v);
    set(null);
  };
  const ok = () => close(req?.kind === 'prompt' ? value.trim() || null : true);
  return (
    <Modal
      open={!!req}
      onClose={() => close(null)}
      title={req?.title}
      footer={
        <>
          <button className="btn" onClick={() => close(null)}>
            {t('common.cancel')}
          </button>
          <button className={`btn ${req?.danger ? 'danger' : 'primary'}`} onClick={ok}>
            {req?.confirm ?? (req?.kind === 'prompt' ? t('common.save') : 'OK')}
          </button>
        </>
      }
    >
      {req?.body && <div className="muted">{req.body}</div>}
      {req?.kind === 'prompt' && (
        <input
          ref={inputRef}
          className="input big"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ok()}
          maxLength={80}
        />
      )}
    </Modal>
  );
}
