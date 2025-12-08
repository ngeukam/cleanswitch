import React, { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  Container,
  Typography,
  Alert,
  Paper,
} from "@mui/material";
import Toolbar from "@mui/material/Toolbar";
import Appbar from "../../components/Appbar";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import useApi from "../../hooks/APIHandler";
import { EventClickArg } from "@fullcalendar/core";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  color: string;
  type: "booking" | "task";
  status?: string;
  priority?: string;
  extendedProps: {
    type: string;
    status?: string;
    priority?: string;
    apartments_info?: any[];
    assignees_info?: any[];
  };
}

function Calendar() {
  const { callApi, loading } = useApi();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<CalendarEvent[]>([]);
  const [calendarView, setCalendarView] = useState("dayGridMonth");
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch bookings and tasks separately
  const fetchCalendarData = async () => {
    try {
      setError(null);
      const [bookingsResponse, tasksResponse] = await Promise.all([
        callApi({ url: "/calendar/bookings/" }),
        callApi({ url: "/calendar/tasks/" }),
      ]);

      if (bookingsResponse?.status === 200) {
        const bookingsData = bookingsResponse.data.map((event: any) => ({
          ...event,
          start: event.start || new Date().toISOString(), // Fallback if start is missing
          end: event.end || undefined,
        }));
        setBookings(bookingsData);
      } else {
        console.error("Failed to fetch bookings:", bookingsResponse);
        setError("Failed to load bookings");
      }

      if (tasksResponse?.status === 200) {
        const tasksData = tasksResponse.data.map((event: any) => ({
          ...event,
          start: event.start || new Date().toISOString(), // Fallback if start is missing
          end: event.end || undefined,
        }));
        setTasks(tasksData);
      } else {
        console.error("Failed to fetch tasks:", tasksResponse);
        setError("Failed to load tasks");
      }
    } catch (err) {
      console.error("Failed to fetch calendar data:", err);
      setError("Failed to load calendar data");
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  // Filter events based on active tab
  const getFilteredEvents = () => {
    const allEvents = [...bookings, ...tasks];
    switch (activeTab) {
      case 1: // Bookings only
        return bookings;
      case 2: // Tasks only
        return tasks;
      default:
        // All events
        return allEvents;
    }
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    const eventType = event.extendedProps.type;
    const eventId = event.id;

    // Show event details and redirect option
    Swal.fire({
      title: `${eventType === "booking" ? "Booking" : "Task"} Details`,
      html: getEventDetailsHTML(event),
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "View Full Details",
      cancelButtonText: "Close",
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#6c757d",
      focusConfirm: false,
      focusCancel: true,
      width: 500,
    }).then((result) => {
      if (result.isConfirmed) {
        // Redirect based on event type
        if (eventType === "booking") {
          navigate(`/bookings/${eventId}`);
        } else if (eventType === "task") {
          navigate(`/tasks/edit/${eventId}`);
        }
      }
    });
  };

  const getEventDetailsHTML = (event: any) => {
    const eventType = event.extendedProps.type;
    const startDate = event.start
      ? new Date(event.start).toLocaleDateString()
      : "N/A";
    const endDate = event.end
      ? new Date(event.end).toLocaleDateString()
      : "N/A";

    if (eventType === "booking") {
      const apartmentsInfo = event.extendedProps.apartments_info || [];
      return `
        <div style="text-align: left;">
          <p><strong>Type:</strong> Booking</p>
          <p><strong>Title:</strong> ${event.title}</p>
          <p><strong>Status:</strong> <span style="color: ${
            event.backgroundColor
          }; font-weight: bold">${
        event.extendedProps.status || "N/A"
      }</span></p>
          <p><strong>Start Date:</strong> ${startDate}</p>
          <p><strong>End Date:</strong> ${endDate}</p>
          ${
            apartmentsInfo.length > 0
              ? `
            <p><strong>Apartments:</strong></p>
            <ul style="margin-top: 5px; margin-bottom: 10px;">
              ${apartmentsInfo
                .map(
                  (apt: any) =>
                    `<li>${apt.number} - ${apt.name} (${
                      apt.property || "No Property"
                    })</li>`
                )
                .join("")}
            </ul>
          `
              : "<p><strong>Apartments:</strong> None</p>"
          }
        </div>
      `;
    } else if (eventType === "task") {
      const assigneesInfo = event.extendedProps.assignees_info || [];
      return `
        <div style="text-align: left;">
          <p><strong>Type:</strong> Task</p>
          <p><strong>Title:</strong> ${event.title}</p>
          <p><strong>Status:</strong> ${event.extendedProps.status || "N/A"}</p>
          <p><strong>Priority:</strong> <span style="color: ${
            event.backgroundColor
          }; font-weight: bold">${
        event.extendedProps.priority || "N/A"
      }</span></p>
          <p><strong>Due Date:</strong> ${startDate}</p>
          ${
            assigneesInfo.length > 0
              ? `
            <p><strong>Assignees:</strong></p>
            <ul style="margin-top: 5px;">
              ${assigneesInfo
                .map(
                  (assignee: any) =>
                    `<li>${assignee.name} (${assignee.department})</li>`
                )
                .join("")}
            </ul>
          `
              : "<p><strong>Assignees:</strong> None</p>"
          }
        </div>
      `;
    }
    return "<div>Event details not available</div>";
  };

  const handleViewChange = (viewInfo: any) => {
    setCalendarView(viewInfo.view.type);
  };

  const eventContent = (arg: any) => {
    const eventType = arg.event.extendedProps.type;
    const title =
      arg.event.title.length > 30
        ? arg.event.title.substring(0, 200) + "..."
        : arg.event.title;

    return (
      <div
        style={{
          fontSize: "0.7rem",
          padding: "1px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
        title={`Click to view ${eventType} details: ${arg.event.title}`}
      >
        <div style={{ fontWeight: "bold", marginBottom: "1px" }}>{title}</div>
        {arg.event.extendedProps.status && (
          <Chip
            label={arg.event.extendedProps.status}
            size="small"
            style={{
              height: "14px",
              fontSize: "0.5rem",
              backgroundColor: arg.event.backgroundColor,
              color: "white",
              marginTop: "1px",
            }}
          />
        )}
      </div>
    );
  };

  return (
    <Box sx={{ display: "flex" }}>
      <Appbar appBarTitle="Calendar" />
      <Box
        component="main"
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === "light"
              ? theme.palette.grey[100]
              : theme.palette.grey[900],
          flexGrow: 1,
          overflow: "auto",
        }}
      >
        <Toolbar />
        <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            {/* Error Display */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Event Type Filter Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
              >
                <Tab label="All Events" />
                <Tab label="Bookings" />
                <Tab label="Tasks" />
              </Tabs>
            </Box>

            {/* Legend */}
            <Box
              sx={{
                mb: 2,
                display: "flex",
                gap: 1,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <Typography variant="body2" sx={{ mr: 1 }}>
                Legend:
              </Typography>
              <Chip
                label="Bookings"
                size="small"
                sx={{ bgcolor: "#2196f3", color: "white" }}
              />
              <Chip
                label="Tasks - High"
                size="small"
                sx={{ bgcolor: "#f44336", color: "white" }}
              />
              <Chip
                label="Tasks - Medium"
                size="small"
                sx={{ bgcolor: "#ff9800", color: "white" }}
              />
              <Chip
                label="Tasks - Low"
                size="small"
                sx={{ bgcolor: "#4caf50", color: "white" }}
              />
            </Box>

            {/* Event Count Summary */}
            <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
              <Typography variant="body2">
                <strong>Bookings:</strong> {bookings.length}
              </Typography>
              <Typography variant="body2">
                <strong>Tasks:</strong> {tasks.length}
              </Typography>
              <Typography variant="body2">
                <strong>Total:</strong> {bookings.length + tasks.length}
              </Typography>
            </Box>

            {/* Instructions */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                💡 Click on any event to view details and navigate to the full
                page
              </Typography>
            </Box>

            {loading && (
              <Box display="flex" justifyContent="center" my={4}>
                <CircularProgress />
              </Box>
            )}

            {!loading && (
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin, timeGridPlugin]}
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                initialView={calendarView}
                timeZone="local" // Changed to local for better date handling
                themeSystem="standard"
                allDaySlot={true}
                slotDuration="01:00:00"
                selectable={false}
                selectMirror={true}
                weekNumbers={true}
                dayMaxEvents={2} // Reduced for better visibility
                weekends={true}
                nowIndicator={true}
                events={getFilteredEvents()}
                eventClick={handleEventClick}
                viewDidMount={handleViewChange}
                eventContent={eventContent}
                eventDisplay="block"
                height="auto"
                eventTimeFormat={{
                  // Time format
                  hour: "2-digit",
                  minute: "2-digit",
                  meridiem: "short",
                }}
              />
            )}
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}

export default Calendar;
