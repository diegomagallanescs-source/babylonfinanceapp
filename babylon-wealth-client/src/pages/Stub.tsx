export function StubPage({ name }: { name: string }) {
  return (
    <div style={{ padding: 32, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 80 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🚧</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{name}</div>
      <div style={{ fontSize: 14, marginTop: 8 }}>Coming soon</div>
    </div>
  );
}
