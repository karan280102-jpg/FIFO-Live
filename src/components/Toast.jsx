export default function Toast({ toast }) {
  if (!toast) return null;
  const color = toast.type === 'error' ? '#c15a4e' : toast.type === 'warn' ? '#d9a441' : '#5fae7c';
  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 300,
      background: '#161310', border: `1px solid ${color}`, color: '#f3ede0', padding: '12px 20px',
      borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: '0 20px 50px -20px rgba(0,0,0,0.7)',
      maxWidth: 420, textAlign: 'center'
    }}>{toast.msg}</div>
  );
}
