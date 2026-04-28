export type ExerciseCategoryKey = "chest" | "back" | "shoulder" | "leg" | "cardio";

export type ExerciseType = "strength" | "cardio";

export type WorkoutStatus = "in_progress" | "completed" | "cancelled";

export type ExerciseCategoryData = {
  id: ExerciseCategoryKey;
  name: string;
  icon: string | null;
  count: number;
};

export type ExerciseData = {
  id: string;
  name: string;
  category: ExerciseCategoryKey;
  targetMuscle: string;
  type: ExerciseType;
  defaultSets: number | null;
  defaultReps: number | null;
  defaultDurationMin: number | null;
};

export type ExerciseLibraryData = {
  items: ExerciseData[];
  categories: ExerciseCategoryData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type WorkoutSetData = {
  setNumber: number;
  reps?: number;
  weightKg?: number;
  durationMin?: number;
  incline?: number;
  resistance?: number;
  loadSetting?: string;
  completed: boolean;
};

export type WorkoutExerciseData = {
  id: string;
  exerciseId: string;
  name: string;
  category: ExerciseCategoryKey;
  targetMuscle: string;
  type: ExerciseType;
  sets: WorkoutSetData[];
  isCompleted: boolean;
};

export type WorkoutSessionData = {
  sessionId: string;
  sessionIndex: number;
  status: WorkoutStatus;
  completedAt: string | null;
  summary: {
    totalExercises: number;
    completedSets: number;
    totalVolumeKg: number;
    durationMin: number;
  };
  exercises: WorkoutExerciseData[];
};

export type TrainingTodayData = {
  date: string;
  summary: {
    sessionCount: number;
    completedSessions: number;
    totalExercises: number;
    completedSets: number;
    durationMin: number;
    progressPercentage: number;
    targetSessions: number;
    trainedParts: string[];
  };
  sessions: WorkoutSessionData[];
};

export type TrainingYesterdayData = {
  date: string;
  hasWorkout: boolean;
  sessions: Array<{
    sessionId: string;
    sessionIndex: number;
    summary: {
      totalExercises: number;
      totalSets: number;
      totalVolumeKg: number;
      durationMin: number;
    };
    exercises: Array<{
      name: string;
      setsCompleted: number;
      repsPerSet: string;
      weightNote: string;
    }>;
  }>;
};

export type TrainingWeeklyStatsData = {
  weekStart: string;
  weekEnd: string;
  stats: {
    workoutCount: number;
    totalDurationMin: number;
    totalSets: number;
    totalVolumeKg: number;
    weekOverWeekChange: number | null;
  };
  dailyBreakdown: Array<{
    date: string;
    hasWorkout: boolean;
    sessionCount: number;
    durationMin: number;
  }>;
};

export type QuickLogTrainingResponse = {
  sessionId: string;
  date: string;
  type: "quick";
  summary: {
    totalExercises: number;
    totalSets: number;
    totalVolumeKg: number;
    durationMin: number;
  };
  createdAt: string;
};
