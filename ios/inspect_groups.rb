#!/usr/bin/env ruby
require 'xcodeproj'

# Open the Xcode project
project_path = 'BookTrackerIOS.xcodeproj'
project = Xcodeproj::Project.open(project_path)

def print_group_tree(group, indent = 0)
  prefix = "  " * indent
  path_info = group.path ? "path: '#{group.path}'" : "no path"
  source_tree = group.source_tree
  puts "#{prefix}#{group.name} (#{path_info}, source_tree: #{source_tree})"

  # Print files in this group
  group.files.each do |file_ref|
    file_path = file_ref.path ? "'#{file_ref.path}'" : "no path"
    file_source_tree = file_ref.source_tree
    puts "#{prefix}  📄 #{file_ref.name || File.basename(file_ref.path || 'unknown')} (path: #{file_path}, source_tree: #{file_source_tree})"
  end

  # Recursively print child groups
  group.groups.each do |subgroup|
    print_group_tree(subgroup, indent + 1)
  end
end

puts "Group Hierarchy:"
puts "="*70
print_group_tree(project.main_group)
puts "="*70

# Now let's look specifically at files that might have issues
puts "\nLooking for problematic file references:"
puts "="*70

project.files.each do |file_ref|
  next unless file_ref.path

  # Get the real path for this file by walking up the group hierarchy
  real_path = file_ref.real_path.to_s rescue nil
  if file_ref.path.include?('MainTabView') ||
     file_ref.path.include?('SearchBooksViewModel') ||
     file_ref.path.include?('GoalsViewModel')

    puts "\nFile: #{file_ref.path}"
    puts "  Name: #{file_ref.name}"
    puts "  Source Tree: #{file_ref.source_tree}"
    puts "  Real Path: #{real_path}" if real_path
    puts "  Parent: #{file_ref.parent.name} (path: #{file_ref.parent.path}, source_tree: #{file_ref.parent.source_tree})"
  end
end
puts "="*70
