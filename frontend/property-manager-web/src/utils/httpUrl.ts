export function normalizeHttpUrl(raw: string): string | null {
    const t = raw.trim();
    if (!t)
        return null;
    try {
        const u = new URL(t);
        if (u.protocol !== 'http:' && u.protocol !== 'https:')
            return null;
        if (!u.hostname)
            return null;
        return u.toString();
    }
    catch {
        return null;
    }
}
