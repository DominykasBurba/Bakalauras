namespace PropertyManager.Api.Models;

public sealed class MaintenanceRequest
{
    public required string Id { get; init; }
    public required int CreatedByUserId { get; init; }
    public int? BuildingId { get; init; }
    public string? BuildingName { get; init; }
    public string? SubmittedFromUnit { get; init; }
    public required string Title { get; init; }
    public required string Description { get; init; }
    public required string Status { get; set; }
    public required string Priority { get; init; }
    public required DateOnly DateCreated { get; init; }
    public required string AssignedTechnician { get; set; }
    public int? AssignedTechnicianUserId { get; init; }
    public List<string> PhotoUrls { get; init; } = [];
    public string? ResidentFeedback { get; init; }

    public string? AdminResponseToResident { get; init; }

    public string? AdminDeclineReason { get; init; }
    public string? TechnicianCompletionNotes { get; init; }

    public string? TechnicianSiteUpdate { get; init; }

    public string? TechnicianMaterialsUsed { get; init; }

    public DateOnly? TechnicianExpectedReturnDate { get; init; }

    public string? TechnicianOfficeNotes { get; init; }

    public IReadOnlyList<TechnicianSiteUpdateHistoryEntry> TechnicianSiteUpdateHistory { get; init; } = [];

    public string? TechnicianInvoiceUrl { get; init; }

    public decimal? TechnicianInvoiceAmount { get; init; }

    public string? TechnicianInvoiceNotes { get; init; }

    public DateTimeOffset? TechnicianInvoiceSubmittedAt { get; init; }

    public IReadOnlyList<TechnicianInvoiceLineItem> TechnicianInvoiceLineItems { get; init; } = [];

    public decimal? TechnicianInvoiceTaxRatePercent { get; init; }

    public string? TechnicianInvoicePurchaseOrderRef { get; init; }

    public IReadOnlyList<string> TechnicianWorkPhotoUrls { get; init; } = [];

    public string? TechnicianSignatureAcknowledgment { get; init; }

    public string? TechnicianPayoutStatus { get; init; }

    public decimal? TechnicianPayoutApprovedAmount { get; init; }

    public DateTimeOffset? TechnicianPayoutPaidAt { get; init; }

    public string? TechnicianPayoutNotes { get; init; }

    public decimal? TechnicianInvoiceSubtotal { get; init; }

    public decimal? TechnicianInvoiceTaxAmount { get; init; }

    public string? ResidentChargeBillId { get; init; }

    public bool? ResidentChargeNotificationSent { get; init; }

    public decimal? ResidentChargeAmount { get; init; }

    public string? ResidentChargeType { get; init; }

    public DateOnly? ResidentChargeDueDate { get; init; }
}
