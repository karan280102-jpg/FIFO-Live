import { useState, useMemo } from 'react';
import { aggregateItems, aggregateStores, inr, fifoColor } from '../lib/fifo.js';

export default function StoresTab({ lots }) {
  const stores = useMemo(() => aggregateStores(lots), [lots]);
  const [focus, setFocus] = useState(null);
  const activeFocus = focus || (stores[0] && stores[0].key);
  const storeRows = lots.filter(l => l.cold_store === activeFocus);
  const storeItems = useMemo(() => aggregateItems(storeRows), [storeRows]);

  return (
    <div>
      <div className="ff-cs-grid">
        {stores.map(s => {
          const r = 26, c = 2 * Math.PI * r, dash = c * (s.fifoPct / 100);
          return (
            <div key={s.key} className="ff-cs-card"
              style={{ borderColor: activeFocus === s.key ? 'rgba(212,175,90,0.32)' : 'rgba(212,175,90,0.14)' }}
              onClick={() => setFocus(s.key)}>
              <div className="ff-cs-card-top">
                <div>
                  <div className="ff-display" style={{ fontSize: 22 }}>{s.key}</div>
                  <div className="ff-panel-note" style={{ marginTop: 4 }}>{s.totalLots} lots</div>
                </div>
                <div className="ff-ring">
                  <svg width="64" height="64">
                    <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                    <circle cx="32" cy="32" r={r} fill="none" stroke={fifoColor(s.fifoPct)} strokeWidth="6"
                      strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform="rotate(-90 32 32)" />
                  </svg>
                  <div className="ff-ring-val" style={{ color: fifoColor(s.fifoPct) }}>{Math.round(s.fifoPct)}%</div>
                </div>
              </div>
              <div className="ff-cs-metrics">
                <div><span className="ff-metric-val" style={{ color: s.violations ? '#c15a4e' : '#5fae7c' }}>{s.violations}</span><span className="ff-metric-label">Violations</span></div>
                <div><span className="ff-metric-val">{inr(s.balanceQty)}</span><span className="ff-metric-label">Balance Kg</span></div>
                <div><span className="ff-metric-val">{s.oldestAge || 0}</span><span className="ff-metric-label">Oldest Days</span></div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="ff-panel">
        <div className="ff-panel-head">
          <div className="ff-panel-title">Item Breakdown — {activeFocus}</div>
          <div className="ff-panel-note">select a cold store above to change focus</div>
        </div>
        <div className="ff-tbl-wrap">
          <table className="ff-table">
            <thead><tr><th>Item</th><th className="num">Lots</th><th className="num">Violations</th><th className="num">FIFO %</th><th className="num">Balance Qty (kg)</th><th className="num">Oldest Pending (d)</th></tr></thead>
            <tbody>
              {storeItems.map(i => (
                <tr key={i.key}>
                  <td className="strong">{i.key}</td>
                  <td className="num">{i.totalLots}</td>
                  <td className="num">{i.violations ? <span style={{ color: '#c15a4e' }}>{i.violations}</span> : '0'}</td>
                  <td><span className="ff-pctbar"><i style={{ width: Math.round(i.fifoPct) + '%', background: fifoColor(i.fifoPct) }}></i></span>{Math.round(i.fifoPct)}%</td>
                  <td className="num">{inr(i.balanceQty)}</td>
                  <td className="num">{i.oldestAge || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
