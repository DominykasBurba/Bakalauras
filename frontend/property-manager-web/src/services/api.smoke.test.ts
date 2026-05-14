import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { approveMaintenanceRequest, approveOccupantProfile, assignMaintenanceTechnician, assignOccupancy, changePassword, completeMaintenanceWithoutCharge, createAdminScheduledMaintenance, createBillingCheckoutSession, createBuilding, createMaintenanceRequest, createOccupantAccount, createTechnicianOfferedService, createUnit, declineMaintenanceRequest, declineOccupantProfile, deleteAdminOccupant, deleteAdminScheduledMaintenance, deleteAdminServiceCatalogItem, deleteBuilding, deleteUnit, endOccupancy, getAdminOccupant, getAdminOccupants, getAdminPendingTechnicianOfferedServices, getAdminScheduledMaintenance, getAdminServiceCatalog, getAdminTechnician, getAdminTechnicianNames, getAdminTechnicians, getBills, getBuildings, getMaintenanceRequest, getNotifications, getOccupancies, getPropertyOverview, getResidentProfile, getResidentsForAdmin, getScheduledMaintenanceForResident, getTechnicianAssignedCatalog, getTechnicianAssignmentContext, getTechnicianOfferedServices, getUnitsForBuilding, markAllNotificationsRead, markNotificationUnread, patchAdminResidentResponse, patchMaintenancePriority, patchResidentChargeFromMaintenance, patchResidentCompletionFeedback, patchTechnicianInvoice, patchTechnicianMaintenanceStatus, patchTechnicianPayout, patchTechnicianSiteDetails, postAdminBroadcastNotification, postAdminServiceCatalogItem, postResidentChargeFromMaintenance, postResidentChargeSendToResident, putAdminServiceCatalogItem, putAdminTechnicianCatalogServices, putAdminTechnicianOfferedServiceReview, putAdminTechnicianProfile, putResidentProfile, updateAdminScheduledMaintenance, updateBuilding, updateMaintenanceRequestStatus, updateUnit, verifyBillingCheckoutSession, } from './api';
function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
describe('api.ts smoke (all exported HTTP helpers)', () => {
    const fetchMock = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>();
    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });
    type Row = [
        string,
        () => Promise<void>
    ];
    const rows: Row[] = [
        [
            'getNotifications',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getNotifications('t');
            },
        ],
        [
            'getNotifications + buildingId',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getNotifications('t', 9);
            },
        ],
        [
            'markNotificationUnread',
            async () => {
                fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
                await markNotificationUnread('t', 3);
            },
        ],
        [
            'markAllNotificationsRead',
            async () => {
                fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
                await markAllNotificationsRead('t');
            },
        ],
        [
            'getMaintenanceRequest',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await getMaintenanceRequest('t', 'REQ-1');
            },
        ],
        [
            'createMaintenanceRequest without photos',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await createMaintenanceRequest('t', 'a', 'b', 'Medium', undefined);
            },
        ],
        [
            'createMaintenanceRequest with photoUrls',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await createMaintenanceRequest('t', 'a', 'b', 'Low', ['u1']);
                const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
                expect(body.photoUrls).toEqual(['u1']);
            },
        ],
        [
            'assignMaintenanceTechnician',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await assignMaintenanceTechnician('t', 'R1', 'Ann');
            },
        ],
        [
            'patchMaintenancePriority',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await patchMaintenancePriority('t', 'R1', 'High');
            },
        ],
        [
            'updateMaintenanceRequestStatus',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await updateMaintenanceRequestStatus('t', 'R1', 'Closed');
            },
        ],
        [
            'approveMaintenanceRequest',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await approveMaintenanceRequest('t', 'R1');
            },
        ],
        [
            'declineMaintenanceRequest with reason',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await declineMaintenanceRequest('t', 'R1', '  nope ');
                const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
                expect(body.reason).toBe('nope');
            },
        ],
        [
            'declineMaintenanceRequest null reason',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await declineMaintenanceRequest('t', 'R1', null);
            },
        ],
        [
            'completeMaintenanceWithoutCharge',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await completeMaintenanceWithoutCharge('t', 'R1');
            },
        ],
        [
            'patchResidentCompletionFeedback',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await patchResidentCompletionFeedback('t', 'R1', 'ok');
            },
        ],
        [
            'patchAdminResidentResponse',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await patchAdminResidentResponse('t', 'R1', 'hello');
            },
        ],
        [
            'patchTechnicianMaintenanceStatus',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await patchTechnicianMaintenanceStatus('t', 'R1', { status: 'Working' });
            },
        ],
        [
            'patchTechnicianSiteDetails',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await patchTechnicianSiteDetails('t', 'R1', {
                    siteUpdate: 's',
                    materialsUsed: 'm',
                    expectedReturnDate: 'd',
                    officeNotes: 'o',
                });
            },
        ],
        [
            'patchTechnicianInvoice',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await patchTechnicianInvoice('t', 'R1', { invoiceUrl: 'http://x' });
            },
        ],
        [
            'patchTechnicianPayout',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await patchTechnicianPayout('t', 'R1', { status: 'approved' });
            },
        ],
        [
            'postResidentChargeFromMaintenance',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({ bill: {}, request: {} }));
                await postResidentChargeFromMaintenance('t', 'R1', { amount: 10 });
            },
        ],
        [
            'patchResidentChargeFromMaintenance',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({ bill: {}, request: {} }));
                await patchResidentChargeFromMaintenance('t', 'R1', { amount: 11 });
            },
        ],
        [
            'postResidentChargeSendToResident',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await postResidentChargeSendToResident('t', 'R1');
            },
        ],
        [
            'getBuildings',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getBuildings('t');
            },
        ],
        [
            'createBuilding',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await createBuilding('t', { name: 'N', address: 'A' });
            },
        ],
        [
            'updateBuilding',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await updateBuilding('t', 1, { name: 'N', address: 'A' });
            },
        ],
        [
            'deleteBuilding',
            async () => {
                fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));
                await deleteBuilding('t', 1);
            },
        ],
        [
            'getPropertyOverview',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await getPropertyOverview('t');
            },
        ],
        [
            'getPropertyOverview + buildingId',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await getPropertyOverview('t', 2);
            },
        ],
        [
            'getUnitsForBuilding',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getUnitsForBuilding('t', 1);
            },
        ],
        [
            'createUnit',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await createUnit('t', 1, { unitCode: '101' });
            },
        ],
        [
            'updateUnit',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await updateUnit('t', 9, { unitCode: '102' });
            },
        ],
        [
            'deleteUnit',
            async () => {
                fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));
                await deleteUnit('t', 9);
            },
        ],
        [
            'getOccupancies',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getOccupancies('t');
            },
        ],
        [
            'getOccupancies filters',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getOccupancies('t', 1, true);
            },
        ],
        [
            'assignOccupancy',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await assignOccupancy('t', 1, { userId: 2, startedAt: '2026-01-01' });
            },
        ],
        [
            'assignOccupancy + leaseEndDate',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await assignOccupancy('t', 1, {
                    userId: 2,
                    startedAt: '2026-01-01',
                    leaseEndDate: ' 2027-01-01 ',
                });
                const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
                expect(body.leaseEndDate).toBe('2027-01-01');
            },
        ],
        [
            'endOccupancy empty body',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await endOccupancy('t', 5);
            },
        ],
        [
            'endOccupancy endedAt',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await endOccupancy('t', 5, { endedAt: '2026-02-02' });
            },
        ],
        [
            'getResidentsForAdmin',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getResidentsForAdmin('t');
            },
        ],
        [
            'getResidentsForAdmin + building',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getResidentsForAdmin('t', 3);
            },
        ],
        [
            'getBills',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getBills('t');
            },
        ],
        [
            'createBillingCheckoutSession',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({ url: 'http://pay' }));
                await createBillingCheckoutSession('t', 'B1');
            },
        ],
        [
            'verifyBillingCheckoutSession',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({ paid: true }));
                await verifyBillingCheckoutSession('t', 'sess');
            },
        ],
        [
            'getScheduledMaintenanceForResident',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getScheduledMaintenanceForResident('t');
            },
        ],
        [
            'getAdminScheduledMaintenance',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getAdminScheduledMaintenance('t');
            },
        ],
        [
            'getAdminScheduledMaintenance + building',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getAdminScheduledMaintenance('t', 4);
            },
        ],
        [
            'createAdminScheduledMaintenance',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({ id: 1 }));
                await createAdminScheduledMaintenance('t', {
                    buildingId: 1,
                    title: 'Roof',
                    scheduledDate: '2026-06-01',
                });
            },
        ],
        [
            'updateAdminScheduledMaintenance',
            async () => {
                fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));
                await updateAdminScheduledMaintenance('t', 1, {
                    buildingId: 1,
                    title: 'Roof',
                    scheduledDate: '2026-06-02',
                });
            },
        ],
        [
            'deleteAdminScheduledMaintenance',
            async () => {
                fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));
                await deleteAdminScheduledMaintenance('t', 1);
            },
        ],
        [
            'postAdminBroadcastNotification',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({ recipientCount: 0 }));
                await postAdminBroadcastNotification('t', { message: 'Hi' });
            },
        ],
        [
            'getTechnicianOfferedServices',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getTechnicianOfferedServices('t');
            },
        ],
        [
            'createTechnicianOfferedService',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await createTechnicianOfferedService('t', { title: 'Paint' });
            },
        ],
        [
            'changePassword',
            async () => {
                fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));
                await changePassword('t', { currentPassword: 'a', newPassword: 'b' });
            },
        ],
        [
            'getResidentProfile',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({ profileStatus: 'ok' }));
                await getResidentProfile('t');
            },
        ],
        [
            'putResidentProfile',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({ profileStatus: 'ok' }));
                await putResidentProfile('t', {
                    phone: '1',
                    emergencyContactName: 'e',
                    emergencyContactPhone: '2',
                });
            },
        ],
        [
            'getAdminOccupants',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getAdminOccupants('t');
            },
        ],
        [
            'getAdminOccupants filters',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getAdminOccupants('t', { buildingId: 1, name: '  pat  ' });
            },
        ],
        [
            'createOccupantAccount',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({ id: 1, email: 'x' }));
                await createOccupantAccount('t', { email: 'x', name: 'y', password: 'z' });
            },
        ],
        [
            'approveOccupantProfile',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({ id: 1, profileStatus: 'ok' }));
                await approveOccupantProfile('t', 1);
            },
        ],
        [
            'declineOccupantProfile',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({ id: 1, profileStatus: 'declined' }));
                await declineOccupantProfile('t', 1, 'nope');
            },
        ],
        [
            'getAdminOccupant',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({ id: 1, email: 'e', name: 'n' }));
                await getAdminOccupant('t', 1);
            },
        ],
        [
            'deleteAdminOccupant',
            async () => {
                fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));
                await deleteAdminOccupant('t', 1);
            },
        ],
        [
            'getAdminTechnicians',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getAdminTechnicians('t');
            },
        ],
        [
            'getAdminTechnicianNames',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getAdminTechnicianNames('t');
            },
        ],
        [
            'getAdminTechnicianNames + catalogItemId',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getAdminTechnicianNames('t', 7);
            },
        ],
        [
            'getAdminServiceCatalog',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getAdminServiceCatalog('t');
            },
        ],
        [
            'postAdminServiceCatalogItem',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await postAdminServiceCatalogItem('t', { name: 'Plumbing' });
            },
        ],
        [
            'putAdminServiceCatalogItem',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await putAdminServiceCatalogItem('t', 1, { name: 'Plumbing' });
            },
        ],
        [
            'deleteAdminServiceCatalogItem',
            async () => {
                fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));
                await deleteAdminServiceCatalogItem('t', 1);
            },
        ],
        [
            'putAdminTechnicianCatalogServices',
            async () => {
                fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));
                await putAdminTechnicianCatalogServices('t', 2, [1, 3]);
            },
        ],
        [
            'getTechnicianAssignedCatalog',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getTechnicianAssignedCatalog('t');
            },
        ],
        [
            'getAdminTechnician',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({ userId: 1, displayName: 'T' }));
                await getAdminTechnician('t', 1);
            },
        ],
        [
            'getAdminPendingTechnicianOfferedServices',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse([]));
                await getAdminPendingTechnicianOfferedServices('t');
            },
        ],
        [
            'putAdminTechnicianOfferedServiceReview approve',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await putAdminTechnicianOfferedServiceReview('t', 1, 9, {
                    decision: 'approve',
                    catalogItemId: 4,
                    note: null,
                });
            },
        ],
        [
            'putAdminTechnicianOfferedServiceReview reject',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({}));
                await putAdminTechnicianOfferedServiceReview('t', 1, 9, {
                    decision: 'reject',
                    note: 'bad',
                });
                const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
                expect(body.decision).toBe('reject');
            },
        ],
        [
            'putAdminTechnicianProfile',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({ userId: 1, displayName: 'T' }));
                await putAdminTechnicianProfile('t', 1, { companyName: 'Co' });
            },
        ],
        [
            'getTechnicianAssignmentContext',
            async () => {
                fetchMock.mockResolvedValueOnce(jsonResponse({ technicianExists: true, activeRequestCount: 0 }));
                await getTechnicianAssignmentContext('t', 'Ann Lee');
            },
        ],
    ];
    it.each(rows)('%s', async (_label, run) => {
        await run();
        expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    });
    it('request() surfaces HTTP error text from generic helper', async () => {
        fetchMock.mockResolvedValueOnce(new Response('denied', { status: 403 }));
        await expect(getBuildings('t')).rejects.toThrow('denied');
    });
    it('request() appends hint for TypeError failed fetch', async () => {
        fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        await expect(getBuildings('t')).rejects.toThrow(/Failed to fetch/);
    });
    it('request() handles non-Error rejection', async () => {
        fetchMock.mockRejectedValueOnce('offline');
        await expect(getBuildings('t')).rejects.toThrow('Network error.');
    });
});
