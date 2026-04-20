export type LoginResponse = {
  token: string
  name: string
  role: string
  unit: string
  userId?: number
  /** Residents: pending_profile | pending_review | approved | declined */
  profileStatus?: string | null
}

export type SessionResponse = {
  userId: number
  email: string
  name: string
  role: string
  unit: string
  buildingId?: number | null
  buildingName?: string | null
  unitId?: number | null
  profileStatus?: string | null
  phone?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  aboutMe?: string | null
  adminComment?: string | null
  profileSubmittedAt?: string | null
  profileReviewedAt?: string | null
}

export type ResidentProfilePayload = {
  phone: string
  emergencyContactName: string
  emergencyContactPhone: string
  aboutMe?: string | null
}

export type ResidentProfileResponse = {
  profileStatus: string
  phone?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  aboutMe?: string | null
  adminComment?: string | null
}

export type OccupantAdminRow = {
  id: number
  name: string
  email: string
  buildingId?: number | null
  buildingName?: string | null
  /** Set when assigned to a unit (occupancy); matches server `units.id`. */
  unitId?: number | null
  unitLine?: string | null
  profileStatus: string
  adminComment?: string | null
  profileSubmittedAt?: string | null
  profileReviewedAt?: string | null
}

export type CreateOccupantPayload = {
  email: string
  name: string
  password: string
  buildingId?: number | null
}

/** GET /admin/occupants/:id — full row plus profile fields for admin view. */
export type OccupantAdminDetail = OccupantAdminRow & {
  phone?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  aboutMe?: string | null
}

export type UpdateOccupantPayload = {
  name: string
  email: string
  buildingId?: number | null
  /** If set, replaces password; omit or leave empty to keep current. */
  password?: string
}

export type TechnicianInvoiceLineItem = {
  kind: string
  description: string
  quantity: number
  unitPrice: number
}

export type MaintenanceRequest = {
  id: string
  createdByUserId?: number
  buildingId?: number | null
  buildingName?: string | null
  submittedFromUnit?: string | null
  title: string
  description: string
  status: string
  priority: string
  dateCreated: string
  assignedTechnician: string
  photoUrls?: string[]
  /** Resident feedback after the technician finishes (for management). */
  residentFeedback?: string | null
  /** Admin reply to the resident (also sent as a notification). */
  adminResponseToResident?: string | null
  /** When status is Declined: optional reason from the office. */
  adminDeclineReason?: string | null
  /** Technician notes when marking work complete. */
  technicianCompletionNotes?: string | null
  /** Vendor invoice link from the assigned technician. */
  technicianInvoiceUrl?: string | null
  technicianInvoiceAmount?: number | null
  technicianInvoiceNotes?: string | null
  technicianInvoiceSubmittedAt?: string | null
  technicianInvoiceLineItems?: TechnicianInvoiceLineItem[]
  technicianInvoiceTaxRatePercent?: number | null
  technicianInvoicePurchaseOrderRef?: string | null
  technicianWorkPhotoUrls?: string[]
  technicianSignatureAcknowledgment?: string | null
  technicianInvoiceSubtotal?: number | null
  technicianInvoiceTaxAmount?: number | null
  /** Office AP tracking — not automated payouts. */
  technicianPayoutStatus?: string | null
  technicianPayoutApprovedAmount?: number | null
  technicianPayoutPaidAt?: string | null
  technicianPayoutNotes?: string | null
  /** Bill ID when admin billed the submitter for tenant-caused damage. */
  residentChargeBillId?: string | null
}

export type NotificationItem = {
  id: number
  message: string
  relativeTime: string
  isRead?: boolean
  buildingId?: number | null
  /** UpcomingMaintenance, General, or omitted for older rows */
  category?: string | null
}

/** GET /buildings — counts are computed server-side from units, occupancies, and maintenance. */
export type Building = {
  id: number
  name: string
  address: string
  totalUnits: number
  occupiedUnits: number
  residents: number
  openRequests: number
}

/** Create/update building (matches API BuildingWriteRequest — name and address only). */
export type BuildingInput = {
  name: string
  address: string
}

/** Room / unit within a building */
export type UnitDto = {
  id: number
  buildingId: number
  unitCode: string
  floor?: string | null
  areaSqm?: number | null
  notes?: string | null
  photoUrls: string[]
  /** Open occupancy resident, if any */
  currentOccupantName?: string | null
  currentOccupantEmail?: string | null
}

export type UnitWrite = {
  unitCode: string
  floor?: string | null
  areaSqm?: number | null
  notes?: string | null
  photoUrls?: string[]
}

export type OccupancyListItem = {
  id: number
  unitId: number
  unitCode: string
  buildingId: number
  buildingName: string
  userId: number
  userName: string
  userEmail: string
  startedAt: string
  endedAt?: string | null
  /** Planned lease end for active stays */
  leaseEndDate?: string | null
  daysInUnit?: number | null
}

export type AssignOccupancyPayload = {
  userId: number
  startedAt: string
  /** Optional planned lease end (on or after start) */
  leaseEndDate?: string
}

