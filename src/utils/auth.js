// src/utils/auth.js
import { supabase } from '../supabase';

// Ritorna l'access token della sessione corrente (o null se non loggato).
export async function getAccessToken() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch (e) {
    return null;
  }
}

// Nome visualizzato a partire da un profilo { full_name, email }.
export function displayName(profile) {
  if (!profile) return 'Utente';
  if (profile.full_name) return profile.full_name;
  const email = profile.email || '';
  if (!email) return 'Utente';
  const local = email.split('@')[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}
