import { useState } from "react";
import {
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

type Task = {
  id: string;
  title: string;
  completed: boolean;
};

const initialTasks: Task[] = [
  { id: "1", title: "Learn React Native", completed: true },
  { id: "2", title: "Build Task Manager UI", completed: false },
  { id: "3", title: "Connect to FastAPI", completed: false },
];

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTask, setNewTask] = useState("");

  const completedCount = tasks.filter((task) => task.completed).length;

  function addTask() {
    const title = newTask.trim();

    if (!title) {
      if (Platform.OS === "web") {
        window.alert("Please enter a task title.");
      } else {
        Alert.alert("Missing task", "Please enter a task title.");
      }
      return;
    }

    setTasks((currentTasks) => [
      { id: Date.now().toString(), title, completed: false },
      ...currentTasks,
    ]);

    setNewTask("");
    Keyboard.dismiss();
  }

  function toggleTask(id: string) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    );
  }

  function deleteTask(id: string) {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));
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
          style={styles.addButton}
          onPress={addTask}
          accessibilityRole="button"
          accessibilityLabel="Add task"
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>TASK LIST</Text>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
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
                item.completed && styles.checkboxCompleted,
              ]}
              onPress={() => toggleTask(item.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.completed }}
              accessibilityLabel={`Mark ${item.title} ${
                item.completed ? "incomplete" : "complete"
              }`}
            >
              {item.completed && <Text style={styles.checkmark}>✓</Text>}
            </Pressable>

            <Pressable
              style={styles.taskContent}
              onPress={() => toggleTask(item.id)}
            >
              <Text
                style={[
                  styles.taskTitle,
                  item.completed && styles.completedTitle,
                ]}
              >
                {item.title}
              </Text>
              <Text style={styles.taskStatus}>
                {item.completed ? "COMPLETED" : "IN PROGRESS"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => deleteTask(item.id)}
              style={styles.deleteButton}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.title}`}
            >
              <Text style={styles.deleteText}>×</Text>
            </Pressable>
          </View>
        )}
      />
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
  header: {
    paddingTop: 28,
    paddingBottom: 24,
  },
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
  subtitle: {
    color: "#74798B",
    fontSize: 15,
    marginTop: 7,
  },
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
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "400",
  },
  sectionTitle: {
    color: "#777D90",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  list: {
    gap: 11,
    paddingBottom: 18,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 30,
  },
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
  checkboxCompleted: {
    backgroundColor: "#6268D9",
    borderColor: "#6268D9",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  taskContent: {
    flex: 1,
    gap: 6,
  },
  taskTitle: {
    color: "#292D42",
    fontSize: 14,
    fontWeight: "600",
  },
  completedTitle: {
    color: "#969AAA",
    textDecorationLine: "line-through",
  },
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
  deleteText: {
    color: "#A0A4B3",
    fontSize: 25,
  },
  emptyState: {
    alignItems: "center",
    padding: 30,
  },
  emptyIcon: {
    color: "#6268D9",
    fontSize: 34,
    marginBottom: 12,
  },
  emptyTitle: {
    color: "#292D42",
    fontSize: 19,
    fontWeight: "800",
  },
  emptyText: {
    color: "#858A9A",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
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
