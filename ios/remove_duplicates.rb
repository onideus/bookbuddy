#!/usr/bin/env ruby
require 'xcodeproj'

# Open the Xcode project
project_path = 'BookTrackerIOS.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Get the main target
target = project.targets.find { |t| t.name == 'BookTrackerApp' }

# Files to remove (old duplicates at root level - these are wrong!)
# We want to keep the ones in Core/ subdirectories
files_to_remove = [
  'AppContainer.swift',    # Remove root level, keep BookTrackerApp/Core/AppContainer.swift
  'RootView.swift',        # Remove root level, keep BookTrackerApp/Core/RootView.swift
  'ContentView.swift',     # This is unused
]

removed_count = 0

files_to_remove.each do |file_name|
  # Find all file references matching just the filename (not full path)
  # We want to remove ones that are at root level
  file_refs = project.files.select do |f|
    f.path == file_name || f.path&.end_with?("/#{file_name}")
  end

  file_refs.each do |file_ref|
    # Only remove if it's the root-level version
    # (path is just the filename, not a full path with subdirectories)
    if file_ref.path == file_name
      # Remove from build phases
      target.source_build_phase.files.each do |build_file|
        if build_file.file_ref == file_ref
          target.source_build_phase.remove_file_reference(file_ref)
          puts "✅ Removed from build phase: #{file_name}"
        end
      end

      # Remove the file reference
      file_ref.remove_from_project
      puts "✅ Removed reference: #{file_name}"
      removed_count += 1
    end
  end
end

# Save the project
project.save

puts "\n" + "="*50
puts "Removed #{removed_count} duplicate file(s)"
puts "="*50
puts "\n✨ Project cleaned successfully!"
