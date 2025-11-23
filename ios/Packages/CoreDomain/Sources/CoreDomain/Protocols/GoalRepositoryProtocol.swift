import Foundation

/// Protocol for goal repository operations
public protocol GoalRepositoryProtocol {
    /// Creates a new goal
    /// - Parameter goal: Goal entity to create
    /// - Returns: Created goal
    /// - Throws: DomainError if creation fails
    func create(_ goal: Goal) async throws -> Goal

    /// Finds all goals for a user
    /// - Parameter userId: User ID
    /// - Returns: Array of goals
    /// - Throws: DomainError if operation fails
    func findByUserId(_ userId: String) async throws -> [Goal]
    
    /// Finds goals for a user with pagination
    /// - Parameters:
    ///   - userId: User ID
    ///   - offset: Number of records to skip
    ///   - limit: Maximum number of records to return (nil for all records)
    /// - Returns: Array of goals
    /// - Throws: DomainError if operation fails
    func findByUserId(_ userId: String, offset: Int, limit: Int?) async throws -> [Goal]

    /// Finds a goal by ID
    /// - Parameter id: Goal ID
    /// - Returns: Goal if found, nil otherwise
    /// - Throws: DomainError if operation fails
    func findById(_ id: String) async throws -> Goal?

    /// Updates an existing goal
    /// - Parameters:
    ///   - id: Goal ID to update
    ///   - updates: Partial goal updates
    /// - Returns: Updated goal if found, nil otherwise
    /// - Throws: DomainError if operation fails
    func update(_ id: String, updates: GoalUpdate) async throws -> Goal?

    /// Deletes a goal
    /// - Parameter id: Goal ID to delete
    /// - Returns: True if deleted, false if not found
    /// - Throws: DomainError if operation fails
    func delete(_ id: String) async throws -> Bool

    /// Finds active (non-completed) goals for a user
    /// - Parameter userId: User ID
    /// - Returns: Array of active goals
    /// - Throws: DomainError if operation fails
    func findActiveByUserId(_ userId: String) async throws -> [Goal]
    
    /// Checks if a goal exists for a user
    /// - Parameters:
    ///   - userId: User ID
    ///   - goalId: Goal ID to check
    /// - Returns: True if goal exists, false otherwise
    /// - Throws: DomainError if operation fails
    func exists(userId: String, goalId: String) async throws -> Bool
}

/// Struct representing partial goal updates
public struct GoalUpdate: Equatable, Sendable {
    public let title: String?
    public let description: String?
    public let targetBooks: Int?
    public let currentBooks: Int?
    public let endDate: Date?
    public let completed: Bool?

    public init(
        title: String? = nil,
        description: String? = nil,
        targetBooks: Int? = nil,
        currentBooks: Int? = nil,
        endDate: Date? = nil,
        completed: Bool? = nil
    ) {
        self.title = title
        self.description = description
        self.targetBooks = targetBooks
        self.currentBooks = currentBooks
        self.endDate = endDate
        self.completed = completed
    }
}
