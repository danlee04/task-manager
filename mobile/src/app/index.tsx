import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  updateTaskCompletion,
  type Task,
} from "@/services/tasks";

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      setError(null);
      const data = await getTasks();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const completedCount = tasks.filter((task) => task.is_completed).length;

  function showMessage(title: string, message: string) {
    if (Platform.OS === "web") {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  async function addTask() {
    const title = newTask.trim();

    if (!title) {
      showMessage("Missing task", "Please enter a task title.");
      return;
    }

    if (isCreating) {
      return;
    }

    setIsCreating(true);
    Keyboard.dismiss();

    try {
      const createdTask = await createTask(title, "");

      setTasks((currentTasks) => [createdTask, ...currentTasks]);
      setNewTask("");
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to create task.";

      showMessage("Create task failed", message);
    } finally {
      setIsCreating(false);
    }
  }

  const toggleTask = async (taskId: number) => {
    const currentTask = tasks.find((task) => task.id === taskId);

    if (!currentTask) {
      return;
    }

    try {
      const updatedTask = await updateTaskCompletion(
        taskId,
        !currentTask.is_completed,
      );

      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === taskId ? updatedTask : task)),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";

      Alert.alert("Update failed", message);
    }
  };

  function startEditingTask(task: Task) {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
  }

  async function saveEditedTask() {
    const title = editTitle.trim();

    if (!title) {
      showMessage("Missing task title", "Please enter a task title.");
      return;
    }

    if (editingTaskId === null || isSaving) {
      return;
    }

    setIsSaving(true);
    Keyboard.dismiss();

    try {
      const updatedTask = await updateTask(
        editingTaskId,
        title,
        editDescription,
      );

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === editingTaskId ? updatedTask : task,
        ),
      );

      setEditingTaskId(null);
      setEditTitle("");
      setEditDescription("");
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to update task.";

      showMessage("Edit task failed", message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteTask(taskId: number) {
    const task = tasks.find((item) => item.id === taskId);

    if (!task) {
      return;
    }

    try {
      await deleteTask(taskId);

      setTasks((currentTasks) =>
        currentTasks.filter((item) => item.id !== taskId),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to delete task.";

      showMessage("Delete failed", message);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>YOUR PERSONAL WORKSPACE</Text>
        <Text style={styles.heading}>My Tasks</Text>
        <Text style={styles.subtitle}>Stay focused. Get things done.</Text>
      </View>

      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryLabel}>YOUR PROGRESS</Text>
          <Text style={styles.summaryNumber}>
            {completedCount} of {tasks.length} completed
          </Text>
        </View>
        <Text style={styles.progressIcon}>✓</Text>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="What needs to be done?"
          placeholderTextColor="#9298A5"
          value={newTask}
          onChangeText={setNewTask}
          onSubmitEditing={addTask}
          returnKeyType="done"
          maxLength={200}
          accessibilityLabel="New task title"
        />
        <Pressable
          style={[styles.addButton, isCreating && { opacity: 0.6 }]}
          onPress={addTask}
          disabled={isCreating}
          accessibilityRole="button"
          accessibilityLabel="Add task"
        >
          {isCreating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.addButtonText}>+</Text>
          )}
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>TASK LIST</Text>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#6268D9" />
          <Text style={styles.emptyText}>Loading tasks...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>Could not load tasks</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadTasks}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id.toString()}
          // Without this, the first tap on Save/Cancel only closes the keyboard.
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            tasks.length === 0 ? styles.emptyList : styles.list
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyTitle}>All clear!</Text>
              <Text style={styles.emptyText}>
                Add a task above to get started.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.taskCard}>
              <Pressable
                style={[
                  styles.checkbox,
                  item.is_completed && styles.checkboxCompleted,
                ]}
                onPress={() => toggleTask(item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.is_completed }}
                accessibilityLabel={`Toggle ${item.title}`}
              >
                {item.is_completed && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>

              {editingTaskId === item.id ? (
                <View style={styles.editForm}>
                  <TextInput
                    style={styles.editInput}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder="Task title"
                    maxLength={200}
                  />

                  <TextInput
                    style={[styles.editInput, styles.descriptionInput]}
                    value={editDescription}
                    onChangeText={setEditDescription}
                    placeholder="Description (optional)"
                    multiline
                  />

                  <View style={styles.editActions}>
                    <Pressable
                      style={styles.saveButton}
                      onPress={saveEditedTask}
                      disabled={isSaving}
                    >
                      <Text style={styles.saveButtonText}>
                        {isSaving ? "Saving..." : "Save"}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.cancelButton}
                      onPress={() => {
                        setEditingTaskId(null);
                        setEditTitle("");
                        setEditDescription("");
                      }}
                      disabled={isSaving}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={styles.taskContent}
                  onPress={() => toggleTask(item.id)}
                >
                  <Text
                    style={[
                      styles.taskTitle,
                      item.is_completed && styles.completedTitle,
                    ]}
                  >
                    {item.title}
                  </Text>

                  {item.description ? (
                    <Text style={styles.taskDescription}>
                      {item.description}
                    </Text>
                  ) : null}

                  <Text style={styles.taskStatus}>
                    {item.is_completed ? "COMPLETED" : "IN PROGRESS"}
                  </Text>
                </Pressable>
              )}

              {editingTaskId !== item.id && (
                <>
                  <Pressable
                    onPress={() => startEditingTask(item)}
                    style={styles.editButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${item.title}`}
                  >
                    <Text style={styles.editText}>Edit</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleDeleteTask(item.id)}
                    style={styles.deleteButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${item.title}`}
                  >
                    <Text style={styles.deleteText}>×</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        />
      )}

      <Text style={styles.footer}>SMALL STEPS. BIG PROGRESS.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    backgroundColor: "#F6F7FB",
    paddingHorizontal: 22,
  },
  header: { paddingTop: 28, paddingBottom: 24 },
  eyebrow: {
    color: "#6268D9",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  heading: {
    color: "#191D35",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
  },
  subtitle: { color: "#74798B", fontSize: 15, marginTop: 7 },
  summary: {
    backgroundColor: "#292E63",
    borderRadius: 18,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  summaryLabel: {
    color: "#BFC4FF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  summaryNumber: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
    marginTop: 7,
  },
  progressIcon: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
    backgroundColor: "#484D91",
    overflow: "hidden",
    borderRadius: 30,
    width: 48,
    height: 48,
    textAlign: "center",
    textAlignVertical: "center",
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 26,
  },
  input: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E6EF",
    borderRadius: 13,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 14,
    color: "#191D35",
  },
  addButton: {
    width: 52,
    borderRadius: 13,
    backgroundColor: "#6268D9",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: { color: "#FFFFFF", fontSize: 28, fontWeight: "400" },
  sectionTitle: {
    color: "#777D90",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  list: { gap: 11, paddingBottom: 18 },
  emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 30 },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9EAF2",
    borderRadius: 15,
    padding: 15,
    gap: 13,
  },
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#C7CAD8",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCompleted: { backgroundColor: "#6268D9", borderColor: "#6268D9" },
  checkmark: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  taskContent: {
    flex: 1,
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
  },
  taskTitle: { color: "#292D42", fontSize: 14, fontWeight: "600" },
  taskDescription: {
    color: "#858A9A",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  completedTitle: { color: "#969AAA", textDecorationLine: "line-through" },
  taskStatus: {
    color: "#8B90A2",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  deleteButton: {
    width: 32,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: { color: "#A0A4B3", fontSize: 25 },
  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#EEF0FF",
  },
  editText: {
    color: "#6268D9",
    fontSize: 12,
    fontWeight: "700",
  },
  editForm: {
    flex: 1,
    gap: 8,
  },
  editInput: {
    backgroundColor: "#F6F7FB",
    borderWidth: 1,
    borderColor: "#E4E6EF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
    color: "#191D35",
  },
  descriptionInput: {
    minHeight: 65,
    textAlignVertical: "top",
  },
  editActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: "#6268D9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  cancelButton: {
    backgroundColor: "#EEF0F4",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#626B7A",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyState: { alignItems: "center", padding: 30 },
  emptyIcon: { color: "#6268D9", fontSize: 34, marginBottom: 12 },
  emptyTitle: { color: "#292D42", fontSize: 19, fontWeight: "800" },
  emptyText: {
    color: "#858A9A",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  retryButton: {
    backgroundColor: "#6268D9",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: "#FFFFFF", fontWeight: "700" },
  footer: {
    textAlign: "center",
    color: "#A0A4B3",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    paddingTop: 12,
    paddingBottom: 12,
  },
});
