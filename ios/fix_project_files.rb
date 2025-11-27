#!/usr/bin/env ruby
# Script to properly fix file references in Xcode project

require 'xcodeproj'

project_path = 'BookTrackerIOS.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Find the main target
target = project.targets.find { |t| t.name == 'BookTrackerApp' }
raise "Target 'BookTrackerApp' not found" unless target

# Remove all dashboard and genre files and re-add them properly
files_to_fix = [
  'StreakViewModel.swift',
  'DashboardViewModel.swift',
  'StreakBadge.swift',
  'DashboardView.swift',
  'LogActivityView.swift',
  'GenreChips.swift',
]

# First remove all references to these files
project.files.each do |file_ref|
  if files_to_fix.include?(file_ref.display_name)
    # Remove from build phases
    target.source_build_phase.files.each do |build_file|
      if build_file.file_ref == file_ref
        puts "Removing from build phase: #{file_ref.display_name}"
        build_file.remove_from_project
      end
    end
    puts "Removing file reference: #{file_ref.display_name} (path: #{file_ref.path})"
    file_ref.remove_from_project
  end
end

# Remove any Dashboard groups (with all their contents removed)
def remove_empty_groups(group)
  group.children.each do |child|
    if child.is_a?(Xcodeproj::Project::Object::PBXGroup)
      remove_empty_groups(child)
      if child.children.empty?
        puts "Removing empty group: #{child.display_name}"
        child.remove_from_project
      end
    end
  end
end

main_group = project.main_group
app_group = main_group.find_subpath('BookTrackerApp', false)
features_group = app_group&.find_subpath('Features', false)

if features_group
  # Remove Dashboard group if it exists (we'll recreate it)
  dashboard_group = features_group.children.find { |c| c.display_name == 'Dashboard' && c.is_a?(Xcodeproj::Project::Object::PBXGroup) }
  if dashboard_group
    dashboard_group.remove_from_project
    puts "Removed Dashboard group"
  end
end

remove_empty_groups(app_group) if app_group

project.save

puts "\nCleaned up. Now re-adding files correctly..."

# Reopen project
project = Xcodeproj::Project.open(project_path)
target = project.targets.find { |t| t.name == 'BookTrackerApp' }
main_group = project.main_group
app_group = main_group.find_subpath('BookTrackerApp', false)
features_group = app_group&.find_subpath('Features', false)

# Helper to find or create group with proper path
def find_or_create_group_with_path(parent, name, path)
  existing = parent.children.find { |c| c.display_name == name && c.is_a?(Xcodeproj::Project::Object::PBXGroup) }
  if existing
    existing
  else
    new_group = parent.new_group(name, path)
    new_group
  end
end

# Create Dashboard structure
dashboard_group = find_or_create_group_with_path(features_group, 'Dashboard', 'Dashboard')

views_group = find_or_create_group_with_path(dashboard_group, 'Views', 'Views')
viewmodels_group = find_or_create_group_with_path(dashboard_group, 'ViewModels', 'ViewModels')
components_group = find_or_create_group_with_path(dashboard_group, 'Components', 'Components')

# Add files to their proper groups
files_config = [
  { group: viewmodels_group, name: 'StreakViewModel.swift' },
  { group: viewmodels_group, name: 'DashboardViewModel.swift' },
  { group: components_group, name: 'StreakBadge.swift' },
  { group: views_group, name: 'DashboardView.swift' },
  { group: views_group, name: 'LogActivityView.swift' },
]

files_config.each do |config|
  file_ref = config[:group].new_file(config[:name])
  target.source_build_phase.add_file_reference(file_ref)
  puts "Added: #{config[:name]}"
end

# Add GenreChips to Books/Components
books_group = features_group.find_subpath('Books', false)
if books_group
  books_components_group = books_group.find_subpath('Components', false)
  if books_components_group
    # Check if it already exists
    existing = books_components_group.children.find { |c| c.display_name == 'GenreChips.swift' }
    unless existing
      file_ref = books_components_group.new_file('GenreChips.swift')
      target.source_build_phase.add_file_reference(file_ref)
      puts "Added: GenreChips.swift"
    else
      puts "GenreChips.swift already exists"
    end
  end
end

project.save
puts "\nProject updated successfully!"
