'use client';
import React, { useState, useEffect } from 'react';
import { searchTMDB, getShowRecommendations } from '@/lib/tmdb';
import { Search, X, Plus, Film, Tv, Sparkles, Loader2 } from 'lucide-react';
import { Entry } from '@/lib/supabase';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: any, status?: string) => void;
  watchingEntries?: Entry[];
  allEntries?: Entry[];
}

interface RecommendedItem {
  id: number;
  name: string;
  poster_path: string | null;
  first_air_date: string;
  vote_average: number;
  basedOn: string; // which show this was recommended because of
}

export function SearchModal({ isOpen, onClose, onAdd, watchingEntries = [], allEntries = [] }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  // Already-tracked tmdb ids for deduplication
  const trackedIds = new Set(allEntries.map(e => e.tmdb_id));

  // Live search: fire 400ms after user stops typing
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      performSearch(query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      if (watchingEntries.length > 0) {
        fetchRecommendations();
      }
    } else {
      setQuery('');
      setResults([]);
      setAddedIds(new Set());
    }
  }, [isOpen]);

  const fetchRecommendations = async () => {
    setLoadingRecs(true);
    const seen = new Set<number>();
    const recs: RecommendedItem[] = [];

    // Filter to get only shows, then shuffle to get different recommendations each time
    const shows = watchingEntries.filter(e => e.type === 'show');
    const shuffledShows = [...shows].sort(() => 0.5 - Math.random());
    const sources = shuffledShows.slice(0, 3);

    for (const show of sources) {
      try {
        const data = await getShowRecommendations(show.tmdb_id);
        for (const item of (data.results || []).slice(0, 6)) {
          if (!seen.has(item.id) && !trackedIds.has(item.id)) {
            seen.add(item.id);
            recs.push({
              id: item.id,
              name: item.name || item.title,
              poster_path: item.poster_path,
              first_air_date: item.first_air_date || '',
              vote_average: item.vote_average || 0,
              basedOn: show.title,
            });
          }
        }
      } catch {}
    }

    // Deduplicate and limit
    setRecommendations(recs.slice(0, 12));
    setLoadingRecs(false);
  };

  if (!isOpen) return null;

  const performSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const data = await searchTMDB(q);
      const filtered = data.results.filter(
        (r: any) => r.media_type === 'movie' || r.media_type === 'tv'
      );
      setResults(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleAdd = (item: any, status?: string) => {
    setAddedIds(prev => new Set(prev).add(item.id));
    onAdd(item, status);
  };

  const isAdded = (id: number) => addedIds.has(id) || trackedIds.has(id);

  const ResultRow = ({ item }: { item: any }) => {
    const id = item.id;
    const isTV = item.media_type === 'tv' || !item.media_type;
    const already = isAdded(id);
    return (
      <div
        style={{
          display: 'flex', gap: 16, alignItems: 'center',
          padding: '12px 16px', borderRadius: 12,
          background: 'var(--bg-primary)',
          border: `1px solid ${already ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
          transition: 'border-color 0.2s',
        }}
      >
        <div style={{ width: 66, height: 96, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-secondary)' }}>
          {item.poster_path ? (
            <img src={`https://image.tmdb.org/t/p/w154${item.poster_path}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isTV ? <Tv size={24} color="var(--text-muted)" /> : <Film size={24} color="var(--text-muted)" />}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.title || item.name}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99, textTransform: 'uppercase',
              background: isTV ? 'rgba(59,130,246,0.15)' : 'rgba(230,57,70,0.15)',
              color: isTV ? 'var(--blue)' : 'var(--accent)',
            }}>
              {isTV ? 'Dizi' : 'Film'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {(item.release_date || item.first_air_date || '').substring(0, 4) || '—'}
            </span>
            {item.vote_average > 0 && (
              <span style={{ fontSize: 12, color: '#facc15' }}>★ {item.vote_average.toFixed(1)}</span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {already ? (
          <span style={{ fontSize: 20, flexShrink: 0 }}>✓</span>
        ) : isTV ? (
          /* Shows: single + button → watching */
          <button
            onClick={() => handleAdd(item, 'watching')}
            style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: 'var(--accent)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="İzliyorum listesine ekle"
          >
            <Plus size={17} color="white" />
          </button>
        ) : (
          /* Movies: two buttons */
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => handleAdd(item, 'done')}
              style={{
                padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(34,197,94,0.4)',
                background: 'rgba(34,197,94,0.12)', color: '#4ade80',
                cursor: 'pointer', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
              }}
              title="İzlendi olarak ekle"
            >
              ✓ İzlendi
            </button>
            <button
              onClick={() => handleAdd(item, 'want')}
              style={{
                padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-accent)',
                background: 'var(--bg-card)', color: 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
              }}
              title="İzlenecek listesine ekle"
            >
              + İzlenecek
            </button>
          </div>
        )}
      </div>
    );
  };

  const showingSearch = results.length > 0 || (loading && query);
  const showingRecs = !showingSearch && recommendations.length > 0;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box animate-in" style={{ maxWidth: 780 }}>

        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>İçerik Ekle</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={15} />
          </button>
        </div>

        {/* Search bar */}
        <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
            <div className="search-bar" style={{ flex: 1, maxWidth: '100%' }}>
              <Search size={15} color="var(--text-muted)" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!e.target.value) setResults([]);
                }}
                placeholder="Film veya dizi ara..."
                autoFocus
              />
              {query && (
                <button type="button" onClick={() => { setQuery(''); setResults([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  <X size={14} />
                </button>
              )}
            </div>
            <button type="submit" className="btn-accent" style={{ padding: '8px 18px', fontSize: 13 }}>
              Ara
            </button>
          </form>
        </div>

        {/* Results / Recommendations */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '14px 22px 20px' }}>

          {/* Search results */}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0' }}>
              <div className="spinner" />
            </div>
          )}
          {!loading && results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Arama Sonuçları
              </p>
              {results.filter(item => !trackedIds.has(item.id) && !addedIds.has(item.id)).map(item => <ResultRow key={item.id} item={item} />)}
              {results.filter(item => !trackedIds.has(item.id) && !addedIds.has(item.id)).length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: 14 }}>
                  Tüm sonuçlar zaten listenizde ekli.
                </p>
              )}
            </div>
          )}
          {!loading && results.length === 0 && query && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px 0', fontSize: 14 }}>Sonuç bulunamadı.</p>
          )}

          {/* Recommendations section */}
          {showingRecs && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Sparkles size={16} color="var(--accent)" />
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Sana Özel Öneriler
                </p>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>— izlediklerine göre</span>
              </div>

              {loadingRecs ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>
                  <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Öneriler yükleniyor...
                </div>
              ) : (
                <>
                  {/* Group by basedOn */}
                  {Array.from(new Set(recommendations.map(r => r.basedOn))).map(showName => {
                    const group = recommendations.filter(r => r.basedOn === showName);
                    return (
                      <div key={showName} style={{ marginBottom: 20 }}>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>"{showName}"</span> dizisini sevdiysen:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {group.filter(item => !trackedIds.has(item.id) && !addedIds.has(item.id)).map(item => (
                            <ResultRow
                              key={item.id}
                              item={{
                                id: item.id,
                                name: item.name,
                                poster_path: item.poster_path,
                                first_air_date: item.first_air_date,
                                vote_average: item.vote_average,
                                media_type: 'tv',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* Empty state — no watching shows for recs */}
          {!showingSearch && !showingRecs && !loadingRecs && !query && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              <Sparkles size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
              <p>Film veya dizi adı girerek arayın.</p>
              {watchingEntries.length === 0 && (
                <p style={{ marginTop: 6, fontSize: 12 }}>İzlediğin diziler oldukça kişiselleştirilmiş öneriler de görünecek!</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
