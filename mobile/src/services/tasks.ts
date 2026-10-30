import Constants from 'expo-constants';

// Use the same machine that serves the Metro bundle; 10.0.2.2 is unreachable over the emulator's Wi-Fi and on real phones.
// shortcut: dev-only (hostUri is unset in release builds), switch to a configured URL before shipping.
const API_HOST = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
const API_BASE_URL = `http://${API_HOST}:8000`;

export type Task = {
  id: number;
  title: string;
  description: string | null;
  is_completed: boolean;
  created_at: string;
};

export async function getTasks(): Promise<Task[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks`);

  const data = await response.json();

  console.log('Tasks API response:', data);

  if (!response.ok) {
    throw new Error(`Failed to fetch tasks: ${response.status}`);
  }

  return data as Task[];
}


export async function createTask(
  title: string,
  description: string,
): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title.trim(),
      description: description.trim() || null,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to create task: ${response.status}`);
  }

  return response.json() as Promise<Task>;
}


export async function updateTaskCompletion(
  taskId: number,
  isCompleted: boolean,
): Promise<Task> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/tasks/${taskId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        is_completed: isCompleted,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to update task: ${response.status}`);
  }

  return response.json() as Promise<Task>;
}

export async function updateTask(
  taskId: number,
  title: string,
  description: string,
): Promise<Task> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/tasks/${taskId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
      }),
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to update task: ${response.status}`);
  }

  return response.json() as Promise<Task>;
}

export async function deleteTask(taskId: number): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/tasks/${taskId}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to delete task: ${response.status}`);
  }
}