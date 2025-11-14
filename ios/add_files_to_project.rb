#!/usr/bin/env ruby
require 'xcodeproj'

# Open the Xcode project
project_path = 'BookTrackerIOS.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Get the main target
target = project.targets.find { |t| t.name == 'BookTrackerApp' }

if target.nil?
  puts "Error: Could not find BookTrackerApp target"
  exit 1
end

# Get or create the BookTrackerApp group
app_group = project.main_group.find_subpath('BookTrackerApp', true)

# Define files to add (relative to ios directory)
files_to_add = [
  # Core
  'BookTrackerApp/Core/AppContainer.swift',
  'BookTrackerApp/Core/MainTabView.swift',
  'BookTrackerApp/Core/RootView.swift',

  # Auth
  'BookTrackerApp/Features/Auth/ViewModels/AuthViewModel.swift',
  'BookTrackerApp/Features/Auth/Views/LoginView.swift',
  'BookTrackerApp/Features/Auth/Views/RegisterView.swift',

  # Books
  'BookTrackerApp/Features/Books/ViewModels/BooksListViewModel.swift',
  'BookTrackerApp/Features/Books/ViewModels/SearchBooksViewModel.swift',
  'BookTrackerApp/Features/Books/Views/BooksListView.swift',
  'BookTrackerApp/Features/Books/Views/BookDetailView.swift',
  'BookTrackerApp/Features/Books/Views/AddBookView.swift',
  'BookTrackerApp/Features/Books/Components/BookCard.swift',
  'BookTrackerApp/Features/Books/Components/BookSearchResultCard.swift',

  # Goals
  'BookTrackerApp/Features/Goals/ViewModels/GoalsViewModel.swift',
  'BookTrackerApp/Features/Goals/Views/GoalsListView.swift',
  'BookTrackerApp/Features/Goals/Views/CreateGoalView.swift',
  'BookTrackerApp/Features/Goals/Components/GoalCard.swift',

  # Search
  'BookTrackerApp/Features/Search/ViewModels/SearchViewModel.swift',
  'BookTrackerApp/Features/Search/Views/SearchView.swift',
  'BookTrackerApp/Features/Search/Components/SearchResultCard.swift',
]

added_count = 0
skipped_count = 0

files_to_add.each do |file_path|
  # Check if file exists
  unless File.exist?(file_path)
    puts "⚠️  File not found: #{file_path}"
    next
  end

  # Check if file is already in the project
  existing_file = project.files.find { |f| f.path == file_path }
  if existing_file
    puts "⏭️  Already in project: #{file_path}"
    skipped_count += 1
    next
  end

  # Create group structure
  path_components = file_path.split('/')
  current_group = app_group

  # Navigate/create groups (skip 'BookTrackerApp' and file name)
  path_components[1..-2].each do |component|
    subgroup = current_group[component]
    unless subgroup
      subgroup = current_group.new_group(component)
    end
    current_group = subgroup
  end

  # Add file reference
  file_ref = current_group.new_reference(file_path)

  # Add to build phase
  target.source_build_phase.add_file_reference(file_ref)

  puts "✅ Added: #{file_path}"
  added_count += 1
end

# Save the project
project.save

puts "\n" + "="*50
puts "Summary:"
puts "  Added: #{added_count} files"
puts "  Skipped: #{skipped_count} files"
puts "  Total: #{files_to_add.length} files"
puts "="*50
puts "\n✨ Project updated successfully!"
puts "   Run 'xcodebuild' to verify the build."
