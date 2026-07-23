import { Clock, Download, LogOut } from 'lucide-react';

export default function Header({ profile, onSignOut, onExport, pendingCount }) {
  return (
    <header className="ff-header">
      <div className="ff-header-brand">
        <div className="ff-brand-mark">F</div>
        <div>
          <div className="ff-display" style={{ fontSize: 19 }}>FIFO LIVE</div>
          <div className="ff-header-sub">Farmley Cold Storage &middot; shared live tracker</div>
        </div>
      </div>
      <div className="ff-header-right">
        {pendingCount > 0 && (
          <span className="ff-pending-pill"><Clock size={12} /> {pendingCount} awaiting approval</span>
        )}
        <button className="ff-btn-ghost" onClick={onExport}><Download size={13} /> Export Data</button>
        <span className={'ff-role-dot ' + (profile.role === 'Admin' ? 'admin' : '')}></span>
        <span className="ff-user-name">{profile.name}</span>
        <span className="ff-role-tag">{profile.role}</span>
        <button className="ff-btn-ghost" onClick={onSignOut}><LogOut size={13} /> Sign out</button>
      </div>
    </header>
  );
}
