using PropertyManager.Api.Models;

namespace PropertyManager.Api.Services;

public interface IDataStore
{
    IReadOnlyList<User> Users { get; }
    IReadOnlyList<MaintenanceRequest> Requests { get; }
    IReadOnlyList<NotificationItem> Notifications { get; }
    IReadOnlyList<Bill> Bills { get; }
    IReadOnlyList<Building> Buildings { get; }
    MaintenanceRequest? GetRequestById(string id);
    bool IsTechnicianAssignedToMaintenance(MaintenanceRequest request, int technicianUserId, string? nameClaim);
    MaintenanceRequest AddRequest(int createdByUserId, string title, string description, string priority, string[]? photoUrls);
    bool MarkBillPaidIfExists(string billId, string? paymentMethod = null);
    bool TryAssignTechnician(string requestId, string assignedTechnician);
    string? GetTechnicianAssignmentBlockReason(string technicianName);
    bool TryUpdatePriority(string requestId, string priority);
    bool TryUpdateRequestStatus(string requestId, string status);
    bool TryApproveMaintenanceRequest(string requestId);
    bool TryDeclineMaintenanceRequest(string requestId, string? reason);
    bool TryCompleteMaintenanceWithoutCharge(string requestId);
    bool TrySetResidentFeedback(string requestId, int residentUserId, string? feedback);
    bool TrySetAdminResidentResponse(string requestId, string? message);
    bool TryTechnicianUpdateStatus(string requestId, int technicianUserId, string? technicianNameClaim, string status, string? completionNotes);
    bool TrySetTechnicianInvoice(string requestId, int technicianUserId, string? technicianNameClaim, TechnicianInvoiceSubmit submit);
    bool TryTechnicianUpdateSiteDetails(string requestId, int technicianUserId, string? technicianNameClaim, TechnicianSiteDetailsSubmit submit);

    bool TrySetTechnicianPayout(string requestId, TechnicianPayoutSubmit submit);
    Bill? TryCreateResidentBillForMaintenance(string requestId, decimal amount, string type, DateOnly dueDate);

    Bill? TryUpdateResidentBillDraft(string requestId, decimal amount, string type, DateOnly? dueDate);
    MaintenanceRequest? TrySendResidentBillNotification(string maintenanceRequestId);
    void ProcessBillDueReminders();
    bool TryMarkNotificationRead(int notificationId, int currentUserId, bool isAdmin);
    bool TryMarkNotificationUnread(int notificationId, int currentUserId, bool isAdmin);
    void MarkAllNotificationsRead(int currentUserId, bool isAdmin);
    int BroadcastAnnouncementToResidents(int? buildingId, string message);
    Building AddBuilding(string name, string address);
    Building? UpdateBuilding(int id, string name, string address);
    bool TryDeleteBuilding(int id);
}
