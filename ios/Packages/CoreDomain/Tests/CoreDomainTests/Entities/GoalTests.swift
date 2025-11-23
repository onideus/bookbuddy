//
//  GoalTests.swift
//  CoreDomainTests
//
//  Regression tests for Goal entity verifying TypeScript defaults
//

import XCTest
@testable import CoreDomain

final class GoalTests: XCTestCase {
    
    // MARK: - Test Data
    
    private let testUserId = "user-123"
    private let testTitle = "Read 24 books in 2024"
    private let testDescription = "My annual reading challenge"
    private let testTargetBooks = 24
    
    private lazy var testStartDate: Date = {
        let calendar = Calendar.current
        return calendar.date(from: DateComponents(year: 2024, month: 1, day: 1))!
    }()
    
    private lazy var testEndDate: Date = {
        let calendar = Calendar.current
        return calendar.date(from: DateComponents(year: 2024, month: 12, day: 31))!
    }()
    
    // MARK: - Goal.create() Regression Tests
    
    func testGoalCreateDefaultValues() {
        // Test Goal.create() matches TypeScript defaults exactly
        let goal = try! Goal.create(
            userId: testUserId,
            title: testTitle,
            targetBooks: testTargetBooks,
            startDate: testStartDate,
            endDate: testEndDate
        )
        
        // Verify ID is generated (UUID format)
        XCTAssertFalse(goal.id.isEmpty, "Goal ID should be generated")
        XCTAssertTrue(UUID(uuidString: goal.id) != nil, "Goal ID should be valid UUID")
        
        // Verify required fields
        XCTAssertEqual(goal.userId, testUserId)
        XCTAssertEqual(goal.title, testTitle)
        XCTAssertEqual(goal.targetBooks, testTargetBooks)
        XCTAssertEqual(goal.startDate, testStartDate)
        XCTAssertEqual(goal.endDate, testEndDate)
        
        // Verify default values match TypeScript implementation
        XCTAssertNil(goal.description, "Default description should be nil")
        XCTAssertEqual(goal.currentBooks, 0, "Default currentBooks should be 0")
        XCTAssertFalse(goal.completed, "Default completed should be false")
    }
    
    func testGoalCreateWithDescription() {
        // Test creating goal with optional description
        let goal = try! Goal.create(
            userId: testUserId,
            title: testTitle,
            description: testDescription,
            targetBooks: testTargetBooks,
            startDate: testStartDate,
            endDate: testEndDate
        )
        
        XCTAssertEqual(goal.description, testDescription)
        XCTAssertEqual(goal.currentBooks, 0, "currentBooks should still be 0")
        XCTAssertFalse(goal.completed, "completed should still be false")
    }
    
    // MARK: - Validation Tests
    
    func testGoalCreateValidation() {
        // Test validation errors match TypeScript behavior
        
        // Empty userId
        XCTAssertThrowsError(try Goal.create(
            userId: "",
            title: testTitle,
            targetBooks: testTargetBooks,
            startDate: testStartDate,
            endDate: testEndDate
        )) { error in
            XCTAssertTrue(error is DomainError)
            if case .validation(let message) = error as! DomainError {
                XCTAssertEqual(message, "User ID cannot be empty")
            }
        }
        
        // Empty title
        XCTAssertThrowsError(try Goal.create(
            userId: testUserId,
            title: "",
            targetBooks: testTargetBooks,
            startDate: testStartDate,
            endDate: testEndDate
        )) { error in
            XCTAssertTrue(error is DomainError)
            if case .validation(let message) = error as! DomainError {
                XCTAssertEqual(message, "Title cannot be empty")
            }
        }
        
        // Whitespace-only title
        XCTAssertThrowsError(try Goal.create(
            userId: testUserId,
            title: "   \t\n   ",
            targetBooks: testTargetBooks,
            startDate: testStartDate,
            endDate: testEndDate
        )) { error in
            XCTAssertTrue(error is DomainError)
            if case .validation(let message) = error as! DomainError {
                XCTAssertEqual(message, "Title cannot be empty")
            }
        }
        
        // Zero target books
        XCTAssertThrowsError(try Goal.create(
            userId: testUserId,
            title: testTitle,
            targetBooks: 0,
            startDate: testStartDate,
            endDate: testEndDate
        )) { error in
            XCTAssertTrue(error is DomainError)
            if case .validation(let message) = error as! DomainError {
                XCTAssertEqual(message, "Target books must be greater than 0")
            }
        }
        
        // Negative target books
        XCTAssertThrowsError(try Goal.create(
            userId: testUserId,
            title: testTitle,
            targetBooks: -5,
            startDate: testStartDate,
            endDate: testEndDate
        )) { error in
            XCTAssertTrue(error is DomainError)
            if case .validation(let message) = error as! DomainError {
                XCTAssertEqual(message, "Target books must be greater than 0")
            }
        }
        
        // End date before start date
        XCTAssertThrowsError(try Goal.create(
            userId: testUserId,
            title: testTitle,
            targetBooks: testTargetBooks,
            startDate: testEndDate,
            endDate: testStartDate
        )) { error in
            XCTAssertTrue(error is DomainError)
            if case .validation(let message) = error as! DomainError {
                XCTAssertEqual(message, "End date must be after start date")
            }
        }
        
        // Same start and end date
        XCTAssertThrowsError(try Goal.create(
            userId: testUserId,
            title: testTitle,
            targetBooks: testTargetBooks,
            startDate: testStartDate,
            endDate: testStartDate
        )) { error in
            XCTAssertTrue(error is DomainError)
            if case .validation(let message) = error as! DomainError {
                XCTAssertEqual(message, "End date must be after start date")
            }
        }
    }
    
