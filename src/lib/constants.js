export const ADMIN_ALLOWLIST = ['Karan Sirohi', 'Yogesh Kumar'];

export function isAllowedAdmin(name) {
  return ADMIN_ALLOWLIST.some(a => a.toLowerCase() === String(name || '').trim().toLowerCase());
}

export const AGING_BUCKETS = [
  { key: 'b0', label: '0–30d', min: 0, max: 30, color: '#5fa8c4' },
  { key: 'b1', label: '31–60d', min: 31, max: 60, color: '#6bab6e' },
  { key: 'b2', label: '61–90d', min: 61, max: 90, color: '#d9a441' },
  { key: 'b3', label: '91–180d', min: 91, max: 180, color: '#cf7a3e' },
  { key: 'b4', label: '181–270d', min: 181, max: 270, color: '#c1453a' },
  { key: 'b5', label: '271–360d', min: 271, max: 360, color: '#a83a30' },
  { key: 'b6', label: '360d+', min: 361, max: Infinity, color: '#7a2b28' }
];

export const CS_PALETTE = ['#cd9f4a', '#7fa8c9', '#c17ea3'];
