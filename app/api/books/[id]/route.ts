import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Container } from "@/lib/di/container";
import { UpdateBookUseCase } from "@/application/use-cases/books/update-book";
import { DeleteBookUseCase } from "@/application/use-cases/books/delete-book";
import { NotFoundError, UnauthorizedError } from "@/domain/errors/domain-errors";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const updates = await request.json();

    const bookRepository = Container.getBookRepository();
    const useCase = new UpdateBookUseCase(bookRepository);

    const book = await useCase.execute({
      bookId: id,
      userId: session.user.id,
      updates,
    });

    // Sync goal progress if book status changed to 'read'
    if (updates.status === 'read' || updates.finishedAt) {
      try {
        const goalRepository = Container.getGoalRepository();
        const goalService = Container.getGoalService();
        const goals = await goalRepository.findByUserId(session.user.id);

        // Sync all active goals
        for (const goal of goals) {
          if (!goal.completed) {
            await goalService.syncGoalProgress(goal.id, session.user.id);
          }
        }
      } catch (goalError) {
        console.error('Error syncing goal progress:', goalError);
        // Don't fail the book update if goal sync fails
      }
    }

    return NextResponse.json({ book });
  } catch (error) {
    console.error("Error updating book:", error);

    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const bookRepository = Container.getBookRepository();
    const useCase = new DeleteBookUseCase(bookRepository);

    await useCase.execute({
      bookId: id,
      userId: session.user.id,
    });

    return NextResponse.json({ message: "Book deleted successfully" });
  } catch (error) {
    console.error("Error deleting book:", error);

    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
