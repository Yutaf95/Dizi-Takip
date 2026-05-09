import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Entry = {
  id: string;
  tmdb_id: number;
  type: 'movie' | 'show';
  title: string;
  poster_url: string | null;
  status: 'watching' | 'want' | 'done' | 'dropped';
  current_season: number;
  current_episode: number;
  profile_id: string;
  updated_at: string;
};
