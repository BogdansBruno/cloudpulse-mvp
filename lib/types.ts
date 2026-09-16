// User & Profile types
export interface UserProfile {
    id: string;
    name: string;
    age?: number;
    goal?: string;
    current_frequency?: number;
    available_days?: string[];
    session_length_min?: number;
    interests?: string;
    constraints_text?: string;
    created_at: string;
  }
  
  // Workout Plan types
  export interface WorkoutPlan {
    id: string;
    user_id: string;
    week_start: string;
    plan_json: WorkoutPlanDay[];
    status: 'active' | 'completed' | 'archived';
    created_at: string;
  }
  
  export interface WorkoutPlanDay {
    day: string;
    type: string;
    duration_min: number;
    description: string;
  }
  
  // Workout Session types
  export interface WorkoutSession {
    id: string;
    plan_id: string;
    day_of_week: string;
    exercise_type: string;
    duration_min: number;
    completed: boolean;
    skip_reason?: string;
    created_at: string;
  }
  
  // Chat Message types
  export interface ChatMessage {
    id: string;
    user_id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
  }
  
  // Auth types
  export interface AuthResponse {
    user: any;
    session: any;
    error: any;
  }
  
  // Agent Response types
  export interface AgentResponse {
    response: string;
    toolCalls?: ToolCall[];
  }
  
  export interface ToolCall {
    name: string;
    input: Record<string, any>;
  }