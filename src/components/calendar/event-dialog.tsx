'use client';

import { useState } from 'react';
import { X, Calendar as CalendarIcon, Clock, Plus, XCircle, CheckCircle, Repeat, Info } from 'lucide-react';
import { Event, EventType } from '@prisma/client';

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  event?: Event & {
    creator?: { id: string; name: string };
  };
}

export function EventDialog({ isOpen, onClose, onSave, event }: EventDialogProps) {
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [eventType, setEventType] = useState<EventType>(event?.eventType || EventType.ONE_TIME);
  const [startAt, setStartAt] = useState(
    event?.startAt ? new Date(event.startAt).toISOString().slice(0, 16) : ''
  );
  const [endAt, setEndAt] = useState(
    event?.endAt ? new Date(event.endAt).toISOString().slice(0, 16) : ''
  );
  const [cronExpr, setCronExpr] = useState(event?.cronExpr || '');
  const [enabled, setEnabled] = useState(event?.enabled ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        eventType,
        cronExpr: eventType === EventType.RECURRING ? cronExpr : undefined,
        startAt: new Date(startAt),
        endAt: endAt ? new Date(endAt) : undefined,
        enabled,
      });

      onClose();
    } catch (error) {
      console.error('Failed to save event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {event ? 'Edit Event' : 'Create Event'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's this event?"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setEventType(EventType.ONE_TIME);
                  setEnabled(true);
                }}
                className={`px-4 py-3 rounded-lg border transition-colors ${
                  eventType === EventType.ONE_TIME
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">One-time Event</p>
                    <p className="text-xs text-gray-500">Single occurrence</p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEventType(EventType.RECURRING);
                  setCronExpr('0 * * * *'); // Default: every hour
                }}
                className={`px-4 py-3 rounded-lg border transition-colors ${
                  eventType === EventType.RECURRING
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Repeat className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">Recurring Event</p>
                    <p className="text-xs text-gray-500">Cron schedule</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {eventType === EventType.ONE_TIME && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date & Time (optional)
                </label>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Cron Expression */}
          {eventType === EventType.RECURRING && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cron Expression
                </label>
                <input
                  type="text"
                  value={cronExpr}
                  onChange={(e) => setCronExpr(e.target.value)}
                  placeholder="0 * * * * (every hour)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
                <div className="mt-2 flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                  <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700">
                    <strong>Cron format:</strong> minute hour day_of_month month day_of_week
                    <br />
                    <strong>Example:</strong> <code>0 * * * *</code> = Every hour
                    <br />
                    <strong>Example:</strong> <code>0 9 * * 1</code> = Every Monday at 9 AM
                  </p>
                </div>
              </div>

              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Enable Event</p>
                  <p className="text-sm text-gray-500">
                    {enabled ? 'Event will be scheduled' : 'Event is paused'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    enabled
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                >
                  <span className="sr-only">Toggle</span>
                  <span
                    className={`block h-3 w-3 rounded-full ${
                      enabled ? 'bg-white' : 'bg-gray-500'
                    }`}
                  />
                </button>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {event ? 'Update' : 'Create'} Event
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
