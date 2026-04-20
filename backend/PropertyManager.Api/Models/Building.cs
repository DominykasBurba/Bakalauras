namespace PropertyManager.Api.Models;

/// <summary>Building list row. Numeric fields are computed from units, occupancies, and maintenance—not stored as manual entry.</summary>
public sealed class Building
{
    public required int Id { get; init; }
    public required string Name { get; init; }
    public required string Address { get; init; }
    /// <summary>Count of rows in <c>units</c> for this building.</summary>
    public required int TotalUnits { get; init; }
    /// <summary>Units with an active (open-ended) occupancy.</summary>
    public required int OccupiedUnits { get; init; }
    /// <summary>Distinct residents in an active occupancy for units in this building.</summary>
    public required int Residents { get; init; }
    /// <summary>Maintenance requests for this building with status other than Completed.</summary>
    public required int OpenRequests { get; init; }
}
