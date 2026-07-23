import { useState, useMemo } from 'react';
import { Package, Truck, AlertTriangle } from 'lucide-react';
import { inr, todayStr } from '../lib/fifo.js';

export default function EntryTab({ lots, onNewLot, onDispatch }) {
  const [mode, setMode] = useState('new');
  const coldStores = useMemo(() => [...new Set(lots.map(l => l.cold_store))].sort(), [lots]);
  const skus = useMemo(() => [...new Set(lots.map(l => l.sku))].sort(), [lots]);

  return (
    <div>
      <div className="ff-entry-switch">
        <button className={mode === 'new' ? 'active' : ''} onClick={() => setMode('new')}><Package size={14} /> New Inward Lot</button>
        <button className={mode === 'dispatch' ? 'active' : ''} onClick={() => setMode('dispatch')}><Truck size={14} /> Record Dispatch</button>
      </div>
      {mode === 'new'
        ? <NewLotForm coldStores={coldStores} skus={skus} onSubmit={onNewLot} />
        : <DispatchForm lots={lots} coldStores={coldStores} onSubmit={onDispatch} />}
    </div>
  );
}

function NewLotForm({ coldStores, skus, onSubmit }) {
  const [form, setForm] = useState({ date: todayStr(), coldStore: '', sku: '', importer: '', lotNo: '', boxQty: '', inwardQty: '' });
  const [err, setErr] = useState('');
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function submit() {
    if (!form.coldStore.trim() || !form.sku.trim() || !form.lotNo.trim() || !form.inwardQty) {
      setErr('Cold Store, Item, Lot No, and Inward Qty are required.'); return;
    }
    setErr('');
    onSubmit(form);
    setForm({ date: todayStr(), coldStore: form.coldStore, sku: '', importer: '', lotNo: '', boxQty: '', inwardQty: '' });
  }

  return (
    <div className="ff-panel ff-form">
      <div className="ff-panel-head"><div className="ff-panel-title">New Inward Lot</div><div className="ff-panel-note">adding stock never needs approval</div></div>
      <div className="ff-form-grid">
        <div>
          <label className="ff-label">Date</label>
          <input type="date" className="ff-input" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div>
          <label className="ff-label">Cold Store</label>
          <input className="ff-input" list="cs-list" value={form.coldStore} onChange={e => set('coldStore', e.target.value)} placeholder="e.g. BRG Cold" />
          <datalist id="cs-list">{coldStores.map(c => <option key={c} value={c} />)}</datalist>
        </div>
        <div>
          <label className="ff-label">Item / SKU</label>
          <input className="ff-input" list="sku-list" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="e.g. Premium Khalas Dates..." />
          <datalist id="sku-list">{skus.map(s => <option key={s} value={s} />)}</datalist>
        </div>
        <div>
          <label className="ff-label">Importer (optional)</label>
          <input className="ff-input" value={form.importer} onChange={e => set('importer', e.target.value)} />
        </div>
        <div>
          <label className="ff-label">Lot No</label>
          <input className="ff-input" value={form.lotNo} onChange={e => set('lotNo', e.target.value)} placeholder="e.g. 12345" />
        </div>
        <div>
          <label className="ff-label">Box Qty</label>
          <input type="number" min="0" className="ff-input" value={form.boxQty} onChange={e => set('boxQty', e.target.value)} />
        </div>
        <div>
          <label className="ff-label">Inward Qty (kg)</label>
          <input type="number" min="0" step="0.01" className="ff-input" value={form.inwardQty} onChange={e => set('inwardQty', e.target.value)} />
        </div>
      </div>
      {err && <div className="ff-error">{err}</div>}
      <button type="button" className="ff-btn-primary" style={{ marginTop: 16 }} onClick={submit}><Package size={15} /> Add Lot</button>
    </div>
  );
}

function DispatchForm({ lots, coldStores, onSubmit }) {
  const [cs, setCs] = useState('');
  const [sku, setSku] = useState('');
  const [lotId, setLotId] = useState('');
  const [outQty, setOutQty] = useState('');
  const [outBox, setOutBox] = useState('');
  const [err, setErr] = useState('');

  const skusForStore = useMemo(() => [...new Set(lots.filter(l => !cs || l.cold_store === cs).map(l => l.sku))].sort(), [lots, cs]);
  const availableLots = useMemo(() => {
    return lots.filter(l => (!cs || l.cold_store === cs) && (!sku || l.sku === sku) && l.pending_qty > 0)
      .slice().sort((a, b) => a.dateObj - b.dateObj);
  }, [lots, cs, sku]);
  const selectedLot = lots.find(l => l.id === lotId);
  const olderPendingCount = selectedLot ? availableLots.filter(l => l.id !== selectedLot.id && l.dateObj < selectedLot.dateObj).length : 0;

  function submit() {
    if (!lotId || !outQty) { setErr('Choose a lot and enter the quantity dispatched.'); return; }
    const q = Number(outQty);
    if (q <= 0 || (selectedLot && q > selectedLot.pending_qty)) {
      setErr(`Quantity must be between 0 and the lot's pending balance (${inr(selectedLot?.pending_qty)} kg).`); return;
    }
    setErr('');
    onSubmit({ lotId, outQty: q, outBox: Number(outBox) || 0 });
    setOutQty(''); setOutBox(''); setLotId('');
  }

  return (
    <div className="ff-panel ff-form">
      <div className="ff-panel-head"><div className="ff-panel-title">Record Dispatch</div><div className="ff-panel-note">dispatching out of order needs admin approval</div></div>
      <div className="ff-form-grid">
        <div>
          <label className="ff-label">Cold Store</label>
          <select className="ff-input" value={cs} onChange={e => { setCs(e.target.value); setSku(''); setLotId(''); }}>
            <option value="">All cold stores</option>
            {coldStores.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="ff-label">Item / SKU</label>
          <select className="ff-input" value={sku} onChange={e => { setSku(e.target.value); setLotId(''); }}>
            <option value="">Select an item</option>
            {skusForStore.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="ff-label">Lot (oldest listed first)</label>
          <select className="ff-input" value={lotId} onChange={e => setLotId(e.target.value)}>
            <option value="">Select a lot</option>
            {availableLots.map(l => (
              <option key={l.id} value={l.id}>
                {l.cold_store} · {l.sku.slice(0, 40)}{l.sku.length > 40 ? '…' : ''} · Lot {l.lot_no} · recv {l.lot_date} · {inr(l.pending_qty)} kg pending
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="ff-label">Out Qty (kg)</label>
          <input type="number" min="0" step="0.01" className="ff-input" value={outQty} onChange={e => setOutQty(e.target.value)} />
        </div>
        <div>
          <label className="ff-label">Out Box (optional)</label>
          <input type="number" min="0" className="ff-input" value={outBox} onChange={e => setOutBox(e.target.value)} />
        </div>
      </div>

      {selectedLot && olderPendingCount > 0 && (
        <div className="ff-warn-box">
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span>{olderPendingCount} older lot(s) of this item at this cold store still have balance. Submitting this will be sent to the admin for approval instead of applying immediately.</span>
        </div>
      )}

      {err && <div className="ff-error">{err}</div>}
      <button type="button" className="ff-btn-primary" style={{ marginTop: 16 }} onClick={submit}><Truck size={15} /> Record Dispatch</button>
    </div>
  );
}
