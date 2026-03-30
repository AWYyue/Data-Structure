export type StoredUserSnapshot = {
  id?: string;
  [key: string]: unknown;
};

export const getStoredUserSnapshot = <T extends object = StoredUserSnapshot>(): T | null => {
  const raw = localStorage.getItem('user');
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

export const getStoredUserId = (): string | null => {
  const user = getStoredUserSnapshot<StoredUserSnapshot>();
  if (!user || typeof user.id !== 'string' || !user.id.trim()) {
    return null;
  }
  return user.id;
};

export const clearStoredAuth = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
