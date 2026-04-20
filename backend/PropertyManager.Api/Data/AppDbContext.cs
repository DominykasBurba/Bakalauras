using Microsoft.EntityFrameworkCore;

namespace PropertyManager.Api.Data;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<UserEntity> Users => Set<UserEntity>();
    public DbSet<BuildingEntity> Buildings => Set<BuildingEntity>();
    public DbSet<MaintenanceRequestEntity> MaintenanceRequests => Set<MaintenanceRequestEntity>();
    public DbSet<NotificationEntity> Notifications => Set<NotificationEntity>();
    public DbSet<BillEntity> Bills => Set<BillEntity>();
    public DbSet<UnitEntity> Units => Set<UnitEntity>();
    public DbSet<BuildingImageEntity> BuildingImages => Set<BuildingImageEntity>();
    public DbSet<OccupancyEntity> Occupancies => Set<OccupancyEntity>();
    public DbSet<ScheduledMaintenanceEntity> ScheduledMaintenance => Set<ScheduledMaintenanceEntity>();
    public DbSet<TechnicianOfferedServiceEntity> TechnicianOfferedServices => Set<TechnicianOfferedServiceEntity>();
    public DbSet<TechnicianProfileEntity> TechnicianProfiles => Set<TechnicianProfileEntity>();
    public DbSet<ServiceCatalogItemEntity> ServiceCatalogItems => Set<ServiceCatalogItemEntity>();
    public DbSet<TechnicianServiceCatalogLinkEntity> TechnicianServiceCatalogLinks =>
        Set<TechnicianServiceCatalogLinkEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserEntity>().HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<TechnicianServiceCatalogLinkEntity>().HasKey(e => new { e.UserId, e.CatalogItemId });
    }
}
