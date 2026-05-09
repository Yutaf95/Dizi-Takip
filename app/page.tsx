'use client';
import React, { useEffect, useState } from 'react';
import { supabase, Entry } from '@/lib/supabase';
import { getShowDetails } from '@/lib/tmdb';
import { SearchModal } from '@/components/SearchModal';
import { DetailDrawer } from '@/components/DetailDrawer';
import { ShowDetail } from '@/components/ShowDetail';
import { NotificationBanner, ShowNotification } from '@/components/NotificationBanner';
import { ProfileSelector, PROFILES, Profile } from '@/components/ProfileSelector';
import { Plus, Search, Film, Tv, BookMarked, CheckCircle2, Play, Layers, Bell, Clapperboard, ChevronDown, Menu } from 'lucide-react';

const SHOW_TABS = [
  { id: 'watching', label: 'İzleniyor', icon: <Play size={15} /> },
  { id: 'want',     label: 'İzlenecek', icon: <BookMarked size={15} /> },
  { id: 'done',     label: 'Tamamlandı', icon: <CheckCircle2 size={15} /> },
];

const MOVIE_TABS = [
  { id: 'want', label: 'İzlenecek', icon: <BookMarked size={15} /> },
  { id: 'done', label: 'İzlendi',   icon: <CheckCircle2 size={15} /> },
];

const NO_POSTER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300"%3E%3Crect width="200" height="300" fill="%2316161f"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="13" fill="%2355556a"%3EAfis Yok%3C/text%3E%3C/svg%3E';

