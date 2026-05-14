using PropertyManager.Api.Data;
using PropertyManager.Api.Helpers;
using Xunit;

namespace PropertyManager.Api.Tests;

public sealed class TechnicianComplianceTests
{
    private static TechnicianProfileEntity Profile(
        DateOnly? license = null,
        DateOnly? coi = null,
        DateOnly? wc = null,
        string? licenseNumber = null,
        bool w9 = true,
        bool bg = true) =>
        new()
        {
            LicenseExpiry = license,
            CoiExpiry = coi,
            WorkersCompExpiry = wc,
            LicenseNumber = licenseNumber,
            W9OnFile = w9,
            BackgroundCheckOnFile = bg,
        };

    [Fact]
    public void BuildWarnings_no_account_short_circuits()
    {
        var w = TechnicianCompliance.BuildWarnings(null, new DateOnly(2026, 1, 1), 0, false);
        Assert.Single(w);
        Assert.Contains("No technician login", w[0], StringComparison.Ordinal);
    }

    [Fact]
    public void BuildWarnings_no_profile()
    {
        var w = TechnicianCompliance.BuildWarnings(null, new DateOnly(2026, 1, 1), 0, true);
        Assert.Contains("Compliance profile not set", string.Join(" ", w), StringComparison.Ordinal);
    }

    [Fact]
    public void BuildWarnings_no_offered_services()
    {
        var w = TechnicianCompliance.BuildWarnings(Profile(), new DateOnly(2026, 6, 1), 0, true);
        Assert.Contains("No offered services", string.Join(" ", w), StringComparison.Ordinal);
    }

