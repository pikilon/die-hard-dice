import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { BUILTIN_DICE } from '../data/presets';
import { useT } from '../i18n';
import { DieThumb } from '../ui/DieThumb';
import { Icon, type IconName } from '../ui/Icon';

const byId = (id: string) => BUILTIN_DICE.find((d) => d.id === id)!;

/** Each "game" shown in the rotating headline: the die that represents it and its i18n label. */
const GAMES = [
  { die: 'b-kot', label: 'hero.game.kot' },
  { die: 'b-hq-combat', label: 'hero.game.hq' },
  { die: 'b-d20', label: 'hero.game.dnd' },
  { die: 'b-coin', label: 'hero.game.yours' },
] as const;

const SATELLITES = ['b-d6-ivory', 'b-hq-move', 'b-d12', 'b-d4'] as const;

const STEPS: { icon: IconName; title: 'hero.step1.title' | 'hero.step2.title' | 'hero.step3.title'; body: 'hero.step1.body' | 'hero.step2.body' | 'hero.step3.body' }[] = [
  { icon: 'palette', title: 'hero.step1.title', body: 'hero.step1.body' },
  { icon: 'layers', title: 'hero.step2.title', body: 'hero.step2.body' },
  { icon: 'share', title: 'hero.step3.title', body: 'hero.step3.body' },
];

export function HomeHero({ onDismiss }: { onDismiss: () => void }) {
  const t = useT();
  const [i, setI] = useState(0);
  const [spin, setSpin] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setI((x) => (x + 1) % GAMES.length), 2600);
    return () => window.clearInterval(id);
  }, []);

  const game = GAMES[i];

  return (
    <section className="hero" aria-labelledby="hero-title">
      <button className="btn ghost sm icon hero-close" onClick={onDismiss} aria-label={t('hero.dismiss')} title={t('hero.dismiss')}>
        <Icon name="close" size={16} />
      </button>

      <div className="hero-copy">
        <span className="hero-eyebrow">
          <Icon name="sparkles" size={14} /> {t('hero.eyebrow')}
        </span>
        <h2 id="hero-title" className="hero-title">
          {t('hero.title1')}
          <br />
          <span className="hero-rotor" aria-live="off">
            <span key={game.label} className="hero-rotor-word">
              {t(game.label)}
            </span>
          </span>
        </h2>
        <p className="hero-lead">{t('hero.lead')}</p>
        <div className="row hero-cta">
          <Link href="/play/b-dnd" className="btn primary lg">
            <Icon name="play" size={20} /> {t('hero.ctaPlay')}
          </Link>
          <Link href="/dice/new" className="btn lg">
            <Icon name="cube" size={20} /> {t('hero.ctaCreate')}
          </Link>
        </div>
        <p className="muted small hero-note">{t('hero.note')}</p>
      </div>

      <div className="hero-stage" aria-hidden="true">
        <div className="hero-glow" />
        {SATELLITES.map((id, k) => (
          <motion.span
            key={id}
            className={`hero-sat hero-sat-${k}`}
            animate={{ rotate: spin * (k % 2 ? -360 : 360) }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            <DieThumb die={byId(id)} size={k < 2 ? 76 : 60} />
          </motion.span>
        ))}
        <button className="hero-main" onClick={() => setSpin((s) => s + 1)} tabIndex={-1}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={game.die}
              className="hero-main-die"
              initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6, rotate: 90 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            >
              <DieThumb die={byId(game.die)} size={170} />
            </motion.span>
          </AnimatePresence>
        </button>
        <div className="hero-shadow" />
      </div>

      <ol className="hero-steps">
        {STEPS.map((s, n) => (
          <li key={s.title} className="hero-step">
            <span className="hero-step-num">{n + 1}</span>
            <Icon name={s.icon} size={22} />
            <div>
              <strong>{t(s.title)}</strong>
              <p>{t(s.body)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
