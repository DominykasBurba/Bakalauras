namespace PropertyManager.Api.Models;

public sealed class MaintenanceRequest
{
    public required string Id { get; init; }
    public required int CreatedByUserId { get; init; }
    public int? BuildingId { get; init; }
    /// <summary>Resolved from the request's building or the submitter's building.</summary>
    public string? BuildingName { get; init; }
    /// <summary>Submitter's unit / room line (from users.unit).</summary>
    public string? SubmittedFromUnit { get; init; }
    public required string Title { get; init; }
    public required string Description { get; init; }
    public required string Status { get; set; }
    public required string Priority { get; init; }
    public required DateOnly DateCreated { get; init; }
    public required string AssignedTechnician { get; set; }
    public List<string> PhotoUrls { get; init; } = [];
    /// <summary>Resident feedback after the technician finishes (Solved or later).</summary>
    public string? ResidentFeedback { get; init; }

    /// <summary>Admin reply visible to the resident (in-app / notifications).</summary>
    public string? AdminResponseToResident { get; init; }

    /// <summary>When status is Declined: optional reason shown to the resident.</summary>
    public string? AdminDeclineReason { get; init; }
    /// <summary>Technician notes when completing the work.</summary>
    public string? TechnicianCompletionNotes { get; init; }

    /// <summary>Link to vendor invoice (PDF URL, etc.) submitted by the assigned technician.</summary>
    public string? TechnicianInvoiceUrl { get; init; }

    public decimal? TechnicianInvoiceAmount { get; init; }

    public string? TechnicianInvoiceNotes { get; init; }

    /// <summary>When the technician submitted invoice details (UTC).</summary>
    public DateTimeOffset? TechnicianInvoiceSubmittedAt { get; init; }

    public IReadOnlyList<TechnicianInvoiceLineItem> TechnicianInvoiceLineItems { get; init; } = [];

    /// <summary>Tax rate as a percent (e.g. 8.5 for 8.5%). Used with line items.</summary>
    public decimal? TechnicianInvoiceTaxRatePercent { get; init; }

    public string? TechnicianInvoicePurchaseOrderRef { get; init; }

    public IReadOnlyList<string> TechnicianWorkPhotoUrls { get; init; } = [];

    /// <summary>Typed acknowledgment (name / date) in lieu of e-signature capture.</summary>
    public string? TechnicianSignatureAcknowledgment { get; init; }

    /// <summary>Accounts payable: Pending, Approved, or Paid (office updates).</summary>
    public string? TechnicianPayoutStatus { get; init; }

    public decimal? TechnicianPayoutApprovedAmount { get; init; }

    public DateTimeOffset? TechnicianPayoutPaidAt { get; init; }

    public string? TechnicianPayoutNotes { get; init; }

    /// <summary>Sum of line extensions before tax (computed when line items exist).</summary>
    public decimal? TechnicianInvoiceSubtotal { get; init; }

    /// <summary>Tax portion from rate × subtotal (computed when line items exist).</summary>
    public decimal? TechnicianInvoiceTaxAmount { get; init; }

    /// <summary>Resident bill created from this work order (tenant damage pass-through), if any.</summary>
    public string? ResidentChargeBillId { get; init; }
}
