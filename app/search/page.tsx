"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Search, BookOpen, Plus } from "lucide-react";
import { useEffect } from "react";

interface GoogleBook {
  id: string;
  title: string;
  authors: string[];
  description?: string;
  thumbnail?: string;
  pageCount?: number;
  publishedDate?: string;
}

export default function SearchPage() {
  const { status } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GoogleBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingBookId, setAddingBookId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/search-books?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.books);
      }
    } catch (error) {
      console.error("Error searching books:", error);
    } finally {
      setLoading(false);
    }
  };

  const addBook = async (book: GoogleBook, status: 'want-to-read' | 'reading' | 'read') => {
    setAddingBookId(book.id);
    try {
      const response = await fetch("/api/books", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          googleBooksId: book.id,
          title: book.title,
          authors: book.authors,
          thumbnail: book.thumbnail,
          description: book.description,
          pageCount: book.pageCount,
          status,
        }),
      });

      if (response.ok) {
        alert("Book added successfully!");
      }
    } catch (error) {
      console.error("Error adding book:", error);
      alert("Failed to add book");
    } finally {
      setAddingBookId(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Search Books
          </h1>

          <form onSubmit={handleSearch} className="max-w-2xl">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for books by title, author, or ISBN..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </form>
        </div>

        {results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((book) => (
              <div
                key={book.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex gap-4 mb-4">
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
                      <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                        {book.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {book.authors.join(", ")}
                      </p>
                      {book.publishedDate && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {new Date(book.publishedDate).getFullYear()}
                        </p>
                      )}
                    </div>
                  </div>

                  {book.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                      {book.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => addBook(book, 'want-to-read')}
                      disabled={addingBookId === book.id}
                      className="flex-1 min-w-[120px] px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50 transition-colors"
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Want to Read
                    </button>
                    <button
                      onClick={() => addBook(book, 'reading')}
                      disabled={addingBookId === book.id}
                      className="flex-1 min-w-[120px] px-3 py-2 text-sm bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 disabled:opacity-50 transition-colors"
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Reading
                    </button>
                    <button
                      onClick={() => addBook(book, 'read')}
                      disabled={addingBookId === book.id}
                      className="flex-1 min-w-[120px] px-3 py-2 text-sm bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800 disabled:opacity-50 transition-colors"
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Read
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && query && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">
              No books found. Try a different search term.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
