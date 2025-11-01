//
//  GetUserGoalsUseCase.swift
//  Application
//
//  Use case for retrieving all goals for a user
//

import Foundation
import CoreDomain

/// Input for getting user's goals
public struct GetUserGoalsInput {
    public let userId: String

    public init(userId: String) {
        self.userId = userId
    }
}

/// Use case for retrieving user's goals
public final class GetUserGoalsUseCase: UseCase {
    public typealias Input = GetUserGoalsInput
    public typealias Output = [Goal]

    private let goalRepository: GoalRepositoryProtocol

    public init(goalRepository: GoalRepositoryProtocol) {
        self.goalRepository = goalRepository
    }

    public func execute(_ input: Input) async throws -> [Goal] {
        return try await goalRepository.findByUserId(input.userId)
    }
}
