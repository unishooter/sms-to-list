import { useState } from 'react';

const STATUS_ICON = { active: '', shopped: '✓', closed: '🔒' };

export default function ListView({ lists, selectedList, onSelect, dragging, onDropList, onCreateList }) {
  const [overListId, setOverListId] = useState(null);
  const [creating, setCreating]     = useState(false);
  const [newName, setNewName]       = useState('');

  const active   = lists.filter((l) => l.status === 'active');
  const inactive = lists.filter((l) => l.status !== 'active');

  const submitNew = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreateList(newName.trim());
    setNewName('');
    setCreating(false);
  };

  const renderBtn = (list) => (
    <button
      key={list.id}
      className={[
        'list-btn',
        selectedList?.id === list.id ? 'active' : '',
        `list-btn--${list.status}`,
        dragging && overListId === list.id ? 'drop-target' : '',
        dragging ? 'droppable' : '',
      ].join(' ')}
      onClick={() => onSelect(list)}
      onDragOver={(e) => { e.preventDefault(); setOverListId(list.id); }}
      onDragLeave={() => setOverListId(null)}
      onDrop={(e) => { e.preventDefault(); setOverListId(null); onDropList(list.id); }}
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

      {lists.length === 0 && !creating && (
        <p className="empty-state">No active lists yet.</p>
      )}

      {active.map(renderBtn)}

      {inactive.length > 0 && (
        <>
          <div className="sidebar-divider">Closed</div>
          {inactive.map(renderBtn)}
        </>
      )}

      {dragging && <p className="drag-hint">Drop on a list to move item</p>}

      {creating ? (
        <form className="new-list-form" onSubmit={submitNew}>
          <input
            autoFocus
            className="new-list-input"
            placeholder="List name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setCreating(false)}
          />
          <div className="new-list-actions">
            <button type="submit" className="btn btn-primary btn-sm-text">Add</button>
            <button type="button" className="btn btn-ghost btn-sm-text" onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="new-list-btn" onClick={() => setCreating(true)}>
          + New List
        </button>
      )}
    </aside>
  );
}