export type EndOccupancyPayload = {
  /** Vacate date (defaults to today on server if omitted) */
  endedAt?: string
}

export type ResidentPicker = {
  id: number
  name: string
  email: string
  buildingId?: number | null
}

export type PropertyOverview = {
  buildingId?: number | null
  buildingName?: string | null
  unitsTotal: number
  unitsWithCurrentOccupant: number
  buildingImagesCount: number
  openMaintenanceRequests: number
  currentOccupancies: OccupancyListItem[]
}

export type Bill = {
  billId: string
  buildingId?: number | null
  type: string
  amount: number
  dueDate: string
  status: string
  maintenanceRequestId?: string | null
  /** ISO 8601 when marked paid (from API). */
  paidAt?: string | null
  paymentMethod?: string | null
}

export type ScheduledMaintenanceItem = {
  id: number
  buildingId: number
  buildingName?: string | null
  title: string
  description?: string | null
  scheduledDate: string
  timeWindow?: string | null
  createdAt: string
}

/** Review state for technician-suggested services (office approves / maps to catalog). */
export type OfferedServiceReviewStatus = 'pending_review' | 'approved' | 'rejected'

/** GET/POST /technician/offered-services — technician’s advertised capabilities. */
export type TechnicianOfferedService = {
  id: number
  title: string
  description?: string | null
  sortOrder: number
  createdAt: string
  reviewStatus?: OfferedServiceReviewStatus
  /** When rejected — feedback from the office (technician can see). */
  adminReviewNote?: string | null
  /** When admin aligned this line with an office catalog category. */
  mappedCatalogItemId?: number | null
  mappedCatalogName?: string | null
}

/** Technician summary on admin service catalog rows (linked service providers). */
export type ServiceCatalogTechnicianSummary = {
  userId: number
  name: string
  email: string
  companyName?: string | null
}

/** Admin-managed general services (e.g. Plumbing, Electrical) — assign to technicians and filter assignments. */
export type ServiceCatalogItem = {
  id: number
  name: string
  description?: string | null
  sortOrder: number
  createdAt: string
  /** Technicians assigned to this catalog row (admin links). */
  techniciansAssigned: number
  /** Who is linked to this catalog service (admin list only; empty elsewhere). */
  assignedTechnicians?: ServiceCatalogTechnicianSummary[]
}

/** Admin: compliance & commercial profile for a technician user. */
export type TechnicianProfile = {
  userId: number
  companyName?: string | null
  contractorType?: string | null
  licenseNumber?: string | null
  licenseExpiry?: string | null
  coiExpiry?: string | null
  workersCompExpiry?: string | null
  w9OnFile: boolean
  backgroundCheckOnFile: boolean
  afterHoursOnCall: boolean
  poRequired: boolean
  billingEmail?: string | null
  billingPhone?: string | null
  rateNotes?: string | null
  serviceAreaNotes?: string | null
  internalNotes?: string | null
  additionalInsuredEntity?: string | null
  updatedAt: string
}

export type TechnicianDirectoryRow = {
  userId: number
  name: string
  email: string
  unitLabel?: string | null
  activeJobs: number
  completedJobs: number
  /** ok | warn | critical | unknown */
  complianceHealth: string
  /** Admin catalog services assigned to this technician. */
  catalogServiceNames: string[]
  /** Services the technician listed on their profile (self-service). */
  offeredServiceTitles: string[]
  /** Suggestions awaiting office review. */
  pendingOfferedReviewCount?: number
}

export type TechnicianNameOption = {
  userId: number
  name: string
}

export type TechnicianMetrics = {
  activeJobs: number
  completedJobs: number
}

export type TechnicianDetail = {
  userId: number
  name: string
  email: string
  unitLabel?: string | null
  profile: TechnicianProfile | null
  offeredServices: TechnicianOfferedService[]
  /** Services assigned by admin from the property catalog. */
  catalogServices: ServiceCatalogItem[]
  metrics: TechnicianMetrics
  complianceWarnings: string[]
}

export type TechnicianAssignmentContext = {
  userId: number | null
  name: string | null
  profile: TechnicianProfile | null
  offeredServices: TechnicianOfferedService[]
  /** Admin catalog services linked to this technician. */
  catalogServices: ServiceCatalogItem[]
  metrics: TechnicianMetrics
  warnings: string[]
  /** When set, assignment must not be saved (expired license / COI / workers comp). */
  assignmentBlockReason?: string | null
}

export type TechnicianProfileWritePayload = {
  companyName?: string | null
  contractorType?: string | null
  licenseNumber?: string | null
  licenseExpiry?: string | null
  coiExpiry?: string | null
  workersCompExpiry?: string | null
  w9OnFile?: boolean
  backgroundCheckOnFile?: boolean
  afterHoursOnCall?: boolean
  poRequired?: boolean
  billingEmail?: string | null
  billingPhone?: string | null
  rateNotes?: string | null
  serviceAreaNotes?: string | null
  internalNotes?: string | null
  additionalInsuredEntity?: string | null
}

export type DashboardSummary = {
  openRequests: number
  completedThisMonth: number
  activeServiceProviders: number
}

