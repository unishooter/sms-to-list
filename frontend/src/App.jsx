import { useState, useEffect, useCallback } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './components/Login.jsx';
import ListView from './components/ListView.jsx';
import ItemRow from './components/ItemRow.jsx';
import { getLists, getListItems, updateItemStatus, updateListStatus, moveItem } from './api.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const FILTERS = ['open', 'done', 'skipped', 'all'];
const CLOSED_STATUSES = ['shopped', 'closed', 'archived'];

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
        <h1>🛒 Shopping Lists</h1>
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
        />

        <main className="main-content">
          {!selectedList ? (
            <div className="empty-state center no-print">
              <span>← Select a list to view items</span>
            </div>
          ) : (
            <>
              <div className="list-header">
                <div className="list-title-row">
                  <h2>{selectedList.display_name}</h2>
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
