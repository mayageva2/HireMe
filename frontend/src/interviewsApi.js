import { fetchAuthSession } from 'aws-amplify/auth';

async function getAuthHeaders() {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (err) {
    console.warn('Could not resolve auth session:', err);
    return {};
  }
}

/** Interview feedback history, newest first. Transcripts are only included with full: true. */
export async function fetchInterviews({ full = false } = {}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/cv/interviews${full ? '?full=1' : ''}`, { headers });
  if (!res.ok) {
    throw new Error(`Interview history request failed (${res.status})`);
  }
  const data = await res.json();
  return Array.isArray(data.interviews) ? data.interviews : [];
}
