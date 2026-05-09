'use client';
import React, { useState, useEffect } from 'react';
import { Entry } from '@/lib/supabase';
import { getShowDetails, getSeasonDetails } from '@/lib/tmdb';
import { ArrowLeft, Check, Play, ChevronDown, Trash2, Save } from 'lucide-react';

interface ShowDetailProps {
  entry: Entry;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<Entry>) => void;
  onDelete: (id: string) => void;
}

interface SeasonInfo { season_number: number; name: string; episode_count: number; }
interface EpisodeInfo { episode_number: number; name: string; still_path: string | null; overview: string; }

const STATUS_OPTIONS = [
  { value: 'watching', label: '▶ İzleniyor' },
  { value: 'want', label: '🔖 İzlenecek' },
  { value: 'done', label: '✓ Tamamlandı' },
];

export function ShowDetail({ entry, onBack, onUpdate, onDelete }: ShowDetailProps) {
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>([]);
  const [activeSeason, setActiveSeason] = useState(entry.current_season || 1);
  const [currentSeason, setCurrentSeason] = useState(entry.current_season || 0);
  const [currentEpisode, setCurrentEpisode] = useState(entry.current_episode || 0);
  const [status, setStatus] = useState<Entry['status']>(entry.status);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSeasons();
  }, []);

  useEffect(() => {
    if (activeSeason) fetchEpisodes(activeSeason);
  }, [activeSeason]);

  const fetchSeasons = async () => {
    setLoadingSeasons(true);
    try {
      const data = await getShowDetails(entry.tmdb_id);
      const valid: SeasonInfo[] = (data.seasons || [])
        .filter((s: any) => s.season_number > 0)
        .map((s: any) => ({ season_number: s.season_number, name: s.name, episode_count: s.episode_count }));
      setSeasons(valid);
    } catch {}
    setLoadingSeasons(false);
  };

  const fetchEpisodes = async (seasonNum: number) => {
    setLoadingEpisodes(true);
    try {
      const data = await getSeasonDetails(entry.tmdb_id, seasonNum);
      setEpisodes((data.episodes || []).map((e: any) => ({
        episode_number: e.episode_number,
        name: e.name,
        still_path: e.still_path,
        overview: e.overview,
      })));
    } catch {}
    setLoadingEpisodes(false);
  };

  // Is this episode "watched" based on current progress?
  const isWatched = (seasonNum: number, epNum: number): boolean => {
    if (status === 'done') return true;
    if (seasonNum < currentSeason) return true;
    if (seasonNum === currentSeason && epNum <= currentEpisode) return true;
    return false;
  };

  const lastSeasonNumber = seasons.length > 0 ? Math.max(...seasons.map(s => s.season_number)) : -1;
  const lastSeasonInfo = seasons.find(s => s.season_number === lastSeasonNumber);

  const handleMarkEpisode = async (seasonNum: number, epNum: number) => {
    let newSeason = currentSeason;
    let newEpisode = currentEpisode;
    let newStatus = status;

    // If already watched and it's the last watched → unmark (go to previous)
    if (seasonNum === currentSeason && epNum === currentEpisode) {
      const newEp = epNum - 1;
      if (newEp <= 0) {
        // Go to previous season's last episode
        const prevSeason = seasons.find(s => s.season_number === seasonNum - 1);
        if (prevSeason) {
          newSeason = prevSeason.season_number;
          newEpisode = prevSeason.episode_count;
        } else {
          newSeason = 0;
          newEpisode = 0;
          newStatus = 'want';
        }
      } else {
        newEpisode = newEp;
      }
    } else {
      newSeason = seasonNum;
      newEpisode = epNum;

      // Auto-complete if last episode of last season
      if (seasonNum === lastSeasonNumber && lastSeasonInfo && epNum === lastSeasonInfo.episode_count) {
        newStatus = 'done';
      } else {
        if (status !== 'watching') newStatus = 'watching';
      }
    }

    setCurrentSeason(newSeason);
    setCurrentEpisode(newEpisode);
    if (newStatus !== status) setStatus(newStatus);

    const finalIsDone = newStatus === 'done';
    onUpdate(entry.id, {
      status: newStatus,
      current_season: finalIsDone ? 0 : newSeason,
      current_episode: finalIsDone ? 0 : newEpisode,
    });
  };

  const handleMarkAllUpTo = (seasonNum: number, epNum: number) => {
    setCurrentSeason(seasonNum);
    setCurrentEpisode(epNum);
    if (status !== 'watching') setStatus('watching');
  };

  const handleSave = async () => {
    setSaving(true);
    const finalIsDone = status === 'done';
    await onUpdate(entry.id, {
      status,
      current_season: finalIsDone ? 0 : currentSeason,
      current_episode: finalIsDone ? 0 : currentEpisode,
    });
    setSaving(false);
    onBack();
  };

  const handleDelete = () => {
    if (confirm(`"${entry.title}" listenden kaldırılsın mı?`)) {
      onDelete(entry.id);
      onBack();
    }
  };

  const progressText = status === 'done'
    ? 'Tamamlandı'
    : currentEpisode > 0
      ? `S${currentSeason} B${currentEpisode} izlendi`
      : 'Henüz başlanmadı';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-primary)', zIndex: 60, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Hero Banner ── */}
      <div style={{ position: 'relative', height: 340, flexShrink: 0 }}>
        {entry.poster_url ? (
          <img
            src={`https://image.tmdb.org/t/p/original${entry.poster_url}`}
            alt={entry.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--bg-secondary)' }} />
        )}
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,15,0.4) 0%, rgba(10,10,15,0.98) 100%)' }} />

        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            position: 'absolute', top: 20, left: 20,
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 99, padding: '8px 16px', cursor: 'pointer',
            color: 'var(--text-primary)', fontSize: 13, fontWeight: 600,
            backdropFilter: 'blur(8px)',
          }}
        >
          <ArrowLeft size={16} /> Geri
        </button>

        {/* Bottom info */}
        <div style={{ position: 'absolute', bottom: 24, left: 32, right: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
            {entry.poster_url && (
              <img
                src={`https://image.tmdb.org/t/p/w200${entry.poster_url}`}
                alt=""
                style={{ width: 80, height: 120, objectFit: 'cover', borderRadius: 10, border: '2px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', flexShrink: 0 }}
              />
            )}
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: 'white', lineHeight: 1.1, marginBottom: 10, textShadow: '0 2px 16px rgba(0,0,0,0.7)' }}>
                {entry.title}
              </h1>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Status selector */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowStatusMenu(p => !p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: status === 'done' ? 'rgba(34,197,94,0.2)' : status === 'watching' ? 'rgba(230,57,70,0.2)' : 'rgba(255,255,255,0.1)',
                      border: `1px solid ${status === 'done' ? 'rgba(34,197,94,0.4)' : status === 'watching' ? 'rgba(230,57,70,0.4)' : 'rgba(255,255,255,0.2)'}`,
                      borderRadius: 99, padding: '6px 14px', cursor: 'pointer',
                      color: status === 'done' ? '#4ade80' : status === 'watching' ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: 12, fontWeight: 600,
                    }}
                  >
                    {STATUS_OPTIONS.find(o => o.value === status)?.label}
                    <ChevronDown size={12} />
                  </button>
                  {showStatusMenu && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                      background: 'var(--bg-card)', border: '1px solid var(--border-accent)',
                      borderRadius: 10, overflow: 'hidden', zIndex: 10, minWidth: 160,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}>
                      {STATUS_OPTIONS.map(o => (
                        <button
                          key={o.value}
                          onClick={() => { setStatus(o.value as Entry['status']); setShowStatusMenu(false); }}
                          style={{
                            width: '100%', padding: '10px 14px', textAlign: 'left',
                            background: status === o.value ? 'rgba(230,57,70,0.12)' : 'transparent',
                            border: 'none', cursor: 'pointer',
                            color: status === o.value ? 'var(--accent)' : 'var(--text-secondary)',
                            fontSize: 13, fontWeight: status === o.value ? 600 : 400,
                            borderBottom: '1px solid var(--border)',
                          }}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.08)', padding: '4px 12px', borderRadius: 99 }}>
                  {progressText}
                </span>
              </div>
            </div>
          </div>

          {/* Save & Delete */}
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={handleDelete} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Trash2 size={18} />
            </button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '10px 22px', borderRadius: 10, background: 'var(--accent)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Save size={16} /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Season Tabs ── */}
      {loadingSeasons ? (
        <div style={{ padding: '20px 32px', display: 'flex', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 36, width: 100, borderRadius: 8, background: 'var(--bg-card)' }} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, padding: '16px 32px', borderBottom: '1px solid var(--border)', overflowX: 'auto', flexShrink: 0 }}>
          {seasons.map(s => (
            <button
              key={s.season_number}
              onClick={() => setActiveSeason(s.season_number)}
              style={{
                padding: '8px 18px', borderRadius: 99, border: '1px solid',
                borderColor: activeSeason === s.season_number ? 'var(--accent)' : 'var(--border-accent)',
                background: activeSeason === s.season_number ? 'rgba(230,57,70,0.15)' : 'var(--bg-card)',
                color: activeSeason === s.season_number ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              {s.name}
              {/* Progress dot for this season */}
              {currentSeason === s.season_number && status !== 'done' && (
                <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg-primary)' }} />
              )}
              {(status === 'done' || currentSeason > s.season_number) && (
                <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: '#4ade80', border: '2px solid var(--bg-primary)' }} />
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Episode List ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px' }}>
        {loadingEpisodes ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 10,
          }}>
            {episodes.map(ep => {
              const watched = isWatched(activeSeason, ep.episode_number);
              const isCurrent = currentSeason === activeSeason && currentEpisode === ep.episode_number && status !== 'done';
              // Next unwatched episode (right after the last watched one)
              const isNext = !watched && !isCurrent && (
                (activeSeason === currentSeason && ep.episode_number === currentEpisode + 1) ||
                (activeSeason > currentSeason && ep.episode_number === 1 && episodes[0]?.episode_number === ep.episode_number)
              );

              return (
                <div
                  key={ep.episode_number}
                  onClick={() => handleMarkEpisode(activeSeason, ep.episode_number)}
                  style={{
                    padding: '14px 14px 14px 16px',
                    borderRadius: 10,
                    background: watched
                      ? 'rgba(34,197,94,0.08)'
                      : isNext
                        ? 'rgba(234,179,8,0.08)'
                        : 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderLeft: `4px solid ${
                      isCurrent ? '#4ade80'
                      : watched  ? '#4ade80'
                      : isNext   ? '#eab308'
                      : 'transparent'
                    }`,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = watched
                      ? 'rgba(34,197,94,0.08)'
                      : isNext ? 'rgba(234,179,8,0.08)'
                      : 'var(--bg-card)';
                  }}
                >
                  {/* Ep number + check */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {activeSeason}. Sezon {ep.episode_number}. Bölüm
                    </span>
                    {/* Tick */}
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${watched ? '#4ade80' : 'var(--border-accent)'}`,
                      background: watched ? 'rgba(34,197,94,0.2)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      {watched && <Check size={11} color="#4ade80" strokeWidth={3} />}
                    </div>
                  </div>

                  {/* Episode name */}
                  <p style={{
                    fontSize: 13, fontWeight: 700,
                    color: isCurrent  ? '#4ade80'
                         : watched    ? '#4ade80'
                         : isNext     ? '#eab308'
                         : 'var(--text-primary)',
                    lineHeight: 1.3,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {ep.name}
                  </p>

                  {/* Badges */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {isCurrent && (
                      <span style={{
                        alignSelf: 'flex-start',
                        fontSize: 9, background: '#22c55e', color: 'white',
                        padding: '2px 7px', borderRadius: 4, fontWeight: 800,
                      }}>
                        İZLEDİM
                      </span>
                    )}
                    {isNext && (
                      <span style={{
                        alignSelf: 'flex-start',
                        fontSize: 9, background: '#854d0e', color: '#fef08a',
                        padding: '2px 7px', borderRadius: 4, fontWeight: 800,
                      }}>
                        SIRADAKI
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
