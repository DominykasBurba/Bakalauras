import type { LoginResponse } from '../types';
export const SUPPRESS_LOGIN_RETURN_PATH_KEY = 'pm.suppressLoginReturnPath';
export function isAdminRole(role: string | undefined | null): boolean {
    return role?.trim().toLowerCase() === 'admin';
}
export function isTechnicianRole(role: string | undefined | null): boolean {
    return role?.trim().toLowerCase() === 'technician';
}
export function isResidentRole(role: string | undefined | null): boolean {
    return role?.trim().toLowerCase() === 'resident';
}
export function normalizeLoginResponse(raw: unknown): LoginResponse | null {
    if (!raw || typeof raw !== 'object')
        return null;
    const o = raw as Record<string, unknown>;
    const token = (o.token ?? o.Token) as string | undefined;
    if (!token || typeof token !== 'string')
        return null;
    const userIdRaw = o.userId ?? o.UserId;
    let userId: number | undefined;
    if (typeof userIdRaw === 'number' && !Number.isNaN(userIdRaw))
        userId = userIdRaw;
    else if (typeof userIdRaw === 'string' && userIdRaw) {
        const n = Number(userIdRaw);
        if (!Number.isNaN(n))
            userId = n;
    }
    const ps = o.profileStatus ?? o.ProfileStatus;
    return {
        token,
        name: typeof o.name === 'string' ? o.name : typeof o.Name === 'string' ? o.Name : '',
        role: typeof o.role === 'string' ? o.role : typeof o.Role === 'string' ? o.Role : '',
        unit: typeof o.unit === 'string' ? o.unit : typeof o.Unit === 'string' ? o.Unit : '',
        userId,
        profileStatus: typeof ps === 'string' ? ps : ps == null ? null : undefined,
    };
}
export function requireLoginResponse(raw: unknown): LoginResponse {
    const n = normalizeLoginResponse(raw);
    if (!n)
        throw new Error('Invalid login response');
    return n;
}
