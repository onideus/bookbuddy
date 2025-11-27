//
//  GoalWorkflowTests.swift
//  ApplicationTests
//
//  Integration tests for complete goal management and tracking workflows
//  Tests goal creation, progress tracking, and completion scenarios
//

import XCTest
@testable import Application
@testable import CoreDomain

final class GoalWorkflowTests: XCTestCase {
    
    // MARK: - System Under Test
    
    private var createGoalUseCase: CreateGoalUseCase!
    private var updateGoalUseCase: UpdateGoalUseCase!
    private var deleteGoalUseCase: DeleteGoalUseCase!
    private var getUserGoalsUseCase: GetUserGoalsUseCase!
    private var addBookUseCase: AddBookUseCase!
    private var updateBookUseCase: UpdateBookUseCase!
    
    // MARK: - Mock Dependencies
    
    private var mockGoalRepository: MockGoalRepository!
    private var mockBookRepository: MockBookRepository!
    
    // MARK: - Test Data
    
    private let testUserId = "goal-workflow-user-id"
    
    // MARK: - Setup & Teardown
    
    override func setUpWithError() throws {
        try super.setUpWithError()
        
        mockGoalRepository = MockGoalRepository()
        mockBookRepository = MockBookRepository()
        
        // Initialize use cases with shared dependencies
        createGoalUseCase = CreateGoalUseCase(goalRepository: mockGoalRepository)
        updateGoalUseCase = UpdateGoalUseCase(goalRepository: mockGoalRepository)
        deleteGoalUseCase = DeleteGoalUseCase(goalRepository: mockGoalRepository)
        getUserGoalsUseCase = GetUserGoalsUseCase(goalRepository: mockGoalRepository)
        addBookUseCase = AddBookUseCase(bookRepository: mockBookRepository)
        updateBookUseCase = UpdateBookUseCase(bookRepository: mockBookRepository)
        
        // Reset all mocks
        mockGoalRepository.reset()
        mockBookRepository.reset()
    }
    
    override func tearDownWithError() throws {
        createGoalUseCase = nil
        updateGoalUseCase = nil
        deleteGoalUseCase = nil
        getUserGoalsUseCase = nil
        addBookUseCase = nil
        updateBookUseCase = nil
        mockGoalRepository = nil
        mockBookRepository = nil
        
        try super.tearDownWithError()
    }
    
    // MARK: - Goal Creation and Management Workflow Tests
    
    func testCompleteGoalWorkflow_FromCreationToCompletion_WorksCorrectly() async throws {
        // MARK: 1. Create Annual Reading Goal
        
        let startDate = Calendar.current.startOfDay(for: Date())
        let endDate = Calendar.current.date(byAdding: .year, value: 1, to: startDate)!
        
        let createInput = CreateGoalInput(
            userId: testUserId,
            title: "Read 24 Books This Year",
            description: "Challenge myself to read 2 books per month",
            targetBooks: 24,
            startDate: startDate,
            endDate: endDate
        )
        
        let createdGoal = try await createGoalUseCase.execute(createInput)
        
        // Verify initial goal state
        XCTAssertEqual(createdGoal.title, "Read 24 Books This Year")
        XCTAssertEqual(createdGoal.targetBooks, 24)
        XCTAssertEqual(createdGoal.currentBooks, 0)
        XCTAssertFalse(createdGoal.completed)
        XCTAssertEqual(createdGoal.startDate, startDate)
        XCTAssertEqual(createdGoal.endDate, endDate)
        
        // MARK: 2. Add Books and Simulate Reading Progress
        
        // Add and complete first book
        let book1 = try await addTestBook(title: "Book 1", status: .wantToRead)
        _ = try await completeBook(book1)
        
        // Update goal progress manually (simulating business logic)
        let progress1Update = GoalUpdate(currentBooks: 1)
        let progress1Input = UpdateGoalInput(
            goalId: createdGoal.id,
            userId: testUserId,
            updates: progress1Update
        )
        
        let goal1Progress = try await updateGoalUseCase.execute(progress1Input)
        XCTAssertEqual(goal1Progress.currentBooks, 1)
        XCTAssertFalse(goal1Progress.completed)
        
        // Add and complete several more books (simulate mid-year progress)
        for i in 2...12 {
            let book = try await addTestBook(title: "Book \(i)", status: .wantToRead)
            _ = try await completeBook(book)
        }
        
        // Update goal to 50% completion
        let midYearUpdate = GoalUpdate(currentBooks: 12)
        let midYearInput = UpdateGoalInput(
            goalId: createdGoal.id,
            userId: testUserId,
            updates: midYearUpdate
        )
        
        let midYearGoal = try await updateGoalUseCase.execute(midYearInput)
        XCTAssertEqual(midYearGoal.currentBooks, 12)
        XCTAssertFalse(midYearGoal.completed) // Not yet at target
        
        // MARK: 3. Complete Remaining Books and Achieve Goal
        
        for i in 13...24 {
            let book = try await addTestBook(title: "Book \(i)", status: .wantToRead)
            _ = try await completeBook(book)
        }
        
        // Complete the goal
        let completionUpdate = GoalUpdate(currentBooks: 24, completed: true)
        let completionInput = UpdateGoalInput(
            goalId: createdGoal.id,
            userId: testUserId,
            updates: completionUpdate
        )
        
        let completedGoal = try await updateGoalUseCase.execute(completionInput)
        XCTAssertEqual(completedGoal.currentBooks, 24)
        XCTAssertEqual(completedGoal.targetBooks, 24)
        XCTAssertTrue(completedGoal.completed)
        
        // MARK: 4. Verify Goal in User's Collection
        
        let getUserGoalsInput = GetUserGoalsInput(userId: testUserId)
        let userGoals = try await getUserGoalsUseCase.execute(getUserGoalsInput)
        
        XCTAssertEqual(userGoals.count, 1)
        XCTAssertTrue(userGoals[0].completed)
        XCTAssertEqual(userGoals[0].currentBooks, 24)
        
        // Verify operation counts
        XCTAssertEqual(mockGoalRepository.createCallCount, 1)
        XCTAssertGreaterThan(mockGoalRepository.updateCallCount, 0)
    }
    
