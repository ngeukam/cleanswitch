import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  SelectChangeEvent,
  Container,
  Toolbar,
  TextField,
} from "@mui/material";
import {
  Visibility,
  Assignment,
  AddTask,
  CalendarToday,
  Home,
  FilterList,
  Clear,
  DateRange,
} from "@mui/icons-material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import useApi from "../../hooks/APIHandler";
import Appbar from "../../components/Appbar";

// TypeScript Interfaces
interface User {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
}
interface Guest {
  user: User;
}

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  due_date: string;
  assigned_to: string[];
  description?: string;
}

interface Apartment {
  id: number;
  number: number;
  name: string;
  property_assigned?: number;
  property_assigned_name?: string;
  capacity?: number;
  numberOfBeds?: number;
  apartmentType: string;
  inService: boolean;
  cleaned: boolean;
  price?: number;
  currency: string;
  image?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  has_planned_tasks: boolean;
  tasks: Task[];
}

interface Booking {
  id: number;
  apartments: number[];
  guest: Guest;
  dateOfReservation: string;
  added_by_user_id?: number;
  check_in_by_user_id?: number;
  check_out_by_user_id?: number;
  status: string;
  startDate: string;
  endDate: string;
  updated_at: string;
  apartments_with_tasks_info: Apartment[];
}

interface Filters {
  status: string;
  has_tasks: string;
  task_status: string;
  property_id: string;
  start_date_from: string;
  start_date_to: string;
  end_date_from: string;
  end_date_to: string;
}

interface TableRow {
  id: string;
  bookingId: number;
  apartmentId: number;
  apartmentName: string;
  apartmentNumber: number;
  propertyName: string;
  propertyId?: number;
  bookingStatus: string;
  checkOut: string;
  checkIn: string;
  hasPlannedTasks: boolean;
  guestName: string;
  tasks: Task[];
}

