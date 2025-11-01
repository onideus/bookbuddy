"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { BookCard } from "@/components/BookCard";

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

export default function BooksPage() {
  const { status } = useSession();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'want-to-read' | 'reading' | 'read'>('all');

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchBooks();
    }
  }, [status]);

  const fetchBooks = async () => {
    try {
      const response = await fetch("/api/books");
      if (response.ok) {
        const data = await response.json();
        setBooks(data.books);
      }
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateBook = async (id: string, updates: Partial<Book>) => {
    try {
      const response = await fetch(`/api/books/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setBooks(books.map(book =>
          book.id === id ? { ...book, ...updates } : book
        ));
      }
    } catch (error) {
      console.error("Error updating book:", error);
    }
  };

  const deleteBook = async (id: string) => {
    if (!confirm("Are you sure you want to delete this book?")) return;

    try {
      const response = await fetch(`/api/books/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setBooks(books.filter(book => book.id !== id));
      }
    } catch (error) {
      console.error("Error deleting book:", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  const filteredBooks = filter === 'all'
    ? books
    : books.filter(book => book.status === filter);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            My Books
          </h1>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              All ({books.length})
            </button>
            <button
              onClick={() => setFilter('want-to-read')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'want-to-read'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Want to Read ({books.filter(b => b.status === 'want-to-read').length})
            </button>
            <button
              onClick={() => setFilter('reading')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'reading'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Reading ({books.filter(b => b.status === 'reading').length})
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'read'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Read ({books.filter(b => b.status === 'read').length})
            </button>
          </div>
        </div>

        {filteredBooks.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'all'
                ? "No books yet. Start by searching for books to add!"
                : `No books in "${filter.replace('-', ' ')}" status.`
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map(book => (
              <BookCard
                key={book.id}
                book={book}
                onUpdate={updateBook}
                onDelete={deleteBook}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
