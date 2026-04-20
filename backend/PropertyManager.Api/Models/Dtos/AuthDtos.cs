namespace PropertyManager.Api.Models.Dtos;

public sealed class LoginRequest
{
    public required string Email { get; init; }
    public required string Password { get; init; }
}

public sealed class LoginResponse
{
    public required string Token { get; init; }
    public required string Name { get; init; }
    public required string Role { get; init; }
    public required string Unit { get; init; }
    public required int UserId { get; init; }
    /// <summary>Residents only: pending_profile | pending_review | approved | declined.</summary>
    public string? ProfileStatus { get; init; }
}

public sealed class ChangePasswordRequest
{
    public required string CurrentPassword { get; init; }
    public required string NewPassword { get; init; }
}

public sealed class SessionResponse
{
    public required int UserId { get; init; }
    public required string Email { get; init; }
    public required string Name { get; init; }
    public required string Role { get; init; }
    public required string Unit { get; init; }
    public int? BuildingId { get; init; }
    public string? BuildingName { get; init; }
    public int? UnitId { get; init; }
    public string? ProfileStatus { get; init; }
    public string? Phone { get; init; }
    public string? EmergencyContactName { get; init; }
    public string? EmergencyContactPhone { get; init; }
    public string? AboutMe { get; init; }
    public string? AdminComment { get; init; }
    public DateTime? ProfileSubmittedAt { get; init; }
    public DateTime? ProfileReviewedAt { get; init; }
}

public sealed class ResidentProfileWriteRequest
{
    public string? Phone { get; init; }
    public string? EmergencyContactName { get; init; }
    public string? EmergencyContactPhone { get; init; }
    public string? AboutMe { get; init; }
}

public sealed class ResidentProfileResponse
{
    public required string ProfileStatus { get; init; }
    public string? Phone { get; init; }
    public string? EmergencyContactName { get; init; }
    public string? EmergencyContactPhone { get; init; }
    public string? AboutMe { get; init; }
    public string? AdminComment { get; init; }
}

public sealed class CreateOccupantRequest
{
    public required string Email { get; init; }
    public required string Name { get; init; }
    public required string Password { get; init; }
    public int? BuildingId { get; init; }
}

public sealed class OccupantAdminRowDto
{
    public required int Id { get; init; }
    public required string Name { get; init; }
    public required string Email { get; init; }
    public int? BuildingId { get; init; }
    public string? BuildingName { get; init; }
    /// <summary>FK to <c>units.id</c> when assigned; null if no unit yet.</summary>
    public int? UnitId { get; init; }
    public string? UnitLine { get; init; }
    public required string ProfileStatus { get; init; }
    public string? AdminComment { get; init; }
    public DateTime? ProfileSubmittedAt { get; init; }
    public DateTime? ProfileReviewedAt { get; init; }
}

public sealed class DeclineOccupantRequest
{
    public required string Comment { get; init; }
}

/// <summary>Full occupant record for admin detail view (GET by id).</summary>
public sealed class OccupantAdminDetailDto
{
    public required int Id { get; init; }
    public required string Name { get; init; }
    public required string Email { get; init; }
    public int? BuildingId { get; init; }
    public string? BuildingName { get; init; }
    public int? UnitId { get; init; }
    public string? UnitLine { get; init; }
    public required string ProfileStatus { get; init; }
    public string? AdminComment { get; init; }
    public DateTime? ProfileSubmittedAt { get; init; }
    public DateTime? ProfileReviewedAt { get; init; }
    public string? Phone { get; init; }
    public string? EmergencyContactName { get; init; }
    public string? EmergencyContactPhone { get; init; }
    public string? AboutMe { get; init; }
}

public sealed class UpdateOccupantRequest
{
    public required string Name { get; init; }
    public required string Email { get; init; }
    public int? BuildingId { get; init; }
    /// <summary>If set, replaces the password; omit or empty to leave unchanged.</summary>
    public string? Password { get; init; }
}
