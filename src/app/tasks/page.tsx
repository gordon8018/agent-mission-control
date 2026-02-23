'use client';

import { useEffect, useState } from 'react';
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { PageLayout } from '@/components/page-layout';
import { TaskColumnComponent } from '@/components/tasks/task-column';
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog';
import { TaskDetailDrawer } from '@/components/tasks/task-detail-drawer';
import { TaskFilters } from '@/components/tasks/task-filters';
import { createTask, moveTask, updateTask, deleteTask, getTasks } from './actions';
import { Task, TaskColumn, User, Agent, TaskPriority, TaskStatus } from '@prisma/client';

export default function TasksPage() {
  const [columns, setColumns] = useState<(TaskColumn & { tasks: any[] })[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createDialogColumnId, setCreateDialogColumnId] = useState<string | undefined>();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filters, setFilters] = useState<any>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [colsRes, usersRes, agentsRes] = await Promise.all([
        fetch('/api/tasks/columns'),
        fetch('/api/tasks/users'),
        fetch('/api/tasks/agents'),
      ]);

      const cols = await colsRes.json();
      const usr = await usersRes.json();
      const agt = await agentsRes.json();

      setColumns(cols);
      setUsers(usr);
      setAgents(agt);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters to tasks
  const filteredColumns = columns.map((col) => ({
    ...col,
    tasks: col.tasks.filter((task) => {
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority && task.priority !== filters.priority) return false;

      if (filters.assigneeType === 'user' && !task.assignedToUserId) return false;
      if (filters.assigneeType === 'agent' && !task.assignedToAgentId) return false;
      if (filters.assigneeType === 'none' && (task.assignedToUserId || task.assignedToAgentId)) return false;

      if (filters.due === 'overdue') {
        if (!task.dueDate) return false;
        if (new Date(task.dueDate) >= new Date()) return false;
      }
      if (filters.due === 'today') {
        const today = new Date().toDateString();
        if (!task.dueDate || new Date(task.dueDate).toDateString() !== today) return false;
      }
      if (filters.due === 'week') {
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        if (!task.dueDate || new Date(task.dueDate) > weekFromNow) return false;
      }
      if (filters.due === 'month') {
        const monthFromNow = new Date();
        monthFromNow.setMonth(monthFromNow.getMonth() + 1);
        if (!task.dueDate || new Date(task.dueDate) > monthFromNow) return false;
      }

      return true;
    }),
  }));

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag over
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = filteredColumns.find((col) =>
      col.tasks.some((task) => task.id === activeId)
    );
    const overColumn = filteredColumns.find((col) =>
      col.tasks.some((task) => task.id === overId)
    );

    if (!activeColumn || !overColumn) return;

    // If moving within the same column
    if (activeColumn.id === overColumn.id) {
      const activeIndex = activeColumn.tasks.findIndex((task) => task.id === activeId);
      const overIndex = activeColumn.tasks.findIndex((task) => task.id === overId);

      if (activeIndex !== overIndex) {
        setColumns((prev) =>
          prev.map((col) =>
            col.id === activeColumn.id
              ? { ...col, tasks: arrayMove(col.tasks, activeIndex, overIndex) }
              : col
          )
        );
      }
    }
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = filteredColumns.find((col) =>
      col.tasks.some((task) => task.id === activeId)
    );
    const overColumn = filteredColumns.find((col) =>
      col.tasks.some((task) => task.id === overId)
    );

    if (!activeColumn || !overColumn) return;

    // Find new position
    const newColumn = filteredColumns.find((col) => col.id === overColumn.id);
    if (!newColumn) return;

    const newColumnTaskIds = newColumn.tasks.map((task) => task.id);
    const overIndex = newColumnTaskIds.indexOf(overId);

    const newPosition = overIndex + 1; // 1-indexed position in database

    // Save to database
    try {
      const result = await moveTask(activeId, {
        columnId: overColumn.id,
        position: newPosition,
      }, 'user-id-placeholder');

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Failed to move task:', error);
      // Revert UI state
      await fetchData();
    }
  };

  // Create task
  const handleCreateTask = async (data: any) => {
    await createTask({
      ...data,
      createdById: 'user-id-placeholder',
    });
    await fetchData();
  };

  // Update task
  const handleUpdateTask = async (id: string, data: any) => {
    await updateTask(id, data, 'user-id-placeholder');
    await fetchData();
  };

  // Delete task
  const handleDeleteTask = async (id: string) => {
    await deleteTask(id, 'user-id-placeholder');
    await fetchData();
  };

  // Handle task card click
  const handleTaskClick = async (task: any) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`);
      const fullTask = await res.json();
      setSelectedTask(fullTask);
      setIsDetailDrawerOpen(true);
    } catch (error) {
      console.error('Failed to fetch task details:', error);
    }
  };

  const actions = (
    <div className="flex items-center gap-3">
      <TaskFilters onFiltersChange={setFilters} />
      <button
        onClick={() => {
          setCreateDialogColumnId(filteredColumns[0]?.id);
          setIsCreateDialogOpen(true);
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
      >
        <Plus className="h-5 w-5" />
        Create Task
      </button>
    </div>
  );

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <PageLayout title="Tasks Board" currentPath="/tasks" actions={actions}>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : (
            /* Board */
            <div className="flex gap-4 overflow-x-auto pb-4">
              {filteredColumns.map((column) => (
                <TaskColumnComponent
                  key={column.id}
                  column={column}
                  onCreateTask={(columnId) => {
                    setCreateDialogColumnId(columnId);
                    setIsCreateDialogOpen(true);
                  }}
                  onTaskClick={handleTaskClick}
                />
              ))}
            </div>
          )}
        </PageLayout>
      </DndContext>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreate={handleCreateTask}
        columns={columns}
        users={users}
        agents={agents}
        defaultColumnId={createDialogColumnId}
      />

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
      />
    </>
  );
}
