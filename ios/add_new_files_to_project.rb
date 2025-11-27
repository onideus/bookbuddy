#!/usr/bin/env ruby
# Script to add new Swift files to the Xcode project

require 'xcodeproj'

project_path = 'BookTrackerIOS.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Find the main target
target = project.targets.find { |t| t.name == 'BookTrackerApp' }
raise "Target 'BookTrackerApp' not found" unless target

# Find the BookTrackerApp group
main_group = project.main_group
app_group = main_group.find_subpath('BookTrackerApp', false)
raise "BookTrackerApp group not found" unless app_group

# Helper to find or create group hierarchy
def find_or_create_group(parent, path_components)
  current = parent
  path_components.each do |component|
    existing = current.children.find { |c| c.display_name == component && c.is_a?(Xcodeproj::Project::Object::PBXGroup) }
    if existing
      current = existing
    else
      current = current.new_group(component)
      current.source_tree = '<group>'
    end
  end
  current
end

# Files to add
new_files = [
  # Dashboard feature
  'Features/Dashboard/ViewModels/StreakViewModel.swift',
  'Features/Dashboard/ViewModels/DashboardViewModel.swift',
  'Features/Dashboard/Components/StreakBadge.swift',
  'Features/Dashboard/Views/DashboardView.swift',
  'Features/Dashboard/Views/LogActivityView.swift',
  # GenreChips component
  'Features/Books/Components/GenreChips.swift',
]

new_files.each do |file_path|
  full_path = "BookTrackerApp/#{file_path}"

  unless File.exist?(full_path)
    puts "File not found: #{full_path}"
    next
  end

  # Split path into components
  path_components = file_path.split('/')[0..-2]
  filename = file_path.split('/').last

  # Find or create parent group
  parent_group = find_or_create_group(app_group, path_components)

  # Check if file already exists in project
  existing = parent_group.children.find { |c| c.display_name == filename }
  if existing
    puts "File already in project: #{file_path}"
    next
  end

  # Add file reference
  file_ref = parent_group.new_file(full_path)

  # Add to target's compile sources
  target.source_build_phase.add_file_reference(file_ref)

  puts "Added: #{file_path}"
end

# Save project
project.save
puts "\nProject updated successfully!"
