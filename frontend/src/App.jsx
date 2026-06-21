import { useState, useEffect, useCallback } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './components/Login.jsx';
import ListView from './components/ListView.jsx';
import ItemRow from './components/ItemRow.jsx';
import { getLists, getListItems, updateItemStatus, updateListStatus } from './api.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const FILTERS = ['open', 'done', 'skipped', 'all'];

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

  // Listen for token expiry events dispatched by api.js
  useEffect(() => {
    const onExpiry = () => setCredential(null);
    window.addEventListener('auth:expired', onExpiry);
    return () => window.removeEventListener('auth:expired', onExpiry);
  }, []);

  const fetchLists = useCallback(async () => {
    try {
      setError(null);
      const data = await getLists();
      setLists(data.filter((l) => l.status === 'active'));
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

  // Load lists on mount (once authenticated)
  useEffect(() => {
    if (credential || !GOOGLE_CLIENT_ID) fetchLists();
  }, [credential, fetchLists]);

  // Load items when selected list changes
  useEffect(() => {
    if (selectedList) fetchItems(selectedList.id);
  }, [selectedList, fetchItems]);

  const handleStatusChange = async (itemId, status) => {
    try {
      const updated = await updateItemStatus(itemId, status);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      // Refresh open_count in sidebar
      setLists((prev) =>
        prev.map((l) =>
          l.id === selectedList?.id
            ? { ...l, open_count: prev.find((x) => x.id === l.id)?.open_count }
            : l
        )
      );
      fetchLists(); // keep badge counts accurate
    } catch (e) {
      setError(e.message);
    }
  };

  const handleArchive = async (listId) => {
    try {
      await updateListStatus(listId, 'archived');
      setLists((prev) => prev.filter((l) => l.id !== listId));
      if (selectedList?.id === listId) {
        setSelectedList(null);
        setItems([]);
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

  // Show login page if Google auth is configured and user is not signed in
  if (GOOGLE_CLIENT_ID && !credential) {
    return <Login onSuccess={setCredential} />;
  }

  const filteredItems =
    filter === 'all' ? items : items.filter((i) => i.status === filter);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🛒 Shopping Lists</h1>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={handleRefresh}>
            ↻ Refresh
          </button>
          {GOOGLE_CLIENT_ID && credential && (
            <button className="btn btn-ghost" onClick={handleLogout}>
              Sign out
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      <div className="app-body">
        <ListView
          lists={lists}
          selectedList={selectedList}
          onSelect={(list) => {
            setSelectedList(list);
            setFilter('open');
          }}
        />

        <main className="main-content">
          {!selectedList ? (
            <div className="empty-state center">
              <span>← Select a list to view items</span>
            </div>
          ) : (
            <>
              <div className="list-header">
                <h2>{selectedList.display_name}</h2>
                <div className="list-actions">
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
                  <button
                    className="btn btn-danger-ghost"
                    onClick={() => handleArchive(selectedList.id)}
                  >
                    Archive
                  </button>
                </div>
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
