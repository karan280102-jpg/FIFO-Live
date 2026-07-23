import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, LabelList, Tooltip as RTooltip } from 'recharts';
import { overallKPI, aggregateItems, aggregateStores, inr, fifoColor } from '../lib/fifo.js';

function KpiCard({ label, value, sub, tone }) {
  const color = tone === 'good' ? '#5fae7c' : tone === 'warn' ? '#d9a441' : tone === 'bad' ? '#c15a4e' : '#f3ede0';
  return (
    <div className="ff-kpi">
      <div className="ff-kpi-label">{label}</div>
      <div className="ff-kpi-val" style={{ color }}>{value}</div>
      <div className="ff-kpi-sub">{sub}</div>
    </div>
  );
}

export default function OverviewTab({ lots }) {
  const k = useMemo(() => overallKPI(lots), [lots]);
  const items = useMemo(() => aggregateItems(lots), [lots]);
  const stores = useMemo(() => aggregateStores(lots), [lots]);
  const watchItems = items.filter(i => i.violations > 0).slice(0, 8);
  const worstItems = items.slice(0, 12).map(i => ({
    name: i.key.length > 34 ? i.key.slice(0, 34) + '…' : i.key,
    pct: Math.round(i.fifoPct), color: fifoColor(i.fifoPct)
  }));

  return (
    <div>
      <div className="ff-kpi-grid">
        <KpiCard label="Total Lots" value={inr(k.totalLots)} sub="tracked live" />
        <KpiCard label="Overall FIFO Compliance" value={Math.round(k.fifoPct) + '%'} sub={`${k.violations} of ${k.totalLots} lots out of order`} tone={k.fifoPct >= 95 ? 'good' : k.fifoPct >= 75 ? 'warn' : 'bad'} />
        <KpiCard label="Lots In Violation" value={k.violations} sub="dispatched ahead of an older lot" tone={k.violations > 0 ? 'bad' : 'good'} />
        <KpiCard label="Balance Qty Pending" value={inr(k.balanceQty)} sub="kg across cold stores" />
        <KpiCard label="Items Needing Attention" value={k.atRisk} sub="items below 80% FIFO" tone={k.atRisk > 0 ? 'warn' : 'good'} />
        <KpiCard label="Oldest Pending Lot" value={k.oldest ? k.oldest.aging + ' d' : '—'} sub={k.oldest ? `${k.oldest.sku.slice(0, 26)}${k.oldest.sku.length > 26 ? '…' : ''} · Lot ${k.oldest.lot_no}` : 'no pending stock'} tone={k.oldest && k.oldest.aging > 270 ? 'bad' : k.oldest && k.oldest.aging > 90 ? 'warn' : 'good'} />
      </div>

      <div className="ff-panel">
        <div className="ff-panel-head">
          <div className="ff-panel-title">FIFO Compliance — Items Needing Attention</div>
          <div className="ff-panel-note">lowest-scoring items · full list under Item-Wise</div>
        </div>
        <div style={{ height: Math.max(360, worstItems.length * 38 + 30) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={worstItems} layout="vertical" margin={{ top: 4, right: 60, left: 4, bottom: 4 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#6e6455', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={230} tick={{ fill: '#a89a83', fontSize: 11 }} axisLine={false} tickLine={false} />
              <RTooltip contentStyle={{ background: '#0d0b09', border: '1px solid rgba(212,175,90,0.32)', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [v + '%', 'FIFO']} labelStyle={{ color: '#f3ede0' }} />
              <Bar dataKey="pct" radius={[4, 4, 4, 4]} barSize={18}>
                {worstItems.map((it, idx) => (<Cell key={idx} fill={it.color} />))}
                <LabelList dataKey="pct" position="right" formatter={(v) => v + '%'} fill="#a89a83" fontSize={10.5} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ff-grid-2">
        <div className="ff-panel">
          <div className="ff-panel-head">
            <div className="ff-panel-title">Balance Qty by Cold Store</div>
            <div className="ff-panel-note">{inr(k.balanceQty)} kg pending across {stores.length} store(s)</div>
          </div>
          <div style={{ height: Math.max(300, stores.length * 120) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stores.map(s => ({ name: s.key, qty: Math.round(s.balanceQty) }))}
                layout="vertical" margin={{ top: 6, right: 90, left: 4, bottom: 6 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#f3ede0', fontSize: 13 }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ background: '#0d0b09', border: '1px solid rgba(212,175,90,0.32)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [inr(v) + ' kg', 'Balance']} />
                <Bar dataKey="qty" radius={[10, 10, 10, 10]} barSize={46}>
                  {stores.map((s, idx) => (<Cell key={idx} fill={['#cd9f4a', '#7fa8c9', '#c17ea3'][idx % 3]} />))}
                  <LabelList dataKey="qty" position="right" formatter={(v) => inr(v) + ' kg'} fill="#f3ede0" fontSize={12} fontWeight={700} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="ff-panel">
          <div className="ff-panel-head">
            <div className="ff-panel-title">Watchlist</div>
            <div className="ff-panel-note">items with FIFO violations</div>
          </div>
          {watchItems.length === 0 ? (
            <div className="ff-empty" style={{ padding: '30px 10px' }}>
              <div className="ff-display" style={{ fontSize: 18 }}>All clear</div>
              <div>No FIFO violations right now.</div>
            </div>
          ) : (
            <div className="ff-attn-list">
              {watchItems.map(i => (
                <div key={i.key} className="ff-attn-row">
                  <span className="ff-attn-name">{i.key}</span>
                  <span className="ff-attn-pct" style={{ color: fifoColor(i.fifoPct) }}>{Math.round(i.fifoPct)}%</span>
                  <span className="ff-attn-meta">{i.violations} of {i.totalLots} lots</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
