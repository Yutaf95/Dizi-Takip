import React from 'react';
import { Entry } from '@/lib/supabase';

interface PosterCardProps {
  entry: Entry;
  onClick: (entry: Entry) => void;
}

export function PosterCard({ entry, onClick }: PosterCardProps) {
  const imageUrl = entry.poster_url
    ? `https://image.tmdb.org/t/p/w500${entry.poster_url}`
    : 'https://via.placeholder.com/500x750?text=No+Poster';

  return (
    <div 
      className="relative group cursor-pointer rounded-lg overflow-hidden transition-transform hover:scale-105 shadow-md border border-card"
      onClick={() => onClick(entry)}
    >
      <img 
        src={imageUrl} 
        alt={entry.title} 
        className="w-full h-auto aspect-[2/3] object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-90 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-semibold text-sm line-clamp-2 text-white">{entry.title}</h3>
          {entry.type === 'show' && (
            <p className="text-xs text-gray-300 mt-1">
              S{entry.current_season} E{entry.current_episode}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
