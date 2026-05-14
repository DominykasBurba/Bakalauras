using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PropertyManager.Api.Controllers;
using PropertyManager.Api.Data;
using PropertyManager.Api.Helpers;
using PropertyManager.Api.Models;
using PropertyManager.Api.Models.Dtos;
using PropertyManager.Api.Security;
using Xunit;

namespace PropertyManager.Api.Tests.Integration;

[CollectionDefinition("Integration", DisableParallelization = true)]
public sealed class IntegrationCollection : ICollectionFixture<IntegrationScenarioFixture>;

public sealed class IntegrationScenarioFixture : IAsyncLifetime
{
    private readonly string _connectionString =
        Environment.GetEnvironmentVariable("PROPERTY_MANAGER_INTEGRATION_CONNECTION")?.Trim()
        ?? "Host=127.0.0.1;Port=5432;Database=property_manager_integration;Username=postgres;Password=mysecretpassword;SSL Mode=Disable";

    public WebApplicationFactory<Program> Factory { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        Factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting(WebHostDefaults.EnvironmentKey, "Testing");
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] = _connectionString,
                });
            });
        });

        try
        {
            await ResetDatabaseAsync();
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException(
                "Integration tests require PostgreSQL. Set PROPERTY_MANAGER_INTEGRATION_CONNECTION or create database " +
                "'property_manager_integration' (or match your connection string). See PropertyManager.Api.Tests.csproj comment.",
                ex);
        }
    }

    public async Task ResetDatabaseAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();
    }

    public async Task DisposeAsync() => await Factory.DisposeAsync();
}

[Collection("Integration")]
[Trait("Category", "Integration")]
public sealed class IntegrationTests : IAsyncLifetime
{
    private const string Password = "Password123!";

    private readonly IntegrationScenarioFixture _fixture;
    private HttpClient _client = null!;

    public IntegrationTests(IntegrationScenarioFixture fixture) => _fixture = fixture;

    public async Task InitializeAsync()
    {
        await _fixture.ResetDatabaseAsync();
        _client = _fixture.Factory.CreateClient();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<T> ReadAsync<T>(HttpResponseMessage response)
    {
        response.EnsureSuccessStatusCode();
        var data = await response.Content.ReadFromJsonAsync<T>();
        Assert.NotNull(data);
        return data;
    }

    private async Task<string> LoginAsync(string email, string roleAssert)
    {
        var res = await _client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest { Email = email, Password = Password });
        var body = await ReadAsync<JsonElement>(res);
        Assert.Equal(roleAssert, body.GetProperty("role").GetString());
        var token = body.GetProperty("token").GetString();
        Assert.False(string.IsNullOrEmpty(token));
        return token!;
    }

    private void SetBearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = AuthenticationHeaderValue.Parse($"Bearer {token}");

