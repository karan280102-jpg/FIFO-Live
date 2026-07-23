import * as XLSX from 'xlsx';
import { aggregateItems, aggregateStores, aggregateAgingByItem, todayStr } from './fifo.js';
import { AGING_BUCKETS } from './constants.js';

export function exportToExcel(computedLots, approvals) {
  const wb = XLSX.utils.book_new();

  const ledgerData = computedLots.slice().sort((a, b) => b.dateObj - a.dateObj).map(l => ({
    'Date': l.lot_date, 'Cold Store': l.cold_store, 'SKU Name': l.sku, 'Importer Name': l.importer, 'Lot No': l.lot_no,
    'Box Qty': l.box_qty, 'Out Box': l.out_box, 'Pending Box': l.pending_box,
    'Inward Qty': l.inward_qty, 'Out Qty': l.out_qty, 'Pending Qty': l.pending_qty,
    'Aging (days)': l.aging,
    'FIFO Status': l.violation ? (l.exception_approved_by_name ? 'Approved Exception' : 'Violation') : 'In Order',
    'Approved By': l.exception_approved_by_name || '',
    'PV Remark': l.pv_remark, 'Entered By': l.entered_by_name || '', 'Entered At': l.entered_at || ''
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ledgerData), 'Lot Ledger');

  const items = aggregateItems(computedLots);
  const itemsData = items.map(i => ({
    'Item': i.key, 'Cold Store(s)': i.coldStores.join(', '), 'Total Lots': i.totalLots,
    'Violations': i.violations, 'FIFO %': Math.round(i.fifoPct),
    'Balance Qty (kg)': Math.round(i.balanceQty), 'Oldest Pending (days)': i.oldestAge
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemsData), 'Item-Wise Summary');

  const stores = aggregateStores(computedLots);
  const storesData = stores.map(s => ({
    'Cold Store': s.key, 'Total Lots': s.totalLots, 'Violations': s.violations,
    'FIFO %': Math.round(s.fifoPct), 'Balance Qty (kg)': Math.round(s.balanceQty), 'Oldest Pending (days)': s.oldestAge
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(storesData), 'Cold Store-Wise Summary');

  const agingItems = aggregateAgingByItem(computedLots);
  const agingData = agingItems.map(i => {
    const row = { 'Item': i.sku, 'Cold Store(s)': i.coldStores.join(', ') };
    AGING_BUCKETS.forEach(b => { row[b.label + ' (kg)'] = Math.round(i[b.key]); });
    row['Total Balance (kg)'] = Math.round(i.total);
    row['Oldest Pending (days)'] = i.oldestAge;
    return row;
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(agingData), 'Aging Breakdown');

  if (approvals && approvals.length) {
    const approvalsData = approvals.slice().sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at)).map(a => ({
      'Item': a.sku, 'Cold Store': a.cold_store, 'Lot No': a.lot_no, 'Lot Date': a.lot_date,
      'Qty Requested (kg)': a.out_qty, 'Requested By': a.requested_by_name, 'Requested At': a.requested_at,
      'Status': a.status, 'Decided By': a.decided_by_name || '', 'Decided At': a.decided_at || '',
      'Would Jump Ahead Of': (a.blockers || []).map(b => `Lot ${b.lot_no} (${b.pending_qty}kg, recv ${b.lot_date})`).join('; ')
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(approvalsData), 'Approvals Log');
  }

  XLSX.writeFile(wb, `FIFO_Live_Export_${todayStr()}.xlsx`);
}
