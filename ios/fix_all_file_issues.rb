#!/usr/bin/env ruby
require 'xcodeproj'

# Open the Xcode project
project_path = 'BookTrackerIOS.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Get the main target
target = project.targets.find { |t| t.name == 'BookTrackerApp' }

puts "Fixing file reference issues..."
puts "="*70

# Step 1: Remove duplicate file references from the project
# (files that appear multiple times with different paths)
puts "\nStep 1: Removing duplicate file references..."

file_map = {}
duplicates_removed = 0

project.files.to_a.each do |file_ref|
  next unless file_ref.path

  filename = File.basename(file_ref.path)

  # Skip non-Swift files and files that are clearly different
  next unless filename.end_with?('.swift')

  if file_map[filename]
    # We have a duplicate. Keep the one with the longer, more specific path
    existing = file_map[filename]

    # Prefer the file with full path (contains BookTrackerApp/)
    if file_ref.path.include?('BookTrackerApp/') && !existing.path.include?('BookTrackerApp/')
      # Remove the existing one, keep the new one
      existing.remove_from_project
      puts "  ✅ Removed duplicate: #{existing.path} (keeping #{file_ref.path})"
      file_map[filename] = file_ref
      duplicates_removed += 1
    elsif !file_ref.path.include?('BookTrackerApp/') && existing.path.include?('BookTrackerApp/')
      # Remove the new one, keep the existing one
      file_ref.remove_from_project
      puts "  ✅ Removed duplicate: #{file_ref.path} (keeping #{existing.path})"
      duplicates_removed += 1
    elsif file_ref.path.length < existing.path.length
      # New one is shorter (less specific), remove it
      file_ref.remove_from_project
      puts "  ✅ Removed duplicate: #{file_ref.path} (keeping #{existing.path})"
      duplicates_removed += 1
    else
      # Existing one is shorter or same, remove the new one
      file_ref.remove_from_project
      puts "  ✅ Removed duplicate: #{file_ref.path} (keeping #{existing.path})"
      duplicates_removed += 1
    end
  else
    file_map[filename] = file_ref
  end
end

# Step 2: Fix source_tree for files with full paths
puts "\nStep 2: Fixing source_tree for files with full paths..."

fixed_source_tree = 0

project.files.each do |file_ref|
  next unless file_ref.path

  # If the file path starts with "BookTrackerApp/" and source_tree is <group>,
  # change it to SOURCE_ROOT to prevent path concatenation
  if file_ref.path.start_with?('BookTrackerApp/') && file_ref.source_tree == '<group>'
    file_ref.source_tree = 'SOURCE_ROOT'
    puts "  ✅ Fixed source_tree for: #{file_ref.path}"
    fixed_source_tree += 1
  end
end

# Step 3: Remove duplicate files from build phases
puts "\nStep 3: Cleaning up build phases..."

build_file_map = {}
build_duplicates_removed = 0

target.source_build_phase.files.to_a.each do |build_file|
  next unless build_file.file_ref

  filename = File.basename(build_file.file_ref.path || "unknown")

  if build_file_map[filename]
    # Duplicate in build phase
    target.source_build_phase.files.delete(build_file)
    puts "  ✅ Removed duplicate from build phase: #{filename}"
    build_duplicates_removed += 1
  else
    build_file_map[filename] = build_file
  end
end

# Save the project
project.save

puts "\n" + "="*70
puts "Summary:"
puts "  File references removed: #{duplicates_removed}"
puts "  Source trees fixed: #{fixed_source_tree}"
puts "  Build phase duplicates removed: #{build_duplicates_removed}"
puts "="*70
puts "\n✨ All file issues fixed! Try building again."
