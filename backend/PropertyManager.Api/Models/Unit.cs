using System.Text.Json.Serialization;

namespace PropertyManager.Api.Models;

public sealed class UnitDto
{
    public required int Id { get; init; }
    public required int BuildingId { get; init; }
    public required string UnitCode { get; init; }
    public string? Floor { get; init; }
    public decimal? AreaSqm { get; init; }
    public string? Notes { get; init; }
    public List<string> PhotoUrls { get; init; } = [];
    [JsonPropertyName("currentOccupantName")]
    public string? CurrentOccupantName { get; init; }
    [JsonPropertyName("currentOccupantEmail")]
    public string? CurrentOccupantEmail { get; init; }
}

public sealed class UnitWriteRequest
{
    public required string UnitCode { get; init; }
    public string? Floor { get; init; }
    public decimal? AreaSqm { get; init; }
    public string? Notes { get; init; }
    public string[]? PhotoUrls { get; init; }
}
