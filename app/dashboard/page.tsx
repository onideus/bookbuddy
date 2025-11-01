"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { BookOpen, Target, TrendingUp, Book } from "lucide-react";
import { ProgressBar } from "@/components/ProgressBar";
import Link from "next/link";

interface Book {
  id: string;
  title: string;
  authors: string[];
  status: 'want-to-read' | 'reading' | 'read';
  currentPage?: number;
  pageCount?: number;
}

interface Goal {
  id: string;
  title: string;
  targetBooks: number;
  currentBooks: number;
  endDate: Date;
  completed: boolean;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  const fetchData = async () => {
    try {
      const [booksRes, goalsRes] = await Promise.all([
        fetch("/api/books"),
        fetch("/api/goals"),
      ]);

      if (booksRes.ok) {
        const booksData = await booksRes.json();
        setBooks(booksData.books);
      }

      if (goalsRes.ok) {
        const goalsData = await goalsRes.json();
        setGoals(goalsData.goals);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  const stats = {
    wantToRead: books.filter(b => b.status === 'want-to-read').length,
    reading: books.filter(b => b.status === 'reading').length,
    read: books.filter(b => b.status === 'read').length,
    total: books.length,
  };

  const activeGoals = goals.filter(g => !g.completed && new Date(g.endDate) >= new Date());

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {session?.user?.name}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Here's your reading progress
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Books</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.total}
                </p>
              </div>
              <BookOpen className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Currently Reading</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.reading}
                </p>
              </div>
              <Book className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Books Read</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.read}
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Goals</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {activeGoals.length}
                </p>
              </div>
              <Target className="w-12 h-12 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Currently Reading */}
        {stats.reading > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Currently Reading
              </h2>
              <Link
                href="/books"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {books
                .filter(b => b.status === 'reading')
                .slice(0, 3)
                .map(book => (
                  <div
                    key={book.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {book.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                      {book.authors.join(", ")}
                    </p>
                    {book.pageCount && (
                      <ProgressBar
                        current={book.currentPage || 0}
                        target={book.pageCount}
                        className="mt-4"
                      />
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Active Goals
              </h2>
              <Link
                href="/goals"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeGoals.slice(0, 2).map(goal => (
                <div
                  key={goal.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {goal.title}
                  </h3>
                  <ProgressBar
                    current={goal.currentBooks}
                    target={goal.targetBooks}
                    className="mt-4"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Due: {new Date(goal.endDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats.total === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No books yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start your reading journey by adding some books
            </p>
            <Link
              href="/search"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Search for Books
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
