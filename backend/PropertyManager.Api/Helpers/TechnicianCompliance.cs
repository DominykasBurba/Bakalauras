using PropertyManager.Api.Data;

namespace PropertyManager.Api.Helpers;

/// <summary>Compliance and readiness messages for assigning technicians.</summary>
public static class TechnicianCompliance
{
    public static IReadOnlyList<string> BuildWarnings(
        TechnicianProfileEntity? profile,
        DateOnly todayUtc,
        int offeredServiceCount,
        bool technicianAccountFound)
    {
        var w = new List<string>();
        if (!technicianAccountFound)
        {
            w.Add("No technician login matches this name — assignment still uses the name string.");
            return w;
        }

        if (offeredServiceCount == 0)
            w.Add("No offered services listed — consider verifying capabilities before assigning.");

        if (profile is null)
        {
            w.Add("Compliance profile not set up — add license, insurance, and W-9 in Technicians.");
            return w;
        }

        if (profile.LicenseExpiry is { } le)
        {
            if (le < todayUtc)
                w.Add($"Trade license expired on {le:yyyy-MM-dd}.");
            else if (le <= todayUtc.AddDays(30))
                w.Add($"Trade license expires soon ({le:yyyy-MM-dd}).");
        }
        else if (!string.IsNullOrWhiteSpace(profile.LicenseNumber))
            w.Add("License number set but no expiry date — add expiry for compliance tracking.");

        if (profile.CoiExpiry is { } ce)
        {
            if (ce < todayUtc)
                w.Add($"Certificate of insurance (liability) expired on {ce:yyyy-MM-dd}.");
            else if (ce <= todayUtc.AddDays(30))
                w.Add($"COI expires soon ({ce:yyyy-MM-dd}).");
        }

        if (profile.WorkersCompExpiry is { } we)
        {
            if (we < todayUtc)
                w.Add($"Workers' compensation expired on {we:yyyy-MM-dd}.");
            else if (we <= todayUtc.AddDays(30))
                w.Add($"Workers' comp expires soon ({we:yyyy-MM-dd}).");
        }

        if (!profile.W9OnFile)
            w.Add("W-9 not marked on file.");

        if (!profile.BackgroundCheckOnFile)
            w.Add("Background check not marked on file.");

        return w;
    }

    /// <summary>
    /// When a technician profile exists, blocks assignment if license, COI, or workers comp is past expiry.
    /// </summary>
    public static string? GetAssignmentBlockReason(TechnicianProfileEntity? profile, DateOnly todayUtc)
    {
        if (profile is null)
            return null;
        if (profile.LicenseExpiry is { } le && le < todayUtc)
            return "Cannot assign this technician: trade license is expired.";
        if (profile.CoiExpiry is { } ce && ce < todayUtc)
            return "Cannot assign this technician: certificate of insurance is expired.";
        if (profile.WorkersCompExpiry is { } we && we < todayUtc)
            return "Cannot assign this technician: workers' compensation coverage is expired.";
        return null;
    }

    /// <summary>Rough health for directory list badges: ok | warn | critical</summary>
    public static string ComplianceHealth(TechnicianProfileEntity? profile, DateOnly todayUtc)
    {
        if (profile is null)
            return "unknown";

        if (profile.LicenseExpiry is { } le && le < todayUtc)
            return "critical";
        if (profile.CoiExpiry is { } ce && ce < todayUtc)
            return "critical";
        if (profile.WorkersCompExpiry is { } we && we < todayUtc)
            return "critical";

        if (profile.LicenseExpiry is { } le2 && le2 <= todayUtc.AddDays(30))
            return "warn";
        if (profile.CoiExpiry is { } ce2 && ce2 <= todayUtc.AddDays(30))
            return "warn";
        if (profile.WorkersCompExpiry is { } we2 && we2 <= todayUtc.AddDays(30))
            return "warn";
        if (!profile.W9OnFile || !profile.BackgroundCheckOnFile)
            return "warn";

        return "ok";
    }
}
