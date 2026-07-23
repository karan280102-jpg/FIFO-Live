import { useState, useMemo } from 'react';
import { Package, Truck, ArrowLeftRight, AlertTriangle } from 'lucide-react';
import { inr, todayStr } from '../lib/fifo.js';

export default function EntryTab({ lots, onNewLot, onDispatch, onTransfer }) {
  const [mode, setMode] = useState('new');
  const coldStores = useMemo(() => [...new Set(lots.map(l => l.cold_store))].sort(), [lots]);
  const skus = useMemo(() => [...new Set(lots.map(l => l.sku))].sort(), [lots]);

  return (
    <div>
      <div className="ff-entry-switch">
        <button className={mode === 'new' ? 'active' : ''} onClick={() => setMode('new')}><Package size={14} /> New Inward Lot</button>
        <button className={mode === 'dispatch' ? 'active' : ''} onClick={() => setMode('dispatch')}><Truck size={14} /> Record Dispatch</button>
        <button className={mode === 'transfer' ? 'active' : ''} onClick={() => setMode('transfer')}><ArrowLeftRight size={14} /> Internal Transfer</button>
      </div>
      {mode === 'new' && <NewLotForm coldStores={coldStores} skus={skus} onSubmit={onNewLot} />}
      {mode === 'dispatch' && <DispatchForm lots={lots} coldStores={coldStores} onSubmit={onDispatch} />}
      {mode === 'transfer' && <TransferForm lots={lots} coldStores={coldStores} onSubmit={onTransfer} />}
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
  const [reason, setReason] = useState('');
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
    onSubmit({ lotId, outQty: q, outBox: Number(outBox) || 0, reason: reason.trim() || null });
    setOutQty(''); setOutBox(''); setLotId(''); setReason('');
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
        <>
          <div className="ff-warn-box">
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            <span>{olderPendingCount} older lot(s) of this item at this cold store still have balance. Submitting this will be sent to the admin for approval instead of applying immediately.</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="ff-label">Reason for bypassing FIFO (optional)</label>
            <input className="ff-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. urgent customer order" />
          </div>
        </>
      )}

      {err && <div className="ff-error">{err}</div>}
      <button type="button" className="ff-btn-primary" style={{ marginTop: 16 }} onClick={submit}><Truck size={15} /> Record Dispatch</button>
    </div>
  );
}

function TransferForm({ lots, coldStores, onSubmit }) {
  const [cs, setCs] = useState('');
  const [sku, setSku] = useState('');
  const [lotId, setLotId] = useState('');
  const [toColdStore, setToColdStore] = useState('');
  const [toLotNo, setToLotNo] = useState('');
  const [qty, setQty] = useState('');
  const [box, setBox] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');

  const skusForStore = useMemo(() => [...new Set(lots.filter(l => !cs || l.cold_store === cs).map(l => l.sku))].sort(), [lots, cs]);
  const availableLots = useMemo(() => {
    return lots.filter(l => (!cs || l.cold_store === cs) && (!sku || l.sku === sku) && l.pending_qty > 0)
      .slice().sort((a, b) => a.dateObj - b.dateObj);
  }, [lots, cs, sku]);
  const selectedLot = lots.find(l => l.id === lotId);
  const olderPendingCount = selectedLot ? availableLots.filter(l => l.id !== selectedLot.id && l.dateObj < selectedLot.dateObj).length : 0;

  function submit() {
    if (!lotId || !qty || !toColdStore.trim() || !toLotNo.trim()) {
      setErr('Choose a source lot, quantity, destination cold store, and new lot number.'); return;
    }
    const q = Number(qty);
    if (q <= 0 || (selectedLot && q > selectedLot.pending_qty)) {
      setErr(`Quantity must be between 0 and the lot's pending balance (${inr(selectedLot?.pending_qty)} kg).`); return;
    }
    if (selectedLot && toColdStore.trim() === selectedLot.cold_store) {
      setErr('Destination cold store must be different from the source cold store.'); return;
    }
    setErr('');
    onSubmit({
      lotId, qty: q, box: Number(box) || 0,
      toColdStore: toColdStore.trim(), toLotNo: toLotNo.trim(),
      notes: notes.trim() || null, reason: reason.trim() || null
    });
    setQty(''); setBox(''); setToColdStore(''); setToLotNo(''); setNotes(''); setReason(''); setLotId('');
  }

  return (
    <div className="ff-panel ff-form">
      <div className="ff-panel-head"><div className="ff-panel-title">Internal Transfer</div><div className="ff-panel-note">move stock between cold stores &middot; jumping the queue at the source still needs approval</div></div>
      <div className="ff-form-grid">
        <div>
          <label className="ff-label">From Cold Store</label>
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
          <label className="ff-label">Source Lot (oldest listed first)</label>
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
          <label className="ff-label">To Cold Store</label>
          <input className="ff-input" list="dest-cs-list" value={toColdStore} onChange={e => setToColdStore(e.target.value)} placeholder="e.g. MJ Cold" />
          <datalist id="dest-cs-list">{coldStores.map(c => <option key={c} value={c} />)}</datalist>
        </div>
        <div>
          <label className="ff-label">New Lot No at Destination</label>
          <input className="ff-input" value={toLotNo} onChange={e => setToLotNo(e.target.value)} placeholder="e.g. 12345-T" />
        </div>
        <div>
          <label className="ff-label">Qty to Transfer (kg)</label>
          <input type="number" min="0" step="0.01" className="ff-input" value={qty} onChange={e => setQty(e.target.value)} />
        </div>
        <div>
          <label className="ff-label">Box Qty (optional)</label>
          <input type="number" min="0" className="ff-input" value={box} onChange={e => setBox(e.target.value)} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="ff-label">Notes (optional)</label>
          <input className="ff-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. reason for the move" />
        </div>
      </div>

      {selectedLot && olderPendingCount > 0 && (
        <>
          <div className="ff-warn-box">
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            <span>{olderPendingCount} older lot(s) of this item at the source cold store still have balance. This transfer will be sent to the admin for approval instead of applying immediately.</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="ff-label">Reason for bypassing FIFO (optional)</label>
            <input className="ff-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. consolidating stock ahead of dispatch" />
          </div>
        </>
      )}

      {err && <div className="ff-error">{err}</div>}
      <button type="button" className="ff-btn-primary" style={{ marginTop: 16 }} onClick={submit}><ArrowLeftRight size={15} /> Transfer Stock</button>
    </div>
  );
}
