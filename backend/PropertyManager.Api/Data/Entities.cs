using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PropertyManager.Api.Data;

[Table("users")]
public sealed class UserEntity
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = "";

    [Column("email")]
    public string Email { get; set; } = "";

    [Column("password")]
    public string Password { get; set; } = "";

    [Column("role")]
    public string Role { get; set; } = "";

    [Column("unit")]
    public string Unit { get; set; } = "";

    [Column("building_id")]
    public int? BuildingId { get; set; }

    [Column("unit_id")]
    public int? UnitId { get; set; }

    /// <summary>pending_profile | pending_review | approved | declined</summary>
    [Column("profile_status")]
    public string ProfileStatus { get; set; } = ResidentProfileStatus.Approved;

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("emergency_contact_name")]
    public string? EmergencyContactName { get; set; }

    [Column("emergency_contact_phone")]
    public string? EmergencyContactPhone { get; set; }

    [Column("about_me")]
    public string? AboutMe { get; set; }

    [Column("admin_comment")]
    public string? AdminComment { get; set; }

    [Column("profile_submitted_at")]
    public DateTime? ProfileSubmittedAt { get; set; }

    [Column("profile_reviewed_at")]
    public DateTime? ProfileReviewedAt { get; set; }
}

public static class ResidentProfileStatus
{
    public const string PendingProfile = "pending_profile";
    public const string PendingReview = "pending_review";
    public const string Approved = "approved";
    public const string Declined = "declined";
}

[Table("buildings")]
public sealed class BuildingEntity
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = "";

    [Column("address")]
    public string Address { get; set; } = "";

    [Column("total_units")]
    public int TotalUnits { get; set; }

    [Column("occupied_units")]
    public int OccupiedUnits { get; set; }

    [Column("residents_count")]
    public int ResidentsCount { get; set; }

    [Column("open_requests")]
    public int OpenRequests { get; set; }
}

[Table("units")]
public sealed class UnitEntity
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("building_id")]
    public int BuildingId { get; set; }

    [Column("unit_code")]
    public string UnitCode { get; set; } = "";

    [Column("floor")]
    public string? Floor { get; set; }

    [Column("area_sqm")]
    public decimal? AreaSqm { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("photo_urls", TypeName = "jsonb")]
    public string PhotoUrlsJson { get; set; } = "[]";
}

[Table("building_images")]
public sealed class BuildingImageEntity
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("building_id")]
    public int BuildingId { get; set; }

    [Column("image_url")]
    public string ImageUrl { get; set; } = "";

    [Column("caption")]
    public string? Caption { get; set; }

    [Column("sort_order")]
    public int SortOrder { get; set; }
}

[Table("occupancies")]
public sealed class OccupancyEntity
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("unit_id")]
    public int UnitId { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("started_at")]
    public DateOnly StartedAt { get; set; }

    [Column("ended_at")]
    public DateOnly? EndedAt { get; set; }

    /// <summary>Optional planned lease end for an active stay (<see cref="EndedAt"/> null).</summary>
    [Column("lease_end_date")]
    public DateOnly? LeaseEndDate { get; set; }
}

[Table("maintenance_requests")]
public sealed class MaintenanceRequestEntity
{
    [Key]
    [Column("id")]
    public string Id { get; set; } = "";

    [Column("created_by_user_id")]
    public int CreatedByUserId { get; set; }

    [Column("building_id")]
    public int? BuildingId { get; set; }

    [Column("title")]
    public string Title { get; set; } = "";

    [Column("description")]
    public string Description { get; set; } = "";

    [Column("status")]
    public string Status { get; set; } = "";

    [Column("priority")]
    public string Priority { get; set; } = "";

    [Column("date_created")]
    public DateOnly DateCreated { get; set; }

    [Column("assigned_technician")]
    public string AssignedTechnician { get; set; } = "Not assigned";

    [Column("photo_urls", TypeName = "jsonb")]
    public string PhotoUrlsJson { get; set; } = "[]";

    [Column("resident_feedback")]
    public string? ResidentFeedback { get; set; }

    [Column("admin_response_to_resident")]
    public string? AdminResponseToResident { get; set; }

    [Column("admin_decline_reason")]
    public string? AdminDeclineReason { get; set; }

    [Column("technician_completion_notes")]
    public string? TechnicianCompletionNotes { get; set; }

    [Column("technician_invoice_url")]
    public string? TechnicianInvoiceUrl { get; set; }

    [Column("technician_invoice_amount")]
    public decimal? TechnicianInvoiceAmount { get; set; }

    [Column("technician_invoice_notes")]
    public string? TechnicianInvoiceNotes { get; set; }

    [Column("technician_invoice_submitted_at")]
    public DateTimeOffset? TechnicianInvoiceSubmittedAt { get; set; }

    [Column("technician_invoice_line_items", TypeName = "jsonb")]
    public string TechnicianInvoiceLineItemsJson { get; set; } = "[]";

    [Column("technician_invoice_tax_rate_percent")]
    public decimal? TechnicianInvoiceTaxRatePercent { get; set; }

