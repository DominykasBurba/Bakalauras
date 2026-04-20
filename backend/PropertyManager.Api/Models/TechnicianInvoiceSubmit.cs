namespace PropertyManager.Api.Models;

/// <summary>Line on a technician invoice (labor, parts, or other).</summary>
public sealed class TechnicianInvoiceLineItem
{
    public string Kind { get; set; } = "other";
    public string Description { get; set; } = "";
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

/// <summary>Payload when a technician saves invoice details before marking work solved.</summary>
public sealed class TechnicianInvoiceSubmit
{
    public required string InvoiceUrl { get; init; }
    public decimal? Amount { get; init; }
    public string? Notes { get; init; }
    public IReadOnlyList<TechnicianInvoiceLineItem>? LineItems { get; init; }
    public decimal? TaxRatePercent { get; init; }
    public string? PurchaseOrderRef { get; init; }
    public IReadOnlyList<string>? WorkPhotoUrls { get; init; }
    public string? SignatureAcknowledgment { get; init; }
}

/// <summary>Admin tracking of payment to the vendor (outside this app — record-keeping only).</summary>
public sealed class TechnicianPayoutSubmit
{
    public string? Status { get; init; }
    public decimal? ApprovedAmount { get; init; }
    public DateTimeOffset? PaidAt { get; init; }
    public string? Notes { get; init; }
}
