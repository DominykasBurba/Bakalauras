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

    public string? MaintenanceRequestId { get; init; }

    public DateTime? PaidAt { get; init; }

    public string? PaymentMethod { get; init; }

    public bool ResidentNotificationSent { get; init; }
}
