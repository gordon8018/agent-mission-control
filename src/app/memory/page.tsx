'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Filter, MoreHorizontal, Search, BookOpen, Clock, Tag as TagIcon } from 'lucide-react';
import { PageLayout } from '@/components/page-layout';
import { MemoryCard } from '@/components/memory/memory-card';
import { MemoryDetailDrawer } from '@/components/memory/memory-detail-drawer';
import { createMemory, updateMemory, deleteMemory, getMemories } from './actions';
import { Memory, MemorySource } from '@prisma/client';

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<{
    source?: MemorySource;
    tag?: string;
  }>({});

  useEffect(() => {
    fetchMemories();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    fetchMemories();
  }, [filters]);

  const fetchMemories = async () => {
    setIsLoading(true);
    try {
      const data = await getMemories(filters);
      setMemories(data);
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMemory = async (data: any) => {
    await createMemory(data);
    await fetchMemories();
  };

  const handleUpdateMemory = async (id: string, data: any) => {
    await updateMemory(id, data, 'user-id-placeholder');
    await fetchMemories();
  };

  const handleDeleteMemory = async (id: string) => {
    await deleteMemory(id, 'user-id-placeholder');
    await fetchMemories();
  };

  const handleTagClick = (tag: string) => {
    setFilters({ ...filters, tag: filters.tag === tag ? undefined : tag });
  };

  const actions = (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setFilters({})}
        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
          filters.source || filters.tag ? 'bg-blue-100 text-blue-700' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
        }`}
      >
        <Filter className="h-4 w-4" />
        {filters.source || filters.tag ? 'Filters Active' : 'Filters'}
      </button>
      <button
        onClick={fetchMemories}
        className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Refresh
      </button>
      <button
        onClick={() => {
          setSelectedMemory(null);
          setIsDetailDrawerOpen(true);
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
      >
        <Plus className="h-5 w-5" />
        New Memory
      </button>
    </div>
  );

  const sourceFilter = (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Source:</span>
      <select
        value={filters.source || 'all'}
        onChange={(e) => {
          const value = e.target.value as any;
          setFilters({ ...filters, source: value === 'all' ? undefined : value });
        }}
        className="text-sm border-0 bg-transparent p-0 font-medium text-gray-700 hover:text-gray-900 focus:ring-0 cursor-pointer"
      >
        <option value="all">All</option>
        <option value={MemorySource.MANUAL}>Manual</option>
        <option value={MemorySource.TASK_DONE}>Task Done</option>
        <option value={MemorySource.RUN_FINISHED}>Run Finished</option>
      </select>
    </div>
  );

  return (
    <>
      <PageLayout title="Memory Library" currentPath="/memory" actions={actions}>
        {/* Filters Bar */}
        <div className="mb-6 flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
          {sourceFilter}
          {filters.tag && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full">
              <TagIcon className="h-3 w-3" />
              <span className="text-sm font-medium">Filter: {filters.tag}</span>
              <button
                onClick={() => setFilters({ ...filters, tag: undefined })}
                className="ml-1 hover:bg-blue-100 rounded-full p-0.5"
              >
                <span className="text-blue-600 font-bold">×</span>
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading memories...</div>
          </div>
        ) : memories.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-gray-200">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">No memories yet</p>
            <p className="text-sm text-gray-500 mb-6">
              Create memories manually, or they'll be auto-created when:
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full">
                <BookOpen className="h-3 w-3" />
                Tasks completed
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full">
                <Clock className="h-3 w-3" />
                Runs finished
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedMemory(null);
                setIsDetailDrawerOpen(true);
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first memory
            </button>
          </div>
        ) : (
          /* Memories Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memories.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onEdit={() => {
                  setSelectedMemory(memory);
                  setIsDetailDrawerOpen(true);
                }}
                onDelete={handleDeleteMemory}
                onTagClick={handleTagClick}
              />
            ))}
          </div>
        )}
      </PageLayout>

      {/* Memory Detail Drawer */}
      {selectedMemory && (
        <MemoryDetailDrawer
          isOpen={isDetailDrawerOpen}
          onClose={() => {
            setIsDetailDrawerOpen(false);
            setSelectedMemory(null);
          }}
          memory={selectedMemory}
          onUpdate={handleUpdateMemory}
          onDelete={handleDeleteMemory}
        />
      )}
    </>
  );
}
