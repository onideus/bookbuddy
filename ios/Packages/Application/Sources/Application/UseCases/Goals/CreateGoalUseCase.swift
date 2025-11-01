//
//  CreateGoalUseCase.swift
//  Application
//
//  Use case for creating a new reading goal
//

import Foundation
import CoreDomain

/// Input for creating a goal
public struct CreateGoalInput {
    public let userId: String
    public let title: String
    public let description: String?
    public let targetBooks: Int
    public let startDate: Date
    public let endDate: Date

    public init(
        userId: String,
        title: String,
        description: String? = nil,
        targetBooks: Int,
        startDate: Date,
        endDate: Date
    ) {
        self.userId = userId
        self.title = title
        self.description = description
        self.targetBooks = targetBooks
        self.startDate = startDate
        self.endDate = endDate
    }
}

/// Use case for creating a reading goal
public final class CreateGoalUseCase: UseCase {
    public typealias Input = CreateGoalInput
    public typealias Output = Goal

    private let goalRepository: GoalRepositoryProtocol

    public init(goalRepository: GoalRepositoryProtocol) {
        self.goalRepository = goalRepository
    }

    public func execute(_ input: Input) async throws -> Goal {
        // Create the goal entity (validation happens in Goal.create)
        let goal = try Goal.create(
            userId: input.userId,
            title: input.title,
            description: input.description,
            targetBooks: input.targetBooks,
            startDate: input.startDate,
            endDate: input.endDate
        )

        // Save to repository
        return try await goalRepository.create(goal)
    }
}
