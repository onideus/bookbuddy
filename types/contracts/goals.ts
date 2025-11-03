export interface GoalDTO {
  id: string;
  userId: string;
  title: string;
  description?: string;
  targetBooks: number;
  startDate: Date;
  endDate: Date;
  booksRead: number;
  isComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetGoalsRequest {
  userId: string;
}

export interface GetGoalsResponse {
  goals: GoalDTO[];
}

export interface CreateGoalRequest {
  title: string;
  description?: string;
  targetBooks: number;
  startDate: string | Date;
  endDate: string | Date;
}

export interface CreateGoalResponse {
  goal: GoalDTO;
}

export interface UpdateGoalRequest {
  title?: string;
  description?: string;
  targetBooks?: number;
  startDate?: string | Date;
  endDate?: string | Date;
}

export interface UpdateGoalResponse {
  goal: GoalDTO;
}

export interface DeleteGoalResponse {
  message: string;
}
