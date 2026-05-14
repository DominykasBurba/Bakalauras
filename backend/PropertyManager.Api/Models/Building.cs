namespace PropertyManager.Api.Models;

public sealed class Building
{
    public required int Id { get; init; }
    public required string Name { get; init; }
    public required string Address { get; init; }
    public required int TotalUnits { get; init; }
    public required int OccupiedUnits { get; init; }
    public required int Residents { get; init; }
    public required int OpenRequests { get; init; }
}