    private async Task<SeedData> SeedStandardWorldAsync()
    {
        using var scope = _fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var building = new BuildingEntity
        {
            Name = "Integration Tower",
            Address = "100 Test St",
            TotalUnits = 20,
            OccupiedUnits = 0,
            ResidentsCount = 0,
            OpenRequests = 0,
        };
        db.Buildings.Add(building);
        await db.SaveChangesAsync();

        var admin = new UserEntity
        {
            Name = "Admin User",
            Email = "admin@test.local",
            Password = PasswordHashing.Hash(Password),
            Role = "Admin",
            Unit = "",
            BuildingId = building.Id,
        };
        var resident = new UserEntity
        {
            Name = "Resident User",
            Email = "resident@test.local",
            Password = PasswordHashing.Hash(Password),
            Role = "Resident",
            Unit = "",
            BuildingId = building.Id,
            ProfileStatus = ResidentProfileStatus.Approved,
        };
        var tech = new UserEntity
        {
            Name = "Tech Pro",
            Email = "tech@test.local",
            Password = PasswordHashing.Hash(Password),
            Role = "Technician",
            Unit = "",
        };
        db.Users.AddRange(admin, resident, tech);
        await db.SaveChangesAsync();

        var unit = new UnitEntity
        {
            BuildingId = building.Id,
            UnitCode = "101",
            Floor = "1",
            PhotoUrlsJson = "[]",
        };
        db.Units.Add(unit);
        await db.SaveChangesAsync();

        resident.BuildingId = building.Id;
        resident.UnitId = unit.Id;
        resident.Unit = $"{building.Name}, Unit {unit.UnitCode}";
        await db.SaveChangesAsync();

        var catalog = new ServiceCatalogItemEntity
        {
            Name = "Plumbing",
            Description = "Pipe work",
            SortOrder = 1,
            CreatedAt = DateTime.UtcNow,
        };
        db.ServiceCatalogItems.Add(catalog);
        await db.SaveChangesAsync();

        db.TechnicianServiceCatalogLinks.Add(new TechnicianServiceCatalogLinkEntity
        {
            UserId = tech.Id,
            CatalogItemId = catalog.Id,
        });

        var profile = new TechnicianProfileEntity
        {
            UserId = tech.Id,
            CompanyName = "Pro Co",
            LicenseExpiry = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
            CoiExpiry = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
            WorkersCompExpiry = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
            W9OnFile = true,
            BackgroundCheckOnFile = true,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        db.TechnicianProfiles.Add(profile);
        await db.SaveChangesAsync();

        return new SeedData(admin.Id, resident.Id, tech.Id, building.Id, unit.Id, catalog.Id);
    }

    private sealed record SeedData(int AdminId, int ResidentId, int TechId, int BuildingId, int UnitId, int CatalogId);

    [Fact]
    public async Task Auth_login_session_and_change_password_roundtrip()
    {
        await SeedStandardWorldAsync();
        var token = await LoginAsync("admin@test.local", "Admin");
        SetBearer(token);

        var session = await ReadAsync<SessionResponse>(await _client.GetAsync("/api/auth/session"));
        Assert.Equal("admin@test.local", session.Email);

        var change = await _client.PutAsJsonAsync(
            "/api/auth/password",
            new ChangePasswordRequest { CurrentPassword = Password, NewPassword = "Password999!" });
        Assert.Equal(HttpStatusCode.NoContent, change.StatusCode);

        _client.DefaultRequestHeaders.Authorization = null;
        var oldLogin = await _client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest { Email = "admin@test.local", Password = Password });
        Assert.Equal(HttpStatusCode.Unauthorized, oldLogin.StatusCode);

        var okNew = await _client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest { Email = "admin@test.local", Password = "Password999!" });
        Assert.Equal(HttpStatusCode.OK, okNew.StatusCode);
    }

    [Fact]
    public async Task Auth_login_rejects_invalid_body()
    {
        var res = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = "", Password = "" });
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Buildings_crud_and_dashboard_summary_notifications()
    {
        await SeedStandardWorldAsync();
        var token = await LoginAsync("admin@test.local", "Admin");
        SetBearer(token);

        var listStart = await ReadAsync<JsonElement>(await _client.GetAsync("/api/buildings"));
        Assert.Equal(1, listStart.GetArrayLength());

        var create = await _client.PostAsJsonAsync(
            "/api/buildings",
            new BuildingWriteRequest { Name = "Beta", Address = "2 Ave" });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);

        var buildingId = (await ReadAsync<JsonElement>(create)).GetProperty("id").GetInt32();

        var summary = await ReadAsync<DashboardDto>(
            await _client.GetAsync("/api/dashboard/summary?buildingId=" + buildingId));
        Assert.True(summary.OpenRequests >= 0);

        var notifications = await ReadAsync<JsonElement>(await _client.GetAsync("/api/dashboard/notifications"));
        Assert.True(notifications.GetArrayLength() >= 0);

        var put = await _client.PutAsJsonAsync(
            $"/api/buildings/{buildingId}",
            new BuildingWriteRequest { Name = "Beta II", Address = "2B Ave" });
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);

        var del = await _client.DeleteAsync($"/api/buildings/{buildingId}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
    }

    [Fact]
    public async Task Dashboard_notification_mark_read_unread_and_read_all()
    {
        var s = await SeedStandardWorldAsync();
        using (var scope = _fixture.Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Notifications.Add(new NotificationEntity
            {
                UserId = s.AdminId,
                Message = "Line 1",
                RelativeTime = "now",
                IsRead = false,
                Category = "Test",
            });
            await db.SaveChangesAsync();
        }

        var token = await LoginAsync("admin@test.local", "Admin");
        SetBearer(token);

        var notes = await ReadAsync<JsonElement>(await _client.GetAsync("/api/dashboard/notifications"));
        var id = notes[0].GetProperty("id").GetInt32();

        Assert.Equal(HttpStatusCode.NoContent,
            (await _client.PatchAsync($"/api/dashboard/notifications/{id}/read", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,
            (await _client.PatchAsync($"/api/dashboard/notifications/{id}/unread", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,
            (await _client.PostAsync("/api/dashboard/notifications/read-all", null)).StatusCode);
    }

    [Fact]
    public async Task Property_overview_admin_and_not_found()
    {
        var s = await SeedStandardWorldAsync();
        var token = await LoginAsync("admin@test.local", "Admin");
        SetBearer(token);

        var ok = await _client.GetAsync("/api/dashboard/property-overview?buildingId=" + s.BuildingId);
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);

        var allBuildingsOverview = await _client.GetAsync("/api/dashboard/property-overview");
        Assert.Equal(HttpStatusCode.OK, allBuildingsOverview.StatusCode);

        var missing = await _client.GetAsync("/api/dashboard/property-overview?buildingId=99999");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Fact]
    public async Task Resident_can_create_maintenance_request()
    {
        await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var created = await _client.PostAsJsonAsync(
            "/api/maintenancerequests",
            new CreateMaintenanceRequest { Title = "Leak", Description = "Kitchen sink", Priority = "Medium" });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var reqId = (await ReadAsync<JsonElement>(created)).GetProperty("id").GetString();
        Assert.False(string.IsNullOrWhiteSpace(reqId));
    }

    [Fact]
    public async Task Resident_can_view_own_maintenance_requests()
    {
        await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var created = await _client.PostAsJsonAsync(
            "/api/maintenancerequests",
            new CreateMaintenanceRequest { Title = "Leak", Description = "Kitchen sink", Priority = "Medium" });
        var reqId = (await ReadAsync<JsonElement>(created)).GetProperty("id").GetString()!;
        var mine = await ReadAsync<JsonElement>(await _client.GetAsync("/api/maintenancerequests"));
        Assert.True(mine.GetArrayLength() >= 1);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync($"/api/maintenancerequests/{reqId}")).StatusCode);
    }

    [Fact]
    public async Task Admin_can_approve_request_and_assign_technician()
    {
        await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var created = await _client.PostAsJsonAsync(
            "/api/maintenancerequests",
            new CreateMaintenanceRequest { Title = "Leak", Description = "Kitchen sink", Priority = "Medium" });
        var reqId = (await ReadAsync<JsonElement>(created)).GetProperty("id").GetString()!;

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        Assert.Equal(HttpStatusCode.OK, (await _client.PostAsync($"/api/maintenancerequests/{reqId}/approve", null)).StatusCode);
        Assert.Equal(
            HttpStatusCode.OK,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/technician",
                new AssignTechnicianRequest { AssignedTechnician = "Tech Pro" })).StatusCode);
    }

    [Fact]
    public async Task Admin_can_update_priority_and_status_after_approval()
    {
        await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var created = await _client.PostAsJsonAsync(
            "/api/maintenancerequests",
            new CreateMaintenanceRequest { Title = "Leak", Description = "Kitchen sink", Priority = "Medium" });
        var reqId = (await ReadAsync<JsonElement>(created)).GetProperty("id").GetString()!;

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        await _client.PostAsync($"/api/maintenancerequests/{reqId}/approve", null);
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician",
            new AssignTechnicianRequest { AssignedTechnician = "Tech Pro" });

        Assert.Equal(
            HttpStatusCode.OK,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/priority",
                new UpdatePriorityRequest { Priority = "High" })).StatusCode);
        Assert.Equal(
            HttpStatusCode.OK,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/status",
                new UpdateStatusRequest { Status = "In Progress" })).StatusCode);
    }

    [Fact]
    public async Task Technician_can_submit_invoice_and_site_update()
    {
        await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var created = await _client.PostAsJsonAsync(
            "/api/maintenancerequests",
            new CreateMaintenanceRequest { Title = "Leak", Description = "Kitchen sink", Priority = "Medium" });
        var reqId = (await ReadAsync<JsonElement>(created)).GetProperty("id").GetString()!;

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        await _client.PostAsync($"/api/maintenancerequests/{reqId}/approve", null);
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician",
            new AssignTechnicianRequest { AssignedTechnician = "Tech Pro" });
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/status",
            new UpdateStatusRequest { Status = "In Progress" });

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("tech@test.local", "Technician"));
        Assert.Equal(
            HttpStatusCode.OK,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/technician-invoice",
                new TechnicianInvoiceRequest { InvoiceUrl = "https://example.com/inv.pdf", Amount = 120m })).StatusCode);
        Assert.Equal(
            HttpStatusCode.OK,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/technician-site-details",
                new TechnicianSiteDetailsRequest
                {
                    SiteUpdate = "On site",
                    MaterialsUsed = "Tape",
                    ExpectedReturnDate = "",
                    OfficeNotes = "",
                })).StatusCode);
    }

    [Fact]
    public async Task Technician_can_mark_request_solved()
    {
        await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var created = await _client.PostAsJsonAsync(
            "/api/maintenancerequests",
            new CreateMaintenanceRequest { Title = "Leak", Description = "Kitchen sink", Priority = "Medium" });
        var reqId = (await ReadAsync<JsonElement>(created)).GetProperty("id").GetString()!;

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        await _client.PostAsync($"/api/maintenancerequests/{reqId}/approve", null);
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician",
            new AssignTechnicianRequest { AssignedTechnician = "Tech Pro" });
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/status",
            new UpdateStatusRequest { Status = "In Progress" });

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("tech@test.local", "Technician"));
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician-invoice",
            new TechnicianInvoiceRequest { InvoiceUrl = "https://example.com/inv.pdf", Amount = 120m });
        Assert.Equal(
            HttpStatusCode.OK,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/technician-status",
                new TechnicianStatusRequest { Status = "Solved", CompletionNotes = "Done" })).StatusCode);
    }

    [Fact]
    public async Task Admin_can_manage_resident_charge_and_technician_payout()
    {
        await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var created = await _client.PostAsJsonAsync(
            "/api/maintenancerequests",
            new CreateMaintenanceRequest { Title = "Leak", Description = "Kitchen sink", Priority = "Medium" });
        var reqId = (await ReadAsync<JsonElement>(created)).GetProperty("id").GetString()!;

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        await _client.PostAsync($"/api/maintenancerequests/{reqId}/approve", null);
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician",
            new AssignTechnicianRequest { AssignedTechnician = "Tech Pro" });
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/status",
            new UpdateStatusRequest { Status = "In Progress" });

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("tech@test.local", "Technician"));
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician-invoice",
            new TechnicianInvoiceRequest { InvoiceUrl = "https://example.com/inv.pdf", Amount = 120m });
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician-status",
            new TechnicianStatusRequest { Status = "Solved", CompletionNotes = "Done" });

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        Assert.Equal(
            HttpStatusCode.OK,
            (await _client.PostAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/resident-charge",
                new ResidentChargeRequest
                {
                    Amount = 55m,
                    Type = "Repair",
                    DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)),
                })).StatusCode);
        Assert.Equal(
            HttpStatusCode.OK,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/resident-charge",
                new ResidentChargeRequest { Amount = 60m })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.PostAsync($"/api/maintenancerequests/{reqId}/resident-charge/send", null)).StatusCode);
        Assert.Equal(
            HttpStatusCode.OK,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/technician-payout",
                new TechnicianPayoutRequest { Status = "Approved", ApprovedAmount = 100m })).StatusCode);
    }

    [Fact]
    public async Task Resident_can_submit_feedback_after_work_is_solved()
    {
        await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var created = await _client.PostAsJsonAsync(
            "/api/maintenancerequests",
            new CreateMaintenanceRequest { Title = "Leak", Description = "Kitchen sink", Priority = "Medium" });
        var reqId = (await ReadAsync<JsonElement>(created)).GetProperty("id").GetString()!;

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        await _client.PostAsync($"/api/maintenancerequests/{reqId}/approve", null);
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician",
            new AssignTechnicianRequest { AssignedTechnician = "Tech Pro" });
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/status",
            new UpdateStatusRequest { Status = "In Progress" });

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("tech@test.local", "Technician"));
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician-invoice",
            new TechnicianInvoiceRequest { InvoiceUrl = "https://example.com/inv.pdf", Amount = 120m });
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician-status",
            new TechnicianStatusRequest { Status = "Solved", CompletionNotes = "Done" });

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/billing")).StatusCode);
        Assert.Equal(
            HttpStatusCode.OK,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/resident-feedback",
                new ResidentFeedbackRequest { Feedback = "Great" })).StatusCode);
    }

    [Fact]
    public async Task Maintenance_happy_path_full_flow_resident_admin_and_technician()
    {
        await SeedStandardWorldAsync();
        var rToken = await LoginAsync("resident@test.local", "Resident");
        SetBearer(rToken);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/dashboard/summary")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/dashboard/notifications")).StatusCode);
        var created = await _client.PostAsJsonAsync(
            "/api/maintenancerequests",
            new CreateMaintenanceRequest { Title = "Leak", Description = "Kitchen sink", Priority = "Medium" });
        var reqId = (await ReadAsync<JsonElement>(created)).GetProperty("id").GetString()!;

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/maintenancerequests")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync($"/api/maintenancerequests/{reqId}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.PostAsync($"/api/maintenancerequests/{reqId}/approve", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician",
            new AssignTechnicianRequest { AssignedTechnician = "Tech Pro" })).StatusCode);

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("tech@test.local", "Technician"));
        Assert.Equal(HttpStatusCode.OK, (await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician-invoice",
            new TechnicianInvoiceRequest { InvoiceUrl = "https://example.com/inv.pdf", Amount = 120m })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician-status",
            new TechnicianStatusRequest { Status = "Solved", CompletionNotes = "Done" })).StatusCode);

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var bills = await ReadAsync<JsonElement>(await _client.GetAsync("/api/billing"));
        Assert.True(bills.GetArrayLength() >= 0);
    }

    [Fact]
    public async Task Maintenance_decline_complete_without_charge_and_bad_requests()
    {
        var s = await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var created = await _client.PostAsJsonAsync(
            "/api/maintenancerequests",
            new CreateMaintenanceRequest { Title = "X", Description = "Y", Priority = "Low" });
        var reqId = (await ReadAsync<JsonElement>(created)).GetProperty("id").GetString()!;

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));

        var decline = await _client.PostAsJsonAsync($"/api/maintenancerequests/{reqId}/decline", new DeclineMaintenanceRequestBody { Reason = "No capacity" });
        Assert.Equal(HttpStatusCode.OK, decline.StatusCode);

        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var created2 = await _client.PostAsJsonAsync(
            "/api/maintenancerequests",
            new CreateMaintenanceRequest { Title = "Z", Description = "W", Priority = "Low" });
        var id2 = (await ReadAsync<JsonElement>(created2)).GetProperty("id").GetString()!;

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        await _client.PostAsync($"/api/maintenancerequests/{id2}/approve", null);
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{id2}/technician",
            new AssignTechnicianRequest { AssignedTechnician = "Tech Pro" });
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{id2}/status",
            new UpdateStatusRequest { Status = "In Progress" });

        SetBearer(await LoginAsync("tech@test.local", "Technician"));
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{id2}/technician-invoice",
            new TechnicianInvoiceRequest { InvoiceUrl = "https://example.com/a.pdf" });
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{id2}/technician-status",
            new TechnicianStatusRequest { Status = "Solved", CompletionNotes = "ok" });

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        var noBill = await _client.PostAsync($"/api/maintenancerequests/{id2}/complete-without-charge", null);
        Assert.Equal(HttpStatusCode.OK, noBill.StatusCode);

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("tech@test.local", "Technician"));
        var badInv = await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{id2}/technician-invoice",
            new TechnicianInvoiceRequest { InvoiceUrl = "not-a-url" });
        Assert.Equal(HttpStatusCode.BadRequest, badInv.StatusCode);
    }

    [Fact]
    public async Task Billing_stripe_paths_and_webhook_without_config()
    {
        await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("resident@test.local", "Resident"));

        var checkout = await _client.PostAsJsonAsync(
            "/api/billing/checkout-session",
            new CreateCheckoutSessionRequest { BillId = "nope" });
        Assert.Equal(HttpStatusCode.ServiceUnavailable, checkout.StatusCode);

        var verify = await _client.PostAsJsonAsync(
            "/api/billing/verify-session",
            new VerifyCheckoutSessionRequest { SessionId = "ses_test" });
        Assert.Equal(HttpStatusCode.ServiceUnavailable, verify.StatusCode);

        _client.DefaultRequestHeaders.Authorization = null;
        var webhook = await _client.PostAsync("/api/billing/webhook", new StringContent("{}", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.ServiceUnavailable, webhook.StatusCode);

        var adminTok = await LoginAsync("admin@test.local", "Admin");
        SetBearer(adminTok);
        var adminBill = await _client.GetAsync("/api/billing");
        Assert.Equal(HttpStatusCode.Forbidden, adminBill.StatusCode);
    }

    [Fact]
    public async Task Scheduled_maintenance_resident_and_admin_crud()
    {
        var s = await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("admin@test.local", "Admin"));

        var create = await _client.PostAsJsonAsync(
            "/api/admin/scheduled-maintenance",
            new CreateScheduledMaintenanceRequest
            {
                BuildingId = s.BuildingId,
                Title = "Roof",
                ScheduledDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3)),
                TimeWindow = "AM",
            });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var id = (await ReadAsync<JsonElement>(create)).GetProperty("id").GetInt32();

        var adminList = await _client.GetAsync("/api/admin/scheduled-maintenance?buildingId=" + s.BuildingId);
        Assert.Equal(HttpStatusCode.OK, adminList.StatusCode);

        var put = await _client.PutAsJsonAsync(
            $"/api/admin/scheduled-maintenance/{id}",
            new CreateScheduledMaintenanceRequest
            {
                BuildingId = s.BuildingId,
                Title = "Roof work",
                ScheduledDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(4)),
            });
        Assert.Equal(HttpStatusCode.NoContent, put.StatusCode);

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var mine = await _client.GetAsync("/api/scheduled-maintenance");
        Assert.Equal(HttpStatusCode.OK, mine.StatusCode);

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        var del = await _client.DeleteAsync($"/api/admin/scheduled-maintenance/{id}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);

        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        var bad = await _client.PostAsJsonAsync(
            "/api/admin/scheduled-maintenance",
            new CreateScheduledMaintenanceRequest { BuildingId = s.BuildingId, Title = "", ScheduledDate = default });
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
    }

    [Fact]
    public async Task Resident_scheduled_maintenance_forbidden_for_admin_route_message()
    {
        await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        var res = await _client.GetAsync("/api/scheduled-maintenance");
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Building_units_and_unit_detail_and_images()
    {
        var s = await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("admin@test.local", "Admin"));

        var list = await _client.GetAsync($"/api/buildings/{s.BuildingId}/units");
        Assert.Equal(HttpStatusCode.OK, list.StatusCode);

        var seedUnitDetail = await _client.GetAsync($"/api/units/{s.UnitId}");
        Assert.Equal(HttpStatusCode.OK, seedUnitDetail.StatusCode);

        var postUnit = await _client.PostAsJsonAsync(
            $"/api/buildings/{s.BuildingId}/units",
            new UnitWriteRequest { UnitCode = "202", Floor = "2", PhotoUrls = [] });
        Assert.Equal(HttpStatusCode.Created, postUnit.StatusCode);
        var newUnitId = (await ReadAsync<JsonElement>(postUnit)).GetProperty("id").GetInt32();

        var unitGet = await _client.GetAsync($"/api/units/{newUnitId}");
        Assert.Equal(HttpStatusCode.OK, unitGet.StatusCode);

        var unitPut = await _client.PutAsJsonAsync(
            $"/api/units/{newUnitId}",
            new UnitWriteRequest { UnitCode = "202b", Floor = "2", PhotoUrls = ["https://x.test/a.png"] });
        Assert.Equal(HttpStatusCode.OK, unitPut.StatusCode);

        var img = await _client.PostAsJsonAsync(
            $"/api/buildings/{s.BuildingId}/images",
            new BuildingImageWriteRequest { ImageUrl = "https://x.test/b.png", SortOrder = 0 });
        Assert.Equal(HttpStatusCode.Created, img.StatusCode);
        var imgId = (await ReadAsync<JsonElement>(img)).GetProperty("id").GetInt32();

        var imgDel = await _client.DeleteAsync($"/api/building-images/{imgId}");
        Assert.Equal(HttpStatusCode.NoContent, imgDel.StatusCode);

        var delUnit = await _client.DeleteAsync($"/api/units/{newUnitId}");
        Assert.Equal(HttpStatusCode.NoContent, delUnit.StatusCode);
    }

    [Fact]
    public async Task Integration_unit_detail_not_found_validation_duplicate_code_and_delete_occupied_conflict()
    {
        var s = await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("admin@test.local", "Admin"));

        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/api/units/999999")).StatusCode);

        Assert.Equal(
            HttpStatusCode.NotFound,
            (await _client.PutAsJsonAsync(
                "/api/units/999999",
                new UnitWriteRequest { UnitCode = "x", Floor = "1" })).StatusCode);

        Assert.Equal(
            HttpStatusCode.BadRequest,
            (await _client.PutAsJsonAsync(
                $"/api/units/{s.UnitId}",
                new UnitWriteRequest { UnitCode = "   ", Floor = "1" })).StatusCode);

        var extra = await _client.PostAsJsonAsync(
            $"/api/buildings/{s.BuildingId}/units",
            new UnitWriteRequest { UnitCode = "extra-u", Floor = "2" });
        Assert.Equal(HttpStatusCode.Created, extra.StatusCode);
        var extraId = (await ReadAsync<JsonElement>(extra)).GetProperty("id").GetInt32();

        Assert.Equal(
            HttpStatusCode.Conflict,
            (await _client.PutAsJsonAsync(
                $"/api/units/{extraId}",
                new UnitWriteRequest { UnitCode = "101", Floor = "2" })).StatusCode);

        var assignBody = new AssignOccupancyRequest
        {
            UserId = s.ResidentId,
            StartedAt = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-5)),
            LeaseEndDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(200)),
        };
        Assert.Equal(HttpStatusCode.OK, (await _client.PostAsJsonAsync($"/api/units/{s.UnitId}/occupancies", assignBody)).StatusCode);

        Assert.Equal(HttpStatusCode.Conflict, (await _client.DeleteAsync($"/api/units/{s.UnitId}")).StatusCode);

        await _client.DeleteAsync($"/api/units/{extraId}");
    }

    [Fact]
    public async Task Occupancies_list_assign_and_end()
    {
        var s = await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("admin@test.local", "Admin"));

        var occ = await _client.GetAsync("/api/occupancies");
        Assert.Equal(HttpStatusCode.OK, occ.StatusCode);

        var assignBody = new AssignOccupancyRequest
        {
            UserId = s.ResidentId,
            StartedAt = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30)),
            LeaseEndDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(300)),
        };
        var assignRes = await _client.PostAsJsonAsync($"/api/units/{s.UnitId}/occupancies", assignBody);
        Assert.Equal(HttpStatusCode.OK, assignRes.StatusCode);
        var occId = (await ReadAsync<JsonElement>(assignRes)).GetProperty("id").GetInt32();

        var endRes = await _client.PostAsJsonAsync($"/api/occupancies/{occId}/end", new EndOccupancyRequest());
        Assert.Equal(HttpStatusCode.OK, endRes.StatusCode);
    }

    [Fact]
    public async Task Admin_can_list_residents_occupants_and_catalog()
    {
        var s = await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/admin/service-catalog")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/admin/residents")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/admin/residents?buildingId=" + s.BuildingId)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/admin/occupants?name=Resident")).StatusCode);
    }

    [Fact]
    public async Task Admin_can_create_and_get_occupant()
    {
        var s = await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        var createOcc = await _client.PostAsJsonAsync(
            "/api/admin/occupants",
            new CreateOccupantRequest
            {
                Email = "newres@test.local",
                Name = "New Res",
                Password = Password,
                BuildingId = s.BuildingId,
            });
        Assert.Equal(HttpStatusCode.Created, createOcc.StatusCode);
        var newId = (await ReadAsync<JsonElement>(createOcc)).GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync($"/api/admin/occupants/{newId}")).StatusCode);
    }

    [Fact]
    public async Task Admin_can_approve_and_decline_pending_occupant()
    {
        var s = await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        var createOcc = await _client.PostAsJsonAsync(
            "/api/admin/occupants",
            new CreateOccupantRequest
            {
                Email = "pending-newres@test.local",
                Name = "New Res",
                Password = Password,
                BuildingId = s.BuildingId,
            });
        var newId = (await ReadAsync<JsonElement>(createOcc)).GetProperty("id").GetInt32();

        using (var scope = _fixture.Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var u = await db.Users.FirstAsync(x => x.Id == newId);
            u.ProfileStatus = ResidentProfileStatus.PendingReview;
            await db.SaveChangesAsync();
        }

        Assert.Equal(HttpStatusCode.OK, (await _client.PostAsync($"/api/admin/occupants/{newId}/approve", null)).StatusCode);

        using (var scope = _fixture.Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var u2 = await db.Users.FirstAsync(x => x.Id == newId);
            u2.ProfileStatus = ResidentProfileStatus.PendingReview;
            await db.SaveChangesAsync();
        }

        Assert.Equal(
            HttpStatusCode.OK,
            (await _client.PostAsJsonAsync(
                $"/api/admin/occupants/{newId}/decline",
                new DeclineOccupantRequest { Comment = "Incomplete docs" })).StatusCode);
    }

    [Fact]
    public async Task Admin_can_crud_service_catalog_item()
    {
        await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        var cat = await _client.PostAsJsonAsync(
            "/api/admin/service-catalog",
            new ServiceCatalogWriteRequest("Electrical", "Wiring", 2));
        var catId = (await ReadAsync<JsonElement>(cat)).GetProperty("id").GetInt32();
        Assert.Equal(
            HttpStatusCode.OK,
            (await _client.PutAsJsonAsync(
                $"/api/admin/service-catalog/{catId}",
                new ServiceCatalogWriteRequest("Electrical+", "Wiring+", 3))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync($"/api/admin/service-catalog/{catId}")).StatusCode);
    }

    [Fact]
    public async Task Technician_can_submit_and_list_offered_services()
    {
        await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("tech@test.local", "Technician"));
        var offer = await _client.PostAsJsonAsync(
            "/api/technician/offered-services",
            new OfferedServiceWriteRequest("Leak fix", "Details", 1));
        Assert.Equal(HttpStatusCode.Created, offer.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/technician/offered-services")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/technician/service-catalog")).StatusCode);
    }

    [Fact]
    public async Task Admin_can_approve_and_reject_technician_offered_services()
    {
        var s = await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("tech@test.local", "Technician"));
        var offer = await _client.PostAsJsonAsync(
            "/api/technician/offered-services",
            new OfferedServiceWriteRequest("Leak fix", "Details", 1));
        var offerId = (await ReadAsync<JsonElement>(offer)).GetProperty("id").GetInt32();
        var offerReject = await _client.PostAsJsonAsync(
            "/api/technician/offered-services",
            new OfferedServiceWriteRequest("Temp", "", 0));
        var rejectId = (await ReadAsync<JsonElement>(offerReject)).GetProperty("id").GetInt32();

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/admin/offered-services/pending-review")).StatusCode);
        Assert.Equal(
            HttpStatusCode.OK,
            (await _client.PutAsJsonAsync(
                $"/api/admin/technicians/{s.TechId}/offered-services/{offerId}/review",
                new OfferedServiceAdminReviewRequest("approve", s.CatalogId, null))).StatusCode);
        Assert.Equal(
            HttpStatusCode.OK,
            (await _client.PutAsJsonAsync(
                $"/api/admin/technicians/{s.TechId}/offered-services/{rejectId}/review",
                new OfferedServiceAdminReviewRequest("reject", null, "bad fit"))).StatusCode);
    }

    [Fact]
    public async Task Admin_can_query_technician_directory_and_assignment_context()
    {
        var s = await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/admin/technicians")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/admin/technicians/names?catalogItemId=" + s.CatalogId)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync($"/api/admin/technicians/{s.TechId}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/admin/technicians/assignment-context?name=Tech%20Pro")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/admin/technicians/assignment-context")).StatusCode);
    }

    [Fact]
    public async Task Admin_can_update_technician_catalog_services_and_profile()
    {
        var s = await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        var cat = await _client.PostAsJsonAsync(
            "/api/admin/service-catalog",
            new ServiceCatalogWriteRequest("Electrical", "Wiring", 2));
        var catId = (await ReadAsync<JsonElement>(cat)).GetProperty("id").GetInt32();

        Assert.Equal(
            HttpStatusCode.NoContent,
            (await _client.PutAsJsonAsync(
                $"/api/admin/technicians/{s.TechId}/catalog-services",
                new TechnicianCatalogServicesWriteRequest([s.CatalogId, catId]))).StatusCode);
        Assert.Equal(
            HttpStatusCode.NoContent,
            (await _client.PutAsJsonAsync(
                $"/api/admin/technicians/{s.TechId}/catalog-services",
                new TechnicianCatalogServicesWriteRequest([s.CatalogId]))).StatusCode);
        Assert.Equal(
            HttpStatusCode.OK,
            (await _client.PutAsJsonAsync(
                $"/api/admin/technicians/{s.TechId}/profile",
                new TechnicianProfileWriteRequest(
                    "Co", "GC", "L1",
                    DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
                    DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
                    DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
                    true, true, false, false,
                    "b@co.test", null, null, null, null, null))).StatusCode);
    }

    [Fact]
    public async Task Admin_offered_service_review_rejects_invalid_decision()
    {
        var s = await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("tech@test.local", "Technician"));
        var offerBad = await _client.PostAsJsonAsync(
            "/api/technician/offered-services",
            new OfferedServiceWriteRequest("Edge", "e", 0));
        var offerBadId = (await ReadAsync<JsonElement>(offerBad)).GetProperty("id").GetInt32();
        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (await _client.PutAsJsonAsync(
                $"/api/admin/technicians/{s.TechId}/offered-services/{offerBadId}/review",
                new OfferedServiceAdminReviewRequest("maybe", null, null))).StatusCode);
    }

    [Fact]
    public async Task Admin_notifications_broadcast()
    {
        var s = await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("admin@test.local", "Admin"));

        var all = await _client.PostAsJsonAsync(
            "/api/admin/notifications/broadcast",
            new BroadcastNotificationRequest { Message = "Hello all" });
        Assert.Equal(HttpStatusCode.OK, all.StatusCode);

        var scoped = await _client.PostAsJsonAsync(
            "/api/admin/notifications/broadcast",
            new BroadcastNotificationRequest { Message = "Hello building", BuildingId = s.BuildingId });
        Assert.Equal(HttpStatusCode.OK, scoped.StatusCode);

        var empty = await _client.PostAsJsonAsync(
            "/api/admin/notifications/broadcast",
            new BroadcastNotificationRequest { Message = "   " });
        Assert.Equal(HttpStatusCode.BadRequest, empty.StatusCode);

        var badBuilding = await _client.PostAsJsonAsync(
            "/api/admin/notifications/broadcast",
            new BroadcastNotificationRequest { Message = "x", BuildingId = 99999 });
        Assert.Equal(HttpStatusCode.NotFound, badBuilding.StatusCode);
    }

    [Fact]
    public async Task Resident_profile_get_and_submit()
    {
        using var scope = _fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var building = new BuildingEntity
        {
            Name = "Solo",
            Address = "1",
            TotalUnits = 1,
            OccupiedUnits = 0,
            ResidentsCount = 0,
            OpenRequests = 0,
        };
        db.Buildings.Add(building);
        await db.SaveChangesAsync();
        var user = new UserEntity
        {
            Name = "Solo Res",
            Email = "solo@test.local",
            Password = PasswordHashing.Hash(Password),
            Role = "Resident",
            Unit = "",
            BuildingId = building.Id,
            ProfileStatus = ResidentProfileStatus.PendingProfile,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var token = await LoginAsync("solo@test.local", "Resident");
        SetBearer(token);

        var get = await _client.GetAsync("/api/resident/profile");
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);

        var put = await _client.PutAsJsonAsync(
            "/api/resident/profile",
            new ResidentProfileWriteRequest
            {
                Phone = "555",
                EmergencyContactName = "E",
                EmergencyContactPhone = "444",
                AboutMe = "Hi",
            });
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);
    }

    [Fact]
    public async Task Maintenance_admin_resident_response_branch()
    {
        var s = await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var created = await _client.PostAsJsonAsync(
            "/api/maintenancerequests",
            new CreateMaintenanceRequest { Title = "A", Description = "B", Priority = "Low" });
        var reqId = (await ReadAsync<JsonElement>(created)).GetProperty("id").GetString()!;
        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        await _client.PostAsync($"/api/maintenancerequests/{reqId}/approve", null);
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician",
            new AssignTechnicianRequest { AssignedTechnician = "Tech Pro" });
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/status",
            new UpdateStatusRequest { Status = "In Progress" });

        SetBearer(await LoginAsync("tech@test.local", "Technician"));
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician-invoice",
            new TechnicianInvoiceRequest { InvoiceUrl = "https://example.com/z.pdf" });
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician-status",
            new TechnicianStatusRequest { Status = "Solved", CompletionNotes = "x" });

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/resident-feedback",
            new ResidentFeedbackRequest { Feedback = "Thanks" });

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        var reply = await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/admin-resident-response",
            new AdminResidentResponseRequest { Message = "Glad to help" });
        Assert.Equal(HttpStatusCode.OK, reply.StatusCode);
    }

    [Fact]
    public async Task Branches_occupants_update_delete_offers_building_images_occupancies()
    {
        var s = await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("admin@test.local", "Admin"));

        Assert.Equal(HttpStatusCode.OK,
            (await _client.GetAsync($"/api/buildings/{s.BuildingId}/images")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await _client.GetAsync("/api/buildings/99999/images")).StatusCode);

        var createExtra = await _client.PostAsJsonAsync(
            "/api/admin/occupants",
            new CreateOccupantRequest
            {
                Email = "extra@test.local",
                Name = "Extra",
                Password = Password,
                BuildingId = s.BuildingId,
            });
        Assert.Equal(HttpStatusCode.Created, createExtra.StatusCode);
        var extraId = (await ReadAsync<JsonElement>(createExtra)).GetProperty("id").GetInt32();

        Assert.Equal(HttpStatusCode.OK,
            (await _client.PutAsJsonAsync(
                $"/api/admin/occupants/{extraId}",
                new UpdateOccupantRequest
                {
                    Name = "Extra II",
                    Email = "extra@test.local",
                    BuildingId = s.BuildingId,
                })).StatusCode);

        Assert.Equal(HttpStatusCode.Conflict,
            (await _client.PutAsJsonAsync(
                $"/api/admin/occupants/{extraId}",
                new UpdateOccupantRequest
                {
                    Name = "Clash",
                    Email = "admin@test.local",
                    BuildingId = s.BuildingId,
                })).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound,
            (await _client.PutAsJsonAsync(
                $"/api/admin/occupants/{extraId}",
                new UpdateOccupantRequest
                {
                    Name = "Extra II",
                    Email = "extra@test.local",
                    BuildingId = 99999,
                })).StatusCode);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.PutAsJsonAsync(
                $"/api/admin/occupants/{extraId}",
                new UpdateOccupantRequest
                {
                    Name = " ",
                    Email = "extra@test.local",
                    BuildingId = s.BuildingId,
                })).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound,
            (await _client.DeleteAsync("/api/admin/occupants/99999")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,
            (await _client.DeleteAsync($"/api/admin/occupants/{extraId}")).StatusCode);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.PostAsync($"/api/admin/occupants/{s.ResidentId}/approve", null)).StatusCode);

        var createPending = await _client.PostAsJsonAsync(
            "/api/admin/occupants",
            new CreateOccupantRequest
            {
                Email = "pending@test.local",
                Name = "Pending Person",
                Password = Password,
                BuildingId = s.BuildingId,
            });
        Assert.Equal(HttpStatusCode.Created, createPending.StatusCode);
        var pendingId = (await ReadAsync<JsonElement>(createPending)).GetProperty("id").GetInt32();
        using (var scope = _fixture.Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var u = await db.Users.FirstAsync(x => x.Id == pendingId);
            u.ProfileStatus = ResidentProfileStatus.PendingReview;
            await db.SaveChangesAsync();
        }

        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.PostAsJsonAsync(
                $"/api/admin/occupants/{pendingId}/decline",
                new DeclineOccupantRequest { Comment = "   " })).StatusCode);

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("tech@test.local", "Technician"));
        var offerRes = await _client.PostAsJsonAsync(
            "/api/technician/offered-services",
            new OfferedServiceWriteRequest("Hold line", "Note", 1));
        Assert.Equal(HttpStatusCode.Created, offerRes.StatusCode);
        var offerId = (await ReadAsync<JsonElement>(offerRes)).GetProperty("id").GetInt32();

        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.PutAsJsonAsync(
                $"/api/technician/offered-services/{offerId}",
                new OfferedServiceWriteRequest("X", "Y", 0))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await _client.PutAsJsonAsync(
                $"/api/technician/offered-services/99999",
                new OfferedServiceWriteRequest("X", "Y", 0))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await _client.DeleteAsync("/api/technician/offered-services/99999")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.DeleteAsync($"/api/technician/offered-services/{offerId}")).StatusCode);

        _client.DefaultRequestHeaders.Authorization = null;
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await _client.GetAsync("/api/technician/offered-services")).StatusCode);

        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        Assert.Equal(HttpStatusCode.OK,
            (await _client.GetAsync($"/api/occupancies?buildingId={s.BuildingId}&currentOnly=true")).StatusCode);

        var badLease = await _client.PostAsJsonAsync(
            $"/api/units/{s.UnitId}/occupancies",
            new AssignOccupancyRequest
            {
                UserId = s.ResidentId,
                StartedAt = DateOnly.FromDateTime(DateTime.UtcNow),
                LeaseEndDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-5)),
            });
        Assert.Equal(HttpStatusCode.BadRequest, badLease.StatusCode);

        var nonRes = await _client.PostAsJsonAsync(
            $"/api/units/{s.UnitId}/occupancies",
            new AssignOccupancyRequest
            {
                UserId = s.AdminId,
                StartedAt = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-10)),
            });
        Assert.Equal(HttpStatusCode.BadRequest, nonRes.StatusCode);

        Assert.Equal(HttpStatusCode.NotFound,
            (await _client.PostAsJsonAsync(
                "/api/units/99999/occupancies",
                new AssignOccupancyRequest
                {
                    UserId = s.ResidentId,
                    StartedAt = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)),
                })).StatusCode);

        var assignOk = await _client.PostAsJsonAsync(
            $"/api/units/{s.UnitId}/occupancies",
            new AssignOccupancyRequest
            {
                UserId = s.ResidentId,
                StartedAt = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-20)),
                LeaseEndDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(200)),
            });
        Assert.Equal(HttpStatusCode.OK, assignOk.StatusCode);
        var occId = (await ReadAsync<JsonElement>(assignOk)).GetProperty("id").GetInt32();

        var started = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-20));
        var badEnd = await _client.PostAsJsonAsync(
            $"/api/occupancies/{occId}/end",
            new EndOccupancyRequest { EndedAt = started.AddDays(-3) });
        Assert.Equal(HttpStatusCode.BadRequest, badEnd.StatusCode);

        Assert.Equal(HttpStatusCode.OK,
            (await _client.PostAsJsonAsync($"/api/occupancies/{occId}/end", new EndOccupancyRequest())).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.PostAsJsonAsync($"/api/occupancies/{occId}/end", new EndOccupancyRequest())).StatusCode);
    }

    [Fact]
    public async Task Branches_auth_change_password_validation_legacy_login_and_maintenance_status()
    {
        await SeedStandardWorldAsync();
        var token = await LoginAsync("admin@test.local", "Admin");
        SetBearer(token);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.PutAsJsonAsync(
                "/api/auth/password",
                new ChangePasswordRequest { CurrentPassword = Password, NewPassword = "short" })).StatusCode);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.PutAsJsonAsync(
                "/api/auth/password",
                new ChangePasswordRequest { CurrentPassword = "nope", NewPassword = "Password888!" })).StatusCode);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.PutAsJsonAsync(
                "/api/auth/password",
                new ChangePasswordRequest { CurrentPassword = Password, NewPassword = Password })).StatusCode);

        using (var scope = _fixture.Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Users.Add(new UserEntity
            {
                Name = "Legacy",
                Email = "legacy@test.local",
                Password = "PlainLegacy1!",
                Role = "Resident",
                Unit = "",
                BuildingId = null,
                ProfileStatus = ResidentProfileStatus.Approved,
            });
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = null;
        var legacyOk = await _client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest { Email = "legacy@test.local", Password = "PlainLegacy1!" });
        Assert.Equal(HttpStatusCode.OK, legacyOk.StatusCode);

        var adminTok2 = await LoginAsync("admin@test.local", "Admin");
        SetBearer(adminTok2);

        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var created = await _client.PostAsJsonAsync(
            "/api/maintenancerequests",
            new CreateMaintenanceRequest { Title = "S", Description = "D", Priority = "Low" });
        var reqId = (await ReadAsync<JsonElement>(created)).GetProperty("id").GetString()!;

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));

        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/status",
                new UpdateStatusRequest { Status = "not-a-real-status" })).StatusCode);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/status",
                new UpdateStatusRequest { Status = "In Progress" })).StatusCode);

        await _client.PostAsync($"/api/maintenancerequests/{reqId}/approve", null);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/status",
                new UpdateStatusRequest { Status = "Declined" })).StatusCode);
    }

    [Fact]
    public async Task Branches_maintenance_assign_before_approve_and_compliance_block()
    {
        var s = await SeedStandardWorldAsync();
        using (var scope = _fixture.Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var p = await db.TechnicianProfiles.FirstAsync(x => x.UserId == s.TechId);
            p.LicenseExpiry = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
            p.CoiExpiry = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1));
            await db.SaveChangesAsync();
        }

        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var created = await _client.PostAsJsonAsync(
            "/api/maintenancerequests",
            new CreateMaintenanceRequest { Title = "T", Description = "D", Priority = "Low" });
        var reqId = (await ReadAsync<JsonElement>(created)).GetProperty("id").GetString()!;

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));

        var tooEarly = await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician",
            new AssignTechnicianRequest { AssignedTechnician = "Tech Pro" });
        Assert.Equal(HttpStatusCode.BadRequest, tooEarly.StatusCode);

        await _client.PostAsync($"/api/maintenancerequests/{reqId}/approve", null);

        var blockedLicense = await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician",
            new AssignTechnicianRequest { AssignedTechnician = "Tech Pro" });
        Assert.Equal(HttpStatusCode.BadRequest, blockedLicense.StatusCode);
        var licenseMsg = await blockedLicense.Content.ReadAsStringAsync();
        Assert.Contains("license", licenseMsg, StringComparison.OrdinalIgnoreCase);

        using (var scope = _fixture.Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var p = await db.TechnicianProfiles.FirstAsync(x => x.UserId == s.TechId);
            p.LicenseExpiry = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1));
            p.CoiExpiry = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-5));
            await db.SaveChangesAsync();
        }

        var blockedCoi = await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician",
            new AssignTechnicianRequest { AssignedTechnician = "Tech Pro" });
        Assert.Equal(HttpStatusCode.BadRequest, blockedCoi.StatusCode);
        var coiMsg = await blockedCoi.Content.ReadAsStringAsync();
        Assert.Contains("insurance", coiMsg, StringComparison.OrdinalIgnoreCase);

        using (var scope = _fixture.Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var p = await db.TechnicianProfiles.FirstAsync(x => x.UserId == s.TechId);
            p.CoiExpiry = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1));
            p.WorkersCompExpiry = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-3));
            await db.SaveChangesAsync();
        }

        var blockedWc = await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician",
            new AssignTechnicianRequest { AssignedTechnician = "Tech Pro" });
        Assert.Equal(HttpStatusCode.BadRequest, blockedWc.StatusCode);
        var wcMsg = await blockedWc.Content.ReadAsStringAsync();
        Assert.Contains("compensation", wcMsg, StringComparison.OrdinalIgnoreCase);

        using (var scope = _fixture.Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var p = await db.TechnicianProfiles.FirstAsync(x => x.UserId == s.TechId);
            p.WorkersCompExpiry = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1));
            await db.SaveChangesAsync();
        }

        var assignOk = await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician",
            new AssignTechnicianRequest { AssignedTechnician = "Tech Pro" });
        Assert.Equal(HttpStatusCode.OK, assignOk.StatusCode);
    }

    [Fact]
    public async Task Branches_maintenance_priority_invalid_and_before_approve()
    {
        await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var created = await _client.PostAsJsonAsync(
            "/api/maintenancerequests",
            new CreateMaintenanceRequest { Title = "P", Description = "Q", Priority = "Low" });
        var reqId = (await ReadAsync<JsonElement>(created)).GetProperty("id").GetString()!;

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));

        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/priority",
                new UpdatePriorityRequest { Priority = "Ultra" })).StatusCode);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/priority",
                new UpdatePriorityRequest { Priority = "High" })).StatusCode);
    }

    [Fact]
    public async Task Branches_resident_profile_validation_and_duplicate_occupant()
    {
        var s = await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("admin@test.local", "Admin"));

        var dup = await _client.PostAsJsonAsync(
            "/api/admin/occupants",
            new CreateOccupantRequest
            {
                Email = "admin@test.local",
                Name = "Clone",
                Password = Password,
                BuildingId = s.BuildingId,
            });
        Assert.Equal(HttpStatusCode.Conflict, dup.StatusCode);

        var create = await _client.PostAsJsonAsync(
            "/api/admin/occupants",
            new CreateOccupantRequest
            {
                Email = "pendingprof@test.local",
                Name = "Prof Pend",
                Password = Password,
                BuildingId = s.BuildingId,
            });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("pendingprof@test.local", "Resident"));

        var missingPhone = await _client.PutAsJsonAsync(
            "/api/resident/profile",
            new ResidentProfileWriteRequest
            {
                Phone = " ",
                EmergencyContactName = "E",
                EmergencyContactPhone = "1",
            });
        Assert.Equal(HttpStatusCode.BadRequest, missingPhone.StatusCode);

        var okProfile = await _client.PutAsJsonAsync(
            "/api/resident/profile",
            new ResidentProfileWriteRequest
            {
                Phone = "555-0100",
                EmergencyContactName = "E",
                EmergencyContactPhone = "555-0200",
                AboutMe = "Hello",
            });
        Assert.Equal(HttpStatusCode.OK, okProfile.StatusCode);

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var approvedBlocked = await _client.PutAsJsonAsync(
            "/api/resident/profile",
            new ResidentProfileWriteRequest
            {
                Phone = "555",
                EmergencyContactName = "E",
                EmergencyContactPhone = "444",
                AboutMe = "N",
            });
        Assert.Equal(HttpStatusCode.BadRequest, approvedBlocked.StatusCode);
    }

    [Fact]
    public async Task Branches_maintenance_approve_twice_and_decline_message_paths()
    {
        await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var created = await _client.PostAsJsonAsync(
            "/api/maintenancerequests",
            new CreateMaintenanceRequest { Title = "Q", Description = "R", Priority = "Low" });
        var reqId = (await ReadAsync<JsonElement>(created)).GetProperty("id").GetString()!;

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));

        Assert.Equal(HttpStatusCode.OK, (await _client.PostAsync($"/api/maintenancerequests/{reqId}/approve", null)).StatusCode);

        var approveAgain = await _client.PostAsync($"/api/maintenancerequests/{reqId}/approve", null);
        Assert.Equal(HttpStatusCode.BadRequest, approveAgain.StatusCode);

        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var created2 = await _client.PostAsJsonAsync(
            "/api/maintenancerequests",
            new CreateMaintenanceRequest { Title = "Q2", Description = "R2", Priority = "Low" });
        var id2 = (await ReadAsync<JsonElement>(created2)).GetProperty("id").GetString()!;

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));

        var declineNoReason = await _client.PostAsJsonAsync(
            $"/api/maintenancerequests/{id2}/decline",
            new DeclineMaintenanceRequestBody { Reason = "" });
        Assert.Equal(HttpStatusCode.OK, declineNoReason.StatusCode);
    }

    [Fact]
    public async Task Branches_maintenance_technician_status_without_assignment_fails()
    {
        await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var created = await _client.PostAsJsonAsync(
            "/api/maintenancerequests",
            new CreateMaintenanceRequest { Title = "NoTech", Description = "D", Priority = "Low" });
        var reqId = (await ReadAsync<JsonElement>(created)).GetProperty("id").GetString()!;

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        await _client.PostAsync($"/api/maintenancerequests/{reqId}/approve", null);

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("tech@test.local", "Technician"));
        var bad = await _client.PatchAsJsonAsync(
            $"/api/maintenancerequests/{reqId}/technician-status",
            new TechnicianStatusRequest { Status = "In Progress", CompletionNotes = "x" });
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
    }

    [Fact]
    public async Task Branches_maintenance_resident_charge_unknown_request()
    {
        await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        var bad = await _client.PostAsJsonAsync(
            "/api/maintenancerequests/mr-does-not-exist/resident-charge",
            new ResidentChargeRequest { Amount = 10m, Type = "Repair", DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5)) });
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
    }

    [Fact]
    public async Task Integration_technician_invoice_rich_payloads_site_dates_and_payout_validation()
    {
        await SeedStandardWorldAsync();
        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        var created = await _client.PostAsJsonAsync(
            "/api/maintenancerequests",
            new CreateMaintenanceRequest { Title = "RichInv", Description = "D", Priority = "Low" });
        var reqId = (await ReadAsync<JsonElement>(created)).GetProperty("id").GetString()!;

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        await _client.PostAsync($"/api/maintenancerequests/{reqId}/approve", null);
        Assert.Equal(HttpStatusCode.OK,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/technician",
                new AssignTechnicianRequest { AssignedTechnician = "Tech Pro" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/status",
                new UpdateStatusRequest { Status = "In Progress" })).StatusCode);

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("tech@test.local", "Technician"));

        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/technician-invoice",
                new TechnicianInvoiceRequest
                {
                    InvoiceUrl = "https://example.com/a.pdf",
                    LineItems =
                    [
                        new TechnicianInvoiceLineItem { Kind = "badkind", Description = "x", Quantity = 1, UnitPrice = 1 },
                    ],
                })).StatusCode);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/technician-invoice",
                new TechnicianInvoiceRequest
                {
                    InvoiceUrl = "https://example.com/a.pdf",
                    WorkPhotoUrls = ["https://e.example/w.jpg", "not-a-url"],
                })).StatusCode);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/technician-invoice",
                new TechnicianInvoiceRequest
                {
                    InvoiceUrl = "https://example.com/a.pdf",
                    TaxRatePercent = 101,
                    Amount = 10m,
                })).StatusCode);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/technician-invoice",
                new TechnicianInvoiceRequest
                {
                    InvoiceUrl = "https://example.com/a.pdf",
                    LineItems =
                    [
                        new TechnicianInvoiceLineItem { Kind = "labor", Description = "L", Quantity = -0.01m, UnitPrice = 1 },
                    ],
                })).StatusCode);

        Assert.Equal(HttpStatusCode.OK,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/technician-invoice",
                new TechnicianInvoiceRequest
                {
                    InvoiceUrl = "https://example.com/invoice-rich.pdf",
                    Notes = "  note  ",
                    TaxRatePercent = 8.25m,
                    PurchaseOrderRef = " PO-99 ",
                    SignatureAcknowledgment = " Signed ",
                    LineItems =
                    [
                        new TechnicianInvoiceLineItem { Kind = "labor", Description = " Labor ", Quantity = 2, UnitPrice = 50 },
                        new TechnicianInvoiceLineItem { Kind = "part", Description = "Part A", Quantity = 1, UnitPrice = 25.5m },
                        new TechnicianInvoiceLineItem { Kind = "OTHER", Description = "", Quantity = 1, UnitPrice = 10 },
                    ],
                    WorkPhotoUrls = ["https://example.com/w1.jpg", "  https://example.com/w2.png  "],
                })).StatusCode);

        Assert.Equal(HttpStatusCode.OK,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/technician-site-details",
                new TechnicianSiteDetailsRequest
                {
                    SiteUpdate = "progress",
                    MaterialsUsed = "m",
                    ExpectedReturnDate = "2026-07-01",
                    OfficeNotes = "on-site",
                })).StatusCode);

        Assert.Equal(HttpStatusCode.OK,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/technician-site-details",
                new TechnicianSiteDetailsRequest
                {
                    SiteUpdate = "progress2",
                    MaterialsUsed = "",
                    ExpectedReturnDate = "2026-07-02T14:00:00",
                    OfficeNotes = "",
                })).StatusCode);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/technician-site-details",
                new TechnicianSiteDetailsRequest
                {
                    SiteUpdate = "x",
                    MaterialsUsed = "",
                    ExpectedReturnDate = "not-a-real-date-zzz",
                    OfficeNotes = "",
                })).StatusCode);

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("admin@test.local", "Admin"));

        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/technician-payout",
                new TechnicianPayoutRequest { Status = "InvalidStatus" })).StatusCode);

        Assert.Equal(HttpStatusCode.OK,
            (await _client.PatchAsJsonAsync(
                $"/api/maintenancerequests/{reqId}/technician-payout",
                new TechnicianPayoutRequest
                {
                    Status = "Paid",
                    ApprovedAmount = 50m,
                    PaidAt = DateTimeOffset.UtcNow,
                    Notes = "  paid out  ",
                })).StatusCode);
    }

    [Fact]
    public async Task Branches_dashboard_unauthorized_admin_notification_filter_and_read_not_found()
    {
        var s = await SeedStandardWorldAsync();
        _client.DefaultRequestHeaders.Authorization = null;
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await _client.GetAsync("/api/dashboard/summary")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await _client.GetAsync("/api/dashboard/notifications")).StatusCode);

        SetBearer(await LoginAsync("admin@test.local", "Admin"));
        Assert.Equal(HttpStatusCode.OK,
            (await _client.GetAsync($"/api/dashboard/notifications?buildingId={s.BuildingId}")).StatusCode);

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("resident@test.local", "Resident"));
        Assert.Equal(HttpStatusCode.NotFound,
            (await _client.PatchAsync("/api/dashboard/notifications/999999/read", null)).StatusCode);

        _client.DefaultRequestHeaders.Authorization = null;
        SetBearer(await LoginAsync("tech@test.local", "Technician"));
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/dashboard/summary")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/dashboard/notifications")).StatusCode);
    }
}
