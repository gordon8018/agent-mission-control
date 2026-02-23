'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { PageLayout } from '@/components/page-layout';
import { CalendarView } from '@/components/calendar/calendar-view';
import { EventDialog } from '@/components/calendar/event-dialog';
import { createEvent, updateEvent, deleteEvent, getEvents } from './actions';
import { Event, EventType, RunStatus } from '@prisma/client';

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(new Date());

  useEffect(() => {
    fetchEvents();
  }, [viewMonth]);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const now = viewMonth;
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const data = await getEvents({
        fromDate: monthStart,
        toDate: monthEnd,
      });

      // Attach runs to events
      const eventsWithRuns = await Promise.all(
        data.map(async (event) => ({
          ...event,
          runs: await fetch(`/api/events/${event.id}`).then((r) => r.json()),
        }))
      );

      setEvents(eventsWithRuns);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEvent = async (data: any) => {
    await createEvent({
      ...data,
      createdBy: 'user-id-placeholder', // TODO: Get from auth
    });
    await fetchEvents();
  };

  const handleUpdateEvent = async (data: any) => {
    if (!selectedEvent) return;
    await updateEvent(selectedEvent.id, data, 'user-id-placeholder');
    await fetchEvents();
  };

  const handleDeleteEvent = async (event: Event) => {
    if (confirm(`Are you sure you want to delete "${event.title}"?`)) {
      await deleteEvent(event.id, 'user-id-placeholder');
      await fetchEvents();
    }
  };

  const actions = (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setViewMonth(new Date())}
        className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
      >
        <RefreshCw className="h-4 w-4 text-gray-600" />
        Today
      </button>
      <button
        onClick={() => {
          setSelectedEvent(null);
          setIsDialogOpen(true);
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
      >
        <Plus className="h-5 w-5" />
        New Event
      </button>
    </div>
  );

  return (
    <>
      <PageLayout title="Calendar" currentPath="/calendar" actions={actions}>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading events...</div>
          </div>
        ) : (
          <CalendarView
            events={events}
            onCreateEvent={() => {
              setSelectedEvent(null);
              setIsDialogOpen(true);
            }}
            onEditEvent={(event) => {
              setSelectedEvent(event);
              setIsDialogOpen(true);
            }}
          />
        )}
      </PageLayout>

      {/* Event Dialog */}
      <EventDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedEvent(null);
        }}
        onSave={selectedEvent ? handleUpdateEvent : handleCreateEvent}
        event={selectedEvent}
      />
    </>
  );
}
