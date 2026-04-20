namespace PropertyManager.Api.Models;

public sealed class Bill
{
    public required string BillId { get; init; }
    public int UserId { get; init; }
    public int? BuildingId { get; init; }
    public required string Type { get; init; }
    public required decimal Amount { get; init; }
    public required DateOnly DueDate { get; init; }
    public string Status { get; set; } = "";

    /// <summary>When set, this charge is tied to a maintenance work order.</summary>
    public string? MaintenanceRequestId { get; init; }

    /// <summary>UTC when marked paid (Stripe or manual).</summary>
    public DateTime? PaidAt { get; init; }

    public string? PaymentMethod { get; init; }
}