export default function Home() {
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('watching');
  const [contentType, setContentType] = useState<'shows' | 'movies'>('shows');
  const [notifications, setNotifications] = useState<ShowNotification[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [showDetailEntry, setShowDetailEntry] = useState<Entry | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);

  // On mount: load profile from localStorage
  useEffect(() => {
    const savedProfileId = localStorage.getItem('activeProfileId');
    if (savedProfileId) {
      const found = PROFILES.find(p => p.id === savedProfileId);
      if (found) {
        setActiveProfile(found);
      } else {
        setShowProfileSelector(true);
      }
    } else {
      setShowProfileSelector(true);
    }
  }, []);

  // When profile is set, fetch entries for that profile
  useEffect(() => {
    if (activeProfile) fetchEntries(activeProfile.id);
  }, [activeProfile]);

  const handleSelectProfile = (profile: Profile) => {
    localStorage.setItem('activeProfileId', profile.id);
    setActiveProfile(profile);
    setShowProfileSelector(false);
    setEntries([]);
  };

  const handleSwitchProfile = (profile: Profile) => {
    setProfileMenuOpen(false);
    localStorage.setItem('activeProfileId', profile.id);
    setActiveProfile(profile);
    setEntries([]);
    setActiveTab('watching');
    setContentType('shows');
    setIsMobileMenuOpen(false);
  };

  // Reset activeTab when switching content type
  const handleContentTypeChange = (type: 'shows' | 'movies') => {
    setContentType(type);
    setActiveTab(type === 'shows' ? 'watching' : 'want');
    setIsMobileMenuOpen(false);
  };

  // Rotate hero banner every 6 seconds
  useEffect(() => {
    const heroEntries = entries.filter(e => e.poster_url);
    if (heroEntries.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex(i => (i + 1) % heroEntries.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [entries]);

  const fetchEntries = async (profileId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('entries')
      .select('*')
      .eq('profile_id', profileId)
      .order('updated_at', { ascending: false });
    if (data) {
      setEntries(data);
      checkForNewEpisodes(data);
    }
    setLoading(false);
  };

  const checkForNewEpisodes = async (allEntries: Entry[]) => {
    const watchingShows = allEntries.filter(e => e.type === 'show' && e.status === 'watching');
    const notes: ShowNotification[] = [];
    for (const show of watchingShows) {
      try {
        const details = await getShowDetails(show.tmdb_id);
        const last = details.last_episode_to_air;
        if (!last) continue;

        const userSeason = show.current_season || 0;
        const userEpisode = show.current_episode || 0;

        const isAhead =
          last.season_number > userSeason ||
          (last.season_number === userSeason && last.episode_number > userEpisode);

        if (isAhead) {
          let nextSeason = userSeason;
          let nextEpisode = userEpisode + 1;

          if (last.season_number > userSeason) {
            const currentSeasonInfo = (details.seasons || []).find(
              (s: any) => s.season_number === userSeason
            );
            const currentSeasonEpisodeCount = currentSeasonInfo?.episode_count ?? userEpisode;
            if (userEpisode >= currentSeasonEpisodeCount) {
              nextSeason = userSeason + 1;
              nextEpisode = 1;
            }
          }

          const behindBy =
            last.season_number === nextSeason
              ? last.episode_number - userEpisode
              : last.episode_number + (last.season_number - nextSeason) * 10 + (10 - nextEpisode + 1);

          notes.push({
            entry: show,
            lastSeason: nextSeason,
            lastEpisode: nextEpisode,
            episodeName: undefined,
            behindBy: Math.max(1, behindBy),
          });
        }
      } catch {}
    }
    setNotifications(notes);
  };

  const handleAddFromSearch = async (tmdbItem: any, status?: string) => {
    if (!activeProfile) return;
    setIsSearchOpen(false);
    const type = tmdbItem.media_type === 'tv' ? 'show' : 'movie';
    const defaultStatus = type === 'movie' ? (status || 'want') : 'watching';
    const { data, error } = await supabase.from('entries').insert([{
      tmdb_id: tmdbItem.id,
      type,
      title: tmdbItem.title || tmdbItem.name,
      poster_url: tmdbItem.poster_path,
      status: defaultStatus,
      current_season: type === 'show' ? 1 : 0,
      current_episode: 0,
      profile_id: activeProfile.id,
    }]).select().single();

    if (error) {
      console.error(error);
      alert('Eklenemedi: ' + error.message);
    } else if (data) {
      setEntries(prev => [data, ...prev]);
      if (type === 'show') setShowDetailEntry(data);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Entry>) => {
    const { data } = await supabase.from('entries').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (data) setEntries(prev => prev.map(e => e.id === id ? data : e));
  };

  const handleDelete = async (id: string) => {
    await supabase.from('entries').delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const currentTabs = contentType === 'shows' ? SHOW_TABS : MOVIE_TABS;
  const filtered = entries.filter(e =>
    e.type === (contentType === 'shows' ? 'show' : 'movie') && e.status === activeTab
  );
  const heroEntries = entries.filter(e => e.poster_url);
  const featuredEntry = heroEntries.length > 0 ? heroEntries[heroIndex % heroEntries.length] : null;

  const handleCardClick = (entry: Entry) => {
    if (entry.type === 'show') {
      setShowDetailEntry(entry);
    } else {
      setSelectedEntry(entry);
    }
  };

  // Show profile selector overlay
  if (showProfileSelector) {
    return <ProfileSelector onSelect={handleSelectProfile} />;
  }

  if (!activeProfile) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>

      <div className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />

      <div className="mobile-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={18} color="white" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Takipçi</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)' }}>
          <Menu size={24} />
        </button>
      </div>

      {/* ───── Sidebar ───── */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div style={{ padding: '0 24px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px var(--accent-glow)' }}>
              <Layers size={20} color="white" />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>Takipçi</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Dizi & Film</p>
            </div>
          </div>
        </div>

        {/* ── Active Profile Badge ── */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
          <button
            onClick={() => setProfileMenuOpen(p => !p)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              background: `${activeProfile.color}18`,
              border: `1px solid ${activeProfile.color}44`,
              borderRadius: 10, padding: '8px 12px', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 22 }}>{activeProfile.emoji}</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: 'white', lineHeight: 1 }}>{activeProfile.name}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Aktif Profil</p>
            </div>
            <ChevronDown size={14} color="rgba(255,255,255,0.4)" style={{ transform: profileMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {/* Profile switch dropdown */}
          {profileMenuOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% - 8px)', left: 16, right: 16, zIndex: 200,
              background: 'var(--bg-card)', border: '1px solid var(--border-accent)',
              borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', padding: '10px 12px 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Profil Seç
              </p>
              {PROFILES.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSwitchProfile(p)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: activeProfile.id === p.id ? `${p.color}22` : 'transparent',
                    borderLeft: activeProfile.id === p.id ? `3px solid ${p.color}` : '3px solid transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{p.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: activeProfile.id === p.id ? 'white' : 'var(--text-secondary)' }}>
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content-type switcher */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', background: 'var(--bg-primary)', borderRadius: 10, padding: 3, gap: 2 }}>
            {([
              { key: 'shows', label: 'Diziler', icon: <Tv size={14} /> },
              { key: 'movies', label: 'Filmler', icon: <Clapperboard size={14} /> },
            ] as const).map(ct => (
              <button
                key={ct.key}
                onClick={() => handleContentTypeChange(ct.key)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  background: contentType === ct.key ? 'var(--accent)' : 'transparent',
                  color: contentType === ct.key ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                  boxShadow: contentType === ct.key ? '0 2px 8px var(--accent-glow)' : 'none',
                }}
              >
                {ct.icon} {ct.label}
              </button>
            ))}
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="sidebar-nav" style={{ marginTop: 12, flex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', padding: '0 24px 10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {contentType === 'shows' ? 'Dizilerim' : 'Filmlerim'}
          </p>
          {currentTabs.map(tab => {
            const count = entries.filter(e =>
              e.type === (contentType === 'shows' ? 'show' : 'movie') && e.status === tab.id
            ).length;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }}
                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              >
                {tab.icon}
                {tab.label}
                <span style={{
                  marginLeft: 'auto', fontSize: 11, fontWeight: 600,
                  background: activeTab === tab.id ? 'rgba(230,57,70,0.15)' : 'rgba(255,255,255,0.06)',
                  color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                  padding: '2px 8px', borderRadius: 99,
                }}>
                  {count}
                </span>
              </button>
            );
          })}

          {notifications.length > 0 && contentType === 'shows' && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', padding: '20px 24px 10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Bildirimler</p>
              <div className="nav-item" style={{ cursor: 'default', gap: 10 }}>
                <Bell size={15} color="var(--accent)" />
                <span style={{ fontSize: 13, color: 'var(--accent)' }}>{notifications.length} yeni bölüm</span>
              </div>
            </>
          )}
        </nav>

        {/* Add button */}
        <div style={{ padding: '20px 16px 0' }}>
          <button onClick={() => setIsSearchOpen(true)} className="btn-accent" style={{ width: '100%', justifyContent: 'center', borderRadius: 12 }}>
            <Plus size={18} /> Ekle
          </button>
        </div>
      </aside>

      {/* ───── Main ───── */}
      <div className="main-content" style={{ flex: 1, overflow: 'hidden' }}>

        {/* Top bar */}
        <div className="top-bar">
          <div className="search-bar" onClick={() => setIsSearchOpen(true)} style={{ cursor: 'pointer' }}>
            <Search size={16} color="var(--text-muted)" />
            <input readOnly placeholder="Film veya dizi ara..." style={{ cursor: 'pointer' }} />
          </div>
          <button
            onClick={() => setIsSearchOpen(true)}
            className="btn-accent"
            style={{ padding: '10px 20px', fontSize: 13, marginLeft: 12 }}
          >
            <Plus size={16} /> Ekle
          </button>
        </div>

        <div style={{ padding: '32px' }}>
          <NotificationBanner
            notifications={notifications}
            onSelect={(entry) => {
              const found = entries.find(e => e.id === entry.id);
              if (found) setSelectedEntry(found);
            }}
          />

          {/* ── Hero Banner ── */}
          {heroEntries.length > 0 && (
            <div className="hero-section" style={{ marginBottom: 48, display: 'flex', position: 'relative', background: 'var(--bg-primary)' }}>
              {[0, 1].map(offset => {
                // Eğer sadece 1 dizi varsa 2. paneli çizme
                if (heroEntries.length === 1 && offset === 1) return null;
                const entry = heroEntries[(heroIndex + offset) % heroEntries.length];
                
                const maskImage = heroEntries.length > 1 
                  ? (offset === 0 ? 'linear-gradient(to right, black 70%, transparent 100%)' : 'linear-gradient(to right, transparent 0%, black 30%)')
                  : 'none';

                return (
                  <div key={`${entry.id}-${offset}-${heroIndex}`} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    <img
                      src={`https://image.tmdb.org/t/p/original${entry.poster_url}`}
                      alt={entry.title}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover', 
                        objectPosition: 'center 20%', 
                        animation: 'heroFadeIn 0.8s ease',
                        WebkitMaskImage: maskImage,
                        maskImage: maskImage
                      }}
                    />
                  </div>
                );
              })}

              {heroEntries.length > 1 && (
                <div style={{ position: 'absolute', bottom: 24, right: 30, display: 'flex', gap: 6, zIndex: 10 }}>
                  {heroEntries.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setHeroIndex(i)}
                      style={{
                        width: i === heroIndex % heroEntries.length ? 20 : 6,
                        height: 6, borderRadius: 99, border: 'none', cursor: 'pointer',
                        background: i === heroIndex % heroEntries.length ? 'white' : 'rgba(255,255,255,0.35)',
                        transition: 'all 0.3s', padding: 0,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Active Tab Section ── */}
          <div>
            <div className="section-header">
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 2 }}>
                <span className="section-line" />
                {currentTabs.find(t => t.id === activeTab)?.label}
              </h3>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} içerik</span>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                <div className="spinner" />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '60px 20px',
                background: 'var(--bg-card)',
                borderRadius: 16, border: '1px dashed var(--border-accent)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16, opacity: 0.3 }}>
                  <Film size={48} /><Tv size={48} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Bu liste boş
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
                  Henüz bu kategoride hiç içerik yok.
                </p>
                <button onClick={() => setIsSearchOpen(true)} className="btn-accent">
                  <Plus size={16} /> İçerik Ekle
                </button>
              </div>
            ) : (
              <div className="wrap-row">
                {filtered.map(entry => (
                  <div
                    key={entry.id}
                    className="poster-card animate-in"
                    onClick={() => handleCardClick(entry)}
                  >
                    <img
                      src={entry.poster_url ? `https://image.tmdb.org/t/p/w342${entry.poster_url}` : NO_POSTER}
                      alt={entry.title}
                      loading="lazy"
                    />
                    <div className="poster-card-overlay">
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'white', lineHeight: 1.3, marginBottom: entry.type === 'show' ? 4 : 0 }}>
                        {entry.title}
                      </p>
                      {entry.type === 'show' && (
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                          S{entry.current_season} B{entry.current_episode}
                        </p>
                      )}
                    </div>
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      background: entry.type === 'show' ? 'rgba(59,130,246,0.9)' : 'rgba(230,57,70,0.9)',
                      borderRadius: 6, padding: '2px 6px',
                    }}>
                      {entry.type === 'show' ? <Tv size={10} color="white" /> : <Film size={10} color="white" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── All Other Sections Removed per user request ── */}
        </div>
      </div>

      {/* ── Modals ── */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onAdd={handleAddFromSearch}
        watchingEntries={entries.filter(e => e.status === 'watching')}
        allEntries={entries}
      />
      {/* Film detail drawer */}
      <DetailDrawer
        entry={selectedEntry}
        isOpen={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
      {/* Show full-screen detail */}
      {showDetailEntry && (
        <ShowDetail
          entry={showDetailEntry}
          onBack={() => setShowDetailEntry(null)}
          onUpdate={async (id, updates) => {
            await handleUpdate(id, updates);
          }}
          onDelete={handleDelete}
        />
      )}

      {/* Close profile menu on outside click */}
      {profileMenuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 45 }}
          onClick={() => setProfileMenuOpen(false)}
        />
      )}
    </div>
  );
}
