import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import mediumWeight from "expo-symbols/androidWeights/medium";

import { AppFonts, type ThemeColor } from "@/constants/theme";
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

const ICON_WEIGHT = { ios: "medium", android: mediumWeight } as const;

// Android lays the screen out above the tab bar, so only iOS needs the bottom inset.
const SAFE_AREA_EDGES =
  Platform.OS === "ios"
    ? (["top", "right", "bottom", "left"] as const)
    : (["top", "right", "left"] as const);

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
  const [focusedField, setFocusedField] = useState<
    "title" | "description" | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "in_progress" | "completed"
  >("all");

  const filteredTasks = tasks.filter((task) => {
    // Filter by status
    if (selectedFilter === "in_progress" && task.is_completed) {
      return false;
    }

    if (selectedFilter === "completed" && !task.is_completed) {
      return false;
    }

    // Filter by search query
    const query = searchQuery.toLowerCase().trim();

    const matchesTitle = task.title.toLowerCase().includes(query);

    const matchesDescription = (task.description ?? "")
      .toLowerCase()
      .includes(query);

    return matchesTitle || matchesDescription;
  });

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter((task) => task.is_completed).length;

  const inProgressTasks = totalTasks - completedTasks;

  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

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

  const progressPercent =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const stats = [
    { label: "Total Tasks", value: totalTasks },
    { label: "In Progress", value: inProgressTasks },
    { label: "Completed", value: completedTasks },
  ];
  const trimmedQuery = searchQuery.trim();
  const emptyCopy = trimmedQuery
    ? {
        title: "No matching tasks",
        text: `Nothing matches "${trimmedQuery}".`,
      }
    : totalTasks === 0
      ? EMPTY_COPY.all
      : EMPTY_COPY[selectedFilter];
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

  function cancelEditing() {
    if (isSaving) {
      return;
    }

    setEditingTaskId(null);
    setEditTitle("");
    setEditDescription("");
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
    <SafeAreaView style={styles.container} edges={SAFE_AREA_EDGES}>
      <View style={styles.header}>
        <Text style={styles.date}>{today}</Text>
        <Text style={styles.heading} accessibilityRole="header">
          My Tasks
        </Text>
        <Text style={styles.subtitle}>Stay focused. Get things done.</Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Your progress</Text>
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

        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statTile}>
              <Text style={styles.statNumber}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.composer}>
        <TextInput
          style={styles.composerInput}
          placeholder="What needs to be done?"
          placeholderTextColor={colors.faint}
          cursorColor={colors.accent}
          selectionHandleColor={colors.accent}
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
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Add task"
        >
          {isCreating ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <SymbolView
              name={{ ios: "plus", android: "add", web: "add" }}
              size={16}
              weight={ICON_WEIGHT}
              tintColor={colors.onAccent}
            />
          )}
        </Pressable>
      </View>

      <View style={styles.search}>
        <SymbolView
          name={{ ios: "magnifyingglass", android: "search", web: "search" }}
          size={16}
          weight={ICON_WEIGHT}
          tintColor={colors.muted}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          placeholderTextColor={colors.faint}
          cursorColor={colors.accent}
          selectionHandleColor={colors.accent}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          accessibilityLabel="Search tasks"
        />
        {searchQuery ? (
          <Pressable
            onPress={() => setSearchQuery("")}
            style={({ pressed }) => [
              styles.clearButton,
              pressed && styles.pressed,
            ]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <SymbolView
              name={{
                ios: "xmark.circle.fill",
                android: "close",
                web: "close",
              }}
              size={18}
              weight={ICON_WEIGHT}
              tintColor={colors.muted}
            />
          </Pressable>
        ) : null}
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
            >
              <Text
                style={[
                  styles.segmentText,
                  isActive && styles.segmentTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View
          style={styles.listCard}
          accessible
          accessibilityLabel="Loading tasks"
        >
          {[0, 1, 2].map((index) => (
            <View key={index}>
              {index > 0 && <View style={styles.separator} />}
              <View style={styles.skeletonRow}>
                <View style={styles.skeletonCircle} />
                <View style={styles.skeletonLines}>
                  <View
                    style={[styles.skeletonLine, styles.skeletonLineLong]}
                  />
                  <View
                    style={[styles.skeletonLine, styles.skeletonLineShort]}
                  />
                </View>
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
              size={26}
              weight={ICON_WEIGHT}
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
          // Let rows react to the first tap while the search keyboard is open.
          keyboardShouldPersistTaps="handled"
          itemLayoutAnimation={LinearTransition.duration(200)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={
            filteredTasks.length === 0 ? styles.emptyList : styles.listCard
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.stateIcon}>
                <SymbolView
                  name={
                    trimmedQuery
                      ? {
                          ios: "magnifyingglass",
                          android: "search",
                          web: "search",
                        }
                      : {
                          ios: "checklist",
                          android: "task_alt",
                          web: "task_alt",
                        }
                  }
                  size={26}
                  weight={ICON_WEIGHT}
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
              style={styles.taskRow}
            >
              <Pressable
                style={[
                  styles.checkbox,
                  item.is_completed && styles.checkboxCompleted,
                ]}
                onPress={() => toggleTask(item.id)}
                hitSlop={12}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.is_completed }}
                accessibilityLabel={`Toggle ${item.title}`}
              >
                {item.is_completed && (
                  <SymbolView
                    name={{ ios: "checkmark", android: "check", web: "check" }}
                    size={16}
                    weight={ICON_WEIGHT}
                    tintColor={colors.onAccent}
                  />
                )}
              </Pressable>

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
                    weight={ICON_WEIGHT}
                    tintColor={colors.muted}
                  />
                </Pressable>

                <Pressable
                  onPress={() => handleDeleteTask(item.id)}
                  style={({ pressed }) => [
                    styles.iconButton,
                    pressed && styles.iconButtonDangerPressed,
                  ]}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${item.title}`}
                >
                  {({ pressed }) => (
                    <SymbolView
                      name={{ ios: "trash", android: "delete", web: "delete" }}
                      size={20}
                      weight={ICON_WEIGHT}
                      tintColor={pressed ? colors.danger : colors.muted}
                    />
                  )}
                </Pressable>
              </View>
            </Animated.View>
          )}
        />
      )}

      <Text style={styles.footer}>Small steps. Big progress.</Text>

      <Modal
        visible={editingTaskId !== null}
        transparent
        animationType="fade"
        onRequestClose={cancelEditing}
      >
        <KeyboardAvoidingView behavior="padding" style={styles.sheetOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={cancelEditing}
            accessibilityRole="button"
            accessibilityLabel="Close editor"
          />

          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle} accessibilityRole="header">
              Edit task
            </Text>

            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={[
                styles.sheetInput,
                focusedField === "title" && styles.sheetInputFocused,
              ]}
              value={editTitle}
              onChangeText={setEditTitle}
              onFocus={() => setFocusedField("title")}
              onBlur={() => setFocusedField(null)}
              placeholder="Task title"
              placeholderTextColor={colors.faint}
              cursorColor={colors.accent}
              selectionHandleColor={colors.accent}
              maxLength={200}
              autoFocus
              accessibilityLabel="Task title"
            />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[
                styles.sheetInput,
                styles.sheetDescription,
                focusedField === "description" && styles.sheetInputFocused,
              ]}
              value={editDescription}
              onChangeText={setEditDescription}
              onFocus={() => setFocusedField("description")}
              onBlur={() => setFocusedField(null)}
              placeholder="Add details (optional)"
              placeholderTextColor={colors.faint}
              cursorColor={colors.accent}
              selectionHandleColor={colors.accent}
              multiline
              accessibilityLabel="Task description"
            />

            <View style={styles.sheetActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  styles.sheetButton,
                  pressed && styles.pressed,
                ]}
                onPress={cancelEditing}
                disabled={isSaving}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.sheetButton,
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
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// Google Sans has very tall line metrics: on Android, includeFontPadding: false plus an
// explicit lineHeight keeps text gaps and the input cursor compact.
function createStyles(colors: Record<ThemeColor, string>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      width: "100%",
      maxWidth: 720,
      alignSelf: "center",
      backgroundColor: colors.screen,
      paddingHorizontal: 16,
    },
    header: { paddingTop: 8, paddingBottom: 12, gap: 2 },
    date: {
      color: colors.accentStrong,
      fontFamily: AppFonts.medium,
      fontSize: 12,
      lineHeight: 16,
      includeFontPadding: false,
    },
    heading: {
      color: colors.heading,
      fontFamily: AppFonts.bold,
      fontSize: 24,
      lineHeight: 30,
      letterSpacing: -0.5,
      includeFontPadding: false,
    },
    subtitle: {
      color: colors.muted,
      fontFamily: AppFonts.regular,
      fontSize: 14,
      lineHeight: 20,
      includeFontPadding: false,
    },
    summary: {
      backgroundColor: colors.hero,
      borderRadius: 18,
      padding: 14,
      gap: 10,
      marginBottom: 10,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    summaryLabel: {
      color: colors.heroMuted,
      fontFamily: AppFonts.medium,
      fontSize: 12,
      lineHeight: 16,
      includeFontPadding: false,
    },
    summaryPercent: {
      color: colors.onAccent,
      fontFamily: AppFonts.bold,
      fontSize: 18,
      lineHeight: 22,
      includeFontPadding: false,
    },
    progressTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.heroTrack,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 2,
      backgroundColor: colors.heroMuted,
    },
    statsRow: { flexDirection: "row", gap: 8 },
    statTile: {
      flex: 1,
      gap: 2,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: colors.heroSurface,
    },
    statNumber: {
      color: colors.onAccent,
      fontFamily: AppFonts.bold,
      fontSize: 16,
      lineHeight: 20,
      includeFontPadding: false,
    },
    statLabel: {
      color: colors.heroMuted,
      fontFamily: AppFonts.regular,
      fontSize: 12,
      lineHeight: 16,
      includeFontPadding: false,
    },
    composer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingLeft: 12,
      paddingRight: 4,
      paddingVertical: 6,
      marginBottom: 8,
    },
    composerInput: {
      flex: 1,
      minWidth: 0,
      color: colors.heading,
      fontFamily: AppFonts.regular,
      fontSize: 15,
      lineHeight: 20,
      includeFontPadding: false,
      paddingVertical: 6,
    },
    addButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: { opacity: 0.7 },
    search: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 44,
      paddingLeft: 12,
      paddingRight: 6,
      borderRadius: 12,
      backgroundColor: colors.surfaceMuted,
      marginBottom: 8,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      color: colors.heading,
      fontFamily: AppFonts.regular,
      fontSize: 14,
      lineHeight: 20,
      includeFontPadding: false,
      paddingVertical: 8,
    },
    clearButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    segmented: {
      flexDirection: "row",
      gap: 4,
      padding: 4,
      borderRadius: 12,
      backgroundColor: colors.surfaceMuted,
      marginBottom: 10,
    },
    segment: {
      flex: 1,
      minHeight: 40,
      paddingHorizontal: 6,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentActive: { backgroundColor: colors.accent },
    segmentText: {
      color: colors.muted,
      fontFamily: AppFonts.medium,
      fontSize: 14,
      lineHeight: 18,
      includeFontPadding: false,
      textAlign: "center",
    },
    segmentTextActive: { color: colors.onAccent },
    listCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 24 },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 50,
    },
    taskRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 56,
      paddingVertical: 8,
      paddingLeft: 14,
      paddingRight: 4,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.faint,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxCompleted: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    taskContent: { flex: 1, minWidth: 0, gap: 1 },
    taskTitle: {
      color: colors.heading,
      fontFamily: AppFonts.medium,
      fontSize: 15,
      lineHeight: 20,
      includeFontPadding: false,
    },
    completedTitle: {
      color: colors.muted,
      textDecorationLine: "line-through",
    },
    taskDescription: {
      color: colors.muted,
      fontFamily: AppFonts.regular,
      fontSize: 13,
      lineHeight: 18,
      includeFontPadding: false,
    },
    taskActions: { flexDirection: "row", gap: 8 },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    iconButtonPressed: { backgroundColor: colors.surfaceMuted },
    iconButtonDangerPressed: { backgroundColor: colors.dangerSoft },
    sheetOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: colors.scrim,
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 10,
      gap: 6,
    },
    sheetHandle: {
      alignSelf: "center",
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 8,
    },
    sheetTitle: {
      color: colors.heading,
      fontFamily: AppFonts.bold,
      fontSize: 18,
      lineHeight: 24,
      includeFontPadding: false,
      marginBottom: 6,
    },
    fieldLabel: {
      color: colors.muted,
      fontFamily: AppFonts.medium,
      fontSize: 12,
      lineHeight: 16,
      includeFontPadding: false,
      marginTop: 4,
    },
    sheetInput: {
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1.5,
      borderColor: colors.surfaceMuted,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.heading,
      fontFamily: AppFonts.regular,
      fontSize: 15,
      lineHeight: 20,
      includeFontPadding: false,
    },
    sheetInputFocused: { borderColor: colors.accent },
    sheetDescription: { minHeight: 96, textAlignVertical: "top" },
    sheetActions: { flexDirection: "row", gap: 10, marginTop: 12 },
    sheetButton: { flex: 1, minHeight: 48 },
    primaryButton: {
      minHeight: 40,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonText: {
      color: colors.onAccent,
      fontFamily: AppFonts.medium,
      fontSize: 14,
      lineHeight: 18,
      includeFontPadding: false,
    },
    secondaryButton: {
      minHeight: 40,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryButtonText: {
      color: colors.heading,
      fontFamily: AppFonts.medium,
      fontSize: 14,
      lineHeight: 18,
      includeFontPadding: false,
    },
    skeletonRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 56,
      paddingHorizontal: 14,
    },
    skeletonCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.surfaceMuted,
    },
    skeletonLines: { flex: 1, gap: 6 },
    skeletonLine: {
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.surfaceMuted,
    },
    skeletonLineLong: { width: "65%" },
    skeletonLineShort: { width: "40%" },
    emptyState: { alignItems: "center", padding: 24, gap: 6 },
    stateIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
    },
    stateIconDanger: { backgroundColor: colors.dangerSoft },
    emptyTitle: {
      color: colors.heading,
      fontFamily: AppFonts.bold,
      fontSize: 17,
      lineHeight: 22,
      includeFontPadding: false,
      textAlign: "center",
    },
    emptyText: {
      color: colors.muted,
      fontFamily: AppFonts.regular,
      fontSize: 14,
      lineHeight: 20,
      includeFontPadding: false,
      textAlign: "center",
    },
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    retryButton: { marginTop: 8 },
    footer: {
      textAlign: "center",
      color: colors.muted,
      fontFamily: AppFonts.medium,
      fontSize: 12,
      lineHeight: 16,
      includeFontPadding: false,
      paddingVertical: 8,
    },
  });
}
