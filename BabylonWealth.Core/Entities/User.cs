namespace BabylonWealth.Core.Entities;

public class User : BaseEntity<Guid>
{
    public string? FirstName { get; set; }
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public string? ProfilePhotoUrl { get; private set; }

    private User() { }

    public static User Create(string email, string passwordHash)
    {
        return new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = passwordHash
        };
    }

    public void UpdateProfilePhoto(string url)
    {
        ProfilePhotoUrl = url;
        Touch();
    }
}