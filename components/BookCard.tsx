"use client";

import { BookOpen, Star, Trash2 } from "lucide-react";
import { useState } from "react";

interface Book {
  id: string;
  title: string;
  authors: string[];
  thumbnail?: string;
  status: 'want-to-read' | 'reading' | 'read';
  currentPage?: number;
  pageCount?: number;
  rating?: number;
}

interface BookCardProps {
  book: Book;
  onUpdate: (id: string, updates: Partial<Book>) => void;
  onDelete: (id: string) => void;
}

export function BookCard({ book, onUpdate, onDelete }: BookCardProps) {
  const [showRating, setShowRating] = useState(false);

  const handleStatusChange = (status: Book['status']) => {
    onUpdate(book.id, { status });
  };

  const handleRating = (rating: number) => {
    onUpdate(book.id, { rating });
    setShowRating(false);
  };

  const handlePageUpdate = () => {
    if (!book.pageCount) return;
    const newPage = prompt(`Current page (out of ${book.pageCount}):`, String(book.currentPage || 0));
    if (newPage !== null) {
      const page = parseInt(newPage);
      if (!isNaN(page) && page >= 0 && page <= book.pageCount) {
        onUpdate(book.id, { currentPage: page });
        if (page === book.pageCount && book.status !== 'read') {
          onUpdate(book.id, { status: 'read', currentPage: page });
        }
      }
    }
  };

  const progress = book.pageCount && book.currentPage
    ? (book.currentPage / book.pageCount) * 100
    : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex gap-4 p-4">
        {book.thumbnail ? (
          <img
            src={book.thumbnail}
            alt={book.title}
            className="w-20 h-28 object-cover rounded"
          />
        ) : (
          <div className="w-20 h-28 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-gray-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {book.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {book.authors.join(", ")}
          </p>

          <div className="mt-2">
            <select
              value={book.status}
              onChange={(e) => handleStatusChange(e.target.value as Book['status'])}
              className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="want-to-read">Want to Read</option>
              <option value="reading">Reading</option>
              <option value="read">Read</option>
            </select>
          </div>

          {book.status === 'reading' && book.pageCount && (
            <div className="mt-2">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span>{book.currentPage || 0} / {book.pageCount} pages</span>
                <button
                  onClick={handlePageUpdate}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Update
                </button>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {book.status === 'read' && (
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-4 h-4 ${
                      star <= (book.rating || 0)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => onDelete(book.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
