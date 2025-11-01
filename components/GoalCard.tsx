"use client";

import { Calendar, Target, Trash2 } from "lucide-react";
import { ProgressBar } from "./ProgressBar";

interface Goal {
  id: string;
  title: string;
  description?: string;
  targetBooks: number;
  currentBooks: number;
  startDate: Date;
  endDate: Date;
  completed: boolean;
}

interface GoalCardProps {
  goal: Goal;
  onDelete: (id: string) => void;
}

export function GoalCard({ goal, onDelete }: GoalCardProps) {
  const startDate = new Date(goal.startDate);
  const endDate = new Date(goal.endDate);
  const now = new Date();
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const isOverdue = now > endDate && goal.currentBooks < goal.targetBooks;
  const isCompleted = goal.currentBooks >= goal.targetBooks;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${
      isCompleted ? 'border-2 border-green-500' : isOverdue ? 'border-2 border-red-500' : ''
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5" />
            {goal.title}
          </h3>
          {goal.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {goal.description}
            </p>
          )}
        </div>
        <button
          onClick={() => onDelete(goal.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <ProgressBar
        current={goal.currentBooks}
        target={goal.targetBooks}
        label="Books Progress"
        className="mb-4"
      />

      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>
            {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="mt-2 text-sm">
        {isCompleted ? (
          <span className="text-green-600 dark:text-green-400 font-semibold">
            Goal completed!
          </span>
        ) : isOverdue ? (
          <span className="text-red-600 dark:text-red-400 font-semibold">
            Overdue by {Math.abs(daysRemaining)} days
          </span>
        ) : (
          <span className="text-gray-600 dark:text-gray-400">
            {daysRemaining} days remaining
          </span>
        )}
      </div>
    </div>
  );
}
