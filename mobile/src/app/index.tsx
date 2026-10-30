import { useCallback, useEffect, useMemo, useState } from "react";
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
import { SymbolView } from "expo-symbols";

import type { ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
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

  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
  const progressPercent =
    tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

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
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>YOUR PROGRESS</Text>
            <Text style={styles.summaryNumber}>
              {completedCount} of {tasks.length} completed
            </Text>
          </View>
          <Text style={styles.summaryPercent}>{progressPercent}%</Text>
        </View>

        <View
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityLabel="Tasks completed"
          accessibilityValue={{ min: 0, max: 100, now: progressPercent }}
        >
          <View
            style={[styles.progressFill, { width: `${progressPercent}%` }]}
          />
        </View>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="What needs to be done?"
          placeholderTextColor={colors.faint}
          value={newTask}
          onChangeText={setNewTask}
          onSubmitEditing={addTask}
          returnKeyType="done"
          maxLength={200}
          accessibilityLabel="New task title"
        />
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            (pressed || isCreating) && styles.pressed,
          ]}
          onPress={addTask}
          disabled={isCreating}
          accessibilityRole="button"
          accessibilityLabel="Add task"
        >
          {isCreating ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <SymbolView
              name={{ ios: "plus", android: "add", web: "add" }}
              size={24}
              tintColor={colors.onAccent}
            />
          )}
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>TASK LIST</Text>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.emptyText}>Loading tasks...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <View style={[styles.stateIcon, styles.stateIconDanger]}>
            <SymbolView
              name={{
                ios: "wifi.exclamationmark",
                android: "cloud_off",
                web: "cloud_off",
              }}
              size={28}
              tintColor={colors.danger}
            />
          </View>
          <Text style={styles.emptyTitle}>Could not load tasks</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              styles.retryButton,
              pressed && styles.pressed,
            ]}
            onPress={loadTasks}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Try again</Text>
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
              <View style={styles.stateIcon}>
                <SymbolView
                  name={{
                    ios: "checklist",
                    android: "task_alt",
                    web: "task_alt",
                  }}
                  size={28}
                  tintColor={colors.accent}
                />
              </View>
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
                hitSlop={10}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.is_completed }}
                accessibilityLabel={`Toggle ${item.title}`}
              >
                {item.is_completed && (
                  <SymbolView
                    name={{ ios: "checkmark", android: "check", web: "check" }}
                    size={16}
                    tintColor={colors.onAccent}
                  />
                )}
              </Pressable>

              {editingTaskId === item.id ? (
                <View style={styles.editForm}>
                  <TextInput
                    style={styles.editInput}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder="Task title"
                    placeholderTextColor={colors.faint}
                    maxLength={200}
                    accessibilityLabel="Task title"
                  />

                  <TextInput
                    style={[styles.editInput, styles.descriptionInput]}
                    value={editDescription}
                    onChangeText={setEditDescription}
                    placeholder="Description (optional)"
                    placeholderTextColor={colors.faint}
                    multiline
                    accessibilityLabel="Task description"
                  />

                  <View style={styles.editActions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => {
                        setEditingTaskId(null);
                        setEditTitle("");
                        setEditDescription("");
                      }}
                      disabled={isSaving}
                      accessibilityRole="button"
                    >
                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.primaryButton,
                        (pressed || isSaving) && styles.pressed,
                      ]}
                      onPress={saveEditedTask}
                      disabled={isSaving}
                      accessibilityRole="button"
                    >
                      <Text style={styles.primaryButtonText}>
                        {isSaving ? "Saving..." : "Save"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.taskContent,
                    pressed && styles.pressed,
                  ]}
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

                  <View
                    style={[
                      styles.badge,
                      item.is_completed ? styles.badgeDone : styles.badgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        item.is_completed
                          ? styles.badgeTextDone
                          : styles.badgeTextActive,
                      ]}
                    >
                      {item.is_completed ? "COMPLETED" : "IN PROGRESS"}
                    </Text>
                  </View>
                </Pressable>
              )}

              {editingTaskId !== item.id && (
                <View style={styles.taskActions}>
                  <Pressable
                    onPress={() => startEditingTask(item)}
                    style={({ pressed }) => [
                      styles.iconButton,
                      pressed && styles.pressed,
                    ]}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${item.title}`}
                  >
                    <SymbolView
                      name={{ ios: "pencil", android: "edit", web: "edit" }}
                      size={18}
                      tintColor={colors.accent}
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => handleDeleteTask(item.id)}
                    style={({ pressed }) => [
                      styles.iconButton,
                      styles.iconButtonDanger,
                      pressed && styles.pressed,
                    ]}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${item.title}`}
                  >
                    <SymbolView
                      name={{ ios: "trash", android: "delete", web: "delete" }}
                      size={18}
                      tintColor={colors.danger}
                    />
                  </Pressable>
                </View>
              )}
            </View>
          )}
        />
      )}

      <Text style={styles.footer}>SMALL STEPS. BIG PROGRESS.</Text>
    </SafeAreaView>
  );
}

