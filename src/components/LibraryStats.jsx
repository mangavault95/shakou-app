// src/components/LibraryStats.jsx
import React from 'react';
import { getAccessToken } from '../utils/auth';

const STATUS_IT = {
  plan: 'Da leggere',
  reading: 'In lettura',
  completed: 'Completato',
  dropped: 'Abbandonato',
  paused: 'In pausa'
};

const STATUS_COLOR = {
  plan: '#6366f1',
  reading: '#22c55e',
  completed: '#f44336',
  dropped: '#9ca3af',
  paused: '#f59e0b'
};

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #eee',
      borderRadius: 12,
      padding: '16px 20px',
      minWidth: 130,
      flex: 1
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || '#111' }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#444', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function LibraryStats({ userId }) {
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    getAccessToken()
      .then(token => fetch('/api/editions?user_stats=1', {
        headers: { Authorization: `Bearer ${token}` }
      }))
      .then(r => r.json())
      .then(j => { if (active) setStats(j.stats || null); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);

  if (loading) return <div style={{ color: '#888', fontSize: 13 }}>Caricamento statistiche…</div>;
  if (!stats || stats.seriesCount === 0) return null;

  const hasValue = stats.collectionValue > 0;
  const hasPublisher = stats.topPublisher !== null;

  const statusEntries = Object.entries(stats.statusBreakdown)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ marginTop: 0, marginBottom: 14 }}>Statistiche collezione</h3>

      {/* Metriche principali */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <StatCard label="Serie in libreria" value={stats.seriesCount} />
        <StatCard label="Volumi posseduti" value={stats.totalOwned} color="#f44336" />
        <StatCard label="Volumi letti" value={stats.totalRead} color="#22c55e"
          sub={stats.totalOwned > 0 ? `${Math.round(stats.totalRead / stats.totalOwned * 100)}% completati` : undefined}
        />
        {hasValue && (
          <StatCard
            label="Valore collezione"
            value={`€ ${stats.collectionValue.toFixed(2)}`}
            color="#6366f1"
          />
        )}
        {hasPublisher && (
          <StatCard
            label="Editore principale"
            value={stats.topPublisher.name}
            sub={`${stats.topPublisher.count} ${stats.topPublisher.count === 1 ? 'serie' : 'serie'}`}
          />
        )}
      </div>

      {/* Breakdown stato lettura */}
      {statusEntries.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {statusEntries.map(([st, count]) => (
            <span key={st} style={{
              padding: '4px 12px',
              borderRadius: 999,
              fontSize: 13,
              background: (STATUS_COLOR[st] || '#eee') + '22',
              color: STATUS_COLOR[st] || '#666',
              border: `1px solid ${STATUS_COLOR[st] || '#ddd'}44`,
              fontWeight: 600
            }}>
              {STATUS_IT[st] || st}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Breakdown editori (se ci sono dati) */}
      {Object.keys(stats.publisherBreakdown).length > 1 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 8 }}>Per editore:</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(stats.publisherBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([pub, count]) => (
                <span key={pub} style={{
                  padding: '4px 12px',
                  borderRadius: 999,
                  fontSize: 13,
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0'
                }}>
                  {pub} ({count})
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
