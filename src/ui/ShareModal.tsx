import { useMemo, useState, type ReactNode } from 'react';
import { useName, useT } from '../i18n';
import type { DiceSet } from '../model/types';
import { encodeShare, shareUrl } from '../share/codec';
import { useLibrary } from '../store/library';
import { Icon } from './Icon';
import { Modal } from './Modal';

interface LinkProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  body: ReactNode;
  url: string;
  /** Title handed to the Web Share API (FR-505). */
  nativeTitle: string;
  warn?: ReactNode;
  note?: ReactNode;
}

/** Generic share dialog: shows a URL with copy + native share (FR-503/FR-505). */
export function ShareLinkModal({ open, onClose, title, body, url, nativeTitle, warn, note }: LinkProps) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const canNative = typeof navigator !== 'undefined' && 'share' in navigator;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>
          {body}
        </p>
        {warn && <div className="callout warn">{warn}</div>}
        <div className="share-url">
          <Icon name="link" size={18} />
          <input className="input" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
        </div>
        {note && <div className="muted small">{note}</div>}
        <div className="row">
          <button className="btn primary" onClick={copy}>
            <Icon name={copied ? 'check' : 'copy'} /> {copied ? t('common.copied') : t('common.copy')}
          </button>
          {canNative && (
            <button className="btn" onClick={() => navigator.share({ title: nativeTitle, url }).catch(() => undefined)}>
              <Icon name="share" /> {t('share.native')}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

/** Share a set: encodes its dice into a `#/import?d=…` URL (spec 001 §5). */
export function ShareModal({ set, open, onClose }: { set: DiceSet | null; open: boolean; onClose: () => void }) {
  const t = useT();
  const name = useName();
  const dice = useLibrary((s) => s.dice);
  const data = useMemo(() => {
    if (!set) return null;
    const used = set.dice.map((id) => dice[id]).filter(Boolean);
    const { payload, droppedUpload } = encodeShare(set, used);
    return { url: shareUrl(payload), droppedUpload };
  }, [set, dice]);

  return (
    <ShareLinkModal
      open={open && !!set}
      onClose={onClose}
      title={set ? t('share.title', { name: name(set) }) : ''}
      body={t('share.body')}
      url={data?.url ?? ''}
      nativeTitle={set ? `${t('app.name')} · ${name(set)}` : t('app.name')}
      warn={data?.droppedUpload ? t('share.droppedUpload') : undefined}
      note={data ? t('share.length', { n: data.url.length }) : undefined}
    />
  );
}
