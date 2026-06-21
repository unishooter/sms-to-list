import { useState, useEffect } from 'react';

const WMO_DESCRIPTIONS = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Icy fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Showers', 81: 'Rain showers', 82: 'Heavy showers',
  85: 'Snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm w/ hail', 99: 'Thunderstorm',
};

const WMO_ICONS = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '❄️', 75: '❄️', 77: '❄️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  85: '🌨️', 86: '🌨️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

function weatherDesc(code) { return WMO_DESCRIPTIONS[code] ?? 'Unknown'; }
function weatherIcon(code) { return WMO_ICONS[code] ?? '🌡️'; }

async function loadWeather(lat, lon) {
  const [weatherRes, geoRes] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
      `&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=auto&forecast_days=3`
    ),
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    ),
  ]);
  const weatherData = await weatherRes.json();
  const geoData = await geoRes.json();
  const cityName =
    geoData.address?.city ||
    geoData.address?.town ||
    geoData.address?.village ||
    geoData.address?.county ||
    '';
  return { weatherData, cityName };
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [city, setCity]       = useState('');
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [coords, setCoords]   = useState(null);

  const refresh = async (lat, lon) => {
    try {
      setError(null);
      const { weatherData, cityName } = await loadWeather(lat, lon);
      setWeather(weatherData);
      setCity(cityName);
      setLastUpdated(new Date());
    } catch {
      setError('Could not load weather data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser.');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        setCoords({ lat: c.latitude, lon: c.longitude });
        refresh(c.latitude, c.longitude);
      },
      () => {
        setError('Location access denied. Enable location to see weather.');
        setLoading(false);
      }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 10 minutes if we have coords
  useEffect(() => {
    if (!coords) return;
    const id = setInterval(() => refresh(coords.lat, coords.lon), 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [coords]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="widget-card weather-widget">
      <div className="widget-header">
        <span className="widget-title">Weather</span>
        {city && <span className="widget-subtitle">{city}</span>}
      </div>

      {loading && <p className="widget-loading">Locating…</p>}
      {error   && <p className="widget-error">{error}</p>}

      {!loading && !error && weather && (() => {
        const c = weather.current;
        const d = weather.daily;
        return (
          <>
            <div className="weather-current">
              <span className="weather-icon-lg">{weatherIcon(c.weathercode)}</span>
              <div className="weather-current-info">
                <span className="weather-temp">{Math.round(c.temperature_2m)}°F</span>
                <span className="weather-desc">{weatherDesc(c.weathercode)}</span>
              </div>
            </div>
            <div className="weather-detail-row">
              <span>💨 {Math.round(c.windspeed_10m)} mph</span>
              <span>💧 {c.relative_humidity_2m}%</span>
            </div>
            <div className="weather-forecast">
              {d.time.map((date, i) => (
                <div key={date} className="forecast-day">
                  <span className="forecast-label">
                    {i === 0
                      ? 'Today'
                      : new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span>{weatherIcon(d.weathercode[i])}</span>
                  <span className="forecast-range">
                    {Math.round(d.temperature_2m_max[i])}°&nbsp;/&nbsp;{Math.round(d.temperature_2m_min[i])}°
                  </span>
                </div>
              ))}
            </div>
          </>
        );
      })()}

      {lastUpdated && (
        <div className="widget-footer">
          Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {coords && (
            <button
              className="widget-refresh-btn"
              onClick={() => refresh(coords.lat, coords.lon)}
              title="Refresh weather"
            >
              ↻
            </button>
          )}
        </div>
      )}
    </div>
  );
}
