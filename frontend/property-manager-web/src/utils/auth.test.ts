import { describe, expect, it } from 'vitest';
import { isAdminRole, isResidentRole, isTechnicianRole, normalizeLoginResponse, requireLoginResponse, } from './auth';
describe('role helpers', () => {
    it('detects admin', () => {
        expect(isAdminRole('Admin')).toBe(true);
        expect(isAdminRole(' admin ')).toBe(true);
        expect(isAdminRole('resident')).toBe(false);
        expect(isAdminRole(undefined)).toBe(false);
    });
    it('detects technician', () => {
        expect(isTechnicianRole('Technician')).toBe(true);
        expect(isTechnicianRole('admin')).toBe(false);
    });
    it('detects resident', () => {
        expect(isResidentRole('Resident')).toBe(true);
        expect(isResidentRole('technician')).toBe(false);
    });
});
describe('normalizeLoginResponse', () => {
    it('parses PascalCase and camelCase fields', () => {
        const r = normalizeLoginResponse({
            Token: 'abc',
            UserId: '42',
            Name: 'N',
            Role: 'admin',
            Unit: 'u',
            ProfileStatus: 'ok',
        });
        expect(r).toEqual({
            token: 'abc',
            userId: 42,
            name: 'N',
            role: 'admin',
            unit: 'u',
            profileStatus: 'ok',
        });
    });
    it('returns null when token missing', () => {
        expect(normalizeLoginResponse({})).toBe(null);
        expect(normalizeLoginResponse(null)).toBe(null);
    });
    it('requireLoginResponse throws', () => {
        expect(() => requireLoginResponse({})).toThrow('Invalid login response');
    });
});
