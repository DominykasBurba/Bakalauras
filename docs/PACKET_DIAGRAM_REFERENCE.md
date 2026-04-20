# Packet diagram reference — Property Manager

Use this list when drawing a **UML package / component diagram** (e.g. like a React client + backend split). Copy names into your tool as needed.

---

## 1. React client application (frontend)

**Tech:** React (Vite), TypeScript, `react-router-dom`

### 1.1 Shared / common (all roles)

| View / component | Route (if any) | Notes |
|------------------|----------------|--------|
| `LoginPage` | `/login` | Unauthenticated |
| `Layout` | wraps app | Shell + nav |
| `NotificationsPage` | `/notifications` | All logged-in users |
| `AccountSettingsPage` | `/account` | All logged-in users |
| `HomeRoute` | `/` | Redirects by role to admin / technician / resident dashboard |

### 1.2 Resident views

| View | Route |
|------|--------|
| `ResidentDashboard` | `/` (default home for residents) |
| `ReportIssue` | `/report-issue` |
| `ResidentMaintenanceRequestsPage` | `/my-maintenance-requests` |
| `BillingPaymentsPage` | `/billing` |
| `CompleteProfilePage` | `/complete-profile` |

### 1.3 Admin views

| View | Route |
|------|--------|
| `AdminDashboard` | `/admin` |
| `MaintenanceRequestsPage` | `/maintenance-requests` (list) |
| `BuildingsPage` | `/buildings` |
| `PropertyManagementPage` | `/admin/property` |
| `AdminOccupantsPage` | `/admin/occupants` |
| `AdminScheduledMaintenancePage` | `/admin/scheduled-maintenance` |
| `AdminSendNotificationsPage` | `/admin/send-notifications` |
| `AdminTechniciansPage` | `/admin/technicians` |
| `AdminTechnicianDetailPage` | `/admin/technicians/:userId` |
| `AdminServiceCatalogPage` | `/admin/service-catalog` |
| `WorkOrderManagementPage` | `/work-order/:id` (admin + technician; role-specific UI) |

### 1.4 Technician (service provider) views

| View | Route |
|------|--------|
| `ServiceProviderPage` | `/service-provider` |
| `TechnicianOfferedServicesPage` | `/service-provider/offered-services` |
| `WorkOrderManagementPage` | `/work-order/:id` (same page as admin; different actions) |

### 1.5 Route guards (optional on diagram)

- `ProtectedRoute`, `AdminRoute`, `ResidentOnlyRoute`, `TechnicianOnlyRoute`, `ServiceProviderRoute`

### 1.6 Frontend “services” / API layer (no separate Flask)

| Artifact | Role |
|----------|------|
| `api.ts` | HTTP client: `request()`, all `getX` / `postX` / `putX` calls to `/api/...` |
| `types.ts` | TypeScript types matching API DTOs |
| `utils/auth.ts` | Role checks, session helpers |
| `contexts/AuthContext.tsx` | Session state |
| `contexts/ToastContext.tsx` | Notifications |
| `contexts/BuildingContext.tsx` | Selected building (admin) |

**Diagram tip:** You can draw a sub-package **“API client”** containing `api.ts` + `types.ts` (similar idea to a `DataFetchService`).

---

## 2. Backend server (single stack — no Flask)

**Tech:** ASP.NET Core Web API, Entity Framework Core, PostgreSQL (typical)

### 2.1 Controllers (HTTP API)

| Controller | Area |
|------------|------|
| `AuthController` | Login / session |
| `BuildingsController` | Buildings CRUD |
| `BuildingImagesController` | Building gallery |
| `DashboardController` | Admin dashboard summary |
| `MaintenanceRequestsController` | Work orders / assignment / status |
| `BillingController` | Bills, Stripe checkout |
| `ResidentProfileController` | Resident profile |
| `ScheduledMaintenanceController` | Resident-facing scheduled maintenance |
| `OccupanciesController` | Occupancies / units |
| `PropertyOverviewController` | Property overview data |
| `PropertyUnitsController` | Units under a building |
| `AdminResidentsController` | Admin resident list |
| `AdminOccupantsController` | Occupants admin |
| `AdminScheduledMaintenanceController` | Admin scheduled maintenance |
| `AdminNotificationsController` | Send notifications |
| `AdminTechniciansController` | Technicians, catalog links, offered-service review |
| `ServiceCatalogController` | Admin service catalog |
| `TechnicianOfferedServicesController` | Technician offered services |
| `TechnicianServiceCatalogController` | Technician-assigned catalog (read) |

**Note:** `OfferedServiceDtos.cs` in Controllers folder is DTOs, not a controller — group under **DTOs** if you split packages.

### 2.2 Models & data

| Location | Contents |
|----------|----------|
| `Data/Entities.cs` | EF entities (users, buildings, bills, maintenance, technician profiles, etc.) |
| `Data/AppDbContext.cs` | DbContext |
| `Models/` | `User`, `Building`, `Bill`, `MaintenanceRequest`, DTO folders, etc. |
| `Helpers/PropertyPortfolioMigration.cs` | DB migrations / DDL |

**Diagram tip:** One package **“Models / persistence”** with an arrow **Controllers → Models** (controllers use entities/DTOs).

### 2.3 Application services (optional package)

| Component | Role |
|-----------|------|
| `PostgresDataStore` | Maintenance / billing persistence |
| `IDataStore` | Interface |
| `JwtTokenService` | JWT issuance |
| `PasswordHashing` | Auth |

---

## 3. Database

- **PostgreSQL** (or whatever your connection string points to), accessed via **EF Core**.

---

## 4. What this project does **not** use

- **No Flask** / no second Python AI server — omit that package entirely unless you add one later.

---

## 5. Minimal one-line architecture (for a simple diagram)

`React SPA (api.ts) —HTTPS JSON—> ASP.NET Core API —> PostgreSQL`

---

## 6. Suggested package names for your drawing tool

**Frontend package:** `React Client` or `property-manager-web`

**Sub-packages:**

- `Resident Views`
- `Admin Views`
- `Technician Views`
- `Shared Views` (login, account, notifications)
- `API Client` (`api.ts`, `types.ts`)

**Backend package:** `PropertyManager.Api`

**Sub-packages:**

- `Controllers`
- `Models` (or `Entities & DTOs`)
- `Services` (optional)
- `Data Access` / `DbContext`

---

*Generated from the repository structure. Update if you add routes or controllers.*
