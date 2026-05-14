using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PropertyManager.Api.Helpers;
using PropertyManager.Api.Services;
using Stripe;
using Stripe.Checkout;

namespace PropertyManager.Api.Controllers;

public sealed class CreateCheckoutSessionRequest
{
    public required string BillId { get; init; }
}

public sealed class VerifyCheckoutSessionRequest
{
    public required string SessionId { get; init; }
}

[ApiController]
[Route("api/[controller]")]
public class BillingController(IDataStore dataStore, IConfiguration configuration, ILogger<BillingController> logger) : ControllerBase
{
    [HttpGet]
    [Authorize]
    public IActionResult GetBills()
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();

        if (User.IsInRole("Admin"))
            return StatusCode(StatusCodes.Status403Forbidden, "Billing is only available to residents.");

        return Ok(dataStore.Bills.Where(b => b.UserId == userId && b.ResidentNotificationSent).ToList());
    }

    [HttpPost("checkout-session")]
    [Authorize]
    public async Task<IActionResult> CreateCheckoutSession(
        [FromBody] CreateCheckoutSessionRequest body,
        CancellationToken cancellationToken)
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();
        if (User.IsInRole("Admin"))
            return StatusCode(StatusCodes.Status403Forbidden, "Billing is only available to residents.");

        var secretKey = configuration["Stripe:SecretKey"];
        if (string.IsNullOrWhiteSpace(secretKey))
        {
            return Problem(
                detail: "Stripe is not configured. Set Stripe:SecretKey (e.g. sk_test_...) in appsettings or user secrets.",
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        StripeConfiguration.ApiKey = secretKey;

        var bill = dataStore.Bills.FirstOrDefault(b => b.BillId == body.BillId);
        if (bill is null)
            return NotFound("Bill not found.");
        if (bill.UserId != userId)
            return StatusCode(StatusCodes.Status403Forbidden, "You can only pay your own bills.");
        if (string.Equals(bill.Status, "Paid", StringComparison.OrdinalIgnoreCase))
            return BadRequest("This bill is already paid.");
        if (!bill.ResidentNotificationSent)
            return BadRequest("This bill is not available for payment yet. Your property office will notify you when it is ready.");

        var baseUrl = configuration["Stripe:FrontendBaseUrl"]?.TrimEnd('/') ?? "http://localhost:5173";
        var unitAmount = (long)Math.Round(bill.Amount * 100m, MidpointRounding.AwayFromZero);
        const long minimumUnitAmountUsd = 100;
        if (unitAmount < minimumUnitAmountUsd)
        {
            return BadRequest(
                "Amount is below the minimum for card checkout (USD 1.00). " +
                "Stripe requires the total to meet currency minimums after conversion.");
        }

        var lineName = $"{bill.Type} - {bill.BillId}".Trim();
        if (lineName.Length == 0)
            lineName = bill.BillId;

        var options = new SessionCreateOptions
        {
            Mode = "payment",
            PaymentMethodTypes = ["card"],
            SuccessUrl = $"{baseUrl}/billing?session_id={{CHECKOUT_SESSION_ID}}",
            CancelUrl = $"{baseUrl}/billing?canceled=1",
            Metadata = new Dictionary<string, string> { ["bill_id"] = bill.BillId },
            LineItems =
            [
                new SessionLineItemOptions
                {
                    Quantity = 1,
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = "usd",
                        UnitAmount = unitAmount,
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = lineName.Length > 250 ? lineName[..250] : lineName,
                            Description = $"Due {bill.DueDate:yyyy-MM-dd}",
                        },
                    },
                },
            ],
        };

        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value?.Trim();
        if (!string.IsNullOrEmpty(email))
            options.CustomerEmail = email;

        try
        {
            var service = new SessionService();
            var session = await service.CreateAsync(options, cancellationToken: cancellationToken);
            if (string.IsNullOrEmpty(session.Url))
            {
                logger.LogError("Stripe Checkout session has no Url. SessionId={SessionId}", session.Id);
                return Problem(
                    detail: "Stripe did not return a checkout URL. Check the API key and Dashboard Checkout settings.",
                    statusCode: StatusCodes.Status502BadGateway);
            }

            return Ok(new { url = session.Url });
        }
        catch (StripeException ex)
        {
            logger.LogWarning(ex, "Stripe CreateCheckoutSession failed");
            return Problem(detail: ex.StripeError?.Message ?? ex.Message, statusCode: StatusCodes.Status502BadGateway);
        }
    }

    [HttpPost("verify-session")]
    [Authorize]
    public async Task<IActionResult> VerifyCheckoutSession(
        [FromBody] VerifyCheckoutSessionRequest body,
        CancellationToken cancellationToken)
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();
        if (User.IsInRole("Admin"))
            return StatusCode(StatusCodes.Status403Forbidden, "Billing is only available to residents.");

        var secretKey = configuration["Stripe:SecretKey"];
        if (string.IsNullOrWhiteSpace(secretKey))
            return Problem(detail: "Stripe is not configured.", statusCode: StatusCodes.Status503ServiceUnavailable);

        StripeConfiguration.ApiKey = secretKey;

        var service = new SessionService();
        var session = await service.GetAsync(body.SessionId, cancellationToken: cancellationToken);

        if (session.PaymentStatus != "paid")
            return Ok(new { paid = false });

        if (session.Metadata is null || !session.Metadata.TryGetValue("bill_id", out var billId) || string.IsNullOrEmpty(billId))
            return Ok(new { paid = false });

        var bill = dataStore.Bills.FirstOrDefault(b => b.BillId == billId);
        if (bill is null || bill.UserId != userId)
            return Ok(new { paid = false });

        var method = StripePaymentMethodLabel(session);
        var marked = dataStore.MarkBillPaidIfExists(billId, method);
        return Ok(new { paid = marked });
    }

    private static string StripePaymentMethodLabel(Session session)
    {
        if (session.PaymentMethodTypes is { Count: > 0 } pm)
            return $"Stripe ({string.Join(", ", pm)})";
        return "Stripe";
    }

    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> StripeWebhook(CancellationToken cancellationToken)
    {
        var webhookSecret = configuration["Stripe:WebhookSecret"];
        if (string.IsNullOrWhiteSpace(webhookSecret))
        {
            logger.LogWarning("Stripe webhook received but Stripe:WebhookSecret is not set.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "Webhook not configured");
        }

        string json;
        using (var reader = new StreamReader(HttpContext.Request.Body))
            json = await reader.ReadToEndAsync(cancellationToken);

        if (!Request.Headers.TryGetValue("Stripe-Signature", out var signatureHeader))
            return BadRequest("Missing Stripe-Signature");

        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(json, signatureHeader, webhookSecret);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(ex, "Invalid Stripe webhook signature");
            return BadRequest();
        }

        if (stripeEvent.Type == EventTypes.CheckoutSessionCompleted && stripeEvent.Data.Object is Session session)
        {
            if (session.Metadata != null && session.Metadata.TryGetValue("bill_id", out var billId) && !string.IsNullOrEmpty(billId))
                dataStore.MarkBillPaidIfExists(billId, StripePaymentMethodLabel(session));
        }

        return Ok();
    }
}
