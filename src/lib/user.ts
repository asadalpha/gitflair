'use client';

import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'gitflair_user_id';

/**
 * Get or create an anonymous user ID.
 * Stored in localStorage — persists across sessions for the same browser.
 */
export function getAnonymousUserId(): string {
    if (typeof window === 'undefined') return '';

    let userId = localStorage.getItem(STORAGE_KEY);
    if (!userId) {
        userId = uuidv4();
        localStorage.setItem(STORAGE_KEY, userId);
    }
    return userId;
}