    func testMultipleGoalsWorkflow_SimultaneousGoals_WorksCorrectly() async throws {
        // MARK: 1. Create Multiple Goals with Different Targets and Timeframes
        
        let currentDate = Date()
        
        // Short-term goal: 3 months, 6 books
        let shortTermGoal = try await createGoalUseCase.execute(CreateGoalInput(
            userId: testUserId,
            title: "Summer Reading Sprint",
            description: "Quick summer reading challenge",
            targetBooks: 6,
            startDate: currentDate,
            endDate: Calendar.current.date(byAdding: .month, value: 3, to: currentDate)!
        ))
        
        // Medium-term goal: 6 months, 12 books
        let mediumTermGoal = try await createGoalUseCase.execute(CreateGoalInput(
            userId: testUserId,
            title: "Half-Year Challenge",
            description: "6 months to read 12 books",
            targetBooks: 12,
            startDate: currentDate,
            endDate: Calendar.current.date(byAdding: .month, value: 6, to: currentDate)!
        ))
        
        // Long-term goal: 1 year, 24 books
        let longTermGoal = try await createGoalUseCase.execute(CreateGoalInput(
            userId: testUserId,
            title: "Annual Reading Goal",
            description: "Read 24 books in a year",
            targetBooks: 24,
            startDate: currentDate,
            endDate: Calendar.current.date(byAdding: .year, value: 1, to: currentDate)!
        ))
        
        // MARK: 2. Progress on Different Goals
        
        // Complete the short-term goal first
        let shortTermCompletion = GoalUpdate(currentBooks: 6, completed: true)
        let shortTermInput = UpdateGoalInput(
            goalId: shortTermGoal.id,
            userId: testUserId,
            updates: shortTermCompletion
        )
        
        let completedShortTerm = try await updateGoalUseCase.execute(shortTermInput)
        XCTAssertTrue(completedShortTerm.completed)
        XCTAssertEqual(completedShortTerm.currentBooks, 6)
        
        // Progress on medium-term goal
        let mediumTermProgress = GoalUpdate(currentBooks: 8)
        let mediumTermInput = UpdateGoalInput(
            goalId: mediumTermGoal.id,
            userId: testUserId,
            updates: mediumTermProgress
        )
        
        let progressedMediumTerm = try await updateGoalUseCase.execute(mediumTermInput)
        XCTAssertFalse(progressedMediumTerm.completed)
        XCTAssertEqual(progressedMediumTerm.currentBooks, 8)
        
        // Progress on long-term goal
        let longTermProgress = GoalUpdate(currentBooks: 10)
        let longTermInput = UpdateGoalInput(
            goalId: longTermGoal.id,
            userId: testUserId,
            updates: longTermProgress
        )
        
        let progressedLongTerm = try await updateGoalUseCase.execute(longTermInput)
        XCTAssertFalse(progressedLongTerm.completed)
        XCTAssertEqual(progressedLongTerm.currentBooks, 10)
        
        // MARK: 3. Verify All Goals State
        
        let getUserGoalsInput = GetUserGoalsInput(userId: testUserId)
        let userGoals = try await getUserGoalsUseCase.execute(getUserGoalsInput)
        
        XCTAssertEqual(userGoals.count, 3)
        
        // Find goals by their characteristics
        let completedGoals = userGoals.filter { $0.completed }
        let activeGoals = userGoals.filter { !$0.completed }
        
        XCTAssertEqual(completedGoals.count, 1)
        XCTAssertEqual(activeGoals.count, 2)
        
        // Verify completed goal
        let completedGoal = completedGoals[0]
        XCTAssertEqual(completedGoal.targetBooks, 6)
        XCTAssertEqual(completedGoal.currentBooks, 6)
        
        // Verify creation and update counts
        XCTAssertEqual(mockGoalRepository.createCallCount, 3)
        XCTAssertEqual(mockGoalRepository.updateCallCount, 3)
    }
    
