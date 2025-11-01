//
//  ContentView.swift
//  BookTracker
//
//  Created by BookTracker Team
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Image(systemName: "book.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.blue)

                Text("BookTracker")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Your personal reading companion")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Text("Coming Soon")
                    .font(.title2)
                    .foregroundColor(.blue)
                    .padding(.top, 20)
            }
            .padding()
            .navigationTitle("BookTracker")
        }
    }
}

#Preview {
    ContentView()
}
