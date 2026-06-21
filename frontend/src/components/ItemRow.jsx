import StatusBadge from './StatusBadge.jsx';

export default function ItemRow({ item, onStatusChange, readonly = false, onDragStart, onDragEnd }) {
  const { id, item_name, status } = item;

  return (
    <li
      className={`item-row ${status}`}
      draggable={!readonly}
      onDragStart={() => onDragStart?.(id)}
      onDragEnd={() => onDragEnd?.()}
    >
      <span className="item-name">{item_name}</span>
      <StatusBadge status={status} />
      {!readonly && (
        <div className="item-row-actions no-print">
          {status !== 'done' && (
            <button className="btn btn-sm done-btn" onClick={() => onStatusChange(id, 'done')} title="Mark as done">
              Done
            </button>
          )}
          {status !== 'skipped' && (
            <button className="btn btn-sm skip-btn" onClick={() => onStatusChange(id, 'skipped')} title="Skip">
              Skip
            </button>
          )}
          {status !== 'open' && (
            <button className="btn btn-sm reopen-btn" onClick={() => onStatusChange(id, 'open')} title="Reopen">
              Reopen
            </button>
          )}
        </div>
      )}
    </li>
  );
}
