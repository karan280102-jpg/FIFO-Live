import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase, configMissing } from './lib/supabaseClient.js';
import { computeFifo, todayStr } from './lib/fifo.js';
import { exportToExcel } from './lib/exportExcel.js';
import Auth from './components/Auth.jsx';
import Header from './components/Header.jsx';
import Nav from './components/Nav.jsx';
import Toast from './components/Toast.jsx';
import OverviewTab from './components/OverviewTab.jsx';
import EntryTab from './components/EntryTab.jsx';
import ItemsTab from './components/ItemsTab.jsx';
import StoresTab from './components/StoresTab.jsx';
import AgingTab from './components/AgingTab.jsx';
import LedgerTab from './components/LedgerTab.jsx';
import ApprovalsTab from './components/ApprovalsTab.jsx';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [lots, setLots] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('overview');
  const [toast, setToast] = useState(null);

  function showToast(msg, type) { setToast({ msg, type: type || 'ok' }); setTimeout(() => setToast(null), 5000); }

  // ---- auth session tracking ----
  useEffect(() => {
    if (configMissing) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ---- load profile once we have a session ----
  useEffect(() => {
    if (!session) { setProfile(null); return; }
    (async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (!error) setProfile(data);
    })();
  }, [session]);

  // ---- load lots + approvals, and subscribe to realtime changes ----
  useEffect(() => {
    if (!session) return;
    let active = true;
    setLoading(true);

    async function loadAll() {
      const [lotsRes, approvalsRes] = await Promise.all([
        supabase.from('lots').select('*'),
        supabase.from('approvals').select('*')
      ]);
      if (!active) return;
      if (lotsRes.error) showToast('Could not load lots: ' + lotsRes.error.message, 'error');
      else setLots(lotsRes.data || []);
      if (approvalsRes.error) showToast('Could not load approvals: ' + approvalsRes.error.message, 'error');
      else setApprovals(approvalsRes.data || []);
      setLoading(false);
    }
    loadAll();

    const channel = supabase
      .channel('fifo-live-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lots' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approvals' }, loadAll)
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [session]);

  const computedLots = useMemo(() => computeFifo(lots), [lots]);
  const pendingCount = approvals.filter(a => a.status === 'pending').length;
  const isAdmin = profile?.role === 'Admin';

  // ---- handlers ----
  async function handleNewLot(form) {
    const { error } = await supabase.from('lots').insert({
      lot_date: form.date, cold_store: form.coldStore.trim(), sku: form.sku.trim(),
      importer: (form.importer || '').trim() || null, lot_no: form.lotNo.trim(),
      box_qty: Number(form.boxQty) || 0, out_box: 0, pending_box: Number(form.boxQty) || 0,
      inward_qty: Number(form.inwardQty) || 0, out_qty: 0, pending_qty: Number(form.inwardQty) || 0,
      pv_remark: 'Done', entered_by: profile.id, entered_by_name: profile.name
    });
    if (error) showToast('Could not add lot: ' + error.message, 'error');
    else showToast(`New lot ${form.lotNo} added for ${form.sku.slice(0, 40)}.`);
  }

  function findBlockers(lot) {
    return computedLots.filter(l =>
      l.cold_store === lot.cold_store && l.sku === lot.sku && l.id !== lot.id && l.pending_qty > 0 && l.dateObj < lot.dateObj
    );
  }

  async function handleDispatch({ lotId, outQty, outBox, reason }) {
    const lot = computedLots.find(l => l.id === lotId);
    if (!lot) return;

    const blockers = findBlockers(lot);

    if (blockers.length > 0) {
      const blockerPayload = blockers.map(b => ({ lot_no: b.lot_no, lot_date: b.lot_date, pending_qty: b.pending_qty }));
      const { error } = await supabase.from('approvals').insert({
        action_type: 'dispatch',
        lot_id: lot.id, cold_store: lot.cold_store, sku: lot.sku, lot_no: lot.lot_no, lot_date: lot.lot_date,
        out_qty: outQty, out_box: outBox, requested_by: profile.id, requested_by_name: profile.name,
        blockers: blockerPayload, reason: reason || null
      });

      if (error) { showToast('Could not create approval request: ' + error.message, 'error'); return; }
      showToast('This dispatch would break FIFO order — sent to the Approvals tab for admin review.', 'warn');
    } else {
      const { error } = await supabase.from('lots').update({
        out_qty: Number(lot.out_qty) + outQty,
        pending_qty: Math.max(0, Number(lot.pending_qty) - outQty),
        out_box: Number(lot.out_box) + outBox,
        pending_box: Math.max(0, Number(lot.pending_box) - outBox)
      }).eq('id', lotId);
      if (error) showToast('Could not record dispatch: ' + error.message, 'error');
      else showToast(`Dispatch of ${outQty} kg recorded for lot ${lot.lot_no}.`);
    }
  }

  async function applyTransfer(lot, qty, box, toColdStore, toLotNo, notes, markException) {
    const srcUpdate = {
      out_qty: Number(lot.out_qty) + qty,
      pending_qty: Math.max(0, Number(lot.pending_qty) - qty),
      out_box: Number(lot.out_box) + box,
      pending_box: Math.max(0, Number(lot.pending_box) - box)
    };
    if (markException) {
      srcUpdate.exception_approved_by = profile.id;
      srcUpdate.exception_approved_by_name = profile.name;
      srcUpdate.exception_approved_at = new Date().toISOString();
    }
    const { error: srcErr } = await supabase.from('lots').update(srcUpdate).eq('id', lot.id);
    if (srcErr) { showToast('Could not update source lot: ' + srcErr.message, 'error'); return false; }

    const { error: dstErr } = await supabase.from('lots').insert({
      lot_date: todayStr(), cold_store: toColdStore, sku: lot.sku,
      importer: notes ? notes.slice(0, 120) : 'Internal transfer', lot_no: toLotNo,
      box_qty: box, out_box: 0, pending_box: box,
      inward_qty: qty, out_qty: 0, pending_qty: qty, pv_remark: 'Done',
      entered_by: profile.id, entered_by_name: profile.name
    });
    if (dstErr) { showToast('Source lot updated, but the destination lot failed: ' + dstErr.message, 'error'); return false; }
    return true;
  }

  async function handleTransfer({ lotId, qty, box, toColdStore, toLotNo, notes, reason }) {
    const lot = computedLots.find(l => l.id === lotId);
    if (!lot) return;

    const blockers = findBlockers(lot);

    if (blockers.length > 0) {
      const blockerPayload = blockers.map(b => ({ lot_no: b.lot_no, lot_date: b.lot_date, pending_qty: b.pending_qty }));
      const { error } = await supabase.from('approvals').insert({
        action_type: 'transfer',
        lot_id: lot.id, cold_store: lot.cold_store, sku: lot.sku, lot_no: lot.lot_no, lot_date: lot.lot_date,
        out_qty: qty, out_box: box, requested_by: profile.id, requested_by_name: profile.name,
        blockers: blockerPayload, to_cold_store: toColdStore, to_lot_no: toLotNo, reason: reason || null
      });
      if (error) { showToast('Could not create transfer request: ' + error.message, 'error'); return; }
      showToast('This transfer would break FIFO order at the source — sent to the Approvals tab for admin review.', 'warn');
    } else {
      const ok = await applyTransfer(lot, qty, box, toColdStore, toLotNo, notes, false);
      if (ok) showToast(`Transferred ${qty} kg to ${toColdStore} as lot ${toLotNo}.`);
    }
  }

  async function handleApprove(reqId) {
    const req = approvals.find(a => a.id === reqId);
    const lot = lots.find(l => l.id === req.lot_id);
    if (!req || !lot) return;

    if (req.action_type === 'transfer') {
      const ok = await applyTransfer(lot, Number(req.out_qty), Number(req.out_box || 0), req.to_cold_store, req.to_lot_no, null, true);
      if (!ok) return;
    } else {
      const { error: lotErr } = await supabase.from('lots').update({
        out_qty: Number(lot.out_qty) + Number(req.out_qty),
        pending_qty: Math.max(0, Number(lot.pending_qty) - Number(req.out_qty)),
        out_box: Number(lot.out_box) + Number(req.out_box || 0),
        pending_box: Math.max(0, Number(lot.pending_box) - Number(req.out_box || 0)),
        exception_approved_by: profile.id, exception_approved_by_name: profile.name, exception_approved_at: new Date().toISOString()
      }).eq('id', lot.id);
      if (lotErr) { showToast('Could not apply the dispatch: ' + lotErr.message, 'error'); return; }
    }

    await supabase.from('approvals').update({
      status: 'approved', decided_by: profile.id, decided_by_name: profile.name, decided_at: new Date().toISOString()
    }).eq('id', reqId);
    showToast(req.action_type === 'transfer' ? 'Transfer approved and applied.' : 'Dispatch approved and applied to live data.');
  }

  async function handleReject(reqId) {
    await supabase.from('approvals').update({
      status: 'rejected', decided_by: profile.id, decided_by_name: profile.name, decided_at: new Date().toISOString()
    }).eq('id', reqId);
    showToast('Request rejected — no change applied.');
  }

  async function handleDeleteLot(lotId) {
    const target = lots.find(l => l.id === lotId);
    const { error } = await supabase.from('lots').delete().eq('id', lotId);
    if (error) showToast('Could not delete: ' + error.message, 'error');
    else showToast(target ? `Deleted lot ${target.lot_no}.` : 'Lot deleted.');
  }

  // ---- render ----
  if (configMissing) {
    return (
      <div className="ff-root">
        <div className="ff-login-wrap">
          <div className="ff-login-card">
            <AlertTriangle size={28} color="#d9a441" style={{ display: 'block', margin: '0 auto 14px' }} />
            <div className="ff-display" style={{ fontSize: 22, textAlign: 'center' }}>Setup needed</div>
            <div style={{ color: '#a89a83', fontSize: 12.5, textAlign: 'center', marginTop: 10, lineHeight: 1.6 }}>
              VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY aren't set. Add them to your <code>.env</code> file locally,
              or as Environment Variables in your Vercel project settings, then redeploy.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return <div className="ff-root"><Auth /></div>;
  if (loading || !profile) {
    return (
      <div className="ff-root">
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a89a83' }}>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="ff-root">
      <Header profile={profile} onSignOut={() => supabase.auth.signOut()} onExport={() => exportToExcel(computedLots, approvals)} pendingCount={pendingCount} />
      <Nav view={view} setView={setView} pendingCount={pendingCount} />
      <div className="ff-main">
        {view === 'overview' && <OverviewTab lots={computedLots} />}
        {view === 'entry' && <EntryTab lots={computedLots} onNewLot={handleNewLot} onDispatch={handleDispatch} onTransfer={handleTransfer} />}
        {view === 'items' && <ItemsTab lots={computedLots} />}
        {view === 'stores' && <StoresTab lots={computedLots} />}
        {view === 'aging' && <AgingTab lots={computedLots} />}
        {view === 'ledger' && <LedgerTab lots={computedLots} isAdmin={isAdmin} onDelete={handleDeleteLot} />}
        {view === 'approvals' && <ApprovalsTab approvals={approvals} isAdmin={isAdmin} onApprove={handleApprove} onReject={handleReject} />}
      </div>
      <Toast toast={toast} />
    </div>
  );
}
