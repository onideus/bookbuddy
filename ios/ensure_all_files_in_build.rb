#!/usr/bin/env ruby
require 'xcodeproj'

# Open the Xcode project
project_path = 'BookTrackerIOS.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Get the main target
target = project.targets.find { |t| t.name == 'BookTrackerApp' }

puts "Ensuring all Swift files are in the build phase..."
puts "="*70

added_count = 0

# Get all Swift file references in the project
project.files.each do |file_ref|
  next unless file_ref.path
  next unless file_ref.path.end_with?('.swift')

  # Skip test files and generated files
  next if file_ref.path.include?('Tests')
  next if file_ref.path.include?('DerivedSources')

  # Check if this file is already in the build phase
  in_build_phase = target.source_build_phase.files.any? do |build_file|
    build_file.file_ref == file_ref
  end

  unless in_build_phase
    # Add it to the build phase
    target.source_build_phase.add_file_reference(file_ref)
    puts "  ✅ Added to build phase: #{file_ref.path}"
    added_count += 1
  end
end

# Save the project
if added_count > 0
  project.save
  puts "\n" + "="*70
  puts "Added #{added_count} file(s) to build phase"
  puts "="*70
  puts "\n✨ Build phase updated!"
else
  puts "\n" + "="*70
  puts "All Swift files are already in the build phase"
  puts "="*70
end
