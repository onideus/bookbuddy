interface ProgressBarProps {
  current: number;
  target: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ current, target, label, className = "" }: ProgressBarProps) {
  const percentage = Math.min((current / target) * 100, 100);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-700 dark:text-gray-300">{label}</span>
          <span className="text-gray-600 dark:text-gray-400">
            {current} / {target}
          </span>
        </div>
      )}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
        {percentage.toFixed(0)}% complete
      </div>
    </div>
  );
}