    [Column("technician_invoice_purchase_order_ref")]
    public string? TechnicianInvoicePurchaseOrderRef { get; set; }

    [Column("technician_work_photo_urls", TypeName = "jsonb")]
    public string TechnicianWorkPhotoUrlsJson { get; set; } = "[]";

    [Column("technician_signature_acknowledgment")]
    public string? TechnicianSignatureAcknowledgment { get; set; }

    [Column("technician_payout_status")]
    public string? TechnicianPayoutStatus { get; set; }

    [Column("technician_payout_approved_amount")]
    public decimal? TechnicianPayoutApprovedAmount { get; set; }

    [Column("technician_payout_paid_at")]
    public DateTimeOffset? TechnicianPayoutPaidAt { get; set; }

    [Column("technician_payout_notes")]
    public string? TechnicianPayoutNotes { get; set; }
}

[Table("notifications")]
public sealed class NotificationEntity
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("message")]
    public string Message { get; set; } = "";

    [Column("relative_time")]
    public string RelativeTime { get; set; } = "";

    [Column("is_read")]
    public bool IsRead { get; set; }

    [Column("category")]
    public string? Category { get; set; }
}

[Table("bills")]
public sealed class BillEntity
{
    [Key]
    [Column("bill_id")]
    public string BillId { get; set; } = "";

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("type")]
    public string Type { get; set; } = "";

    [Column("amount")]
    public decimal Amount { get; set; }

    [Column("due_date")]
    public DateOnly DueDate { get; set; }

    [Column("status")]
    public string Status { get; set; } = "";

    [Column("maintenance_request_id")]
    public string? MaintenanceRequestId { get; set; }

    [Column("paid_at")]
    public DateTime? PaidAt { get; set; }

    [Column("payment_method")]
    public string? PaymentMethod { get; set; }
}

[Table("scheduled_maintenance")]
public sealed class ScheduledMaintenanceEntity
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("building_id")]
    public int BuildingId { get; set; }

    [Column("title")]
    public string Title { get; set; } = "";

    [Column("description")]
    public string? Description { get; set; }

    [Column("scheduled_date")]
    public DateOnly ScheduledDate { get; set; }

    [Column("time_window")]
    public string? TimeWindow { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}

[Table("technician_offered_services")]
public sealed class TechnicianOfferedServiceEntity
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("title")]
    public string Title { get; set; } = "";

    [Column("description")]
    public string? Description { get; set; }

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    /// <summary>pending_review | approved | rejected</summary>
    [Column("review_status")]
    public string ReviewStatus { get; set; } = OfferedServiceReviewStatus.Approved;

    [Column("admin_review_note")]
    public string? AdminReviewNote { get; set; }

    [Column("mapped_catalog_item_id")]
    public int? MappedCatalogItemId { get; set; }
}

/// <summary>Admin-managed general services (e.g. Plumbing, HVAC) for assigning technicians and filtering.</summary>
[Table("service_catalog_items")]
public sealed class ServiceCatalogItemEntity
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = "";

    [Column("description")]
    public string? Description { get; set; }

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}

[Table("technician_service_catalog_links")]
public sealed class TechnicianServiceCatalogLinkEntity
{
    [Column("user_id")]
    public int UserId { get; set; }

    [Column("catalog_item_id")]
    public int CatalogItemId { get; set; }
}

/// <summary>Admin-managed compliance and commercial fields for users with role Technician (one row per technician).</summary>
[Table("technician_profiles")]
public sealed class TechnicianProfileEntity
{
    [Key]
    [Column("user_id")]
    public int UserId { get; set; }

    [Column("company_name")]
    public string? CompanyName { get; set; }

    /// <summary>w2 | independent_contractor | vendor_company</summary>
    [Column("contractor_type")]
    public string? ContractorType { get; set; }

    [Column("license_number")]
    public string? LicenseNumber { get; set; }

    [Column("license_expiry", TypeName = "date")]
    public DateOnly? LicenseExpiry { get; set; }

    [Column("coi_expiry", TypeName = "date")]
    public DateOnly? CoiExpiry { get; set; }

    [Column("workers_comp_expiry", TypeName = "date")]
    public DateOnly? WorkersCompExpiry { get; set; }

    [Column("w9_on_file")]
    public bool W9OnFile { get; set; }

    [Column("background_check_on_file")]
    public bool BackgroundCheckOnFile { get; set; }

    [Column("after_hours_on_call")]
    public bool AfterHoursOnCall { get; set; }

    [Column("po_required")]
    public bool PoRequired { get; set; }

    [Column("billing_email")]
    public string? BillingEmail { get; set; }

    [Column("billing_phone")]
    public string? BillingPhone { get; set; }

    [Column("rate_notes")]
    public string? RateNotes { get; set; }

    [Column("service_area_notes")]
    public string? ServiceAreaNotes { get; set; }

    [Column("internal_notes")]
    public string? InternalNotes { get; set; }

    [Column("additional_insured_entity")]
    public string? AdditionalInsuredEntity { get; set; }

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; }
}
