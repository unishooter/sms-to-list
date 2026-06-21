export default function ListView({ lists, selectedList, onSelect }) {
  return (
    <aside className="sidebar">
      <h2>Lists</h2>
      {lists.length === 0 && (
        <p className="empty-state">No active lists yet.</p>
      )}
      {lists.map((list) => (
        <button
          key={list.id}
          className={`list-btn ${selectedList?.id === list.id ? 'active' : ''}`}
          onClick={() => onSelect(list)}
        >
          <span>{list.display_name}</span>
          {list.open_count > 0 && (
            <span className="badge">{list.open_count}</span>
          )}
        </button>
      ))}
    </aside>
  );
}