const BookingApartmentsTasksList: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const navigate = useNavigate();
  const { callApi, loading } = useApi();

  // Filter states
  const [filters, setFilters] = useState<Filters>({
    status: "",
    has_tasks: "",
    task_status: "",
    property_id: "",
    start_date_from: "",
    start_date_to: "",
    end_date_from: "",
    end_date_to: "",
  });

  // Fetch bookings with filters
  const fetchBookings = async (
    filterParams: Filters = {
      status: "",
      has_tasks: "",
      task_status: "",
      property_id: "",
      start_date_from: "",
      start_date_to: "",
      end_date_from: "",
      end_date_to: "",
    }
  ): Promise<void> => {
    try {
      //   setLoading(true);

      // Build query string
      const queryParams = new URLSearchParams();
      Object.entries(filterParams).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });

      const response = await callApi({
        url: `/bookings/apartments-tasks/?${queryParams}`,
      });

      if (response?.status === 200) {
        setBookings(response.data.bookings);
      }
    } catch (err) {
    } finally {
      //   setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(filters);
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await callApi({
        url: `/properties/`,
        params: { page: 1, pageSize: 100, ordering: "-id" },
      });

      if (response?.data?.data?.data) {
        const propertiesData = response.data.data.data;
        setProperties(propertiesData);
      }
    } catch (err) {
      console.error("Failed to fetch properties:", err);
    }
  };

  // Handle filter changes
  const handleFilterChange = (
    filterName: keyof Filters,
    value: string
  ): void => {
    const newFilters: Filters = {
      ...filters,
      [filterName]: value,
    };
    setFilters(newFilters);
    fetchBookings(newFilters);
  };

  // Handle date filter changes
  const handleDateFilterChange = (
    filterName: keyof Filters,
    value: string
  ): void => {
    const newFilters: Filters = {
      ...filters,
      [filterName]: value,
    };
    setFilters(newFilters);
    // Don't fetch immediately on date change to avoid too many API calls
  };

  // Apply date filters
  const handleApplyDateFilters = (): void => {
    fetchBookings(filters);
  };

  // Clear all filters
  const handleClearFilters = (): void => {
    const clearedFilters: Filters = {
      status: "",
      has_tasks: "",
      task_status: "",
      property_id: "",
      start_date_from: "",
      start_date_to: "",
      end_date_from: "",
      end_date_to: "",
    };
    setFilters(clearedFilters);
    fetchBookings(clearedFilters);
  };

  // Clear date filters only
  const handleClearDateFilters = (): void => {
    const clearedDateFilters: Filters = {
      ...filters,
      start_date_from: "",
      start_date_to: "",
      end_date_from: "",
      end_date_to: "",
    };
    setFilters(clearedDateFilters);
    fetchBookings(clearedDateFilters);
  };

  // Check if date filters are active
  const hasDateFilters = (): boolean => {
    return !!(
      filters.start_date_from ||
      filters.start_date_to ||
      filters.end_date_from ||
      filters.end_date_to
    );
  };

  // Transform data for DataGrid
  const getRows = (): TableRow[] => {
    const rows: TableRow[] = [];

    bookings.forEach((booking: Booking) => {
      booking.apartments_with_tasks_info?.forEach((apartment: Apartment) => {
        rows.push({
          id: `${booking.id}-${apartment.id}`,
          bookingId: booking.id,
          apartmentId: apartment.id,
          apartmentName: apartment.name || `Apartment ${apartment.number}`,
          apartmentNumber: apartment.number,
          propertyName: apartment.property_assigned_name || "N/A",
          propertyId: apartment.property_assigned,
          bookingStatus: booking.status,
          checkOut: booking.endDate,
          checkIn: booking.startDate,
          hasPlannedTasks: apartment.has_planned_tasks,
          guestName: booking.guest
            ? `${booking.guest.user.first_name} ${booking.guest.user.last_name}`
            : "N/A",
          tasks: apartment.tasks || [],
        });
      });
    });

    return rows;
  };

  const handleViewBooking = (bookingId: number): void => {
    navigate(`/bookings/${bookingId}`);
  };

  const handleViewTasks = (
    apartmentId: number,
    apartmentName: string
  ): void => {
    navigate(
      `/tasks-list?apartment=${apartmentId}&apartmentName=${encodeURIComponent(
        apartmentName
      )}`
    );
  };

  const handleCreateTask = (apartmentId: number, propertyId: number): void => {
    navigate(`/tasks/create?apartment=${apartmentId}&property=${propertyId}`);
  };

  // Booking status color mapping
  const getStatusColor = (
    status: string
  ): "success" | "info" | "default" | "error" | "warning" | "primary" => {
    const colors: Record<
      string,
      "success" | "info" | "default" | "error" | "warning" | "primary"
    > = {
      confirmed: "success",
      checked_in: "info",
      checked_out: "default",
      cancelled: "error",
      upcoming: "warning",
      active: "primary",
    };
    return (
      (colors[status] as
        | "success"
        | "info"
        | "default"
        | "error"
        | "warning"
        | "primary") || "default"
    );
  };

  const formatStatus = (status: string): string => {
    return status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Define columns with TypeScript types
  const columns: GridColDef[] = [
    {
      field: "apartmentName",
      headerName: "Apartment",
      width: 180,
      renderCell: (params: GridRenderCellParams<TableRow>) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Home color="primary" fontSize="small" />
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {params.row.apartmentName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              #{params.row.apartmentNumber}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: "propertyName",
      headerName: "Property",
      width: 150,
      renderCell: (params: GridRenderCellParams<TableRow>) => (
        <Chip
          label={params.row.propertyName}
          size="small"
          variant="outlined"
          color="primary"
        />
      ),
    },
    {
      field: "guestName",
      headerName: "Guest",
      width: 160,
    },
    {
      field: "bookingStatus",
      headerName: "Booking Status",
      width: 150,
      renderCell: (params: GridRenderCellParams<TableRow>) => (
        <Chip
          label={formatStatus(params.row.bookingStatus)}
          color={getStatusColor(params.row.bookingStatus)}
          size="small"
        />
      ),
    },
    {
      field: "checkIn",
      headerName: "Check-in",
      width: 150,
      renderCell: (params: GridRenderCellParams<TableRow>) => {
        const checkInDate = new Date(params.row.checkIn);
        return (
          <Box>
            <Typography variant="body2">
              {checkInDate.toLocaleDateString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {checkInDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "checkOut",
      headerName: "Check-out",
      width: 180,
      renderCell: (params: GridRenderCellParams<TableRow>) => {
        const checkOutDate = new Date(params.row.checkOut);
        const now = new Date();
        const isPastDue = checkOutDate < now;

        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CalendarToday
              fontSize="small"
              color={isPastDue ? "error" : "action"}
            />
            <Box>
              <Typography variant="body2">
                {checkOutDate.toLocaleDateString()}
              </Typography>
              <Typography
                variant="caption"
                color={isPastDue ? "error" : "text.secondary"}
              >
                {checkOutDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "hasPlannedTasks",
      headerName: "Tasks Planned",
      width: 140,
      renderCell: (params: GridRenderCellParams<TableRow>) => (
        <Chip
          icon={<Assignment />}
          label={params.row.hasPlannedTasks ? "Yes" : "No"}
          color={params.row.hasPlannedTasks ? "primary" : "default"}
          variant={params.row.hasPlannedTasks ? "filled" : "outlined"}
          size="small"
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 250,
      sortable: false,
      renderCell: (params: GridRenderCellParams<TableRow>) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          {/* View Booking Button */}
          <Tooltip title="View Booking Details">
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleViewBooking(params.row.bookingId)}
            >
              <Visibility />
            </IconButton>
          </Tooltip>

          {/* View Tasks or Create Task Button */}
          {params.row.hasPlannedTasks ? (
            <Tooltip title="View Tasks">
              <Button
                variant="outlined"
                size="small"
                startIcon={<Assignment />}
                onClick={() =>
                  handleViewTasks(
                    params.row.apartmentId,
                    params.row.apartmentName
                  )
                }
              >
                Tasks ({params.row.tasks.length})
              </Button>
            </Tooltip>
          ) : (
            <Tooltip title="Create Task">
              <Button
                variant="contained"
                size="small"
                startIcon={<AddTask />}
                onClick={() =>
                  handleCreateTask(
                    params.row.apartmentId,
                    params.row.propertyId
                  )
                }
                color="error"
              >
                Create Task
              </Button>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  // Active filters count
  const activeFiltersCount = Object.values(filters).filter(
    (value) => value !== ""
  ).length;

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  const rows = getRows();

  return (
    <Box sx={{ display: "flex" }}>
      <Appbar appBarTitle="Bookings Apartments Tasks" />
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
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom fontWeight="bold">
                Booking Apartments & Tasks
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage apartments, bookings, and associated tasks
              </Typography>
            </Box>

            {/* Filter Section */}
            <Card sx={{ mb: 3 }} variant="outlined">
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <FilterList color="action" sx={{ mr: 1 }} />
                  <Typography variant="h6">Filters</Typography>
                  {activeFiltersCount > 0 && (
                    <Chip
                      label={`${activeFiltersCount} active`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ ml: 2 }}
                    />
                  )}
                  <Box sx={{ flexGrow: 1 }} />
                  <Button
                    startIcon={<Clear />}
                    onClick={handleClearFilters}
                    disabled={activeFiltersCount === 0}
                  >
                    Clear All
                  </Button>
                </Box>

                <Grid container spacing={2}>
                  {/* Basic Filters */}
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Booking Status</InputLabel>
                      <Select
                        value={filters.status}
                        label="Booking Status"
                        onChange={(e: SelectChangeEvent) =>
                          handleFilterChange("status", e.target.value)
                        }
                      >
                        <MenuItem value="">All Statuses</MenuItem>
                        <MenuItem value="confirmed">Confirmed</MenuItem>
                        <MenuItem value="checked_in">Checked In</MenuItem>
                        <MenuItem value="checked_out">Checked Out</MenuItem>
                        <MenuItem value="cancelled">Cancelled</MenuItem>
                        <MenuItem value="upcoming">Upcoming</MenuItem>
                        <MenuItem value="active">Active</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Tasks Planned</InputLabel>
                      <Select
                        value={filters.has_tasks}
                        label="Tasks Planned"
                        onChange={(e: SelectChangeEvent) =>
                          handleFilterChange("has_tasks", e.target.value)
                        }
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="true">Has Tasks</MenuItem>
                        <MenuItem value="false">No Tasks</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Task Status</InputLabel>
                      <Select
                        value={filters.task_status}
                        label="Task Status"
                        onChange={(e: SelectChangeEvent) =>
                          handleFilterChange("task_status", e.target.value)
                        }
                      >
                        <MenuItem value="">All Statuses</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="in_progress">In Progress</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="cancelled">Cancelled</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Property</InputLabel>
                      <Select
                        value={filters.property_id}
                        label="Property"
                        onChange={(e: SelectChangeEvent) =>
                          handleFilterChange("property_id", e.target.value)
                        }
                      >
                        <MenuItem value="">All Properties</MenuItem>
                        {properties.map((prop) => (
                          <MenuItem key={prop.id} value={prop.id}>
                            {prop.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Date Filters */}
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        mb: 2,
                        mt: 1,
                      }}
                    >
                      <DateRange color="action" sx={{ mr: 1 }} />
                      <Typography variant="h6">Date Range Filters</Typography>
                      {hasDateFilters() && (
                        <Button
                          size="small"
                          onClick={handleClearDateFilters}
                          sx={{ ml: 2 }}
                        >
                          Clear Dates
                        </Button>
                      )}
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Check-in From"
                      type="date"
                      value={filters.start_date_from}
                      onChange={(e) =>
                        handleDateFilterChange(
                          "start_date_from",
                          e.target.value
                        )
                      }
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Check-in To"
                      type="date"
                      value={filters.start_date_to}
                      onChange={(e) =>
                        handleDateFilterChange("start_date_to", e.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Check-out From"
                      type="date"
                      value={filters.end_date_from}
                      onChange={(e) =>
                        handleDateFilterChange("end_date_from", e.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Check-out To"
                      type="date"
                      value={filters.end_date_to}
                      onChange={(e) =>
                        handleDateFilterChange("end_date_to", e.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        mt: 1,
                      }}
                    >
                      <Button
                        variant="contained"
                        onClick={handleApplyDateFilters}
                        disabled={!hasDateFilters()}
                        startIcon={<FilterList />}
                      >
                        Apply Date Filters
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Results Summary */}
            <Box
              sx={{
                mb: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Showing {rows.length} results
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => fetchBookings(filters)}
                startIcon={<FilterList />}
              >
                Refresh
              </Button>
            </Box>

            {/* Data Grid */}
            <Box sx={{ height: 600, width: "100%" }}>
              <DataGrid
                rows={rows}
                columns={columns}
                pageSize={10}
                rowsPerPageOptions={[10, 25, 50]}
                disableSelectionOnClick
                sx={{
                  "& .MuiDataGrid-cell:hover": {
                    backgroundColor: "transparent",
                  },
                }}
                initialState={{
                  sorting: {
                    sortModel: [{ field: "checkOut", sort: "asc" }],
                  },
                }}
              />
            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default BookingApartmentsTasksList;
