import { useT } from '../i18n';
import { PAYPAL_1_URL, PAYPAL_2_URL, PAYPAL_BASE_URL } from '../model/tip';
import { useTip } from '../store/tip';
import { toast } from './feedback';
import { GameIcon, Icon } from './Icon';
import { Modal } from './Modal';

export function TipModal() {
  const t = useT();
  const isOpen = useTip((s) => s.isOpen);
  const closeTip = useTip((s) => s.closeTip);
  const markDonated = useTip((s) => s.markDonated);

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={closeTip}
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Icon name="heart" size={22} style={{ color: 'var(--ruby-2)' }} />
          {t('tip.title')}
        </span>
      }
    >
      <div className="stack tip-modal-body">
        <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>
          {t('tip.lead')}
        </p>

        <div className="tip-amounts">
          <a
            href={PAYPAL_1_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn primary tip-amount-btn"
            title={`${t('tip.buttonAction')} (${t('tip.amount1')})`}
          >
            <span className="tip-amount-val">{t('tip.amount1')}</span>
            <span className="tip-amount-sub">PayPal</span>
          </a>
          <a
            href={PAYPAL_2_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn primary tip-amount-btn"
            title={`${t('tip.buttonAction')} (${t('tip.amount2')})`}
          >
            <span className="tip-amount-val">{t('tip.amount2')}</span>
            <span className="tip-amount-sub">PayPal</span>
          </a>
          <a
            href={PAYPAL_BASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn tip-amount-btn"
            title={`${t('tip.buttonAction')} (${t('tip.amountOther')})`}
          >
            <span className="tip-amount-val">{t('tip.amountOther')}</span>
            <span className="tip-amount-sub">PayPal</span>
          </a>
        </div>

        <div className="callout tip-feature-callout">
          <GameIcon name="sparkles" size={22} color="var(--gold-400)" />
          <div>
            <strong>{t('tip.featureTitle')}</strong>
            <p>{t('tip.featureNote')}</p>
          </div>
        </div>

        <div className="row tip-modal-actions">
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => {
              markDonated();
              toast(t('tip.thanksToast'));
            }}
          >
            <Icon name="check" size={16} /> {t('tip.alreadyDonated')}
          </button>
          <button type="button" className="btn sm" onClick={closeTip}>
            {t('tip.maybeLater')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
