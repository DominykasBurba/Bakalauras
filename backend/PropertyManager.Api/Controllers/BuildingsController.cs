using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PropertyManager.Api.Models.Dtos;
using PropertyManager.Api.Services;

namespace PropertyManager.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BuildingsController(IDataStore dataStore) : ControllerBase
{
    [HttpGet]
    public IActionResult GetAll()
    {
        return Ok(dataStore.Buildings);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public IActionResult Create([FromBody] BuildingWriteRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Name))
            return BadRequest("Name is required.");
        if (string.IsNullOrWhiteSpace(body.Address))
            return BadRequest("Address is required.");

        var created = dataStore.AddBuilding(body.Name, body.Address);
        return Created($"/api/buildings/{created.Id}", created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public IActionResult Update(int id, [FromBody] BuildingWriteRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Name))
            return BadRequest("Name is required.");
        if (string.IsNullOrWhiteSpace(body.Address))
            return BadRequest("Address is required.");

        var updated = dataStore.UpdateBuilding(id, body.Name, body.Address);
        if (updated is null)
            return NotFound();
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public IActionResult Delete(int id)
    {
        if (!dataStore.TryDeleteBuilding(id))
            return NotFound();
        return NoContent();
    }
}
