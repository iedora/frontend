import type { CSSProperties, ReactNode } from 'react'

/**
 * Shared editorial bits for the /admin pages. Page heads share the same
 * eyebrow / serif title / italic note pattern, so we centralize the styles
 * here rather than repeating them in every page file.
 */

const eyebrowStyle: CSSProperties = {
  display: 'block',
  fontFamily: 'var(--mono)',
  fontSize: 10.5,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--ink-55)',
  marginBottom: 12,
}

const titleStyle: CSSProperties = {
  fontFamily: 'var(--serif)',
  fontSize: 48,
  lineHeight: 1.05,
  letterSpacing: '-0.02em',
  margin: 0,
  fontWeight: 400,
}

const noteStyle: CSSProperties = {
  fontFamily: 'var(--serif)',
  fontStyle: 'italic',
  fontSize: 17,
  color: 'var(--ink-70)',
  marginTop: 12,
  maxWidth: '56ch',
}

export function PageHead({
  eyebrow,
  title,
  note,
  actions,
}: {
  eyebrow: ReactNode
  title: ReactNode
  note?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 24,
        paddingBottom: 36,
        borderBottom: '1px solid var(--ink-14)',
        marginBottom: 36,
      }}
    >
      <div>
        <span style={eyebrowStyle}>{eyebrow}</span>
        <h1 style={titleStyle}>{title}</h1>
        {note ? <p style={noteStyle}>{note}</p> : null}
      </div>
      {actions ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {actions}
        </div>
      ) : null}
    </div>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span style={eyebrowStyle}>{children}</span>
}

const monoStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 11,
  color: 'var(--ink-70)',
}

export function Mono({
  children,
  style,
}: {
  children: ReactNode
  style?: CSSProperties
}) {
  return <span style={{ ...monoStyle, ...style }}>{children}</span>
}

/** Hairline separator between sections within a page. */
export function SectionRule({ children }: { children?: ReactNode }) {
  return (
    <div
      style={{
        borderTop: '1px solid var(--ink-14)',
        marginTop: 36,
        marginBottom: 24,
        paddingTop: 24,
      }}
    >
      {children}
    </div>
  )
}
