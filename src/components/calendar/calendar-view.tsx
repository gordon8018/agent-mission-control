'use client';

import { useState } from 'react';
import { X, Calendar as CalendarIcon, Clock, Plus, MoreHorizontal, Check, XCircle, Play, Pause } from 'lucide-react';
import { Event, EventType, RunStatus } from '@prisma/client';

interface CalendarViewProps {
  events: (Event & {
    creator?: { id: string; name: string };
    runs: Array<{
      id: string;
      status: RunStatus;
      startedAt: Date;
      completedAt?: Date;
      output?: string;
    }>;
  })[];
  onCreateEvent: () => void;
  onEditEvent: (event: any) => void;
}

const eventTypeColors = {
  [EventType.ONE_TIME]: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    icon: '📅',
  },
  [EventType.RECURRING]: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-300',
    icon: '🔄',
  },
};

const runStatusIcons = {
  [RunStatus.PENDING]: Clock,
  [RunStatus.RUNNING]: Play,
  [RunStatus.SUCCESS]: Check,
  [RunStatus.FAILED]: XCircle,
  [RunStatus.CANCELLED]: Pause,
};

const runStatusColors = {
  [RunStatus.PENDING]: 'text-gray-500',
  [RunStatus.RUNNING]: 'text-blue-600',
  [RunStatus.SUCCESS]: 'text-green-600',
  [RunStatus.FAILED]: 'text-red-600',
  [RunStatus.CANCELLED]: 'text-gray-400',
};

export function CalendarView({ events, onCreateEvent, onEditEvent }: CalendarViewProps) {
  const [isListView, setIsListView] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date());

  const monthStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const monthEnd = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);

  // Filter events in current month
  const monthEvents = events.filter((event) => {
    const eventDate = new Date(event.startAt);
    return eventDate >= monthStart && eventDate <= monthEnd;
  });

  const prevMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = (date: Date) => {
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Calendar</h2>
          <button
            onClick={() => setIsListView(!isListView)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isListView
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {isListView ? (
              <>
                <CalendarIcon className="h-5 w-5" />
                List View
              </>
            ) : (
              <>
                <CalendarIcon className="h-5 w-5" />
                Month View
              </>
            )}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Clock className="h-5 w-5 text-gray-600 rotate-180" />
          </button>
          <span className="text-sm font-medium text-gray-900 min-w-[150px] text-center">
            {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Clock className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={() => setViewMonth(new Date())}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Today
          </button>
          <button
            onClick={onCreateEvent}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            New Event
          </button>
        </div>
      </div>

      {/* Calendar Grid View */}
      {!isListView && (
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-gray-500 py-2"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {Array.from({ length: 35 }, (_, i) => {
            const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i - 1);
            const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
            const isValidDate = date.getDate() >= 1 && date.getDate() <= daysInMonth;

            if (!isValidDate) {
              return <div key={i} className="min-h-[100px] bg-gray-50" />;
            }

            const dayEvents = monthEvents.filter((event) =>
              new Date(event.startAt).toDateString() === date.toDateString()
            );

            return (
              <div
                key={i}
                className={`min-h-[100px] border-t border-gray-200 p-1 ${isToday(date) ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${isToday(date) ? 'text-blue-700' : 'text-gray-900'}`}>
                    {date.getDate()}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayEvents.map((event) => {
                    const style = eventTypeColors[event.eventType];
                    return (
                      <div
                        key={event.id}
                        onClick={() => onEditEvent(event)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium border ${style.bg} ${style.border} ${style.text} hover:shadow-md cursor-pointer transition-shadow`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{style.icon}</span>
                          <span className="truncate max-w-[120px]">{event.title}</span>
                        </div>
                        {event.eventType === EventType.RECURRING && (
                          <div className="flex items-center gap-1 text-[10px] text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>{event.nextRunAt ? new Date(event.nextRunAt).toLocaleTimeString() : 'N/A'}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {isListView && (
        <div className="space-y-4">
          {monthEvents.map((event) => {
            const style = eventTypeColors[event.eventType];
            return (
              <div
                key={event.id}
                onClick={() => onEditEvent(event)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md cursor-pointer transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`px-2.5 py-1 rounded-full text-base ${style.bg} ${style.border}`}
                      >
                        {style.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{event.title}</h3>
                        <p className="text-sm text-gray-500">
                          {event.startAt.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}{' '}
                          at {event.startAt.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button className="p-1 hover:bg-gray-100 rounded-lg">
                    <MoreHorizontal className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                {event.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {event.description}
                  </p>
                )}

                {event.eventType === EventType.RECURRING && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>
                      Enabled: {event.enabled ? 'Yes' : 'No'} |{' '}
                      Next run: {event.nextRunAt ? new Date(event.nextRunAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                )}

                {/* Run History */}
                {event.runs.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Run History</h4>
                    <div className="space-y-2">
                      {event.runs.slice(0, 3).map((run) => {
                        const StatusIcon = runStatusIcons[run.status] || Clock;
                        const statusColor = runStatusColors[run.status] || 'text-gray-500';

                        return (
                          <div
                            key={run.id}
                            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                          >
                            <div
                              className={`p-2 rounded-full ${run.status === RunStatus.SUCCESS ? 'bg-green-100' : run.status === RunStatus.FAILED ? 'bg-red-100' : 'bg-gray-100'}`}
                            >
                              <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className={`text-sm font-medium capitalize text-gray-900`}>
                                  {run.status.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {run.startedAt.toLocaleDateString()} {run.startedAt.toLocaleTimeString()}
                                </span>
                              </div>
                              {run.completedAt && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Duration: {Math.round((run.completedAt.getTime() - run.startedAt.getTime()) / 1000)}s
                                </p>
                              )}
                              {run.output && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                                  {run.output}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {event.runs.length > 3 && (
                        <p className="text-xs text-gray-400 text-center">
                          +{event.runs.length - 3} more runs
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {monthEvents.length === 0 && (
            <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
              <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No events this month</p>
              <p className="text-sm text-gray-400">Click "New Event" to create one</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
