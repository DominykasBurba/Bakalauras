using PropertyManager.Api.Data;
using PropertyManager.Api.Helpers;
using Xunit;

namespace PropertyManager.Api.Tests;

public sealed class OfferedServiceMapperTests
{
    [Fact]
    public void ToResponse_trims_and_maps_catalog_name()
    {
        var e = new TechnicianOfferedServiceEntity
        {
            Id = 3,
            UserId = 1,
            Title = "  Title  ",
            Description = "  d  ",
            SortOrder = 2,
            CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            ReviewStatus = " approved ",
            AdminReviewNote = " note ",
            MappedCatalogItemId = 9,
        };
        var names = new Dictionary<int, string> { [9] = "Plumbing" };
        var r = OfferedServiceMapper.ToResponse(e, names);
        Assert.Equal(3, r.Id);
        Assert.Equal("Title", r.Title);
        Assert.Equal("d", r.Description);
        Assert.Equal("approved", r.ReviewStatus);
        Assert.Equal("note", r.AdminReviewNote);
        Assert.Equal(9, r.MappedCatalogItemId);
        Assert.Equal("Plumbing", r.MappedCatalogName);
    }

    [Fact]
    public void ToResponse_empty_description_and_missing_catalog()
    {
        var e = new TechnicianOfferedServiceEntity
        {
            Id = 1,
            Title = "T",
            Description = "   ",
            ReviewStatus = "pending",
            MappedCatalogItemId = 99,
        };
        var r = OfferedServiceMapper.ToResponse(e, new Dictionary<int, string>());
        Assert.Null(r.Description);
        Assert.Null(r.MappedCatalogName);
    }
}
