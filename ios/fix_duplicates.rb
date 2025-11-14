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

puts "Checking for duplicate files in build phases..."

# Track files by their basename (filename without path)
file_map = {}
duplicates_removed = 0

# Get all build files from source build phase
build_files = target.source_build_phase.files.dup

build_files.each do |build_file|
  next unless build_file.file_ref

  file_path = build_file.file_ref.path
  file_name = File.basename(file_path)

  if file_map[file_name]
    # This is a duplicate - remove it
    target.source_build_phase.files.delete(build_file)
    puts "✅ Removed duplicate: #{file_path}"
    duplicates_removed += 1
  else
    # First occurrence - track it
    file_map[file_name] = build_file
  end
end

# Save the project
project.save

puts "\n" + "="*50
puts "Removed #{duplicates_removed} duplicate file(s) from build phase"
puts "="*50

if duplicates_removed > 0
  puts "\n✨ Project fixed! Try building again."
else
  puts "\n⚠️  No duplicates found in build phase."
  puts "   The issue might be elsewhere. Checking for other problems..."
end
