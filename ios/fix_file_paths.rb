#!/usr/bin/env ruby
# Script to fix file references in Xcode project

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

# Files to fix - we need to remove the incorrectly added ones first
files_to_remove = []

def find_files_recursively(group, files_to_remove)
  group.children.each do |child|
    if child.is_a?(Xcodeproj::Project::Object::PBXGroup)
      find_files_recursively(child, files_to_remove)
    elsif child.is_a?(Xcodeproj::Project::Object::PBXFileReference)
      # Check if the path looks wrong (has double path components)
      if child.path && (child.path.include?('BookTrackerApp/Features/BookTrackerApp') ||
                        child.path.include?('BookTrackerApp/Features/Books/Components/BookTrackerApp'))
        puts "Found incorrect file ref: #{child.path}"
        files_to_remove << child
      end
    end
  end
end

find_files_recursively(app_group, files_to_remove)

# Remove from build phases and from groups
files_to_remove.each do |file_ref|
  target.source_build_phase.files.each do |build_file|
    if build_file.file_ref == file_ref
      build_file.remove_from_project
    end
  end
  file_ref.remove_from_project
  puts "Removed: #{file_ref.path}"
end

# Now add files with correct paths
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

# Files to add with correct paths (relative to BookTrackerApp folder)
new_files = {
  'Dashboard/ViewModels/StreakViewModel.swift' => 'Features/Dashboard/ViewModels',
  'Dashboard/ViewModels/DashboardViewModel.swift' => 'Features/Dashboard/ViewModels',
  'Dashboard/Components/StreakBadge.swift' => 'Features/Dashboard/Components',
  'Dashboard/Views/DashboardView.swift' => 'Features/Dashboard/Views',
  'Dashboard/Views/LogActivityView.swift' => 'Features/Dashboard/Views',
  'GenreChips.swift' => 'Features/Books/Components',
}

new_files.each do |filename, group_path|
  full_disk_path = "BookTrackerApp/Features/#{filename}"
  full_disk_path = "BookTrackerApp/Features/Books/Components/#{filename}" if group_path.include?('Books/Components')

  # Split the group_path into components
  path_components = group_path.split('/')

  # Find or create the parent group
  parent_group = find_or_create_group(app_group, path_components)

  # Get just the filename
  just_filename = File.basename(filename)

  # Check if file already exists (correctly) in project
  existing = parent_group.children.find { |c| c.display_name == just_filename && c.is_a?(Xcodeproj::Project::Object::PBXFileReference) }
  if existing
    puts "File already correctly in project: #{just_filename}"
    next
  end

  # Create file reference with correct relative path
  file_ref = parent_group.new_file(just_filename)
  file_ref.source_tree = '<group>'

  # Add to target's compile sources
  target.source_build_phase.add_file_reference(file_ref)

  puts "Added with correct path: #{group_path}/#{just_filename}"
end

# Save project
project.save
puts "\nProject updated successfully!"