    func testGoalModificationWorkflow_ChangingTargetsAndDates_WorksCorrectly() async throws {
        // MARK: 1. Create Initial Goal
        
        let initialStartDate = Date()
        let initialEndDate = Calendar.current.date(byAdding: .month, value: 6, to: initialStartDate)!
        
        let createInput = CreateGoalInput(
            userId: testUserId,
            title: "Flexible Reading Goal",
            description: "A goal that will be modified",
            targetBooks: 10,
            startDate: initialStartDate,
            endDate: initialEndDate
        )
        
        let createdGoal = try await createGoalUseCase.execute(createInput)
        
        // MARK: 2. Increase Target (More Ambitious)
        
        let increaseTargetUpdate = GoalUpdate(
            description: "Increased ambition - aiming higher!",
            targetBooks: 15
        )
        
        let increaseTargetInput = UpdateGoalInput(
            goalId: createdGoal.id,
            userId: testUserId,
            updates: increaseTargetUpdate
        )
        
        let increasedGoal = try await updateGoalUseCase.execute(increaseTargetInput)
        XCTAssertEqual(increasedGoal.targetBooks, 15)
        XCTAssertEqual(increasedGoal.description, "Increased ambition - aiming higher!")
        
        // MARK: 3. Extend Deadline
        
        let newEndDate = Calendar.current.date(byAdding: .month, value: 9, to: initialStartDate)!
        let extendDeadlineUpdate = GoalUpdate(endDate: newEndDate)
        
        let extendDeadlineInput = UpdateGoalInput(
            goalId: createdGoal.id,
            userId: testUserId,
            updates: extendDeadlineUpdate
        )
        
        let extendedGoal = try await updateGoalUseCase.execute(extendDeadlineInput)
        XCTAssertEqual(extendedGoal.endDate, newEndDate)
        XCTAssertEqual(extendedGoal.targetBooks, 15) // Should remain the same
        
        // MARK: 4. Progress and Complete Modified Goal
        
        let progressUpdate = GoalUpdate(currentBooks: 8)
        let progressInput = UpdateGoalInput(
            goalId: createdGoal.id,
            userId: testUserId,
            updates: progressUpdate
        )
        
        let progressGoal = try await updateGoalUseCase.execute(progressInput)
        XCTAssertEqual(progressGoal.currentBooks, 8)
        XCTAssertFalse(progressGoal.completed)
        
        // Complete the modified goal
        let completionUpdate = GoalUpdate(currentBooks: 15, completed: true)
        let completionInput = UpdateGoalInput(
            goalId: createdGoal.id,
            userId: testUserId,
            updates: completionUpdate
        )
        
        let finalGoal = try await updateGoalUseCase.execute(completionInput)
        XCTAssertTrue(finalGoal.completed)
        XCTAssertEqual(finalGoal.currentBooks, 15)
        XCTAssertEqual(finalGoal.targetBooks, 15)
        
        // Verify all modifications were applied
        XCTAssertEqual(mockGoalRepository.updateCallCount, 4)
    }
    
