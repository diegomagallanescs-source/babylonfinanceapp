using BabylonWealth.Core.Entities;

namespace BabylonWealth.Core.Interfaces.Repositories;

public interface IProjectionRepository : IBaseRepository<Projection, Guid>
{
    /// <summary>All of a user's projections, newest first.</summary>
    Task<IEnumerable<Projection>> GetAllOrderedAsync(Guid userId);
}
