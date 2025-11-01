import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Container } from "@/lib/di/container";
import { GetUserGoalsUseCase } from "@/application/use-cases/goals/get-user-goals";
import { CreateGoalUseCase } from "@/application/use-cases/goals/create-goal";
import { ValidationError } from "@/domain/errors/domain-errors";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const goalRepository = Container.getGoalRepository();
    const useCase = new GetUserGoalsUseCase(goalRepository);
    const goals = await useCase.execute({ userId: session.user.id });

    return NextResponse.json({ goals });
  } catch (error) {
    console.error("Error fetching goals:", error);
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
    const { title, description, targetBooks, startDate, endDate } = body;

    if (!title || !targetBooks || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const goalRepository = Container.getGoalRepository();
    const useCase = new CreateGoalUseCase(goalRepository);

    const goal = await useCase.execute({
      userId: session.user.id,
      title,
      description,
      targetBooks,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error("Error creating goal:", error);

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