function createStyles(colors: Record<ThemeColor, string>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      width: "100%",
      maxWidth: 720,
      alignSelf: "center",
      backgroundColor: colors.screen,
      paddingHorizontal: 20,
    },
    header: { paddingTop: 24, paddingBottom: 20 },
    eyebrow: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    heading: {
      color: colors.heading,
      fontSize: 34,
      fontWeight: "800",
      letterSpacing: -1,
    },
    subtitle: { color: colors.muted, fontSize: 15, marginTop: 6 },
    summary: {
      backgroundColor: colors.hero,
      borderRadius: 20,
      padding: 20,
      gap: 16,
      marginBottom: 20,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    summaryLabel: {
      color: colors.heroMuted,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.2,
    },
    summaryNumber: {
      color: colors.onAccent,
      fontSize: 19,
      fontWeight: "700",
      marginTop: 6,
    },
    summaryPercent: {
      color: colors.onAccent,
      fontSize: 30,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    progressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: "rgba(255, 255, 255, 0.18)",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 4,
      backgroundColor: colors.heroMuted,
    },
    inputRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
    input: {
      flex: 1,
      minWidth: 0,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: colors.heading,
    },
    addButton: {
      width: 52,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: { opacity: 0.7 },
    sectionTitle: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.4,
      marginBottom: 12,
    },
    list: { gap: 10, paddingBottom: 16 },
    emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 30 },
    taskCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      gap: 12,
      boxShadow: "0 1px 2px rgba(25, 29, 53, 0.06)",
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.faint,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxCompleted: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    taskContent: { flex: 1, gap: 4, minWidth: 0 },
    taskTitle: { color: colors.heading, fontSize: 15, fontWeight: "600" },
    completedTitle: {
      color: colors.muted,
      textDecorationLine: "line-through",
    },
    taskDescription: { color: colors.muted, fontSize: 13, lineHeight: 18 },
    badge: {
      alignSelf: "flex-start",
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginTop: 4,
    },
    badgeActive: { backgroundColor: colors.accentSoft },
    badgeDone: { backgroundColor: colors.successSoft },
    badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
    badgeTextActive: { color: colors.accentStrong },
    badgeTextDone: { color: colors.success },
    taskActions: { flexDirection: "row", gap: 8 },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    iconButtonDanger: { backgroundColor: colors.dangerSoft },
    editForm: { flex: 1, gap: 8 },
    editInput: {
      backgroundColor: colors.screen,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.heading,
    },
    descriptionInput: { minHeight: 72, textAlignVertical: "top" },
    editActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 4,
    },
    primaryButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
    },
    primaryButtonText: {
      color: colors.onAccent,
      fontSize: 13,
      fontWeight: "700",
    },
    secondaryButton: {
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
    },
    secondaryButtonText: {
      color: colors.accentStrong,
      fontSize: 13,
      fontWeight: "700",
    },
    emptyState: { alignItems: "center", padding: 30, gap: 8 },
    stateIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    stateIconDanger: { backgroundColor: colors.dangerSoft },
    emptyTitle: { color: colors.heading, fontSize: 19, fontWeight: "800" },
    emptyText: { color: colors.muted, fontSize: 13, textAlign: "center" },
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    retryButton: { marginTop: 8 },
    footer: {
      textAlign: "center",
      color: colors.faint,
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.5,
      paddingVertical: 12,
    },
  });
}