    func testGoalCreateTrimsWhitespace() {
        // Test title trimming behavior matches TypeScript
        let goal = try! Goal.create(
            userId: testUserId,
            title: "  \t 2024 Reading Goal \n  ",
            targetBooks: testTargetBooks,
            startDate: testStartDate,
            endDate: testEndDate
        )
        
        XCTAssertEqual(goal.title, "2024 Reading Goal", "Title should be trimmed")
    }
    
    // MARK: - Progress Update Regression Tests
    
    func testGoalProgressUpdate() {
        // Test progress updates match TypeScript behavior
        let goal = try! Goal.create(
            userId: testUserId,
            title: testTitle,
            targetBooks: testTargetBooks,
            startDate: testStartDate,
            endDate: testEndDate
        )
        
        // Update progress but not completed
        let updatedGoal = goal.withCurrentBooks(10)
        XCTAssertEqual(updatedGoal.currentBooks, 10)
        XCTAssertFalse(updatedGoal.completed, "Should not be completed with 10/24 books")
        
        // Update progress to target (should auto-complete)
        let completedGoal = goal.withCurrentBooks(24)
        XCTAssertEqual(completedGoal.currentBooks, 24)
        XCTAssertTrue(completedGoal.completed, "Should be auto-completed when reaching target")
        
        // Update progress beyond target (should stay completed)
        let exceededGoal = goal.withCurrentBooks(30)
        XCTAssertEqual(exceededGoal.currentBooks, 30)
        XCTAssertTrue(exceededGoal.completed, "Should be completed when exceeding target")
    }
    
    func testGoalManualCompletion() {
        // Test manual completion
        let goal = try! Goal.create(
            userId: testUserId,
            title: testTitle,
            targetBooks: testTargetBooks,
            startDate: testStartDate,
            endDate: testEndDate
        )
        
        let manuallyCompletedGoal = goal.markAsCompleted()
        XCTAssertTrue(manuallyCompletedGoal.completed, "Should be marked as completed")
        XCTAssertEqual(manuallyCompletedGoal.currentBooks, 0, "currentBooks should remain unchanged")
    }
    
    // MARK: - Computed Properties Regression Tests
    
    func testGoalComputedProperties() {
        // Test computed properties match TypeScript behavior
        let goal = try! Goal.create(
            userId: testUserId,
            title: testTitle,
            targetBooks: testTargetBooks,
            startDate: testStartDate,
            endDate: testEndDate
        )
        
        // Test with 50% progress
        let halfwayGoal = goal.withCurrentBooks(12)
        XCTAssertEqual(halfwayGoal.progressPercentage, 0.5, accuracy: 0.01)
        XCTAssertEqual(halfwayGoal.progressPercentageInt, 50)
        XCTAssertEqual(halfwayGoal.booksRemaining, 12)
        
        // Test with 100% progress
        let completedGoal = goal.withCurrentBooks(24)
        XCTAssertEqual(completedGoal.progressPercentage, 1.0)
        XCTAssertEqual(completedGoal.progressPercentageInt, 100)
        XCTAssertEqual(completedGoal.booksRemaining, 0)
        
        // Test with over 100% progress
        let exceededGoal = goal.withCurrentBooks(30)
        XCTAssertEqual(exceededGoal.progressPercentage, 1.0, "Progress should be capped at 1.0")
        XCTAssertEqual(exceededGoal.progressPercentageInt, 100, "Progress percentage should be capped at 100")
        XCTAssertEqual(exceededGoal.booksRemaining, 0, "Books remaining should be 0 when exceeded")
    }
    
    func testGoalStatusComputation() {
        // Test goal status computation
        let now = Date()
        let calendar = Calendar.current
        
        // Future goal (not started)
        let futureStart = calendar.date(byAdding: .day, value: 30, to: now)!
        let futureEnd = calendar.date(byAdding: .day, value: 60, to: now)!
        let futureGoal = try! Goal.create(
            userId: testUserId,
            title: "Future Goal",
            targetBooks: 10,
            startDate: futureStart,
            endDate: futureEnd
        )
        XCTAssertEqual(futureGoal.status, .notStarted)
        XCTAssertFalse(futureGoal.hasStarted)
        XCTAssertFalse(futureGoal.isActive)
        XCTAssertFalse(futureGoal.isOverdue)
        
        // Active goal (in progress)
        let pastStart = calendar.date(byAdding: .day, value: -30, to: now)!
        let futureEndActive = calendar.date(byAdding: .day, value: 30, to: now)!
        let activeGoal = try! Goal.create(
            userId: testUserId,
            title: "Active Goal",
            targetBooks: 10,
            startDate: pastStart,
            endDate: futureEndActive
        )
        XCTAssertEqual(activeGoal.status, .inProgress)
        XCTAssertTrue(activeGoal.hasStarted)
        XCTAssertTrue(activeGoal.isActive)
        XCTAssertFalse(activeGoal.isOverdue)
        
        // Completed goal
        let completedGoal = activeGoal.withCurrentBooks(10)
        XCTAssertEqual(completedGoal.status, .completed)
        XCTAssertFalse(completedGoal.isActive)
        XCTAssertFalse(completedGoal.isOverdue)
        
        // Overdue goal
        let pastEnd = calendar.date(byAdding: .day, value: -10, to: now)!
        let overdueGoal = try! Goal.create(
            userId: testUserId,
            title: "Overdue Goal",
            targetBooks: 10,
            startDate: pastStart,
            endDate: pastEnd
        )
        XCTAssertEqual(overdueGoal.status, .overdue)
        XCTAssertTrue(overdueGoal.hasStarted)
        XCTAssertFalse(overdueGoal.isActive)
        XCTAssertTrue(overdueGoal.isOverdue)
    }
}