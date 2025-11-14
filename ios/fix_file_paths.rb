#!/usr/bin/env ruby
require 'xcodeproj'

# Open the Xcode project
project_path = 'BookTrackerIOS.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Get the main target
target = project.targets.find { |t| t.name == 'BookTrackerApp' }

puts "Fixing mangled file paths..."

fixed_count = 0

# Iterate through all file references
project.files.each do |file_ref|
  next unless file_ref.path

  path = file_ref.path

  # Check if path has duplicate components
  if path.include?('BookTrackerApp/Features/BookTrackerApp/Features') ||
     path.include?('BookTrackerApp/BookTrackerApp/Core') ||
     path.include?('Features/Books/Components/BookTrackerApp/Features/Books/Components') ||
     path.include?('Features/Books/Views/BookTrackerApp/Features/Books/Views') ||
     path.include?('Features/Books/ViewModels/BookTrackerApp/Features/Books/ViewModels')

    # Fix the path by removing duplicate segments
    fixed_path = path.dup

    # Remove duplicated path segments
    fixed_path = fixed_path.gsub('BookTrackerApp/Features/BookTrackerApp/Features', 'BookTrackerApp/Features')
    fixed_path = fixed_path.gsub('BookTrackerApp/BookTrackerApp/Core', 'BookTrackerApp/Core')
    fixed_path = fixed_path.gsub('Features/Books/Components/BookTrackerApp/Features/Books/Components', 'BookTrackerApp/Features/Books/Components')
    fixed_path = fixed_path.gsub('Features/Books/Views/BookTrackerApp/Features/Books/Views', 'BookTrackerApp/Features/Books/Views')
    fixed_path = fixed_path.gsub('Features/Books/ViewModels/BookTrackerApp/Features/Books/ViewModels', 'BookTrackerApp/Features/Books/ViewModels')

    # Update the file reference
    file_ref.path = fixed_path
    puts "✅ Fixed: #{path}"
    puts "    -> #{fixed_path}"
    fixed_count += 1
  end
end

# Save the project
project.save

puts "\n" + "="*50
puts "Fixed #{fixed_count} file path(s)"
puts "="*50
puts "\n✨ Paths fixed! Try building again."
