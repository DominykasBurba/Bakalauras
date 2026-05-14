import { describe, expect, it } from 'vitest';
import { normalizeHttpUrl } from './httpUrl';
describe('normalizeHttpUrl', () => {
    it('returns null for empty and bad protocols', () => {
        expect(normalizeHttpUrl('')).toBe(null);
        expect(normalizeHttpUrl('   ')).toBe(null);
        expect(normalizeHttpUrl('ftp://x.com')).toBe(null);
        expect(normalizeHttpUrl('not a url')).toBe(null);
    });
    it('accepts http and https', () => {
        expect(normalizeHttpUrl('https://example.com/p')).toBe('https://example.com/p');
        expect(normalizeHttpUrl('  http://localhost:5173/ ')).toBe('http://localhost:5173/');
    });
    it('rejects bare host-less http', () => {
        expect(normalizeHttpUrl('http://')).toBe(null);
    });
});
