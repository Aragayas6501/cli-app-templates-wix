import type { CSSProperties } from 'react';

export const sapphirePrecisionSystem = {
  name: 'Sapphire Precision',
  compliance: 'Official Brand Design System implementation for Store Locator Pro.',
  color: {
    primary: '#0052FF',
    secondary: '#EBF1FF',
    tertiary: '#BF3003',
    neutral: '#0F172A',
    white: '#FFFFFF',
    textSecondary: 'rgba(15, 23, 42, 0.72)',
    textMuted: 'rgba(15, 23, 42, 0.52)',
    textDisabled: 'rgba(15, 23, 42, 0.36)',
    border: 'rgba(15, 23, 42, 0.14)',
    borderStrong: 'rgba(15, 23, 42, 0.24)',
    focusRing: 'rgba(0, 82, 255, 0.34)',
    primarySoft: 'rgba(0, 82, 255, 0.08)',
    primaryGlow: 'rgba(0, 82, 255, 0.14)',
    tertiarySoft: 'rgba(191, 48, 3, 0.08)',
    tertiaryBorder: 'rgba(191, 48, 3, 0.24)',
  },
  spacing: {
    base: 4,
    xs: 8,
    sm: 16,
    md: 24,
    lg: 40,
    xl: 64,
  },
  radius: {
    sm: 4,
    default: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  shadow: {
    resting: '0 1px 2px rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.14)',
    hover: 'inset 0 1px 0 rgba(255, 255, 255, 0.88), 0 8px 24px rgba(0, 82, 255, 0.08)',
    inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.86)',
  },
  motion: {
    fast: '80ms',
    standard: '160ms',
    smooth: '240ms',
    easeStandard: 'cubic-bezier(0.16, 1, 0.3, 1)',
    easeAlt: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
  font: {
    display: 'SF Pro Display, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    text: 'SF Pro Text, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
  },
};

const ds = sapphirePrecisionSystem;

export const dashboardVisualCss = `
.slp-dashboard {
  --mouse-x: 50%;
  --mouse-y: 50%;
  --slp-ds-primary: ${ds.color.primary};
  --slp-ds-secondary: ${ds.color.secondary};
  --slp-ds-tertiary: ${ds.color.tertiary};
  --slp-ds-neutral: ${ds.color.neutral};
  --slp-ds-white: ${ds.color.white};
  --slp-ds-focus: ${ds.color.focusRing};
  position: relative;
  isolation: isolate;
}

.slp-dashboard *,
.slp-dashboard *::before,
.slp-dashboard *::after {
  box-sizing: border-box;
}

.slp-dashboard::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -2;
  pointer-events: none;
  background:
    radial-gradient(520px circle at var(--mouse-x) var(--mouse-y), ${ds.color.primaryGlow}, rgba(0, 82, 255, 0.065) 36%, transparent 72%),
    radial-gradient(circle, rgba(15, 23, 42, 0.14) 1px, transparent 1.2px);
  background-size: auto, 18px 18px;
}

.slp-dashboard button,
.slp-dashboard a,
.slp-dashboard input,
.slp-dashboard select,
.slp-dashboard textarea {
  transition: border-color ${ds.motion.standard} ${ds.motion.easeAlt}, box-shadow ${ds.motion.standard} ${ds.motion.easeAlt}, transform ${ds.motion.fast} ${ds.motion.easeStandard}, background ${ds.motion.standard} ${ds.motion.easeAlt}, color ${ds.motion.standard} ${ds.motion.easeAlt}, opacity ${ds.motion.standard} ${ds.motion.easeAlt};
}

.slp-dashboard button:not(:disabled):active,
.slp-dashboard a:active {
  transform: scale(0.985) translateY(1px);
}

.slp-dashboard button:focus-visible,
.slp-dashboard a:focus-visible,
.slp-dashboard input:focus-visible,
.slp-dashboard select:focus-visible,
.slp-dashboard textarea:focus-visible {
  outline: 3px solid var(--slp-ds-focus);
  outline-offset: 2px;
  box-shadow: none !important;
}

.slp-dashboard button:disabled,
.slp-dashboard input:disabled,
.slp-dashboard select:disabled,
.slp-dashboard textarea:disabled {
  cursor: not-allowed !important;
  opacity: .52;
  transform: none !important;
}

.slp-dashboard code,
.slp-dashboard pre {
  font-family: ${ds.font.mono};
}

.slp-ds-skeleton {
  animation: slp-ds-skeleton 1200ms ${ds.motion.easeAlt} infinite;
  background: linear-gradient(90deg, rgba(15, 23, 42, 0.06), rgba(0, 82, 255, 0.08), rgba(15, 23, 42, 0.06));
  background-size: 200% 100%;
  border-radius: ${ds.radius.default}px;
  min-height: 96px;
}

@keyframes slp-ds-skeleton {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .slp-dashboard,
  .slp-dashboard *,
  .slp-ds-skeleton {
    animation-duration: 0ms !important;
    transition-duration: 0ms !important;
  }
}

@media (max-width: 640px) {
  .slp-dashboard {
    padding: ${ds.spacing.sm}px !important;
  }
}
`;

export const dashboardStyles: Record<string, CSSProperties> = {
  page: {
    backgroundColor: ds.color.white,
    backgroundImage: 'radial-gradient(circle, rgba(15, 23, 42, 0.14) 1px, transparent 1.2px)',
    backgroundSize: '18px 18px',
    color: ds.color.neutral,
    fontFamily: ds.font.text,
    minHeight: '100vh',
    padding: ds.spacing.md,
  },
  hero: {
    background: `color-mix(in srgb, ${ds.color.secondary} 84%, ${ds.color.white})`,
    border: `2px solid rgba(0, 82, 255, 0.72)`,
    borderRadius: 20,
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.82), 0 20px 80px rgba(0, 82, 255, 0.08)',
    color: ds.color.neutral,
    marginBottom: ds.spacing.md,
    padding: ds.spacing.md,
  },
  heroBadge: {
    alignItems: 'center',
    background: ds.color.white,
    border: `1px solid ${ds.color.border}`,
    borderRadius: ds.radius.full,
    color: ds.color.neutral,
    display: 'inline-flex',
    fontSize: 12,
    fontWeight: 500,
    gap: ds.spacing.xs,
    letterSpacing: '0.045em',
    marginBottom: ds.spacing.sm,
    padding: `${ds.spacing.xs}px ${ds.spacing.sm}px`,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: ds.font.display,
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.16,
    margin: `0 0 ${ds.spacing.xs}px`,
    maxWidth: 920,
  },
  heroText: {
    color: ds.color.textSecondary,
    fontSize: 16,
    lineHeight: 1.56,
    margin: 0,
    maxWidth: 920,
  },
  card: {
    background: ds.color.white,
    border: `1px solid ${ds.color.border}`,
    borderRadius: ds.radius.default,
    boxShadow: ds.shadow.resting,
    marginBottom: ds.spacing.md,
    padding: ds.spacing.sm,
  },
  sectionHeader: {
    alignItems: 'start',
    display: 'flex',
    gap: ds.spacing.sm,
    justifyContent: 'space-between',
    marginBottom: ds.spacing.sm,
  },
  sectionTitle: {
    fontFamily: ds.font.display,
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    margin: `0 0 ${ds.spacing.xs}px`,
  },
  sectionSubtitle: {
    color: ds.color.textSecondary,
    fontSize: 15,
    lineHeight: 1.47,
    margin: 0,
    maxWidth: 820,
  },
  grid: {
    display: 'grid',
    gap: ds.spacing.sm,
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  },
  label: {
    color: ds.color.neutral,
    display: 'grid',
    fontSize: 13,
    fontWeight: 500,
    gap: ds.spacing.xs,
    letterSpacing: '-0.01em',
  },
  input: {
    background: `color-mix(in srgb, ${ds.color.secondary} 60%, ${ds.color.white})`,
    border: `1px solid ${ds.color.border}`,
    borderRadius: ds.radius.default,
    boxSizing: 'border-box',
    color: ds.color.neutral,
    font: 'inherit',
    minHeight: 44,
    padding: `${ds.spacing.xs}px ${ds.spacing.sm}px`,
    width: '100%',
  },
  button: {
    background: ds.color.primary,
    border: `1px solid color-mix(in srgb, ${ds.color.primary} 76%, ${ds.color.neutral})`,
    borderRadius: ds.radius.default,
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.34), 0 1px 2px rgba(15, 23, 42, 0.08), 0 8px 20px rgba(0, 82, 255, 0.12)',
    color: ds.color.white,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    minHeight: 44,
    padding: `${ds.spacing.xs}px ${ds.spacing.sm}px`,
  },
  secondaryButton: {
    background: ds.color.white,
    border: `1px solid ${ds.color.border}`,
    borderRadius: ds.radius.default,
    boxShadow: ds.shadow.inset,
    color: ds.color.neutral,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    minHeight: 44,
    padding: `${ds.spacing.xs}px ${ds.spacing.sm}px`,
  },
  dangerButton: {
    background: ds.color.tertiary,
    border: `1px solid color-mix(in srgb, ${ds.color.tertiary} 70%, ${ds.color.neutral})`,
    borderRadius: ds.radius.default,
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.24), 0 8px 20px rgba(191, 48, 3, 0.12)',
    color: ds.color.white,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    minHeight: 44,
    padding: `${ds.spacing.xs}px ${ds.spacing.sm}px`,
  },
  metricCard: {
    background: ds.color.white,
    border: `1px solid ${ds.color.border}`,
    borderRadius: ds.radius.default,
    boxShadow: ds.shadow.resting,
    minHeight: 150,
    overflow: 'hidden',
    padding: ds.spacing.sm,
    position: 'relative',
  },
  metricValue: {
    color: ds.color.primary,
    fontFeatureSettings: '"tnum"',
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.16,
  },
  metricDetail: {
    color: ds.color.textSecondary,
    fontSize: 15,
    lineHeight: 1.47,
    margin: `${ds.spacing.xs}px 0 0`,
  },
  statusRail: {
    alignItems: 'center',
    background: ds.color.white,
    border: `1px solid ${ds.color.border}`,
    borderRadius: ds.radius.default,
    boxShadow: ds.shadow.inset,
    color: ds.color.neutral,
    display: 'flex',
    flexWrap: 'wrap',
    gap: ds.spacing.sm,
    justifyContent: 'space-between',
    marginTop: ds.spacing.sm,
    padding: ds.spacing.sm,
  },
  statusDot: {
    background: ds.color.primary,
    borderRadius: ds.radius.full,
    boxShadow: `0 0 0 4px ${ds.color.primarySoft}`,
    display: 'inline-block',
    flex: '0 0 auto',
    height: 10,
    width: 10,
  },
  statusDotWarning: {
    background: ds.color.tertiary,
    boxShadow: `0 0 0 4px ${ds.color.tertiarySoft}`,
  },
  toolbar: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: ds.spacing.xs,
    marginTop: ds.spacing.sm,
  },
  emptyState: {
    alignContent: 'center',
    background: `color-mix(in srgb, ${ds.color.secondary} 54%, ${ds.color.white})`,
    border: `1px solid ${ds.color.border}`,
    borderRadius: ds.radius.default,
    color: ds.color.textSecondary,
    display: 'grid',
    gap: ds.spacing.xs,
    justifyItems: 'start',
    minHeight: 150,
    padding: ds.spacing.sm,
  },
  fieldHint: {
    color: ds.color.textMuted,
    fontSize: 12,
    lineHeight: 1.45,
  },
  fieldError: {
    color: ds.color.tertiary,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.45,
  },
  rowCard: {
    background: ds.color.white,
    border: `1px solid ${ds.color.border}`,
    borderRadius: ds.radius.default,
    boxShadow: ds.shadow.resting,
    padding: ds.spacing.sm,
  },
  rowCardArchived: {
    background: `color-mix(in srgb, ${ds.color.secondary} 52%, ${ds.color.white})`,
    border: `1px dashed ${ds.color.borderStrong}`,
  },
  mutedText: {
    color: ds.color.textSecondary,
    lineHeight: 1.56,
  },
  status: {
    alignItems: 'center',
    background: `color-mix(in srgb, ${ds.color.secondary} 60%, ${ds.color.white})`,
    border: `1px solid ${ds.color.border}`,
    borderRadius: ds.radius.default,
    color: ds.color.neutral,
    display: 'flex',
    flexWrap: 'wrap',
    gap: ds.spacing.xs,
    justifyContent: 'space-between',
    marginTop: ds.spacing.sm,
    padding: ds.spacing.sm,
  },
  codeBlock: {
    background: ds.color.neutral,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: ds.radius.default,
    color: ds.color.white,
    maxHeight: 280,
    overflow: 'auto',
    padding: ds.spacing.sm,
    whiteSpace: 'pre-wrap',
  },
  pill: {
    background: `color-mix(in srgb, ${ds.color.secondary} 80%, ${ds.color.white})`,
    border: `1px solid ${ds.color.border}`,
    borderRadius: ds.radius.full,
    color: ds.color.neutral,
    display: 'inline-flex',
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: '0.045em',
    padding: `${ds.spacing.base}px ${ds.spacing.xs}px`,
    textTransform: 'uppercase',
  },
};

export function mergeStyles(...styles: Array<CSSProperties | false | null | undefined>): CSSProperties {
  return Object.assign({}, ...styles.filter(Boolean));
}
