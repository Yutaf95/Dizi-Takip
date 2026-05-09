'use client';
import React, { useState } from 'react';
import { Bell, X, ChevronRight, Play, Tv } from 'lucide-react';
import { Entry } from '@/lib/supabase';

export interface ShowNotification {
  entry: Entry;
  lastSeason: number;
  lastEpisode: number;
  episodeName?: string;
  behindBy: number; // how many episodes behind
}

interface NotificationBannerProps {
  notifications: ShowNotification[];
  onSelect: (entry: Entry) => void;
}

export function NotificationBanner({ notifications, onSelect }: NotificationBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = notifications.filter(n => !dismissed.has(n.entry.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(prev => new Set([...prev, id]));
  };

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Header pill */}
      <button
        onClick={() => setExpanded(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'linear-gradient(135deg, rgba(230,57,70,0.18), rgba(230,57,70,0.08))',
          border: '1px solid rgba(230,57,70,0.3)',
          borderRadius: expanded ? '12px 12px 0 0' : 12,
          padding: '12px 16px',
          cursor: 'pointer',
          width: '100%',
          transition: 'border-radius 0.2s',
        }}
      >
        {/* Bell with badge */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(230,57,70,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bell size={18} color="var(--accent)" />
          </div>
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: 'var(--accent)', color: 'white',
            fontSize: 10, fontWeight: 800,
            width: 18, height: 18, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {visible.length}
          </span>
        </div>

        <div style={{ flex: 1, textAlign: 'left' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
            Yeni Bölümler Yayında!
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
            {visible.length} dizide yeni bölüm mevcut — görmek için tıkla
          </p>
        </div>

        <ChevronRight
          size={18}
          color="var(--accent)"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}
        />
      </button>

      {/* Expanded list */}
      {expanded && (
        <div style={{
          border: '1px solid rgba(230,57,70,0.3)',
          borderTop: 'none',
          borderRadius: '0 0 12px 12px',
          overflow: 'hidden',
          background: 'rgba(10,10,15,0.8)',
        }}>
          {visible.map((notif, idx) => (
            <div
              key={notif.entry.id}
              onClick={() => onSelect(notif.entry)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(230,57,70,0.07)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Poster thumbnail */}
              <div style={{ width: 40, height: 56, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-secondary)' }}>
                {notif.entry.poster_url ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w92${notif.entry.poster_url}`}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Tv size={16} color="var(--text-muted)" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {notif.entry.title}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Sıradaki: Sezon {notif.lastSeason}, Bölüm {notif.lastEpisode}
                  {notif.episodeName && (
                    <span style={{ color: 'var(--text-muted)' }}> — {notif.episodeName}</span>
                  )}
                </p>
                <p style={{ fontSize: 11, color: 'var(--accent)', marginTop: 3, fontWeight: 600 }}>
                  {notif.behindBy === 1
                    ? '1 bölüm geride'
                    : `${notif.behindBy} bölüm geride`}
                </p>
              </div>

              {/* CTA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 700,
                  background: 'rgba(230,57,70,0.15)', color: 'var(--accent)',
                  padding: '4px 10px', borderRadius: 99,
                }}>
                  <Play size={10} fill="var(--accent)" /> Güncelle
                </span>
                <button
                  onClick={(e) => dismiss(notif.entry.id, e)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}
                  title="Bildirimi kapat"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
