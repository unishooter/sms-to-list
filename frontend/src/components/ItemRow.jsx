import StatusBadge from './StatusBadge.jsx';

function formatPhone(num) {
  const digits = num.replace(/\D/g, '');
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  }
  return digits.slice(-10).replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
}

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
      {item.from_number && (
        <span className="item-from" title={item.from_number}>
          {formatPhone(item.from_number)}
        </span>
      )}
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
