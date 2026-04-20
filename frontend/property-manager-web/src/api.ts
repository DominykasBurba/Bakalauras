import type {
  AssignOccupancyPayload,
  CreateOccupantPayload,
  EndOccupancyPayload,
  Bill,
  Building,
  BuildingInput,
  DashboardSummary,
  MaintenanceRequest,
  NotificationItem,
  OccupancyListItem,
  OccupantAdminDetail,
  OccupantAdminRow,
  UpdateOccupantPayload,
  PropertyOverview,
  ResidentPicker,
  ResidentProfilePayload,
  ResidentProfileResponse,
  ScheduledMaintenanceItem,
  ServiceCatalogItem,
  SessionResponse,
  TechnicianAssignmentContext,
  TechnicianDetail,
  TechnicianDirectoryRow,
  TechnicianNameOption,
  TechnicianOfferedService,
  TechnicianProfile,
  TechnicianProfileWritePayload,
  UnitDto,
  UnitWrite,
} from './types'
import { requireLoginResponse } from './utils/auth'

/**
 * Ensures requests hit .../api/... even when VITE_API_URL is set without the /api suffix
 * (e.g. http://localhost:5076 → http://localhost:5076/api). Omitting /api causes 404 on all routes.
 * Use a relative base like `/api` with the Vite dev proxy (vite.config.ts) to avoid cross-origin issues.
 */
function normalizeApiBaseUrl(raw: string | undefined): string {
  // In dev, default to same-origin /api so Vite can proxy to the ASP.NET API (see vite.config.ts).
  const fallback = import.meta.env.DEV ? '/api' : 'http://localhost:5076'
  const trimmed = (raw ?? fallback).trim()
  if (trimmed.startsWith('/')) {
    return trimmed.replace(/\/+$/, '') || '/api'
  }
  const base = trimmed.replace(/\/+$/, '')
  if (base.toLowerCase().endsWith('/api')) return base
  return `${base}/api`
}

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL)

async function request<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const url = `${API_BASE_URL}${path}`
  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers,
    })
  } catch (e) {
    const hint =
      typeof e === 'object' &&
      e !== null &&
      'message' in e &&
      String((e as Error).message).includes('fetch')
        ? ` Cannot reach ${API_BASE_URL.startsWith('/') ? 'the API (is the backend running on port 5076, and is VITE_API_URL correct?)' : API_BASE_URL}.`
        : ''
    throw new Error(
      e instanceof Error
        ? `${e.message}.${hint}`
        : `Network error.${hint}`,
    )
  }

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  const text = await response.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

