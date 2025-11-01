import { NextResponse } from "next/server";
import { Container } from "@/lib/di/container";
import { SearchBooksUseCase } from "@/application/use-cases/search/search-books";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const externalBookSearch = Container.getExternalBookSearch();
    const useCase = new SearchBooksUseCase(externalBookSearch);

    const results = await useCase.execute({ query });

    const books = results.map((item) => ({
      id: item.id,
      title: item.volumeInfo.title,
      authors: item.volumeInfo.authors || [],
      description: item.volumeInfo.description,
      thumbnail: item.volumeInfo.imageLinks?.thumbnail,
      pageCount: item.volumeInfo.pageCount,
    }));

    return NextResponse.json({ books });
  } catch (error) {
    console.error("Error searching books:", error);
    return NextResponse.json(
      { error: "Failed to search books" },
      { status: 500 }
    );
  }
}
