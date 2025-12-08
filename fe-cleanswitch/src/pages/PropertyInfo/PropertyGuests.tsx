import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Grid,
  IconButton,
  Toolbar,
  Paper,
  Avatar,
  Chip,
  Typography,
  Tooltip,
  Stack,
} from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
  Edit,
  Delete,
  Person,
  Email,
  Phone,
  Apartment,
  Bookmark,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import Appbar from "../../components/Appbar";
import useApi from "../../hooks/APIHandler";
import { toast } from "react-toastify";
import DeleteConfirmationDialog from "../../components/DeleteConfirmationDialog";
import { Guest } from "../GuestInfo/types";
import AddGuestDialog from "../GuestInfo/AddGuestDialog";

interface Ordering {
  field: keyof Guest;
  sort: "asc" | "desc";
}

type CustomPaginationModel = {
  page: number;
  pageSize: number;
};

function PropertyGuests() {
  const { callApi, loading } = useApi();
  const { id } = useParams();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [columns, setColumns] = useState<GridColDef[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [paginationModel, setPaginationModel] = useState<CustomPaginationModel>(
    {
      page: 0,
      pageSize: 25,
    }
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [debounceSearch, setDebounceSearch] = useState("");
  const [ordering, setOrdering] = useState<Ordering[]>([
    { field: "id", sort: "desc" },
  ]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [property, setProperty] = useState<any>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounceSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    getGuests();
    fetchProperty();
  }, [paginationModel, debounceSearch, ordering, id]);

  const fetchProperty = async () => {
    try {
      const result = await callApi({
        url: `/properties/${id}/`,
      });
      if (result?.status === 200) {
        setProperty(result.data);
      }
    } catch (error) {
      console.error("Error fetching property:", error);
    }
  };

  const getGuests = async () => {
    const order =
      ordering.length > 0 && ordering[0].sort === "asc"
        ? ordering[0].field
        : "-" + ordering[0].field;

    try {
      const result = await callApi({
        url: `/properties/${id}/guests/`,
        params: {
          page: paginationModel.page + 1,
          pageSize: paginationModel.pageSize,
          search: debounceSearch,
          ordering: order,
        },
      });
      
      if (result?.status === 200) {
        const resultData = result.data.data;
        
        // Handle different response structures
        let guestsData: Guest[] = [];
        
        if (Array.isArray(resultData)) {
          guestsData = resultData;
        } else if (resultData.data && Array.isArray(resultData.data)) {
          guestsData = resultData.data;
        } else {
          guestsData = resultData;
        }
        
        // Process guests data to calculate current apartments
        const processedGuests = guestsData.map(guest => ({
          ...guest,
          current_apartments: getCurrentApartments(guest)
        }));
        
        setGuests(processedGuests);
        setTotalItems(resultData.totalItems || processedGuests.length);
        generateColumns(processedGuests);
      }
    } catch (error) {
      console.error("Error fetching guests:", error);
      toast.error("Failed to load guests");
    }
  };

  // Calculate current apartments based on recent bookings
  const getCurrentApartments = (guest: Guest): string[] => {
    if (!guest.recent_bookings || guest.recent_bookings.length === 0) {
      return [];
    }

    // Find current or upcoming booking
    const currentBooking = guest.recent_bookings.find(
      booking => booking.status === "checked_in"
    );

    if (currentBooking && currentBooking.apartments.length > 0) {
      // Return all apartments in the current booking
      return currentBooking.apartments.map(apartment => 
        `${apartment.number} - ${apartment.name}`
      );
    }

    return [];
  };

  const handleDeleteClick = (params: GridRenderCellParams) => {
    setSelectedGuest(params.row);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!selectedGuest) return;
    setDeleteLoading(true);
    try {
      const response = await callApi({
        url: `/guests/${selectedGuest.id}/`,
        method: "DELETE",
      });

      if (response?.status === 204) {
        toast.success("Guest deleted successfully!");
        setDeleteDialogOpen(false);
        setSelectedGuest(null);
        getGuests();
      }
    } catch (err) {
      console.error("Error deleting guest:", err);
      toast.error("Failed to delete guest");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCloseDeleteDialog = (): void => {
    if (!deleteLoading) {
      setDeleteDialogOpen(false);
      setSelectedGuest(null);
    }
  };

  const onEditClick = (params: GridRenderCellParams) => {
    navigate(`/guests/edit/${params.row.id}`);
  };

  const onViewClick = (params: GridRenderCellParams) => {
    navigate(`/guests/${params.row.id}`);
  };

  const generateColumns = (data: Guest[]) => {
    const baseColumns: GridColDef[] = [
      {
        field: "action",
        headerName: "Actions",
        width: 120,
        sortable: false,
        renderCell: (params: GridRenderCellParams) => (
          <Box>
            <Tooltip title="View Details">
              <IconButton onClick={() => onViewClick(params)} size="small">
                <Person color="primary" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit Guest">
              <IconButton onClick={() => onEditClick(params)} size="small">
                <Edit color="secondary" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Guest">
              <IconButton onClick={() => handleDeleteClick(params)} size="small">
                <Delete color="error" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
      {
        field: "avatar",
        headerName: "Guest",
        width: 250,
        sortable: false,
        renderCell: (params: GridRenderCellParams) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: "primary.main",
                fontSize: "0.875rem",
              }}
            >
              {params.row.user?.first_name?.[0]?.toUpperCase()}
              {params.row.user?.last_name?.[0]?.toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight="bold">
                {params.row.user?.first_name} {params.row.user?.last_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Guest #{params.row.id}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        field: "contact",
        headerName: "Contact Info",
        width: 250,
        sortable: false,
        renderCell: (params: GridRenderCellParams) => (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Email fontSize="small" color="action" />
              <Typography variant="body2">{params.row.user?.email}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Phone fontSize="small" color="action" />
              <Typography variant="body2">{params.row.user?.phone}</Typography>
            </Box>
          </Box>
        ),
      },
      {
        field: "current_apartments",
        headerName: "Current Apartments",
        width: 300,
        sortable: false,
        renderCell: (params: GridRenderCellParams) => {
          const currentApartments = params.row.current_apartments || [];
          
          if (currentApartments.length === 0) {
            return (
              <Tooltip title="Not Checked In">
                <Chip
                  label="Not Checked In"
                  color="default"
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            );
          }

          return (
            <Tooltip 
              title={
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Current Apartments:
                  </Typography>
                  {currentApartments.map((apartment:any, index:any) => (
                    <Typography key={index} variant="body2">
                      • {apartment}
                    </Typography>
                  ))}
                </Box>
              }
              arrow
              placement="top"
            >
              <Stack direction="column" spacing={0.5}>
                <Chip
                  icon={<Apartment />}
                  label={`${currentApartments.length} apartment${currentApartments.length > 1 ? 's' : ''}`}
                  color="default"
                  size="small"
                  variant="filled"
                />
                {currentApartments.length === 1 && (
                  <Typography variant="caption" color="text.secondary">
                    {currentApartments[0]}
                  </Typography>
                )}
                {currentApartments.length > 1 && (
                  <Typography variant="caption" color="text.secondary">
                    {currentApartments.length} apartments
                  </Typography>
                )}
              </Stack>
            </Tooltip>
          );
        },
      },
      {
        field: "booking_count",
        headerName: "Bookings",
        width: 120,
        sortable: true,
        renderCell: (params: GridRenderCellParams) => (
          <Chip
            icon={<Bookmark />}
            label={params.row.booking_count || 0}
            size="small"
            variant="outlined"
            color="primary"
          />
        ),
      },
      {
        field: "last_booking",
        headerName: "Last Booking Status",
        width: 150,
        sortable: false,
        renderCell: (params: GridRenderCellParams) => {
          const recentBookings = params.row.recent_bookings;
          if (!recentBookings || recentBookings.length === 0) {
            return <Typography variant="body2" color="text.secondary">No bookings</Typography>;
          }
          
          const lastBooking = recentBookings[0];
          const statusColor = 
            lastBooking.status === 'checked_in' ? 'success' :
            lastBooking.status === 'upcoming' ? 'warning' :
            lastBooking.status === 'checked_out' ? 'default' : 'secondary';
            
          return (
            <Chip
              label={lastBooking.status.replace('_', ' ')}
              color={statusColor}
              size="small"
              variant="outlined"
            />
          );
        },
      },
      {
        field: "apartments_count",
        headerName: "Current Apt Count",
        width: 140,
        sortable: true,
        renderCell: (params: GridRenderCellParams) => {
          const currentApartments = params.row.current_apartments || [];
          return (
            <Typography variant="body2" fontWeight="bold">
              {currentApartments.length}
            </Typography>
          );
        },
      },
    ];

    setColumns(baseColumns);
  };

  return (
    <Box sx={{ display: "flex" }}>
      <Appbar appBarTitle={`Guests List`} />
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
          {/* Property Info Header */}
          {property && (
            <Paper elevation={2} sx={{ p: 3, mb: 3, backgroundColor: 'primary.main', color: 'white' }}>
              <Typography variant="h5" gutterBottom>
                Property {property.name}
              </Typography>
              <Typography variant="body1">
                {property.address}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Total Guests: {guests.length}
              </Typography>
            </Paper>
          )}

          {/* Search and Add Button */}
          <AddGuestDialog
            handleChange={getGuests}
            searchQuery={searchQuery}
            searchChange={(e) => setSearchQuery(e.target.value)}
            hideButtonAdd={true}
          />
          
          {/* Data Grid */}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 2 }}>
                <DataGrid
                  rows={guests}
                  columns={columns}
                  rowHeight={90}
                  autoHeight={true}
                  page={paginationModel.page}
                  pageSize={paginationModel.pageSize}
                  onPageChange={(newPage) =>
                    setPaginationModel((prev) => ({ ...prev, page: newPage }))
                  }
                  onPageSizeChange={(newPageSize) =>
                    setPaginationModel((prev) => ({
                      ...prev,
                      pageSize: newPageSize,
                    }))
                  }
                  rowsPerPageOptions={[5, 10, 25]}
                  rowCount={totalItems}
                  paginationMode="server"
                  loading={loading}
                  sx={{
                    backgroundColor: "white",
                    "& .MuiDataGrid-cell": {
                      borderBottom: `1px solid #f0f0f0`,
                    },
                    "& .MuiDataGrid-columnHeaders": {
                      backgroundColor: "#f5f5f5",
                      borderBottom: "2px solid #e0e0e0",
                    },
                  }}
                />
              </Paper>
            </Grid>
          </Grid>

          {/* Delete Confirmation Dialog */}
          <DeleteConfirmationDialog
            open={deleteDialogOpen}
            onClose={handleCloseDeleteDialog}
            onConfirm={handleDeleteConfirm}
            loading={deleteLoading}
            title="Delete Guest"
            description="Are you sure you want to delete this guest? This action cannot be undone and will also delete their user account."
            itemName={
              selectedGuest
                ? `${selectedGuest.user?.first_name} ${selectedGuest.user?.last_name}`
                : ""
            }
            confirmText="Delete Guest"
            cancelText="Cancel"
          />
        </Container>
      </Box>
    </Box>
  );
}

export default PropertyGuests;