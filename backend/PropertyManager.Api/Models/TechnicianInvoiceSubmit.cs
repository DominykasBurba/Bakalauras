namespace PropertyManager.Api.Models;

public sealed class TechnicianInvoiceLineItem
{
    public string Kind { get; set; } = "other";
    public string Description { get; set; } = "";
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

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

public sealed class TechnicianPayoutSubmit
{
    public string? Status { get; init; }
    public decimal? ApprovedAmount { get; init; }
    public DateTimeOffset? PaidAt { get; init; }
    public string? Notes { get; init; }
}
