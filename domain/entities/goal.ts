export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  targetBooks: number;
  currentBooks: number;
  startDate: Date;
  endDate: Date;
  completed: boolean;
}
