import { useState, useEffect, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

const CAL_SCOPE = 'https://www.googleapis.com/auth/calendar';
const CAL_API   = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const TZ        = Intl.DateTimeFormat().resolvedOptions().timeZone;

function formatEventDate(ev) {
  const raw = ev.start?.dateTime || ev.start?.date;
  if (!raw) return '';
  if (ev.start?.date) {
    // All-day
    const [y, m, d] = raw.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  }
  return new Date(raw).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function CalendarWidget() {
  const [accessToken, setAccessToken] = useState(null);
  const [events, setEvents]           = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvent, setNewEvent]       = useState({ title: '', date: todayStr(), time: '' });
  const [adding, setAdding]           = useState(false);

  const login = useGoogleLogin({
    scope: CAL_SCOPE,
    onSuccess: (resp) => { setAccessToken(resp.access_token); setError(null); },
    onError:   ()     => setError('Google sign-in failed. Please try again.'),
  });

  const fetchEvents = useCallback(async (token) => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const res = await fetch(
        `${CAL_API}?timeMin=${encodeURIComponent(now)}&maxResults=10&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 401) {
        setAccessToken(null);
        setError('Session expired — click Connect to reconnect.');
        return;
      }
      if (!res.ok) throw new Error(`Calendar API error: ${res.status}`);
      const data = await res.json();
      setEvents(data.items || []);
    } catch (e) {
      setError(e.message || 'Could not load calendar events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (accessToken) fetchEvents(accessToken);
  }, [accessToken, fetchEvents]);

  const handleAdd = async () => {
    if (!newEvent.title.trim() || !newEvent.date) return;
    setAdding(true);
    setError(null);
    try {
      let eventBody;
      if (newEvent.time) {
        const start = new Date(`${newEvent.date}T${newEvent.time}:00`);
        const end   = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour
        eventBody = {
          summary: newEvent.title.trim(),
          start: { dateTime: start.toISOString(), timeZone: TZ },
          end:   { dateTime: end.toISOString(),   timeZone: TZ },
        };
      } else {
        eventBody = {
          summary: newEvent.title.trim(),
          start: { date: newEvent.date },
          end:   { date: newEvent.date },
        };
      }

      const res = await fetch(CAL_API, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      });
      if (!res.ok) throw new Error('Failed to create event.');
      await fetchEvents(accessToken);
      setNewEvent({ title: '', date: todayStr(), time: '' });
      setShowAddForm(false);
    } catch (e) {
      setError(e.message || 'Could not add event.');
    } finally {
      setAdding(false);
    }
  };

  if (!accessToken) {
    return (
      <div className="widget-card calendar-widget">
        <div className="widget-header">
          <span className="widget-title">Calendar</span>
        </div>
        <div className="calendar-connect">
          <p className="widget-muted">
            Connect your Google Calendar to view and add upcoming events.
          </p>
          {error && <p className="widget-error">{error}</p>}
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => login()}>
            Connect Google Calendar
          </button>
          <p className="widget-muted" style={{ marginTop: 8, fontSize: 11 }}>
            Requires Google Calendar API to be enabled in your Cloud project.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-card calendar-widget">
      <div className="widget-header">
        <span className="widget-title">Calendar</span>
        <div className="widget-header-actions">
          <button
            className="widget-icon-btn"
            onClick={() => fetchEvents(accessToken)}
            title="Refresh events"
          >
            ↻
          </button>
          <button
            className="widget-icon-btn"
            onClick={() => setShowAddForm((v) => !v)}
            title="Add event"
            style={{ fontWeight: 700 }}
          >
            +
          </button>
          <button
            className="widget-icon-btn"
            onClick={() => setAccessToken(null)}
            title="Disconnect calendar"
            style={{ fontSize: 11 }}
          >
            ✕
          </button>
        </div>
      </div>

      {error && <p className="widget-error">{error}</p>}

      {showAddForm && (
        <div className="cal-add-form">
          <input
            className="cal-input"
            placeholder="Event title"
            value={newEvent.title}
            autoFocus
            onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAddForm(false); }}
          />
          <div className="cal-input-row">
            <input
              className="cal-input"
              type="date"
              value={newEvent.date}
              onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))}
            />
            <input
              className="cal-input"
              type="time"
              value={newEvent.time}
              onChange={(e) => setNewEvent((p) => ({ ...p, time: e.target.value }))}
            />
          </div>
          <div className="cal-add-actions">
            <button
              className="btn btn-primary btn-sm-text"
              onClick={handleAdd}
              disabled={adding || !newEvent.title.trim() || !newEvent.date}
            >
              {adding ? 'Adding…' : 'Add Event'}
            </button>
            <button
              className="btn btn-ghost btn-sm-text"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="widget-loading">Loading…</p>
      ) : events.length === 0 ? (
        <p className="widget-muted">No upcoming events.</p>
      ) : (
        <ul className="cal-event-list">
          {events.map((ev) => (
            <li key={ev.id} className="cal-event-item">
              <span className="cal-event-date">{formatEventDate(ev)}</span>
              <span className="cal-event-title">{ev.summary || '(No title)'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
