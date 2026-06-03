export type PriorityLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type GoalIntent = 'Exam' | 'Level Up' | 'Intro';

export interface SprintWall {
    date: string;
    label: string;
}

export interface Subtask {
    id: string;
    title: string;
    completed: boolean;
}

export interface Task {
    id: string;
    goal_id: string;
    user_id: string;
    title: string;
    subject?: string;
    duration_mins?: number;
    due_date: string;
    priority: PriorityLevel;
    task_type: 'task' | 'void';
    status: 'pending' | 'completed';
    pivoted_count: number;
    subtasks: Subtask[];
    notes?: string;
    resources?: any[];
    reflection?: string;
    created_at?: string;
}

export interface LearningGoal {
    id: string;
    user_id: string;
    title: string;
    duration_days: number;
    level: string;
    goal_intent: GoalIntent;
    sprint_walls: SprintWall[];
    commitment_hours_per_week: number;
    created_at: string;
    tasks?: Task[];
}

export interface PlanMetadata {
    hard_walls: string[];
    void_days: string[];
    sprint_boundaries: string[];
}
