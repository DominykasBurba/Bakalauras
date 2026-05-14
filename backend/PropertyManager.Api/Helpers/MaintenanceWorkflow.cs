namespace PropertyManager.Api.Helpers;

public static class MaintenanceWorkflow
{
    public const string Requested = "Requested";
    public const string Registered = "Registered";
    public const string InProgress = "In Progress";
    public const string Solved = "Solved";
    public const string Unpaid = "Unpaid";
    public const string Completed = "Completed";
    public const string Declined = "Declined";

    public static readonly string[] AllStatuses =
    [
        Requested, Registered, InProgress, Solved, Unpaid, Completed, Declined,
    ];

    public static string? CanonicalStatus(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;
        var t = raw.Trim();
        foreach (var s in AllStatuses)
        {
            if (string.Equals(t, s, StringComparison.OrdinalIgnoreCase))
                return s;
        }

        return null;
    }

    public static bool IsTerminal(string status) =>
        string.Equals(status, Completed, StringComparison.OrdinalIgnoreCase) ||
        string.Equals(status, Declined, StringComparison.OrdinalIgnoreCase);

    public static bool ResidentCanSubmitPostWorkFeedback(string status)
    {
        if (string.IsNullOrWhiteSpace(status))
            return false;
        return MatchesAny(status, Solved, Unpaid, Completed);
    }

    public static bool AdminCanTransition(string from, string to)
    {
        if (string.Equals(from, to, StringComparison.OrdinalIgnoreCase))
            return true;
        return (from, to) switch
        {
            var (f, t) when string.Equals(f, Requested, StringComparison.OrdinalIgnoreCase) =>
                MatchesAny(t, Registered, Completed, Declined),
            var (f, t) when string.Equals(f, Registered, StringComparison.OrdinalIgnoreCase) =>
                MatchesAny(t, InProgress, Solved, Completed, Requested),
            var (f, t) when string.Equals(f, InProgress, StringComparison.OrdinalIgnoreCase) =>
                MatchesAny(t, Solved, Completed, Registered),
            var (f, t) when string.Equals(f, Solved, StringComparison.OrdinalIgnoreCase) =>
                MatchesAny(t, Unpaid, Completed, InProgress),
            var (f, t) when string.Equals(f, Unpaid, StringComparison.OrdinalIgnoreCase) =>
                MatchesAny(t, Completed),
            _ => false,
        };
    }

    private static bool MatchesAny(string t, params string[] options) =>
        options.Any(o => string.Equals(o, t, StringComparison.OrdinalIgnoreCase));
}
