import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Container } from "@/lib/di/container";
import { UpdateGoalUseCase } from "@/application/use-cases/goals/update-goal";
import { DeleteGoalUseCase } from "@/application/use-cases/goals/delete-goal";
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

    const goalRepository = Container.getGoalRepository();
    const useCase = new UpdateGoalUseCase(goalRepository);

    const goal = await useCase.execute({
      goalId: id,
      userId: session.user.id,
      updates,
    });

    return NextResponse.json({ goal });
  } catch (error) {
    console.error("Error updating goal:", error);

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

    const goalRepository = Container.getGoalRepository();
    const useCase = new DeleteGoalUseCase(goalRepository);

    await useCase.execute({
      goalId: id,
      userId: session.user.id,
    });

    return NextResponse.json({ message: "Goal deleted successfully" });
  } catch (error) {
    console.error("Error deleting goal:", error);

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
