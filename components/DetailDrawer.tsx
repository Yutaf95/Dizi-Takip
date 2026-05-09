'use client';
import React, { useState, useEffect } from 'react';
import { Entry } from '@/lib/supabase';
import { getShowDetails, getSeasonDetails } from '@/lib/tmdb';
import { X, Save, Trash2, ChevronDown, Loader2 } from 'lucide-react';

interface DetailDrawerProps {
  entry: Entry | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Entry>) => void;
  onDelete: (id: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'watching', label: '▶ İzleniyor' },
  { value: 'want', label: '🔖 İzlenecek' },
  { value: 'done', label: '✓ Tamamlandı' },
];

interface SeasonInfo { season_number: number; name: string; episode_count: number; }
interface EpisodeInfo { episode_number: number; name: string; }

export function DetailDrawer({ entry, isOpen, onClose, onUpdate, onDelete }: DetailDrawerProps) {
  const [status, setStatus] = useState<Entry['status']>('want');
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(0);
  const [autoCompleted, setAutoCompleted] = useState(false);

  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // When entry changes, reset state and fetch data
  useEffect(() => {
    if (!entry) return;
    setStatus(entry.status);
    setSeason(entry.current_season || 1);
    setEpisode(entry.current_episode || 0);
    setSeasons([]);
    setEpisodes([]);
    setAutoCompleted(false);

    if (entry.type === 'show') {
      fetchSeasons(entry.tmdb_id);
    }
  }, [entry]);

  // When season changes (and show), fetch episodes for that season
  useEffect(() => {
    if (!entry || entry.type !== 'show' || !season) return;
    fetchEpisodes(entry.tmdb_id, season);
  }, [season, entry]);

  const fetchSeasons = async (tmdbId: number) => {
    setLoadingSeasons(true);
    try {
      const data = await getShowDetails(tmdbId);
      const validSeasons: SeasonInfo[] = (data.seasons || [])
        .filter((s: any) => s.season_number > 0)
        .map((s: any) => ({
          season_number: s.season_number,
          name: s.name,
          episode_count: s.episode_count,
        }));
      setSeasons(validSeasons);
    } catch (e) {
      console.error('Sezonlar yüklenemedi:', e);
    } finally {
      setLoadingSeasons(false);
    }
  };

  const fetchEpisodes = async (tmdbId: number, seasonNum: number) => {
    setLoadingEpisodes(true);
    try {
      const data = await getSeasonDetails(tmdbId, seasonNum);
      const eps: EpisodeInfo[] = (data.episodes || []).map((e: any) => ({
        episode_number: e.episode_number,
        name: e.name,
      }));
      setEpisodes(eps);
    } catch (e) {
      console.error('Bölümler yüklenemedi:', e);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  if (!isOpen || !entry) return null;

  // Compute whether we're on the very last episode of the very last season
  const lastSeasonNumber = seasons.length > 0 ? Math.max(...seasons.map(s => s.season_number)) : -1;
  const lastEpisodeNumber = episodes.length > 0 ? Math.max(...episodes.map(e => e.episode_number)) : -1;

  const isDone = status === 'done';
  const isShow = entry.type === 'show';

  const handleEpisodeSelect = (epNumber: number) => {
    setEpisode(epNumber);
    setAutoCompleted(false);

    if (
      seasons.length > 0 &&
      episodes.length > 0 &&
      season === lastSeasonNumber &&
      epNumber === lastEpisodeNumber
    ) {
      // Son sezonun son bölümü → otomatik tamamlandı
      setStatus('done');
      setAutoCompleted(true);
    } else {
      // Herhangi bir bölüm seçildi → İzleniyor olarak işaretle
      setStatus('watching');
    }
  };

  const handleSave = () => {
    const finalIsDone = status === 'done';
    onUpdate(entry.id, {
      status,
      current_season: finalIsDone ? 0 : season,
      current_episode: finalIsDone ? 0 : episode,
    });
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`"${entry.title}" listenden kaldırılsın mı?`)) {
      onDelete(entry.id);
      onClose();
    }
  };

  const handleSeasonChange = (newSeason: number) => {
    setSeason(newSeason);
    setEpisode(0);
    setAutoCompleted(false);
    if (status === 'done') setStatus('watching');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40, backdropFilter: 'blur(4px)' }}
      />

      {/* Drawer */}
      <div className="drawer animate-in">
        {/* Hero */}
        <div style={{ position: 'relative', height: 260, background: 'var(--bg-secondary)', flexShrink: 0 }}>
          {entry.poster_url && (
            <>
              <img
                src={`https://image.tmdb.org/t/p/w780${entry.poster_url}`}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-card) 0%, transparent 60%)' }} />
            </>
          )}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-accent)',
              borderRadius: '50%', width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-primary)',
            }}
          >
            <X size={18} />
          </button>

          <div style={{ position: 'absolute', bottom: 20, left: 20, display: 'flex', gap: 14, alignItems: 'flex-end' }}>
            {entry.poster_url && (
              <img
                src={`https://image.tmdb.org/t/p/w200${entry.poster_url}`}
                alt=""
                style={{ width: 76, height: 114, objectFit: 'cover', borderRadius: 8, border: '2px solid var(--border-accent)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', flexShrink: 0 }}
              />
            )}
            <div style={{ paddingBottom: 4, maxWidth: 240 }}>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25 }}>{entry.title}</h2>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {entry.type === 'show' ? 'Dizi' : 'Film'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, flex: 1, overflowY: 'auto' }}>

          {/* Status */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              Durum
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Entry['status'])}
                className="select-field"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={15} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Episode picker — only for shows that are NOT done */}
          {isShow && !isDone && (
            <>
              {/* Season picker */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
                  Sezon
                </label>
                {loadingSeasons ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                    <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 0.8s linear infinite' }} /> Sezonlar yükleniyor...
                  </div>
                ) : seasons.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {seasons.map(s => (
                      <button
                        key={s.season_number}
                        onClick={() => handleSeasonChange(s.season_number)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 8,
                          border: '1px solid',
                          borderColor: season === s.season_number ? 'var(--accent)' : 'var(--border-accent)',
                          background: season === s.season_number ? 'rgba(230,57,70,0.15)' : 'var(--bg-primary)',
                          color: season === s.season_number ? 'var(--accent)' : 'var(--text-secondary)',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {s.name || `Sezon ${s.season_number}`}
                        <span style={{ fontSize: 11, marginLeft: 6, opacity: 0.6 }}>{s.episode_count} Bölüm</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Fallback: manual input */
                  <input
                    type="number" min="0" value={season}
                    onChange={(e) => handleSeasonChange(parseInt(e.target.value) || 1)}
                    className="input-field"
                  />
                )}
              </div>

              {/* Episode picker */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
                  Bölüm
                </label>
                {loadingEpisodes ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                    <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Bölümler yükleniyor...
                  </div>
                ) : episodes.length > 0 ? (
                  <div style={{ maxHeight: 260, overflowY: 'auto', borderRadius: 10, border: '1px solid var(--border-accent)', background: 'var(--bg-primary)' }}>
                    {/* "Henüz başlamadım" option */}
                    <button
                      onClick={() => setEpisode(0)}
                      style={{
                        width: '100%', padding: '10px 14px',
                        textAlign: 'left', background: episode === 0 ? 'rgba(230,57,70,0.12)' : 'transparent',
                        border: 'none', borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        color: episode === 0 ? 'var(--accent)' : 'var(--text-muted)',
                        fontSize: 13,
                      }}
                    >
                      — Henüz başlamadım
                    </button>
                    {episodes.map(ep => {
                      const isLast = season === lastSeasonNumber && ep.episode_number === lastEpisodeNumber;
                      const isSelected = episode === ep.episode_number;
                      return (
                        <button
                          key={ep.episode_number}
                          onClick={() => handleEpisodeSelect(ep.episode_number)}
                          style={{
                            width: '100%', padding: '10px 14px',
                            textAlign: 'left',
                            background: isSelected ? 'rgba(230,57,70,0.12)' : 'transparent',
                            border: 'none',
                            borderBottom: '1px solid var(--border)',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 10,
                            transition: 'background 0.15s',
                          }}
                        >
                          <span style={{
                            fontSize: 11, fontWeight: 700, minWidth: 28, textAlign: 'center',
                            color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                          }}>
                            {ep.episode_number}
                          </span>
                          <span style={{
                            fontSize: 13,
                            color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: isSelected ? 600 : 400,
                            flex: 1, textAlign: 'left',
                          }}>
                            {ep.name}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            {isLast && (
                              <span style={{ fontSize: 10, background: 'rgba(34,197,94,0.15)', color: '#4ade80', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>SON</span>
                            )}
                            {isSelected && (
                              <span style={{ fontSize: 12, color: 'var(--accent)' }}>✓</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Fallback: manual input */
                  <input
                    type="number" min="0" value={episode}
                    onChange={(e) => setEpisode(parseInt(e.target.value) || 0)}
                    className="input-field"
                  />
                )}
              </div>
            </>
          )}

          {/* Done message */}
          {isShow && isDone && (
            <div style={{
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: 10, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>🎉</span>
              <div>
                <p style={{ fontSize: 13, color: '#4ade80', fontWeight: 700 }}>Diziyi tamamladınız!</p>
                {autoCompleted && (
                  <p style={{ fontSize: 12, color: '#86efac', marginTop: 2 }}>Son bölümü izlediğiniz için otomatik tamamlandı olarak işaretlendi.</p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', gap: 12 }}>
            <button onClick={handleSave} className="btn-accent" style={{ flex: 1, justifyContent: 'center' }}>
              <Save size={16} /> Kaydet
            </button>
            <button
              onClick={handleDelete}
              style={{
                padding: '12px 16px', borderRadius: 99, border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
              title="Listeden Kaldır"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
