import { LayoutDashboard, Plus, Package, Warehouse, CalendarClock, Table2, ListChecks } from 'lucide-react';

const NAV_ITEMS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'entry', label: 'Add Entry', icon: Plus },
  { key: 'items', label: 'Item-Wise', icon: Package },
  { key: 'stores', label: 'Cold Store-Wise', icon: Warehouse },
  { key: 'aging', label: 'Aging', icon: CalendarClock },
  { key: 'ledger', label: 'Lot Ledger', icon: Table2 },
  { key: 'approvals', label: 'Approvals', icon: ListChecks }
];

export default function Nav({ view, setView, pendingCount }) {
  return (
    <nav className="ff-nav">
      {NAV_ITEMS.map(item => {
        const Icon = item.icon;
        return (
          <button key={item.key} className={'ff-nav-btn' + (view === item.key ? ' active' : '')} onClick={() => setView(item.key)}>
            <Icon size={14} />
            {item.label}
            {item.key === 'approvals' && pendingCount > 0 && <span className="ff-nav-badge">{pendingCount}</span>}
          </button>
        );
      })}
    </nav>
  );
}
