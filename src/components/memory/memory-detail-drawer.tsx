'use client';

import { X, Edit, Trash2, BookOpen, Clock, Tag } from 'lucide-react';
import { Memory } from '@prisma/client';

interface MemoryDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  memory: Memory & {
    creator?: { id: string; name: string };
    sourceTask?: { id: string; title: string };
    sourceRun?: { id: string; eventId: string; status: string };
  };
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTagClick?: (tag: string) => void;
}

export function MemoryDetailDrawer({ isOpen, onClose, memory, onUpdate, onDelete, onTagClick }: MemoryDetailDrawerProps) {
  const [title, setTitle] = useState(memory.title);
  const [content, setContent] = useState(memory.content || '');
  const [summary, setSummary] = useState(memory.summary || '');
  const [tags, setTags] = useState(memory.tags || []);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !memory) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(memory.id, {
        title,
        content,
        summary,
        tags,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save memory:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this memory?')) {
      await onDelete(memory.id);
      onClose();
    }
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-2xl transform transition-transform z-50 overflow-y-auto ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900 line-clamp-1">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Save"
          >
            <Edit className={`h-5 w-5 text-gray-600 ${isSaving ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Editable fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Summary
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary of this memory..."
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <button
                  key={index}
                  onClick={() => onTagClick?.(tag)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Markdown Preview */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Content Preview</h3>
          <div className="prose prose max-w-none text-gray-800">
            {/* Simple markdown-like rendering */}
            {content.split('\n').map((line, index) => {
              if (line.startsWith('# ')) {
                const level = line.match(/^#+/)?.[0]?.length || 1;
                const heading = line.replace(/^#+/, '');
                const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
                return (
                  <HeadingTag key={index} className={`font-semibold mt-${level * 2} mb-2`}>
                    {heading.trim()}
                  </HeadingTag>
                );
              } else if (line.startsWith('**') && line.endsWith('**')) {
                return (
                  <strong key={index} className="font-bold">
                    {line.replace(/\*\*/g, '')}
                  </strong>
                );
              } else if (line.startsWith('- ')) {
                return (
                  <li key={index} className="ml-4 list-disc">
                    {line.replace(/^-\s/, '')}
                  </li>
                );
              } else if (line.trim() === '') {
                return <br key={index} />;
              } else {
                return <p key={index}>{line}</p>;
              }
            })}
          </div>
        </div>

        {/* Source Reference */}
        {(memory.sourceTask || memory.sourceRun) && (
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Source</h3>
            {memory.sourceTask && (
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Task</p>
                  <p className="text-sm text-gray-600">{memory.sourceTask.title}</p>
                </div>
              </div>
            )}
            {memory.sourceRun && (
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Run</p>
                  <p className="text-sm text-gray-600">
                    {memory.sourceRun.status} - Event ID: {memory.sourceRun.eventId}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <p>
              Created {memory.createdAt ? new Date(memory.createdAt).toLocaleString() : 'Unknown'} by {memory.creator?.name || 'Unknown'}
            </p>
            {memory.updatedAt && memory.updatedAt !== memory.createdAt && (
              <p>Updated {new Date(memory.updatedAt).toLocaleString()}</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-6 border-t bg-gray-50 sticky bottom-0">
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Delete Memory
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Edit className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
