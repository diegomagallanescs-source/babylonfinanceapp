using System.ComponentModel.DataAnnotations;

namespace BabylonWealth.Core.DTOs.Requests;

public class UpdateUserRequest
{
    [MaxLength(100)]
    public string? FirstName { get; set; }
}
