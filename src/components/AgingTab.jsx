import { useMemo } from 'react';
import { aggregateAgingByItem, inr } from '../lib/fifo.js';
import { AGING_BUCKETS } from '../lib/constants.js';

export default function AgingTab({ lots }) {
  const items = useMemo(() => aggregateAgingByItem(lots), [lots]);
  const lastKey = AGING_BUCKETS[AGING_BUCKETS.length - 1].key;
  return (
    <div className="ff-panel">
      <div className="ff-panel-head">
        <div className="ff-panel-title">Item-Wise Aging Breakdown</div>
        <div className="ff-panel-note">{items.length} items holding balance</div>
      </div>
      <div className="ff-tbl-wrap">
        <table className="ff-table">
          <thead><tr>
            <th>Item</th><th>Cold Store(s)</th>
            {AGING_BUCKETS.map(b => <th key={b.key} className="num">{b.label} (kg)</th>)}
            <th className="num">Total Balance (kg)</th><th className="num">Oldest Pending (d)</th>
          </tr></thead>
          <tbody>
            {items.map(i => (
              <tr key={i.sku}>
                <td className="strong">{i.sku}</td>
                <td>{i.coldStores.map(c => <span key={c} className="ff-badge dim">{c}</span>)}</td>
                {AGING_BUCKETS.map(b => {
                  const v = i[b.key];
                  return <td key={b.key} className="num" style={{ color: v ? b.color : undefined, fontWeight: (v && b.key === lastKey) ? 700 : undefined }}>{v ? inr(v) : '—'}</td>;
                })}
                <td className="num strong">{inr(i.total)}</td>
                <td className="num">{i.oldestAge}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
