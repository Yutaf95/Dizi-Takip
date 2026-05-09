const TMDB_TOKEN = process.env.NEXT_PUBLIC_TMDB_TOKEN || '';

const fetchTMDB = async (endpoint: string, params: Record<string, string> = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const url = `https://api.themoviedb.org/3${endpoint}?${queryParams}`;
  
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TMDB_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch from TMDB');
  }
  
  return res.json();
};

export const searchTMDB = async (query: string) => {
  return fetchTMDB('/search/multi', { query, include_adult: 'false' });
};

export const getShowDetails = async (id: number) => {
  return fetchTMDB(`/tv/${id}`);
};

export const getSeasonDetails = async (id: number, seasonNumber: number) => {
  return fetchTMDB(`/tv/${id}/season/${seasonNumber}`);
};

export const getShowRecommendations = async (id: number) => {
  return fetchTMDB(`/tv/${id}/recommendations`);
};

export const getSimilarShows = async (id: number) => {
  return fetchTMDB(`/tv/${id}/similar`);
};
