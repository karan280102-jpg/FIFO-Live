import { AGING_BUCKETS } from './constants.js';

export function inr(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Math.round(n).toLocaleString('en-IN');
}

export function daysBetween(a, b) {
  return Math.round((a - b) / 86400000);
}

export function fmtDate(d) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fifoColor(p) {
  if (p >= 95) return '#5fae7c';
  if (p >= 75) return '#d9a441';
  return '#c15a4e';
}

export function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
}

/**
 * Computes FIFO violation flags on the full lot set.
 * A lot is a "violation" if it has been dispatched (out_qty > 0) while an
 * OLDER lot of the same cold_store + sku still has pending_qty > 0.
 */
export function computeFifo(rawLots) {
  const rows = rawLots.map(r => ({ ...r, dateObj: new Date(r.lot_date) }));
  const today = new Date();
  rows.forEach(r => { r.aging = daysBetween(today, r.dateObj); });

  const groups = {};
  rows.forEach(r => {
    const key = r.cold_store + '||' + r.sku;
    (groups[key] = groups[key] || []).push(r);
  });

  Object.values(groups).forEach(g => {
    g.sort((a, b) => a.dateObj - b.dateObj || String(a.lot_no).localeCompare(String(b.lot_no)));
    g.forEach((lot, i) => {
      const older = g.slice(0, i);
      const olderPending = older.filter(o => o.pending_qty > 0);
      lot.queueIndex = i;
      lot.queueTotal = g.length;
      lot.violation = (lot.out_qty > 0) && olderPending.length > 0;
      lot.blockedBy = lot.violation ? olderPending.map(o => o.lot_no) : [];
    });
  });

  return rows;
}

export function aggregateBy(rows, keyFn) {
  const map = {};
  rows.forEach(r => {
    const key = keyFn(r);
    if (!map[key]) map[key] = { key, rows: [], coldStores: new Set() };
    map[key].rows.push(r);
    map[key].coldStores.add(r.cold_store);
  });
  return Object.values(map).map(g => {
    const totalLots = g.rows.length;
    const violations = g.rows.filter(r => r.violation).length;
    const fifoPct = totalLots ? 100 * (1 - violations / totalLots) : 100;
    const balanceQty = g.rows.reduce((s, r) => s + Number(r.pending_qty), 0);
    const pendingLots = g.rows.filter(r => r.pending_qty > 0);
    const oldestAge = pendingLots.length ? Math.max(...pendingLots.map(r => r.aging)) : 0;
    return { key: g.key, coldStores: [...g.coldStores], totalLots, violations, fifoPct, balanceQty, oldestAge };
  });
}

export function aggregateItems(rows) {
  return aggregateBy(rows, r => r.sku).sort((a, b) => a.fifoPct - b.fifoPct);
}
export function aggregateStores(rows) {
  return aggregateBy(rows, r => r.cold_store).sort((a, b) => b.balanceQty - a.balanceQty);
}

export function aggregateAgingByItem(rows) {
  const pending = rows.filter(r => r.pending_qty > 0);
  const map = {};
  pending.forEach(r => {
    if (!map[r.sku]) {
      const g = { sku: r.sku, coldStores: new Set(), total: 0, oldestAge: 0 };
      AGING_BUCKETS.forEach(b => { g[b.key] = 0; });
      map[r.sku] = g;
    }
    const g = map[r.sku];
    g.coldStores.add(r.cold_store);
    const bucket = AGING_BUCKETS.find(b => r.aging >= b.min && r.aging <= b.max);
    if (bucket) g[bucket.key] += Number(r.pending_qty);
    g.total += Number(r.pending_qty);
    if (r.aging > g.oldestAge) g.oldestAge = r.aging;
  });
  return Object.values(map).map(g => ({ ...g, coldStores: [...g.coldStores] })).sort((a, b) => b.total - a.total);
}

export function overallKPI(rows) {
  const totalLots = rows.length;
  const violations = rows.filter(r => r.violation).length;
  const fifoPct = totalLots ? 100 * (1 - violations / totalLots) : 100;
  const balanceQty = rows.reduce((s, r) => s + Number(r.pending_qty), 0);
  const items = aggregateItems(rows);
  const atRisk = items.filter(i => i.fifoPct < 80).length;
  const pendingLots = rows.filter(r => r.pending_qty > 0);
  let oldest = null;
  pendingLots.forEach(r => { if (!oldest || r.aging > oldest.aging) oldest = r; });
  return { totalLots, violations, fifoPct, balanceQty, atRisk, oldest };
}