    func testGoalDeletionWorkflow_RemovingGoals_WorksCorrectly() async throws {
        // MARK: 1. Create Multiple Goals
        
        let currentDate = Date()
        
        let goal1 = try await createGoalUseCase.execute(CreateGoalInput(
            userId: testUserId,
            title: "Goal to Keep",
            targetBooks: 5,
            startDate: currentDate,
            endDate: Calendar.current.date(byAdding: .month, value: 3, to: currentDate)!
        ))
        
        let goal2 = try await createGoalUseCase.execute(CreateGoalInput(
            userId: testUserId,
            title: "Goal to Delete",
            targetBooks: 10,
            startDate: currentDate,
            endDate: Calendar.current.date(byAdding: .month, value: 6, to: currentDate)!
        ))
        
        // MARK: 2. Verify Both Goals Exist
        
        let initialGoals = try await getUserGoalsUseCase.execute(GetUserGoalsInput(userId: testUserId))
        XCTAssertEqual(initialGoals.count, 2)
        
        // MARK: 3. Delete One Goal
        
        let deleteInput = DeleteGoalInput(goalId: goal2.id, userId: testUserId)
        try await deleteGoalUseCase.execute(deleteInput)
        
        // MARK: 4. Verify Only One Goal Remains
        
        let remainingGoals = try await getUserGoalsUseCase.execute(GetUserGoalsInput(userId: testUserId))
        XCTAssertEqual(remainingGoals.count, 1)
        XCTAssertEqual(remainingGoals[0].id, goal1.id)
        XCTAssertEqual(remainingGoals[0].title, "Goal to Keep")
        
        // Verify operation counts
        XCTAssertEqual(mockGoalRepository.createCallCount, 2)
        XCTAssertEqual(mockGoalRepository.deleteCallCount, 1)
    }
    
    // MARK: - Complex Goal and Book Integration Scenarios
    
    func testGoalAndBookIntegrationWorkflow_BookProgressAffectsGoals_WorksCorrectly() async throws {
        // MARK: 1. Create Goal
        
        let goal = try await createGoalUseCase.execute(CreateGoalInput(
            userId: testUserId,
            title: "Book and Goal Integration",
            description: "Track books completing towards goal",
            targetBooks: 5,
            startDate: Date(),
            endDate: Calendar.current.date(byAdding: .month, value: 3, to: Date())!
        ))
        
        // MARK: 2. Add Books and Track Progress
        
        // Simulate the business logic where completing books updates goal progress
        var completedBooksCount = 0
        
        for i in 1...3 {
            let book = try await addTestBook(title: "Goal Book \(i)", status: .wantToRead)
            _ = try await completeBook(book)
            completedBooksCount += 1
            
            // Update goal progress to reflect completed book
            let progressUpdate = GoalUpdate(currentBooks: completedBooksCount)
            let progressInput = UpdateGoalInput(
                goalId: goal.id,
                userId: testUserId,
                updates: progressUpdate
            )
            
            let updatedGoal = try await updateGoalUseCase.execute(progressInput)
            XCTAssertEqual(updatedGoal.currentBooks, completedBooksCount)
            XCTAssertFalse(updatedGoal.completed) // Should not be completed yet
        }
        
        // MARK: 3. Complete Remaining Books to Achieve Goal
        
        for i in 4...5 {
            let book = try await addTestBook(title: "Final Goal Book \(i)", status: .wantToRead)
            _ = try await completeBook(book)
            completedBooksCount += 1
        }
        
        // Complete the goal
        let finalUpdate = GoalUpdate(currentBooks: 5, completed: true)
        let finalInput = UpdateGoalInput(
            goalId: goal.id,
            userId: testUserId,
            updates: finalUpdate
        )
        
        let achievedGoal = try await updateGoalUseCase.execute(finalInput)
        XCTAssertTrue(achievedGoal.completed)
        XCTAssertEqual(achievedGoal.currentBooks, 5)
        XCTAssertEqual(achievedGoal.targetBooks, 5)
        
        // MARK: 4. Verify Book and Goal State Consistency
        
        let userGoals = try await getUserGoalsUseCase.execute(GetUserGoalsInput(userId: testUserId))
        XCTAssertEqual(userGoals.count, 1)
        XCTAssertTrue(userGoals[0].completed)
        
        // Verify we created and completed the right number of books
        XCTAssertEqual(mockBookRepository.createCallCount, 5)
        XCTAssertEqual(mockBookRepository.updateCallCount, 10) // 2 updates per book (start + complete)
    }
    
    // MARK: - Helper Methods
    
    private func addTestBook(title: String, status: BookStatus) async throws -> Book {
        let input = AddBookInput(
            userId: testUserId,
            googleBooksId: UUID().uuidString,
            title: title,
            authors: ["Test Author"],
            thumbnail: nil,
            description: "Test book for goal workflow",
            pageCount: 200,
            status: status
        )
        return try await addBookUseCase.execute(input)
    }
    
    private func completeBook(_ book: Book) async throws -> Book {
        // Start reading
        let startReading = UpdateBookInput(
            bookId: book.id,
            userId: testUserId,
            updates: BookUpdate(status: .reading)
        )
        _ = try await updateBookUseCase.execute(startReading)
        
        // Complete reading
        let completeReading = UpdateBookInput(
            bookId: book.id,
            userId: testUserId,
            updates: BookUpdate(
                status: .read,
                currentPage: book.pageCount,
                rating: 4,
                finishedAt: Date()
            )
        )
        return try await updateBookUseCase.execute(completeReading)
    }
}