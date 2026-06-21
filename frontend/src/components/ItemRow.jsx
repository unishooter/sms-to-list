import StatusBadge from './StatusBadge.jsx';

export default function ItemRow({ item, onStatusChange }) {
  const { id, item_name, status } = item;

  return (
    <li className={`item-row ${status}`}>
      <span className="item-name">{item_name}</span>
      <StatusBadge status={status} />
      <div className="item-row-actions">
        {status !== 'done' && (
          <button
            className="btn btn-sm done-btn"
            onClick={() => onStatusChange(id, 'done')}
            title="Mark as done"
          >
            Done
          </button>
        )}
        {status !== 'skipped' && (
          <button
            className="btn btn-sm skip-btn"
            onClick={() => onStatusChange(id, 'skipped')}
            title="Skip this item"
          >
            Skip
          </button>
        )}
        {status !== 'open' && (
          <button
            className="btn btn-sm reopen-btn"
            onClick={() => onStatusChange(id, 'open')}
            title="Reopen item"
          >
            Reopen
          </button>
        )}
      </div>
    </li>
  );
}
