import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
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

const FILTERS = [
  { key: "all", label: "All" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
] as const;

const EMPTY_COPY = {
  all: { title: "All clear!", text: "Add a task above to get started." },
  in_progress: {
    title: "Nothing in progress",
    text: "Every task is done. Nice work!",
  },
  completed: {
    title: "No completed tasks yet",
    text: "Tap the circle next to a task to complete it.",
  },
};

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

  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "in_progress" | "completed"
  >("all");

  const filteredTasks = tasks.filter((task) => {
    if (selectedFilter === "in_progress") {
      return !task.is_completed;
    }

    if (selectedFilter === "completed") {
      return task.is_completed;
    }

    return true;
  });

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
  const filterCounts = {
    all: tasks.length,
    in_progress: tasks.length - completedCount,
    completed: completedCount,
  };
  const emptyCopy =
    tasks.length === 0 ? EMPTY_COPY.all : EMPTY_COPY[selectedFilter];
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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
        <Text style={styles.date}>{today}</Text>
        <Text style={styles.heading} accessibilityRole="header">
          My Tasks
        </Text>
        <Text style={styles.subtitle}>Stay focused. Get things done.</Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>Your progress</Text>
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

      <View style={styles.composer}>
        <TextInput
          style={styles.composerInput}
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
          hitSlop={2}
          accessibilityRole="button"
          accessibilityLabel="Add task"
        >
          {isCreating ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <SymbolView
              name={{ ios: "plus", android: "add", web: "add" }}
              size={22}
              tintColor={colors.onAccent}
            />
          )}
        </Pressable>
      </View>

      <View style={styles.segmented} accessibilityRole="tablist">
        {FILTERS.map(({ key, label }) => {
          const isActive = selectedFilter === key;

          return (
            <Pressable
              key={key}
              style={({ pressed }) => [
                styles.segment,
                isActive && styles.segmentActive,
                pressed && styles.pressed,
              ]}
              onPress={() => setSelectedFilter(key)}
              hitSlop={{ top: 4, bottom: 4 }}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${label}, ${filterCounts[key]} tasks`}
            >
              <Text
                style={[
                  styles.segmentText,
                  isActive && styles.segmentTextActive,
                ]}
              >
                {label}{" "}
                <Text style={styles.segmentCount}>{filterCounts[key]}</Text>
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.list} accessible accessibilityLabel="Loading tasks">
          {[0, 1, 2].map((index) => (
            <View key={index} style={styles.skeletonCard}>
              <View style={styles.skeletonCircle} />
              <View style={styles.skeletonLines}>
                <View style={[styles.skeletonLine, styles.skeletonLineLong]} />
                <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
              </View>
            </View>
          ))}
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
            hitSlop={4}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <Animated.FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id.toString()}
          // Without this, the first tap on Save/Cancel only closes the keyboard.
          keyboardShouldPersistTaps="handled"
          itemLayoutAnimation={LinearTransition.duration(200)}
          contentContainerStyle={
            filteredTasks.length === 0 ? styles.emptyList : styles.list
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
              <Text style={styles.emptyTitle}>{emptyCopy.title}</Text>
              <Text style={styles.emptyText}>{emptyCopy.text}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={styles.taskCard}
            >
              <Pressable
                style={[
                  styles.checkbox,
                  item.is_completed && styles.checkboxCompleted,
                ]}
                onPress={() => toggleTask(item.id)}
                hitSlop={11}
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
                      hitSlop={4}
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
                      hitSlop={4}
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
                </Pressable>
              )}

              {editingTaskId !== item.id && (
                <View style={styles.taskActions}>
                  <Pressable
                    onPress={() => startEditingTask(item)}
                    style={({ pressed }) => [
                      styles.iconButton,
                      pressed && styles.iconButtonPressed,
                    ]}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${item.title}`}
                  >
                    <SymbolView
                      name={{ ios: "pencil", android: "edit", web: "edit" }}
                      size={20}
                      tintColor={colors.muted}
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => handleDeleteTask(item.id)}
                    style={({ pressed }) => [
                      styles.iconButton,
                      pressed && styles.iconButtonPressed,
                    ]}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${item.title}`}
                  >
                    <SymbolView
                      name={{ ios: "trash", android: "delete", web: "delete" }}
                      size={20}
                      tintColor={colors.danger}
                    />
                  </Pressable>
                </View>
              )}
            </Animated.View>
          )}
        />
      )}

      <Text style={styles.footer}>Small steps. Big progress.</Text>
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
    header: { paddingTop: 16, paddingBottom: 20 },
    date: {
      color: colors.accentStrong,
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 4,
    },
    heading: {
      color: colors.heading,
      fontSize: 34,
      fontWeight: "800",
      letterSpacing: -1,
    },
    subtitle: { color: colors.muted, fontSize: 15, marginTop: 4 },
    summary: {
      backgroundColor: colors.hero,
      borderRadius: 24,
      padding: 20,
      gap: 16,
      marginBottom: 16,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    summaryLabel: { color: colors.heroMuted, fontSize: 13, fontWeight: "600" },
    summaryNumber: {
      color: colors.onAccent,
      fontSize: 20,
      fontWeight: "700",
      marginTop: 4,
    },
    summaryPercent: {
      color: colors.onAccent,
      fontSize: 34,
      fontWeight: "800",
      letterSpacing: -1,
    },
    progressTrack: {
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.heroTrack,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 5,
      backgroundColor: colors.heroMuted,
    },
    composer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingLeft: 16,
      paddingRight: 6,
      paddingVertical: 6,
      marginBottom: 20,
    },
    composerInput: {
      flex: 1,
      minWidth: 0,
      fontSize: 16,
      color: colors.heading,
      paddingVertical: 10,
    },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: { opacity: 0.7 },
    segmented: {
      flexDirection: "row",
      gap: 4,
      padding: 4,
      borderRadius: 14,
      backgroundColor: colors.surfaceMuted,
      marginBottom: 16,
    },
    segment: {
      flex: 1,
      minHeight: 40,
      paddingHorizontal: 6,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentActive: { backgroundColor: colors.accent },
    segmentText: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: "700",
      textAlign: "center",
    },
    segmentTextActive: { color: colors.onAccent },
    segmentCount: { fontWeight: "500" },
    list: { gap: 10, paddingBottom: 16 },
    emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 30 },
    taskCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      paddingLeft: 16,
      paddingRight: 8,
    },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      borderColor: colors.faint,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxCompleted: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    taskContent: { flex: 1, gap: 2, minWidth: 0 },
    taskTitle: { color: colors.heading, fontSize: 16, fontWeight: "600" },
    completedTitle: {
      color: colors.muted,
      textDecorationLine: "line-through",
    },
    taskDescription: { color: colors.muted, fontSize: 14, lineHeight: 20 },
    taskActions: { flexDirection: "row", gap: 8 },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    iconButtonPressed: { backgroundColor: colors.surfaceMuted },
    editForm: { flex: 1, gap: 8 },
    editInput: {
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
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
      minHeight: 40,
      paddingHorizontal: 18,
      borderRadius: 999,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonText: {
      color: colors.onAccent,
      fontSize: 14,
      fontWeight: "700",
    },
    secondaryButton: {
      minHeight: 40,
      paddingHorizontal: 18,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryButtonText: {
      color: colors.heading,
      fontSize: 14,
      fontWeight: "700",
    },
    skeletonCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    skeletonCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.surfaceMuted,
    },
    skeletonLines: { flex: 1, gap: 8 },
    skeletonLine: {
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.surfaceMuted,
    },
    skeletonLineLong: { width: "70%" },
    skeletonLineShort: { width: "45%" },
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
    emptyTitle: {
      color: colors.heading,
      fontSize: 19,
      fontWeight: "800",
      textAlign: "center",
    },
    emptyText: { color: colors.muted, fontSize: 14, textAlign: "center" },
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    retryButton: { marginTop: 8 },
    footer: {
      textAlign: "center",
      color: colors.muted,
      fontSize: 12,
      fontWeight: "600",
      paddingVertical: 12,
    },
  });
}
