import { useMemo, useState } from 'react';
import { useName, useT } from '../i18n';
import type { DiceSet } from '../model/types';
import { encodeShare, shareUrl } from '../share/codec';
import { useLibrary } from '../store/library';
import { Icon } from './Icon';
import { Modal } from './Modal';

export function ShareModal({ set, open, onClose }: { set: DiceSet | null; open: boolean; onClose: () => void }) {
  const t = useT();
  const name = useName();
  const dice = useLibrary((s) => s.dice);
  const [copied, setCopied] = useState(false);
  const data = useMemo(() => {
    if (!set) return null;
    const used = set.dice.map((id) => dice[id]).filter(Boolean);
    const { payload, droppedUpload } = encodeShare(set, used);
    return { url: shareUrl(payload), droppedUpload };
  }, [set, dice]);

  const copy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = data.url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const canNative = typeof navigator !== 'undefined' && 'share' in navigator;

  return (
    <Modal open={open && !!set} onClose={onClose} title={set ? t('share.title', { name: name(set) }) : ''}>
      {data && (
        <div className="stack">
          <p className="muted" style={{ margin: 0 }}>
            {t('share.body')}
          </p>
          {data.droppedUpload && <div className="callout warn">{t('share.droppedUpload')}</div>}
          <div className="share-url">
            <Icon name="link" size={18} />
            <input className="input" readOnly value={data.url} onFocus={(e) => e.currentTarget.select()} />
          </div>
          <div className="muted small">{t('share.length', { n: data.url.length })}</div>
          <div className="row">
            <button className="btn primary" onClick={copy}>
              <Icon name={copied ? 'check' : 'copy'} /> {copied ? t('common.copied') : t('common.copy')}
            </button>
            {canNative && (
              <button
                className="btn"
                onClick={() => navigator.share({ title: `Die Hard Dice · ${name(set!)}`, url: data.url }).catch(() => undefined)}
              >
                <Icon name="share" /> {t('share.native')}
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