export async function login(email: string, password: string) {
  const raw = await request<unknown>('/auth/login', undefined, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return requireLoginResponse(raw)
}

export function getDashboardSummary(token: string, buildingId?: number | null) {
  const q =
    buildingId != null && buildingId !== undefined
      ? `?buildingId=${encodeURIComponent(buildingId)}`
      : ''
  return request<DashboardSummary>(`/dashboard/summary${q}`, token)
}

export function getNotifications(token: string, buildingId?: number | null) {
  const q =
    buildingId != null && buildingId !== undefined
      ? `?buildingId=${encodeURIComponent(buildingId)}`
      : ''
  return request<NotificationItem[]>(`/dashboard/notifications${q}`, token)
}

export async function markNotificationRead(token: string, notificationId: number): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/dashboard/notifications/${notificationId}/read`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }
}

export async function markNotificationUnread(token: string, notificationId: number): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/dashboard/notifications/${notificationId}/unread`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/dashboard/notifications/read-all`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }
}

export function getMaintenanceRequests(token: string) {
  return request<MaintenanceRequest[]>('/maintenancerequests', token)
}

export function getMaintenanceRequest(token: string, requestId: string) {
  return request<MaintenanceRequest>(
    `/maintenancerequests/${encodeURIComponent(requestId)}`,
    token,
  )
}

export function createMaintenanceRequest(
  token: string,
  title: string,
  description: string,
  priority: string,
  photoUrls?: string[],
) {
  return request<MaintenanceRequest>('/maintenancerequests', token, {
    method: 'POST',
    body: JSON.stringify({
      title,
      description,
      priority,
      ...(photoUrls?.length ? { photoUrls } : {}),
    }),
  })
}

export function assignMaintenanceTechnician(
  token: string,
  requestId: string,
  assignedTechnician: string,
) {
  return request<MaintenanceRequest>(
    `/maintenancerequests/${encodeURIComponent(requestId)}/technician`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({ assignedTechnician }),
    },
  )
}

export function patchMaintenancePriority(
  token: string,
  requestId: string,
  priority: 'Low' | 'Medium' | 'High',
) {
  return request<MaintenanceRequest>(
    `/maintenancerequests/${encodeURIComponent(requestId)}/priority`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    },
  )
}

export function updateMaintenanceRequestStatus(
  token: string,
  requestId: string,
  status: string,
) {
  return request<MaintenanceRequest>(
    `/maintenancerequests/${encodeURIComponent(requestId)}/status`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  )
}

export function approveMaintenanceRequest(token: string, requestId: string) {
  return request<MaintenanceRequest>(
    `/maintenancerequests/${encodeURIComponent(requestId)}/approve`,
    token,
    { method: 'POST' },
  )
}

export function declineMaintenanceRequest(token: string, requestId: string, reason?: string | null) {
  return request<MaintenanceRequest>(
    `/maintenancerequests/${encodeURIComponent(requestId)}/decline`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ reason: reason?.trim() || null }),
    },
  )
}

export function completeMaintenanceWithoutCharge(token: string, requestId: string) {
  return request<MaintenanceRequest>(
    `/maintenancerequests/${encodeURIComponent(requestId)}/complete-without-charge`,
    token,
    { method: 'POST' },
  )
}

export function patchResidentCompletionFeedback(
  token: string,
  requestId: string,
  feedback: string,
) {
  return request<MaintenanceRequest>(
    `/maintenancerequests/${encodeURIComponent(requestId)}/resident-feedback`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({ feedback }),
    },
  )
}

export function patchAdminResidentResponse(token: string, requestId: string, message: string) {
  return request<MaintenanceRequest>(
    `/maintenancerequests/${encodeURIComponent(requestId)}/admin-resident-response`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({ message }),
    },
  )
}

export function patchTechnicianMaintenanceStatus(
  token: string,
  requestId: string,
  body: { status: string; completionNotes?: string },
) {
  return request<MaintenanceRequest>(
    `/maintenancerequests/${encodeURIComponent(requestId)}/technician-status`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  )
}

export function patchTechnicianInvoice(
  token: string,
  requestId: string,
  body: {
    invoiceUrl: string
    amount?: number
    notes?: string
    lineItems?: Array<{ kind: string; description: string; quantity: number; unitPrice: number }>
    taxRatePercent?: number
    purchaseOrderRef?: string
    workPhotoUrls?: string[]
    signatureAcknowledgment?: string
  },
) {
  return request<MaintenanceRequest>(
    `/maintenancerequests/${encodeURIComponent(requestId)}/technician-invoice`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  )
}

export function patchTechnicianPayout(
  token: string,
  requestId: string,
  body: {
    status?: string
    approvedAmount?: number
    paidAt?: string
    notes?: string
  },
) {
  return request<MaintenanceRequest>(
    `/maintenancerequests/${encodeURIComponent(requestId)}/technician-payout`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  )
}

export function postResidentChargeFromMaintenance(
  token: string,
  requestId: string,
  body: { amount: number; type?: string; dueDate?: string },
) {
  return request<{ bill: Bill; request: MaintenanceRequest }>(
    `/maintenancerequests/${encodeURIComponent(requestId)}/resident-charge`,
    token,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
}

export function getBuildings(token: string) {
  return request<Building[]>('/buildings', token)
}

export function createBuilding(token: string, body: BuildingInput) {
  return request<Building>('/buildings', token, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateBuilding(token: string, id: number, body: BuildingInput) {
  return request<Building>(`/buildings/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function deleteBuilding(token: string, id: number): Promise<void> {
  await request<void>(`/buildings/${id}`, token, { method: 'DELETE' })
}

export function getPropertyOverview(token: string, buildingId?: number | null) {
  const q =
    buildingId != null && buildingId !== undefined
      ? `?buildingId=${encodeURIComponent(buildingId)}`
      : ''
  return request<PropertyOverview>(`/dashboard/property-overview${q}`, token)
}

export function getUnitsForBuilding(token: string, buildingId: number) {
  return request<UnitDto[]>(`/buildings/${buildingId}/units`, token)
}

export function createUnit(token: string, buildingId: number, body: UnitWrite) {
  return request<UnitDto>(`/buildings/${buildingId}/units`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateUnit(token: string, unitId: number, body: UnitWrite) {
  return request<UnitDto>(`/units/${unitId}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function deleteUnit(token: string, unitId: number): Promise<void> {
  await request<void>(`/units/${unitId}`, token, { method: 'DELETE' })
}

export function getOccupancies(token: string, buildingId?: number | null, currentOnly = false) {
  const params = new URLSearchParams()
  if (buildingId != null && buildingId !== undefined) {
    params.set('buildingId', String(buildingId))
  }
  if (currentOnly) params.set('currentOnly', 'true')
  const q = params.toString() ? `?${params.toString()}` : ''
  return request<OccupancyListItem[]>(`/occupancies${q}`, token)
}

export function assignOccupancy(token: string, unitId: number, body: AssignOccupancyPayload) {
  const payload: Record<string, unknown> = {
    userId: body.userId,
    startedAt: body.startedAt,
  }
  if (body.leaseEndDate?.trim()) payload.leaseEndDate = body.leaseEndDate.trim()
  return request<OccupancyListItem>(`/units/${unitId}/occupancies`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function endOccupancy(token: string, occupancyId: number, body?: EndOccupancyPayload) {
  return request<OccupancyListItem>(`/occupancies/${occupancyId}/end`, token, {
    method: 'POST',
    body: JSON.stringify(body?.endedAt ? { endedAt: body.endedAt } : {}),
  })
}

export function getResidentsForAdmin(token: string, buildingId?: number | null) {
  const q =
    buildingId != null && buildingId !== undefined
      ? `?buildingId=${encodeURIComponent(buildingId)}`
      : ''
  return request<ResidentPicker[]>(`/admin/residents${q}`, token)
}

export function getBills(token: string) {
  return request<Bill[]>('/billing', token)
}

export function createBillingCheckoutSession(token: string, billId: string) {
  return request<{ url: string }>('/billing/checkout-session', token, {
    method: 'POST',
    body: JSON.stringify({ billId }),
  })
}

export function verifyBillingCheckoutSession(token: string, sessionId: string) {
  return request<{ paid: boolean }>('/billing/verify-session', token, {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  })
}

export function getScheduledMaintenanceForResident(token: string) {
  return request<ScheduledMaintenanceItem[]>('/scheduled-maintenance', token)
}

export function getAdminScheduledMaintenance(token: string, buildingId?: number | null) {
  const q =
    buildingId != null && buildingId !== undefined
      ? `?buildingId=${encodeURIComponent(buildingId)}`
      : ''
  return request<ScheduledMaintenanceItem[]>(`/admin/scheduled-maintenance${q}`, token)
}

export function createAdminScheduledMaintenance(
  token: string,
  body: {
    buildingId: number
    title: string
    description?: string | null
    scheduledDate: string
    timeWindow?: string | null
  },
) {
  return request<{ id: number }>('/admin/scheduled-maintenance', token, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateAdminScheduledMaintenance(
  token: string,
  id: number,
  body: {
    buildingId: number
    title: string
    description?: string | null
    scheduledDate: string
    timeWindow?: string | null
  },
) {
  return request<void>(`/admin/scheduled-maintenance/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deleteAdminScheduledMaintenance(token: string, id: number) {
  return request<void>(`/admin/scheduled-maintenance/${id}`, token, { method: 'DELETE' })
}

export function postAdminBroadcastNotification(
  token: string,
  body: { message: string; buildingId?: number | null },
) {
  return request<{ recipientCount: number; warning?: string }>('/admin/notifications/broadcast', token, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function getTechnicianOfferedServices(token: string) {
  return request<TechnicianOfferedService[]>('/technician/offered-services', token)
}

export function createTechnicianOfferedService(
  token: string,
  body: { title: string; description?: string | null; sortOrder?: number },
) {
  return request<TechnicianOfferedService>('/technician/offered-services', token, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateTechnicianOfferedService(
  token: string,
  id: number,
  body: { title: string; description?: string | null; sortOrder?: number },
) {
  return request<TechnicianOfferedService>(`/technician/offered-services/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deleteTechnicianOfferedService(token: string, id: number) {
  return request<void>(`/technician/offered-services/${id}`, token, { method: 'DELETE' })
}

export function getAuthSession(token: string) {
  return request<SessionResponse>('/auth/session', token)
}

export function changePassword(
  token: string,
  body: { currentPassword: string; newPassword: string },
) {
  return request<void>('/auth/password', token, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function getResidentProfile(token: string) {
  return request<ResidentProfileResponse>('/resident/profile', token)
}

export function putResidentProfile(token: string, body: ResidentProfilePayload) {
  return request<ResidentProfileResponse>('/resident/profile', token, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function getAdminOccupants(
  token: string,
  params?: { buildingId?: number | null; name?: string | null },
) {
  const sp = new URLSearchParams()
  if (params?.buildingId != null && params.buildingId !== undefined) {
    sp.set('buildingId', String(params.buildingId))
  }
  const name = params?.name?.trim()
  if (name) sp.set('name', name)
  const q = sp.toString()
  return request<OccupantAdminRow[]>(`/admin/occupants${q ? `?${q}` : ''}`, token)
}

export function createOccupantAccount(token: string, body: CreateOccupantPayload) {
  return request<{ id: number; email: string }>('/admin/occupants', token, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function approveOccupantProfile(token: string, userId: number) {
  return request<{ id: number; profileStatus: string }>(`/admin/occupants/${userId}/approve`, token, {
    method: 'POST',
  })
}

export function declineOccupantProfile(token: string, userId: number, comment: string) {
  return request<{ id: number; profileStatus: string; adminComment?: string | null }>(
    `/admin/occupants/${userId}/decline`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ comment }),
    },
  )
}

export function getAdminOccupant(token: string, userId: number) {
  return request<OccupantAdminDetail>(`/admin/occupants/${userId}`, token)
}

export function updateAdminOccupant(token: string, userId: number, body: UpdateOccupantPayload) {
  const payload: Record<string, unknown> = {
    name: body.name,
    email: body.email,
    buildingId: body.buildingId ?? null,
  }
  const pw = body.password?.trim()
  if (pw) payload.password = pw
  return request<{ id: number; name: string; email: string; buildingId?: number | null }>(
    `/admin/occupants/${userId}`,
    token,
    { method: 'PUT', body: JSON.stringify(payload) },
  )
}

export async function deleteAdminOccupant(token: string, userId: number): Promise<void> {
  await request<void>(`/admin/occupants/${userId}`, token, { method: 'DELETE' })
}

export function getAdminTechnicians(token: string) {
  return request<TechnicianDirectoryRow[]>('/admin/technicians', token)
}

export function getAdminTechnicianNames(token: string, catalogItemId?: number | null) {
  const q =
    catalogItemId != null && catalogItemId > 0
      ? `?catalogItemId=${encodeURIComponent(String(catalogItemId))}`
      : ''
  return request<TechnicianNameOption[]>(`/admin/technicians/names${q}`, token)
}

export function getAdminServiceCatalog(token: string) {
  return request<ServiceCatalogItem[]>('/admin/service-catalog', token)
}

export function postAdminServiceCatalogItem(
  token: string,
  body: { name: string; description?: string | null; sortOrder?: number },
) {
  return request<ServiceCatalogItem>('/admin/service-catalog', token, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function putAdminServiceCatalogItem(
  token: string,
  id: number,
  body: { name: string; description?: string | null; sortOrder?: number },
) {
  return request<ServiceCatalogItem>(`/admin/service-catalog/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deleteAdminServiceCatalogItem(token: string, id: number) {
  return request<void>(`/admin/service-catalog/${id}`, token, { method: 'DELETE' })
}

export function putAdminTechnicianCatalogServices(token: string, userId: number, catalogItemIds: number[]) {
  return request<void>(`/admin/technicians/${userId}/catalog-services`, token, {
    method: 'PUT',
    body: JSON.stringify({ catalogItemIds }),
  })
}

export function getTechnicianAssignedCatalog(token: string) {
  return request<ServiceCatalogItem[]>('/technician/service-catalog', token)
}

export function getAdminTechnician(token: string, userId: number) {
  return request<TechnicianDetail>(`/admin/technicians/${userId}`, token)
}

export type OfferedServiceAdminReviewBody = {
  decision: 'approve' | 'reject'
  catalogItemId?: number | null
  note?: string | null
}

export function putAdminTechnicianOfferedServiceReview(
  token: string,
  userId: number,
  offeredServiceId: number,
  body: OfferedServiceAdminReviewBody,
) {
  return request<TechnicianOfferedService>(
    `/admin/technicians/${userId}/offered-services/${offeredServiceId}/review`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        decision: body.decision,
        catalogItemId: body.catalogItemId ?? undefined,
        note: body.note ?? undefined,
      }),
    },
  )
}

export function putAdminTechnicianProfile(
  token: string,
  userId: number,
  body: TechnicianProfileWritePayload,
) {
  return request<TechnicianProfile>(`/admin/technicians/${userId}/profile`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function getTechnicianAssignmentContext(token: string, technicianName: string) {
  const q = `?name=${encodeURIComponent(technicianName)}`
  return request<TechnicianAssignmentContext>(`/admin/technicians/assignment-context${q}`, token)
}
