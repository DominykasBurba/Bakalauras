export type LoginResponse = {
    token: string;
    name: string;
    role: string;
    unit: string;
    userId?: number;
    profileStatus?: string | null;
};
export type SessionResponse = {
    userId: number;
    email: string;
    name: string;
    role: string;
    unit: string;
    buildingId?: number | null;
    buildingName?: string | null;
    unitId?: number | null;
    profileStatus?: string | null;
    phone?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    aboutMe?: string | null;
    adminComment?: string | null;
    profileSubmittedAt?: string | null;
    profileReviewedAt?: string | null;
};
export type ResidentProfilePayload = {
    phone: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    aboutMe?: string | null;
};
export type ResidentProfileResponse = {
    profileStatus: string;
    phone?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    aboutMe?: string | null;
    adminComment?: string | null;
};
export type OccupantAdminRow = {
    id: number;
    name: string;
    email: string;
    buildingId?: number | null;
    buildingName?: string | null;
    unitId?: number | null;
    unitLine?: string | null;
    profileStatus: string;
    adminComment?: string | null;
    profileSubmittedAt?: string | null;
    profileReviewedAt?: string | null;
};
export type CreateOccupantPayload = {
    email: string;
    name: string;
    password: string;
    buildingId?: number | null;
};
export type OccupantAdminDetail = OccupantAdminRow & {
    phone?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    aboutMe?: string | null;
};
export type UpdateOccupantPayload = {
    name: string;
    email: string;
    buildingId?: number | null;
    password?: string;
};
export type TechnicianInvoiceLineItem = {
    kind: string;
    description: string;
    quantity: number;
    unitPrice: number;
};
export type TechnicianSiteUpdateHistoryEntry = {
    at: string;
    siteUpdate?: string | null;
    materialsUsed?: string | null;
    expectedReturnDate?: string | null;
    officeNotes?: string | null;
};
export type MaintenanceRequest = {
    id: string;
    createdByUserId?: number;
    buildingId?: number | null;
    buildingName?: string | null;
    submittedFromUnit?: string | null;
    title: string;
    description: string;
    status: string;
    priority: string;
    dateCreated: string;
    assignedTechnician: string;
    assignedTechnicianUserId?: number | null;
    photoUrls?: string[];
    residentFeedback?: string | null;
    adminResponseToResident?: string | null;
    adminDeclineReason?: string | null;
    technicianCompletionNotes?: string | null;
    technicianSiteUpdate?: string | null;
    technicianMaterialsUsed?: string | null;
    technicianExpectedReturnDate?: string | null;
    technicianOfficeNotes?: string | null;
    technicianSiteUpdateHistory?: TechnicianSiteUpdateHistoryEntry[] | null;
    technicianInvoiceUrl?: string | null;
    technicianInvoiceAmount?: number | null;
    technicianInvoiceNotes?: string | null;
    technicianInvoiceSubmittedAt?: string | null;
    technicianInvoiceLineItems?: TechnicianInvoiceLineItem[];
    technicianInvoiceTaxRatePercent?: number | null;
    technicianInvoicePurchaseOrderRef?: string | null;
    technicianWorkPhotoUrls?: string[];
    technicianSignatureAcknowledgment?: string | null;
    technicianInvoiceSubtotal?: number | null;
    technicianInvoiceTaxAmount?: number | null;
    technicianPayoutStatus?: string | null;
    technicianPayoutApprovedAmount?: number | null;
    technicianPayoutPaidAt?: string | null;
    technicianPayoutNotes?: string | null;
    residentChargeBillId?: string | null;
    residentChargeNotificationSent?: boolean | null;
    residentChargeAmount?: number | null;
    residentChargeType?: string | null;
    residentChargeDueDate?: string | null;
};
export type NotificationItem = {
    id: number;
    message: string;
    relativeTime: string;
    isRead?: boolean;
    buildingId?: number | null;
    category?: string | null;
};
export type Building = {
    id: number;
    name: string;
    address: string;
    totalUnits: number;
    occupiedUnits: number;
    residents: number;
    openRequests: number;
};
export type BuildingInput = {
    name: string;
    address: string;
};
export type UnitDto = {
    id: number;
    buildingId: number;
    unitCode: string;
    floor?: string | null;
    areaSqm?: number | null;
    notes?: string | null;
    photoUrls: string[];
    currentOccupantName?: string | null;
    currentOccupantEmail?: string | null;
};
export type UnitWrite = {
    unitCode: string;
    floor?: string | null;
    areaSqm?: number | null;
    notes?: string | null;
    photoUrls?: string[];
};
export type OccupancyListItem = {
    id: number;
    unitId: number;
    unitCode: string;
    buildingId: number;
    buildingName: string;
    userId: number;
    userName: string;
    userEmail: string;
    startedAt: string;
    endedAt?: string | null;
    leaseEndDate?: string | null;
    daysInUnit?: number | null;
};
export type AssignOccupancyPayload = {
    userId: number;
    startedAt: string;
    leaseEndDate?: string;
};
export type EndOccupancyPayload = {
    endedAt?: string;
};
export type ResidentPicker = {
    id: number;
    name: string;
    email: string;
    buildingId?: number | null;
};
export type PropertyOverview = {
    buildingId?: number | null;
    buildingName?: string | null;
    unitsTotal: number;
    unitsWithCurrentOccupant: number;
    buildingImagesCount: number;
    openMaintenanceRequests: number;
    currentOccupancies: OccupancyListItem[];
};
export type Bill = {
    billId: string;
    buildingId?: number | null;
    type: string;
    amount: number;
    dueDate: string;
    status: string;
    maintenanceRequestId?: string | null;
    paidAt?: string | null;
    paymentMethod?: string | null;
    residentNotificationSent?: boolean;
};
export type ScheduledMaintenanceItem = {
    id: number;
    buildingId: number;
    buildingName?: string | null;
    title: string;
    description?: string | null;
    scheduledDate: string;
    timeWindow?: string | null;
    createdAt: string;
};
export type OfferedServiceReviewStatus = 'pending_review' | 'approved' | 'rejected';
export type TechnicianOfferedService = {
    id: number;
    title: string;
    description?: string | null;
    sortOrder: number;
    createdAt: string;
    reviewStatus?: OfferedServiceReviewStatus;
    adminReviewNote?: string | null;
    mappedCatalogItemId?: number | null;
    mappedCatalogName?: string | null;
};
export type PendingTechnicianOfferedServiceRow = {
    userId: number;
    technicianName: string;
    technicianEmail: string;
    companyName: string | null;
    service: TechnicianOfferedService;
};
export type ServiceCatalogTechnicianSummary = {
    userId: number;
    name: string;
    email: string;
    companyName?: string | null;
};
export type ServiceCatalogItem = {
    id: number;
    name: string;
    description?: string | null;
    sortOrder: number;
    createdAt: string;
    techniciansAssigned: number;
    assignedTechnicians?: ServiceCatalogTechnicianSummary[];
};
export type TechnicianProfile = {
    userId: number;
    companyName?: string | null;
    contractorType?: string | null;
    licenseNumber?: string | null;
    licenseExpiry?: string | null;
    coiExpiry?: string | null;
    workersCompExpiry?: string | null;
    w9OnFile: boolean;
    backgroundCheckOnFile: boolean;
    afterHoursOnCall: boolean;
    poRequired: boolean;
    billingEmail?: string | null;
    billingPhone?: string | null;
    rateNotes?: string | null;
    serviceAreaNotes?: string | null;
    internalNotes?: string | null;
    additionalInsuredEntity?: string | null;
    updatedAt: string;
};
export type TechnicianDirectoryRow = {
    userId: number;
    name: string;
    email: string;
    unitLabel?: string | null;
    activeJobs: number;
    completedJobs: number;
    complianceHealth: string;
    catalogServiceNames: string[];
    offeredServiceTitles: string[];
    pendingOfferedReviewCount?: number;
};
export type TechnicianNameOption = {
    userId: number;
    name: string;
};
export type TechnicianMetrics = {
    activeJobs: number;
    completedJobs: number;
};
export type TechnicianDetail = {
    userId: number;
    name: string;
    email: string;
    unitLabel?: string | null;
    profile: TechnicianProfile | null;
    offeredServices: TechnicianOfferedService[];
    catalogServices: ServiceCatalogItem[];
    metrics: TechnicianMetrics;
    complianceWarnings: string[];
};
export type TechnicianAssignmentContext = {
    userId: number | null;
    name: string | null;
    profile: TechnicianProfile | null;
    offeredServices: TechnicianOfferedService[];
    catalogServices: ServiceCatalogItem[];
    metrics: TechnicianMetrics;
    warnings: string[];
    assignmentBlockReason?: string | null;
};
export type TechnicianProfileWritePayload = {
    companyName?: string | null;
    contractorType?: string | null;
    licenseNumber?: string | null;
    licenseExpiry?: string | null;
    coiExpiry?: string | null;
    workersCompExpiry?: string | null;
    w9OnFile?: boolean;
    backgroundCheckOnFile?: boolean;
    afterHoursOnCall?: boolean;
    poRequired?: boolean;
    billingEmail?: string | null;
    billingPhone?: string | null;
    rateNotes?: string | null;
    serviceAreaNotes?: string | null;
    internalNotes?: string | null;
    additionalInsuredEntity?: string | null;
};
export type DashboardSummary = {
    openRequests: number;
    completedThisMonth: number;
    activeServiceProviders: number;
};
