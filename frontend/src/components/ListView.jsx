const STATUS_ICON = { active: '', shopped: '✓', closed: '🔒' };

export default function ListView({ lists, selectedList, onSelect }) {
  const active   = lists.filter((l) => l.status === 'active');
  const inactive = lists.filter((l) => l.status !== 'active');

  const renderBtn = (list) => (
    <button
      key={list.id}
      className={`list-btn ${selectedList?.id === list.id ? 'active' : ''} list-btn--${list.status}`}
      onClick={() => onSelect(list)}
    >
      <span className="list-btn-label">
        {STATUS_ICON[list.status] && (
          <span className="list-status-icon">{STATUS_ICON[list.status]}</span>
        )}
        {list.display_name}
      </span>
      {list.open_count > 0 && (
        <span className="badge">{list.open_count}</span>
      )}
    </button>
  );

  return (
    <aside className="sidebar no-print">
      <h2>Lists</h2>
      {lists.length === 0 && <p className="empty-state">No active lists yet.</p>}
      {active.map(renderBtn)}
      {inactive.length > 0 && (
        <>
          <div className="sidebar-divider">Closed</div>
          {inactive.map(renderBtn)}
        </>
      )}
    </aside>
  );
}
