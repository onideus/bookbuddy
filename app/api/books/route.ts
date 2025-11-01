import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Container } from "@/lib/di/container";
import { GetUserBooksUseCase } from "@/application/use-cases/books/get-user-books";
import { AddBookUseCase } from "@/application/use-cases/books/add-book";
import { DuplicateError, ValidationError } from "@/domain/errors/domain-errors";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bookRepository = Container.getBookRepository();
    const useCase = new GetUserBooksUseCase(bookRepository);
    const books = await useCase.execute({ userId: session.user.id });

    return NextResponse.json({ books });
  } catch (error) {
    console.error("Error fetching books:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { googleBooksId, title, authors, thumbnail, description, pageCount, status } = body;

    if (!googleBooksId || !title || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const bookRepository = Container.getBookRepository();
    const useCase = new AddBookUseCase(bookRepository);

    const book = await useCase.execute({
      userId: session.user.id,
      googleBooksId,
      title,
      authors: authors || [],
      thumbnail,
      description,
      pageCount,
      status,
    });

    return NextResponse.json({ book }, { status: 201 });
  } catch (error) {
    console.error("Error creating book:", error);

    if (error instanceof DuplicateError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
