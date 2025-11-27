//
//  InfrastructureIOSTests.swift
//  InfrastructureIOSTests
//
//  Unit tests for InfrastructureIOS layer
//

import XCTest
@testable import InfrastructureIOS

final class InfrastructureIOSTests: XCTestCase {
    func testExample() {
        // Placeholder test
        XCTAssertTrue(true)
    }

    func testSearchEndpointRequiresAuth() {
        let endpoint = APIEndpoint.searchBooks(query: "harry potter")

        XCTAssertEqual(endpoint.path, "/search")
        XCTAssertEqual(endpoint.method, .get)
        XCTAssertTrue(endpoint.requiresAuth)
    }
}
