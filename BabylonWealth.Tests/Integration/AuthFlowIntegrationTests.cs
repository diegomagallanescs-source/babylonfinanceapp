using System.Net;
using System.Net.Http.Json;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Tests.Integration;

/// <summary>
/// Integration tests for the full auth flow: register → login → call authenticated endpoint.
/// Each test class gets an isolated in-memory database via the factory.
/// </summary>
public class AuthFlowIntegrationTests : IClassFixture<BabylonWebApplicationFactory>
{
    private readonly HttpClient _client;

    public AuthFlowIntegrationTests(BabylonWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ── Register ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Register_WithValidCredentials_Returns200WithJwt()
    {
        var request = new RegisterRequest
        {
            Email = "arkad@babylon.com",
            Password = "Babylon1",
            FirstName = "Arkad"
        };

        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<AuthResponseDto>();
        Assert.NotNull(body);
        Assert.NotEmpty(body.Token);
        Assert.Equal("arkad@babylon.com", body.Email);
        Assert.Equal("Arkad", body.FirstName);
        Assert.True(body.ExpiresAt > DateTime.UtcNow);
        Assert.NotEqual(Guid.Empty, body.UserId);
    }

    [Fact]
    public async Task Register_WithDuplicateEmail_Returns400()
    {
        var request = new RegisterRequest
        {
            Email = "duplicate@babylon.com",
            Password = "Babylon1"
        };

        await _client.PostAsJsonAsync("/api/v1/auth/register", request);
        var secondResponse = await _client.PostAsJsonAsync("/api/v1/auth/register", request);

        Assert.Equal(HttpStatusCode.BadRequest, secondResponse.StatusCode);
    }

    [Fact]
    public async Task Register_WithWeakPassword_Returns400()
    {
        var request = new RegisterRequest
        {
            Email = "weak@babylon.com",
            Password = "short" // < 8 chars, no digit
        };

        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── Login ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Login_AfterRegister_Returns200WithJwt()
    {
        // Register first
        var email = "mathusael@babylon.com";
        var password = "Babylon1";
        await _client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest
        {
            Email = email,
            Password = password,
            FirstName = "Mathusael"
        });

        // Then login
        var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest
        {
            Email = email,
            Password = password
        });

        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        var body = await loginResponse.Content.ReadFromJsonAsync<AuthResponseDto>();
        Assert.NotNull(body);
        Assert.NotEmpty(body.Token);
        Assert.Equal(email, body.Email);
    }

    [Fact]
    public async Task Login_WithWrongPassword_Returns401()
    {
        var email = "bansir@babylon.com";
        await _client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest
        {
            Email = email,
            Password = "Babylon1"
        });

        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest
        {
            Email = email,
            Password = "WrongPass9"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_WithUnknownEmail_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest
        {
            Email = "ghost@babylon.com",
            Password = "Babylon1"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── Authenticated endpoint ────────────────────────────────────────────────

    [Fact]
    public async Task AuthenticatedEndpoint_WithValidJwt_Returns200()
    {
        // Register and grab the JWT
        var registerResponse = await _client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest
        {
            Email = "kobbi@babylon.com",
            Password = "Babylon1",
            FirstName = "Kobbi"
        });
        var auth = await registerResponse.Content.ReadFromJsonAsync<AuthResponseDto>();

        // Call a protected endpoint with the token
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/accounts");
        req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth!.Token);

        var response = await _client.SendAsync(req);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task AuthenticatedEndpoint_WithoutJwt_Returns401()
    {
        var response = await _client.GetAsync("/api/v1/accounts");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
