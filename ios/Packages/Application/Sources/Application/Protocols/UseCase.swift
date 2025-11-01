//
//  UseCase.swift
//  Application
//
//  Base protocol for all use cases in the application layer
//

import Foundation

/// Protocol that all use cases must conform to
/// Use cases represent application-specific business rules
public protocol UseCase {
    /// Input type for the use case
    associatedtype Input

    /// Output type returned by the use case
    associatedtype Output

    /// Executes the use case with the given input
    /// - Parameter input: The input data required for this use case
    /// - Returns: The output result of the use case execution
    /// - Throws: Domain errors if the use case cannot be completed
    func execute(_ input: Input) async throws -> Output
}

/// Protocol for use cases that don't require input
public protocol NoInputUseCase {
    /// Output type returned by the use case
    associatedtype Output

    /// Executes the use case without input
    /// - Returns: The output result of the use case execution
    /// - Throws: Domain errors if the use case cannot be completed
    func execute() async throws -> Output
}

/// Protocol for use cases that don't return output
public protocol VoidOutputUseCase {
    /// Input type for the use case
    associatedtype Input

    /// Executes the use case with the given input, returning nothing
    /// - Parameter input: The input data required for this use case
    /// - Throws: Domain errors if the use case cannot be completed
    func execute(_ input: Input) async throws
}