    [Fact]
    public void BuildWarnings_expired_license()
    {
        var w = TechnicianCompliance.BuildWarnings(
            Profile(license: new DateOnly(2020, 1, 1)),
            new DateOnly(2026, 1, 1),
            1,
            true);
        Assert.Contains("license expired", string.Join(" ", w), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void BuildWarnings_license_expires_soon()
    {
        var w = TechnicianCompliance.BuildWarnings(
            Profile(license: new DateOnly(2026, 1, 25)),
            new DateOnly(2026, 1, 1),
            1,
            true);
        Assert.Contains("expires soon", string.Join(" ", w), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void BuildWarnings_license_number_without_expiry()
    {
        var w = TechnicianCompliance.BuildWarnings(
            Profile(licenseNumber: "L-1"),
            new DateOnly(2026, 1, 1),
            1,
            true);
        Assert.Contains("no expiry date", string.Join(" ", w), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void GetAssignmentBlockReason_license_expired()
    {
        var r = TechnicianCompliance.GetAssignmentBlockReason(
            Profile(license: new DateOnly(2020, 1, 1)),
            new DateOnly(2026, 1, 1));
        Assert.Contains("license", r!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void GetAssignmentBlockReason_coi_expired()
    {
        var r = TechnicianCompliance.GetAssignmentBlockReason(
            Profile(coi: new DateOnly(2020, 1, 1), license: new DateOnly(2027, 1, 1)),
            new DateOnly(2026, 1, 1));
        Assert.Contains("insurance", r!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void GetAssignmentBlockReason_workers_comp_expired()
    {
        var r = TechnicianCompliance.GetAssignmentBlockReason(
            Profile(
                coi: new DateOnly(2027, 1, 1),
                license: new DateOnly(2027, 1, 1),
                wc: new DateOnly(2020, 1, 1)),
            new DateOnly(2026, 1, 1));
        Assert.Contains("compensation", r!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ComplianceHealth_unknown_without_profile() =>
        Assert.Equal("unknown", TechnicianCompliance.ComplianceHealth(null, new DateOnly(2026, 1, 1)));

    [Fact]
    public void ComplianceHealth_critical_on_expired_license() =>
        Assert.Equal(
            "critical",
            TechnicianCompliance.ComplianceHealth(
                Profile(license: new DateOnly(2020, 1, 1), coi: new DateOnly(2027, 1, 1), wc: new DateOnly(2027, 1, 1)),
                new DateOnly(2026, 1, 1)));

    [Fact]
    public void ComplianceHealth_warn_on_missing_w9() =>
        Assert.Equal(
            "warn",
            TechnicianCompliance.ComplianceHealth(
                Profile(license: new DateOnly(2027, 1, 1), w9: false, bg: true),
                new DateOnly(2026, 1, 1)));

    [Fact]
    public void ComplianceHealth_ok_fully_compliant() =>
        Assert.Equal(
            "ok",
            TechnicianCompliance.ComplianceHealth(
                Profile(license: new DateOnly(2027, 6, 1), coi: new DateOnly(2027, 6, 1), wc: new DateOnly(2027, 6, 1)),
                new DateOnly(2026, 1, 1)));

    [Fact]
    public void BuildWarnings_coi_expired()
    {
        var w = TechnicianCompliance.BuildWarnings(
            Profile(coi: new DateOnly(2020, 1, 1), license: new DateOnly(2027, 1, 1), wc: new DateOnly(2027, 1, 1)),
            new DateOnly(2026, 1, 1),
            1,
            true);
        Assert.Contains("insurance (liability) expired", string.Join(" ", w), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void BuildWarnings_coi_expires_soon() =>
        Assert.Contains(
            "COI expires soon",
            string.Join(
                " ",
                TechnicianCompliance.BuildWarnings(
                    Profile(coi: new DateOnly(2026, 1, 20), license: new DateOnly(2027, 1, 1), wc: new DateOnly(2027, 1, 1)),
                    new DateOnly(2026, 1, 1),
                    1,
                    true)),
            StringComparison.Ordinal);

    [Fact]
    public void BuildWarnings_workers_comp_expired() =>
        Assert.Contains(
            "compensation expired",
            string.Join(
                " ",
                TechnicianCompliance.BuildWarnings(
                    Profile(
                        license: new DateOnly(2027, 1, 1),
                        coi: new DateOnly(2027, 1, 1),
                        wc: new DateOnly(2020, 1, 1)),
                    new DateOnly(2026, 1, 1),
                    1,
                    true)),
            StringComparison.OrdinalIgnoreCase);

    [Fact]
    public void BuildWarnings_workers_comp_expires_soon() =>
        Assert.Contains(
            "Workers' comp expires soon",
            string.Join(
                " ",
                TechnicianCompliance.BuildWarnings(
                    Profile(
                        license: new DateOnly(2027, 1, 1),
                        coi: new DateOnly(2027, 1, 1),
                        wc: new DateOnly(2026, 1, 25)),
                    new DateOnly(2026, 1, 1),
                    1,
                    true)),
            StringComparison.Ordinal);

    [Theory]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public void BuildWarnings_w9_and_background_check(bool w9, bool background)
    {
        var w = string.Join(" ", TechnicianCompliance.BuildWarnings(Profile(w9: w9, bg: background), new DateOnly(2026, 1, 1), 1, true));
        if (!w9) Assert.Contains("W-9", w, StringComparison.Ordinal);
        if (!background) Assert.Contains("Background check", w, StringComparison.Ordinal);
    }

    [Fact]
    public void GetAssignmentBlockReason_null_for_missing_profile() =>
        Assert.Null(TechnicianCompliance.GetAssignmentBlockReason(null, new DateOnly(2026, 1, 1)));

    [Fact]
    public void GetAssignmentBlockReason_null_when_nothing_expired() =>
        Assert.Null(
            TechnicianCompliance.GetAssignmentBlockReason(
                Profile(license: new DateOnly(2027, 1, 1), coi: new DateOnly(2027, 1, 1), wc: new DateOnly(2027, 1, 1)),
                new DateOnly(2026, 1, 1)));

    [Fact]
    public void ComplianceHealth_warn_when_coi_soon() =>
        Assert.Equal(
            "warn",
            TechnicianCompliance.ComplianceHealth(
                Profile(license: new DateOnly(2027, 1, 1), coi: new DateOnly(2026, 1, 15), wc: new DateOnly(2027, 1, 1)),
                new DateOnly(2026, 1, 1)));
}
