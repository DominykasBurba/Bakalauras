using PropertyManager.Api.Helpers;
using Xunit;

namespace PropertyManager.Api.Tests;

public sealed class MaintenanceWorkflowTests
{
    [Theory]
    [InlineData("Requested", "Requested")]
    [InlineData("  requested  ", "Requested")]
    [InlineData("in progress", "In Progress")]
    [InlineData("IN PROGRESS", "In Progress")]
    public void CanonicalStatus_returns_canonical_for_known_status(string? raw, string? expected) =>
        Assert.Equal(expected, MaintenanceWorkflow.CanonicalStatus(raw));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    [InlineData("NotARealStatus")]
    public void CanonicalStatus_returns_null_for_invalid(string? raw) =>
        Assert.Null(MaintenanceWorkflow.CanonicalStatus(raw));

    [Theory]
    [InlineData("Completed", true)]
    [InlineData("completed", true)]
    [InlineData("Declined", true)]
    [InlineData("Requested", false)]
    [InlineData("In Progress", false)]
    public void IsTerminal(string status, bool expected) =>
        Assert.Equal(expected, MaintenanceWorkflow.IsTerminal(status));

    [Theory]
    [InlineData("Solved", true)]
    [InlineData("Unpaid", true)]
    [InlineData("Completed", true)]
    [InlineData("Requested", false)]
    [InlineData("In Progress", false)]
    [InlineData("", false)]
    public void ResidentCanSubmitPostWorkFeedback(string status, bool expected) =>
        Assert.Equal(expected, MaintenanceWorkflow.ResidentCanSubmitPostWorkFeedback(status));

    [Fact]
    public void AllStatuses_contain_expected_set()
    {
        var set = new HashSet<string>(MaintenanceWorkflow.AllStatuses, StringComparer.Ordinal);
        Assert.Contains(MaintenanceWorkflow.Requested, set);
        Assert.Contains(MaintenanceWorkflow.Declined, set);
        Assert.Equal(7, MaintenanceWorkflow.AllStatuses.Length);
    }

    [Theory]
    [InlineData("Requested", "Requested", true)]
    [InlineData("Requested", "Registered", true)]
    [InlineData("Requested", "In Progress", false)]
    [InlineData("Registered", "In Progress", true)]
    [InlineData("In Progress", "Solved", true)]
    [InlineData("Solved", "Unpaid", true)]
    [InlineData("Unpaid", "Completed", true)]
    [InlineData("Solved", "Requested", false)]
    [InlineData("Declined", "Requested", false)]
    [InlineData("In Progress", "Completed", true)]
    public void AdminCanTransition_respects_matrix(string from, string to, bool expected) =>
        Assert.Equal(expected, MaintenanceWorkflow.AdminCanTransition(from, to));
}
