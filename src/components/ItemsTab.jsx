import { useState, useMemo, Fragment } from 'react';
import { aggregateItems, aggregateBy, inr, fifoColor } from '../lib/fifo.js';

export default function ItemsTab({ lots }) {
  const items = useMemo(() => aggregateItems(lots), [lots]);
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="ff-panel">
      <div className="ff-panel-head">
        <div className="ff-panel-title">Item-Wise FIFO Compliance</div>
        <div className="ff-panel-note">{items.length} items &middot; click a row to see qty by cold store</div>
      </div>
      <div className="ff-tbl-wrap">
        <table className="ff-table">
          <thead><tr>
            <th></th>
            <th>Item</th><th>Cold Store(s)</th><th className="num">Lots</th><th className="num">Violations</th>
            <th className="num">FIFO %</th><th className="num">Balance Qty (kg)</th><th className="num">Oldest Pending (d)</th>
          </tr></thead>
          <tbody>
            {items.map(i => {
              const isOpen = expanded === i.key;
              const storeRows = isOpen
                ? aggregateBy(lots.filter(l => l.sku === i.key), l => l.cold_store).sort((a, b) => b.balanceQty - a.balanceQty)
                : [];
              return (
                <Fragment key={i.key}>
                  <tr className="row-click" style={{ cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : i.key)}>
                    <td style={{ color: '#6e6455', width: 18 }}>{isOpen ? '▾' : '▸'}</td>
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
                  {isOpen && (
                    <tr>
                      <td colSpan={8} style={{ padding: 0, background: '#151210' }}>
                        <div style={{ padding: '10px 16px 16px' }}>
                          <table className="ff-table" style={{ fontSize: 12 }}>
                            <thead><tr>
                              <th>Cold Store</th><th className="num">Lots</th><th className="num">Violations</th>
                              <th className="num">FIFO %</th><th className="num">Balance Qty (kg)</th><th className="num">Oldest Pending (d)</th>
                            </tr></thead>
                            <tbody>
                              {storeRows.map(s => (
                                <tr key={s.key}>
                                  <td className="strong">{s.key}</td>
                                  <td className="num">{s.totalLots}</td>
                                  <td className="num">{s.violations ? <span style={{ color: '#c15a4e' }}>{s.violations}</span> : '0'}</td>
                                  <td>
                                    <span className="ff-pctbar"><i style={{ width: Math.round(s.fifoPct) + '%', background: fifoColor(s.fifoPct) }}></i></span>
                                    {Math.round(s.fifoPct)}%
                                  </td>
                                  <td className="num strong">{inr(s.balanceQty)}</td>
                                  <td className="num">{s.oldestAge || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
