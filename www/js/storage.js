// Profils joueurs + progression. Sauvegarde dans le stockage natif (Capacitor Preferences) quand l'appli
// tourne sur téléphone, avec localStorage comme copie de secours (et pour le mode navigateur).

const KEY = 'calot.save.v1';
export const MAX_PROFILES = 6;
export const MARBLE_COLORS = ['#3a86ff', '#ff006e', '#ffbe0b', '#06d6a0', '#8338ec', '#fb5607', '#00b4d8', '#e63946'];

const prefs = () => window.Capacitor?.Plugins?.Preferences;

let data = { version: 1, lastProfileId: null, profiles: [] };

function readLocal() {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}

export async function load() {
  let saved = null;
  try {
    if (prefs()) {
      const r = await prefs().get({ key: KEY });
      if (r && r.value) saved = JSON.parse(r.value);
    }
  } catch (e) { /* stockage natif indisponible */ }
  if (!saved) saved = readLocal();
  if (saved && Array.isArray(saved.profiles)) data = saved;
  return data;
}

export function save() {
  const s = JSON.stringify(data);
  try { localStorage.setItem(KEY, s); } catch (e) {}
  try { prefs()?.set({ key: KEY, value: s }); } catch (e) {}
}

export const profiles = () => data.profiles;
export const current = () => data.profiles.find(p => p.id === data.lastProfileId) || null;

export function selectProfile(id) { data.lastProfileId = id; save(); }

export function createProfile(name, color) {
  const p = {
    id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name.trim().slice(0, 16) || 'Joueur',
    color,
    created: Date.now(),
    progress: {},                      // { 'facile-1': { stars, best } }
    settings: { sound: true, haptics: true },
  };
  data.profiles.push(p);
  data.lastProfileId = p.id;
  save();
  return p;
}

export function updateProfile(id, patch) {
  const p = data.profiles.find(x => x.id === id);
  if (p) { Object.assign(p, patch); save(); }
}

export function deleteProfile(id) {
  data.profiles = data.profiles.filter(p => p.id !== id);
  if (data.lastProfileId === id) data.lastProfileId = null;
  save();
}

export function resetProgress(id) { updateProfile(id, { progress: {} }); }

// Enregistre un résultat ; ne garde que le meilleur. Renvoie true si c'est un nouveau record.
export function recordResult(levelId, shots, stars) {
  const p = current();
  if (!p) return false;
  const old = p.progress[levelId];
  const better = !old || shots < old.best;
  p.progress[levelId] = { stars: Math.max(stars, old?.stars || 0), best: better ? shots : old.best };
  save();
  return better && !!old;
}

export const totalStars = (p) => Object.values(p.progress).reduce((a, r) => a + r.stars, 0);
