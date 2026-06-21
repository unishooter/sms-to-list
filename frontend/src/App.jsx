import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './components/Login.jsx';
import ListView from './components/ListView.jsx';
import ItemRow from './components/ItemRow.jsx';
import WeatherWidget from './components/WeatherWidget.jsx';
import CalendarWidget from './components/CalendarWidget.jsx';
import { getLists, getListItems, updateItemStatus, updateListStatus, moveItem, createList, renameList, deleteList } from './api.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const FILTERS = ['open', 'done', 'skipped', 'all'];
const CLOSED_STATUSES = ['shopped', 'closed', 'archived'];

function EditableTitle({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== value) onSave(draft.trim());
    else setDraft(value);
  };

  if (editing) {
    return (
      <input
        className="editable-title-input"
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
      />
    );
  }
  return (
    <h2
      className="editable-title"
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to rename"
    >
      {value} <span className="edit-icon">✎</span>
    </h2>
  );
}

function AppContent() {
  const [credential, setCredential] = useState(
    () => localStorage.getItem('google_credential')
  );
  const [lists, setLists]               = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [items, setItems]               = useState([]);
  const [filter, setFilter]             = useState('open');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [dragItemId, setDragItemId]     = useState(null);
  const selectedListRef = useRef(selectedList);

  useEffect(() => {
    const onExpiry = () => setCredential(null);
    window.addEventListener('auth:expired', onExpiry);
    return () => window.removeEventListener('auth:expired', onExpiry);
  }, []);

  const fetchLists = useCallback(async () => {
    try {
      setError(null);
      const data = await getLists();
      // Show all non-archived lists in the sidebar
      setLists(data.filter((l) => l.status !== 'archived'));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const fetchItems = useCallback(async (listId) => {
    setLoading(true);
    try {
      const data = await getListItems(listId);
      setItems(data.items);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (credential || !GOOGLE_CLIENT_ID) fetchLists();
  }, [credential, fetchLists]);

  useEffect(() => {
    if (selectedList) fetchItems(selectedList.id);
  }, [selectedList, fetchItems]);

  // Keep ref in sync so the interval always sees the current selected list
  useEffect(() => { selectedListRef.current = selectedList; }, [selectedList]);

  // Auto-refresh every 30 seconds — stable interval, reads list via ref
  useEffect(() => {
    const id = setInterval(() => {
      fetchLists();
      if (selectedListRef.current) fetchItems(selectedListRef.current.id);
    }, 30000);
    return () => clearInterval(id);
  }, [fetchLists, fetchItems]);

  const handleStatusChange = async (itemId, status) => {
    try {
      const updated = await updateItemStatus(itemId, status);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      fetchLists();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleListStatus = async (listId, status) => {
    try {
      const updated = await updateListStatus(listId, status);
      if (status === 'archived') {
        setLists((prev) => prev.filter((l) => l.id !== listId));
        if (selectedList?.id === listId) { setSelectedList(null); setItems([]); }
      } else {
        setLists((prev) => prev.map((l) => (l.id === updated.id ? { ...l, status: updated.status } : l)));
        if (selectedList?.id === listId) setSelectedList((prev) => ({ ...prev, status: updated.status }));
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const handleRefresh = () => {
    fetchLists();
    if (selectedList) fetchItems(selectedList.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('google_credential');
    setCredential(null);
    setLists([]);
    setSelectedList(null);
    setItems([]);
  };

  const handlePrint = () => window.print();

  const handleCreateList = async (displayName) => {
    try {
      const newList = await createList(displayName);
      setLists((prev) => [newList, ...prev]);
      setSelectedList(newList);
      setFilter('open');
      setItems([]);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleRenameList = async (listId, displayName) => {
    try {
      const updated = await renameList(listId, displayName);
      setLists((prev) => prev.map((l) => (l.id === updated.id ? { ...l, display_name: updated.display_name } : l)));
      if (selectedList?.id === updated.id) setSelectedList((prev) => ({ ...prev, display_name: updated.display_name }));
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDeleteList = async (listId) => {
    if (!window.confirm('Delete this list and all its items? This cannot be undone.')) return;
    try {
      await deleteList(listId);
      setLists((prev) => prev.filter((l) => l.id !== listId));
      if (selectedList?.id === listId) { setSelectedList(null); setItems([]); }
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDragStart = (itemId) => setDragItemId(itemId);
  const handleDragEnd   = ()       => setDragItemId(null);

  const handleDropOnList = async (targetListId) => {
    if (!dragItemId || targetListId === selectedList?.id) return;
    try {
      await moveItem(dragItemId, targetListId);
      // Remove item from current view
      setItems((prev) => prev.filter((i) => i.id !== dragItemId));
      fetchLists(); // refresh open counts
    } catch (e) {
      setError(e.message);
    } finally {
      setDragItemId(null);
    }
  };

  if (GOOGLE_CLIENT_ID && !credential) {
    return <Login onSuccess={setCredential} />;
  }

  const filteredItems =
    filter === 'all' ? items : items.filter((i) => i.status === filter);

  const isClosed = selectedList && CLOSED_STATUSES.includes(selectedList.status);

  return (
    <div className="app">
      <header className="app-header no-print">
        <h1>🏠 Family Dashboard</h1>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={handleRefresh}>↻ Refresh</button>
          {GOOGLE_CLIENT_ID && credential && (
            <button className="btn btn-ghost" onClick={handleLogout}>Sign out</button>
          )}
        </div>
      </header>

      {error && (
        <div className="error-banner no-print">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      <div className="app-body">
        <ListView
          lists={lists}
          selectedList={selectedList}
          onSelect={(list) => { setSelectedList(list); setFilter('open'); }}
          dragging={dragItemId !== null}
          onDropList={handleDropOnList}
          onCreateList={handleCreateList}
        />

        <main className="main-content" id="list-panel">
          {!selectedList ? (
            <div className="empty-state center no-print">
              <span>← Select a list to view items</span>
            </div>
          ) : (
            <>
              <div className="list-header">
                <div className="list-title-row">
                  <EditableTitle
                    value={selectedList.display_name}
                    onSave={(name) => handleRenameList(selectedList.id, name)}
                  />
                  {isClosed && (
                    <span className={`list-status-chip ${selectedList.status}`}>
                      {selectedList.status}
                    </span>
                  )}
                </div>
                <div className="list-actions no-print">
                  <div className="filter-tabs">
                    {FILTERS.map((f) => (
                      <button
                        key={f}
                        className={`tab ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                  <button className="btn btn-ghost btn-sm-icon" onClick={handlePrint} title="Print list">
                    🖨 Print
                  </button>
                  {!isClosed && (
                    <button
                      className="btn btn-status shopped"
                      onClick={() => handleListStatus(selectedList.id, 'shopped')}
                    >
                      Shopped
                    </button>
                  )}
                  {!isClosed && (
                    <button
                      className="btn btn-status closed"
                      onClick={() => handleListStatus(selectedList.id, 'closed')}
                    >
                      Close
                    </button>
                  )}
                  {selectedList.status !== 'archived' && (
                    <button
                      className="btn btn-danger-ghost"
                      onClick={() => handleListStatus(selectedList.id, 'archived')}
                    >
                      Archive
                    </button>
                  )}
                  <button
                    className="btn btn-danger-ghost"
                    onClick={() => handleDeleteList(selectedList.id)}
                    title="Permanently delete list and items"
                  >
                    Delete
                  </button>
                  {isClosed && (
                    <button
                      className="btn btn-ghost"
                      onClick={() => handleListStatus(selectedList.id, 'active')}
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>

              {/* Print header — only visible when printing */}
              <div className="print-only print-header">
                <h2>{selectedList.display_name}</h2>
                <p>{new Date().toLocaleDateString()}</p>
              </div>

              {loading ? (
                <p className="loading">Loading…</p>
              ) : filteredItems.length === 0 ? (
                <p className="empty-state">
                  No {filter === 'all' ? '' : filter + ' '}items in this list.
                </p>
              ) : (
                <ul className="item-list">
                  {filteredItems.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onStatusChange={handleStatusChange}
                      readonly={isClosed}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </ul>
              )}
            </>
          )}
        </main>

        <aside className="right-panel no-print">
          <WeatherWidget />
          <CalendarWidget />
        </aside>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppContent />
    </GoogleOAuthProvider>
  );
}
