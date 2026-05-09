'use client';
import React from 'react';

export interface Profile {
  id: string;
  name: string;
  emoji: string;
  color: string;
  glow: string;
}

export const PROFILES: Profile[] = [
  { id: 'yusuf',   name: 'Yusuf',   emoji: '🎬', color: '#e63946', glow: 'rgba(230,57,70,0.4)'   },
  { id: 'serife',  name: 'Şerife',  emoji: '🌸', color: '#a855f7', glow: 'rgba(168,85,247,0.4)' },
  { id: 'azra',    name: 'Azra',    emoji: '⚡', color: '#22c55e', glow: 'rgba(34,197,94,0.4)'   },
  { id: 'umit',    name: 'Ümit',    emoji: '🏆', color: '#3b82f6', glow: 'rgba(59,130,246,0.4)'  },
];

interface ProfileSelectorProps {
  onSelect: (profile: Profile) => void;
}

export function ProfileSelector({ onSelect }: ProfileSelectorProps) {
  const [hovered, setHovered] = React.useState<string | null>(null);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: '#0a0a0f',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 48,
    }}>
      {/* Background gradient blobs */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: '-10%', left: '20%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(230,57,70,0.06) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', right: '15%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
      </div>

      {/* Logo */}
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #e63946, #c1121f)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(230,57,70,0.5)',
            fontSize: 22,
          }}>🎬</div>
          <div>
            <p style={{ fontSize: 22, fontWeight: 900, color: 'white', lineHeight: 1 }}>Takipçi</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Dizi & Film</p>
          </div>
        </div>
        <h1 style={{
          fontSize: 32, fontWeight: 900, color: 'white',
          marginTop: 8, letterSpacing: '-0.02em',
        }}>
          Kim İzliyor?
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
          Profilini seç ve kaldığın yerden devam et
        </p>
      </div>

      {/* Profile grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 px-6 max-w-lg md:max-w-none">
        {PROFILES.map(profile => (
          <button
            key={profile.id}
            onClick={() => onSelect(profile)}
            onMouseEnter={() => setHovered(profile.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '16px 12px',
              borderRadius: 16,
              transition: 'transform 0.2s ease',
              transform: hovered === profile.id ? 'translateY(-6px) scale(1.04)' : 'none',
            }}
          >
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              background: `linear-gradient(135deg, ${profile.color}22, ${profile.color}44)`,
              border: `2px solid ${hovered === profile.id ? profile.color : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36,
              boxShadow: hovered === profile.id ? `0 0 32px ${profile.glow}, 0 8px 32px rgba(0,0,0,0.4)` : '0 4px 16px rgba(0,0,0,0.3)',
              transition: 'all 0.2s ease',
            }} className="md:w-[100px] md:h-[100px] md:text-[44px]">
              {profile.emoji}
            </div>
            <span style={{
              fontSize: 15, fontWeight: 700,
              color: hovered === profile.id ? 'white' : 'rgba(255,255,255,0.7)',
              transition: 'color 0.2s ease',
            }}>
              {profile.name}
            </span>
          </button>
        ))}
      </div>

      {/* Hint */}
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: -16 }}>
        Her profil kendi izleme geçmişini taşır
      </p>
    </div>
  );
}
