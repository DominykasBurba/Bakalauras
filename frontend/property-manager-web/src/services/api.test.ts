import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { login, getDashboardSummary, getAuthSession, getMaintenanceRequests, markNotificationRead, markNotificationUnread, markAllNotificationsRead, updateAdminOccupant, } from './api';
function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
describe('api request helpers', () => {
    const fetchMock = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>();
    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });
    it('login posts JSON and returns normalized user', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({
            token: 'abc',
            name: 'N',
            role: 'resident',
            unit: 'U1',
            userId: 5,
        }));
        const r = await login('a@test.com', 'secret');
        expect(r).toEqual({
            token: 'abc',
            name: 'N',
            role: 'resident',
            unit: 'U1',
            userId: 5,
            profileStatus: null,
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(String(url)).toMatch(/\/auth\/login$/);
        expect(init?.method).toBe('POST');
        expect(init?.body).toBe(JSON.stringify({ email: 'a@test.com', password: 'secret' }));
    });
    it('login throws with parsed message for JSON error body', async () => {
        fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401 }));
        await expect(login('x', 'y')).rejects.toThrow('Invalid credentials');
    });
    it('login throws with plain text error body', async () => {
        fetchMock.mockResolvedValueOnce(new Response('Invalid credentials', { status: 401 }));
        await expect(login('x', 'y')).rejects.toThrow('Invalid credentials');
    });
    it('login throws on invalid JSON body for requireLoginResponse', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({}));
        await expect(login('x', 'y')).rejects.toThrow('Invalid login response');
    });
    it('login wraps network failures with hint when message mentions fetch', async () => {
        fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        await expect(login('x', 'y')).rejects.toThrow(/Failed to fetch/);
    });
    it('getDashboardSummary adds buildingId query when provided', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({ openRequests: 0, completedThisMonth: 0, activeServiceProviders: 0 }));
        await getDashboardSummary('tok', 12);
        expect(String(fetchMock.mock.calls[0][0])).toContain('buildingId=12');
        const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
        expect(headers.get('Authorization')).toBe('Bearer tok');
    });
    it('getDashboardSummary omits query when buildingId undefined', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({ openRequests: 0, completedThisMonth: 0, activeServiceProviders: 0 }));
        await getDashboardSummary('tok');
        const url = String(fetchMock.mock.calls[0][0]);
        expect(url).not.toContain('buildingId');
    });
    it('getAuthSession GETs session with bearer', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({
            userId: 1,
            email: 'e',
            name: 'n',
            role: 'resident',
            unit: '',
        }));
        const s = await getAuthSession('tok');
        expect(s.userId).toBe(1);
        expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/auth\/session$/);
    });
    it('getMaintenanceRequests returns parsed array', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 'REQ-1', title: 'T' }]));
        const list = await getMaintenanceRequests('tok');
        expect(list).toHaveLength(1);
    });
    it('request returns undefined for empty 200 body', async () => {
        fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));
        const result = await getMaintenanceRequests('tok');
        expect(result).toBeUndefined();
    });
    it('markNotificationRead resolves on 204', async () => {
        fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
        await expect(markNotificationRead('tok', 9)).resolves.toBeUndefined();
        const [url, init] = fetchMock.mock.calls[0];
        expect(String(url)).toContain('/dashboard/notifications/9/read');
        expect(init?.method).toBe('PATCH');
    });
    it('markNotificationRead throws when not ok', async () => {
        fetchMock.mockResolvedValueOnce(new Response('nope', { status: 500 }));
        await expect(markNotificationRead('tok', 1)).rejects.toThrow('nope');
    });
    it('markNotificationUnread throws when not ok', async () => {
        fetchMock.mockResolvedValueOnce(new Response('bad', { status: 502 }));
        await expect(markNotificationUnread('tok', 2)).rejects.toThrow('bad');
    });
    it('markAllNotificationsRead throws when not ok', async () => {
        fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }));
        await expect(markAllNotificationsRead('tok')).rejects.toThrow(/503/);
    });
    it('updateAdminOccupant omits password when blank', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({ id: 1, name: 'A', email: 'a@b.com', buildingId: null }));
        await updateAdminOccupant('tok', 3, {
            name: 'A',
            email: 'a@b.com',
            buildingId: null,
            password: '   ',
        });
        const body = fetchMock.mock.calls[0][1]?.body as string;
        const parsed = JSON.parse(body);
        expect(parsed.password).toBeUndefined();
    });
    it('updateAdminOccupant includes trimmed password when set', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({ id: 1, name: 'A', email: 'a@b.com', buildingId: null }));
        await updateAdminOccupant('tok', 3, {
            name: 'A',
            email: 'a@b.com',
            password: ' NewPass1 ',
        });
        const parsed = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
        expect(parsed.password).toBe('NewPass1');
    });
});
