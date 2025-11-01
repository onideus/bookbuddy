import { NextResponse } from "next/server";
import { Container } from "@/lib/di/container";
import { RegisterUserUseCase } from "@/application/use-cases/auth/register-user";
import { DuplicateError, ValidationError } from "@/domain/errors/domain-errors";

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    const userRepository = Container.getUserRepository();
    const passwordHasher = Container.getPasswordHasher();
    const useCase = new RegisterUserUseCase(userRepository, passwordHasher);

    const user = await useCase.execute({
      email,
      password,
      name,
    });

    return NextResponse.json(
      { message: "User created successfully", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

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
