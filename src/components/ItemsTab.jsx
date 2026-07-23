import { useMemo } from 'react';
import { aggregateItems, inr, fifoColor } from '../lib/fifo.js';

export default function ItemsTab({ lots }) {
  const items = useMemo(() => aggregateItems(lots), [lots]);
  return (
    <div className="ff-panel">
      <div className="ff-panel-head">
        <div className="ff-panel-title">Item-Wise FIFO Compliance</div>
        <div className="ff-panel-note">{items.length} items</div>
      </div>
      <div className="ff-tbl-wrap">
        <table className="ff-table">
          <thead><tr>
            <th>Item</th><th>Cold Store(s)</th><th className="num">Lots</th><th className="num">Violations</th>
            <th className="num">FIFO %</th><th className="num">Balance Qty (kg)</th><th className="num">Oldest Pending (d)</th>
          </tr></thead>
          <tbody>
            {items.map(i => (
              <tr key={i.key}>
                <td className="strong">{i.key}</td>
                <td>{i.coldStores.map(c => <span key={c} className="ff-badge dim">{c}</span>)}</td>
                <td className="num">{i.totalLots}</td>
                <td className="num">{i.violations ? <span style={{ color: '#c15a4e' }}>{i.violations}</span> : '0'}</td>
                <td>
                  <span className="ff-pctbar"><i style={{ width: Math.round(i.fifoPct) + '%', background: fifoColor(i.fifoPct) }}></i></span>
                  {Math.round(i.fifoPct)}%
                </td>
                <td className="num">{inr(i.balanceQty)}</td>
                <td className="num">{i.oldestAge || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
