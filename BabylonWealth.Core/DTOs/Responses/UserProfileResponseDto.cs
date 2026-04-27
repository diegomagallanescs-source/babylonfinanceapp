namespace BabylonWealth.Core.DTOs.Responses;

public class UserProfileResponseDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public DateTime CreatedAt { get; set; }
}
