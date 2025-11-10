#!/usr/bin/env ruby
require 'xcodeproj'

# Open the Xcode project
project_path = 'BookTrackerIOS.xcodeproj'
project = Xcodeproj::Project.open(project_path)

puts "Inspecting file references for path issues..."
puts "="*70

fixed_count = 0

# Check all file references
project.files.each do |file_ref|
  next unless file_ref.path

  original_path = file_ref.path

  # Check for patterns indicating mangled paths:
  # 1. BookTrackerApp/BookTrackerApp/...
  # 2. Features/.../BookTrackerApp/Features/...
  if original_path.include?('BookTrackerApp/BookTrackerApp/') ||
     original_path =~ /Features\/.*\/BookTrackerApp\/Features\// ||
     original_path =~ /Components\/.*\/BookTrackerApp\/.*\/Components\// ||
     original_path =~ /Views\/.*\/BookTrackerApp\/.*\/Views\// ||
     original_path =~ /ViewModels\/.*\/BookTrackerApp\/.*\/ViewModels\//

    # Extract the filename
    filename = File.basename(original_path)

    # Determine the correct path based on the filename and pattern
    correct_path = nil

    case filename
    when 'MainTabView.swift'
      correct_path = 'BookTrackerApp/Core/MainTabView.swift'
    when 'SearchBooksViewModel.swift'
      correct_path = 'BookTrackerApp/Features/Books/ViewModels/SearchBooksViewModel.swift'
    when 'BookDetailView.swift'
      correct_path = 'BookTrackerApp/Features/Books/Views/BookDetailView.swift'
    when 'AddBookView.swift'
      correct_path = 'BookTrackerApp/Features/Books/Views/AddBookView.swift'
    when 'BookSearchResultCard.swift'
      correct_path = 'BookTrackerApp/Features/Books/Components/BookSearchResultCard.swift'
    when 'GoalsViewModel.swift'
      correct_path = 'BookTrackerApp/Features/Goals/ViewModels/GoalsViewModel.swift'
    when 'GoalsListView.swift'
      correct_path = 'BookTrackerApp/Features/Goals/Views/GoalsListView.swift'
    when 'CreateGoalView.swift'
      correct_path = 'BookTrackerApp/Features/Goals/Views/CreateGoalView.swift'
    when 'GoalCard.swift'
      correct_path = 'BookTrackerApp/Features/Goals/Components/GoalCard.swift'
    when 'SearchViewModel.swift'
      correct_path = 'BookTrackerApp/Features/Search/ViewModels/SearchViewModel.swift'
    when 'SearchView.swift'
      correct_path = 'BookTrackerApp/Features/Search/Views/SearchView.swift'
    when 'SearchResultCard.swift'
      correct_path = 'BookTrackerApp/Features/Search/Components/SearchResultCard.swift'
    end

    if correct_path && File.exist?(correct_path)
      puts "Found mangled path:"
      puts "  Original: #{original_path}"
      puts "  Correct:  #{correct_path}"

      # Update the file reference path
      file_ref.path = correct_path

      # Also set source_tree to SOURCE_ROOT to make it absolute from project root
      file_ref.source_tree = 'SOURCE_ROOT'

      puts "  ✅ Fixed!"
      puts
      fixed_count += 1
    elsif correct_path
      puts "⚠️  Path is mangled but file doesn't exist at expected location:"
      puts "  Mangled: #{original_path}"
      puts "  Expected: #{correct_path}"
      puts
    end
  end
end

# Save the project
if fixed_count > 0
  project.save
  puts "="*70
  puts "Fixed #{fixed_count} file reference(s)"
  puts "="*70
  puts "\n✨ File references corrected! Try building again."
else
  puts "="*70
  puts "No mangled paths found in file references."
  puts "The issue may be in how groups concatenate paths."
  puts "="*70
end
