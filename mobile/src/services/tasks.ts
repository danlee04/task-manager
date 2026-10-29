
const API_BASE_URL = 'http://10.0.2.2:8000';

export type Task = {
  id: number;
  title: string;
  description: string | null;
  is_completed: boolean;
  created_at: string;
};

export async function getTasks(): Promise<Task[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks`);

  if (!response.ok) {
    throw new Error(`Failed to fetch tasks: ${response.status}`);
  }

  return response.json() as Promise<Task[]>;
}
