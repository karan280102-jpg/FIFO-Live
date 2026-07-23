import { useState, useMemo, Fragment } from 'react';
import { Search } from 'lucide-react';
import { aggregateItems, aggregateBy, inr, fifoColor } from '../lib/fifo.js';

function SortTh({ label, sortField, className, sortKey, sortDir, onSort }) {
  const active = sortKey === sortField;
  return (
    <th className={`sortable${className ? ' ' + className : ''}`} onClick={() => onSort(sortField)}>
      {label}{active && <span className="ff-sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}
    </th>
  );
}

export default function ItemsTab({ lots }) {
  const items = useMemo(() => aggregateItems(lots), [lots]);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('fifoPct');
  const [sortDir, setSortDir] = useState('asc');

  function onSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'key' ? 'asc' : 'desc'); }
  }

  const filtered = useMemo(() => {
    let rows = items;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(i => i.key.toLowerCase().includes(q) || i.coldStores.some(c => c.toLowerCase().includes(q)));
    }
    rows = [...rows].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [items, search, sortKey, sortDir]);

  return (
    <div className="ff-panel">
      <div className="ff-panel-head">
        <div>
          <div className="ff-panel-title">Item-Wise FIFO Compliance</div>
          <div className="ff-panel-note">{filtered.length} of {items.length} items &middot; click a row to see qty by cold store</div>
        </div>
        <div className="ff-search-wrap">
          <Search size={14} />
          <input className="ff-input" placeholder="Search item or cold store..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="ff-tbl-wrap">
        <table className="ff-table">
          <thead><tr>
            <th></th>
            <SortTh label="Item" sortField="key" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <th>Cold Store(s)</th>
            <SortTh label="Lots" sortField="totalLots" className="num" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="Violations" sortField="violations" className="num" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="FIFO %" sortField="fifoPct" className="num" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="Balance Qty (kg)" sortField="balanceQty" className="num" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="Oldest Pending (d)" sortField="oldestAge" className="num" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
          </tr></thead>
          <tbody>
            {filtered.map(i => {
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
