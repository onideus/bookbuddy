export interface ReadingActivity {
  id: string;
  userId: string;
  bookId?: string;
  activityDate: Date;
  pagesRead: number;
  minutesRead: number;
  createdAt: Date;
}
