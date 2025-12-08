import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Grid,
  IconButton,
  Toolbar,
  Button,
  Chip,
  Typography,
  Stack,
  Paper,
} from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
  Edit,
  Delete,
  Visibility,
  Add,
  Bed,
  LocationOn,
  Business,
  CheckCircle,
  Warning,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import Appbar from "../../components/Appbar";
import useApi from "../../hooks/APIHandler";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import DeleteConfirmationDialog from "../../components/DeleteConfirmationDialog";
import SearchInput from "../../components/SearchInput";

interface Booking {
  id: number;
  apartment: {
    id: number;
    name: string;
    number: number;
    currency: string;
    cleaned: boolean;
    property_address: string;
    property_assigned_name: string;
    apartmentType: string;
  };
  guest: {
    id: number;
    user: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    };
  };
  startDate: string;
  endDate: string;
  dateOfReservation: string;
  status: string;
  duration: number;
}
const renderApartmentType = (type: string) => {
  const colorMap: Record<string, any> = {
    king: "primary",
    luxury: "secondary",
    normal: "info",
    economic: "warning",
  };

  return (
    <Chip
      label={type.charAt(0).toUpperCase() + type.slice(1)}
      color={colorMap[type] || "default"}
      size="small"
      sx={{ ml: 1 }}
    />
  );
};
export default function PropertyBookings() {
  const { callApi, loading } = useApi();
  const { id } = useParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [columns, setColumns] = useState<GridColDef[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [debounceSearch, setDebounceSearch] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
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
    if (!id) return;
    getBookings();
    fetchProperty();
  }, [paginationModel, debounceSearch, id]);

  const fetchProperty = async () => {
    const result = await callApi({
      url: `/properties/${id}/`,
    });
    if (result) {
      setProperty([result.data]);
    }
  };

  const getBookings = async () => {
    const result = await callApi({
      url: `/properties/${id}/bookings/`,
      params: {
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        search: debounceSearch,
      },
    });
    if (result) {
      const resultData = result.data.data;
      setBookings(resultData.data);
      setTotalItems(resultData.totalItems);
      generateColumns();
    }
  };

  const handleDeleteClick = (params: GridRenderCellParams) => {
    setSelectedBooking(params.row);
    setDeleteDialogOpen(true);
  };
  const handleDeleteConfirm = async (): Promise<void> => {
    if (!selectedBooking) return;
    setDeleteLoading(true);
    try {
      const response = await callApi({
        url: `/apartments/bookings/${selectedBooking.id}/`,
        method: "DELETE",
      });

      if (response?.status === 204) {
        toast.success("Booking deleted successfully!");
        setDeleteDialogOpen(false);
        setSelectedBooking(null);
        getBookings();
      }
    } catch (err) {
      console.error("Error deleting booking:", err);
    } finally {
      setDeleteLoading(false);
    }
  };
  const handleCloseDeleteDialog = (): void => {
    if (!deleteLoading) {
      setDeleteDialogOpen(false);
      setSelectedBooking(null);
    }
  };

  const generateColumns = () => {
    const columns: GridColDef[] = [
      {
        field: "actions",
        headerName: "Actions",
        width: 120,
        sortable: false,
        renderCell: (params: GridRenderCellParams) => (
          <>
            <IconButton onClick={() => navigate(`/bookings/${params.row.id}`)}>
              <Visibility color="primary" />
            </IconButton>
            <IconButton onClick={() => handleDeleteClick(params)}>
              <Delete color="error" />
            </IconButton>
          </>
        ),
      },
      {
        field: "status",
        headerName: "Status",
        width: 150,
        renderCell: (params: GridRenderCellParams) => {
          const statusColors: Record<string, string> = {
            confirmed: "#2196f3", // Blue
            checked_in: "#4caf50", // Green
            checked_out: "#f44336", // Red
            cancelled: "#9e9e9e", // Grey
            upcoming: "#ff9800", // Orange
            active: "#673ab7", // Purple
          };

          const statusColor = statusColors[params.value as string] || "#757575";

          return (
            <Chip
              label={(params.value as string)
                .toUpperCase()
                .replaceAll("_", " ")}
              sx={{
                backgroundColor: statusColor,
                color: "white",
                fontWeight: "bold",
                "&:hover": {
                  backgroundColor: statusColor,
                  opacity: 0.9,
                },
              }}
              size="small"
            />
          );
        },
      },
      {
        field: "apartments",
        headerName: "Apartments",
        width: 400,
        renderCell: (params) => {
          const apartments = params.row.apartments || [];
          const firstApartment = apartments[0];
          const remainingCount = apartments.length - 1;

          return (
            <Box sx={{ width: "100%", py: 1 }}>
              {firstApartment && (
                <Box>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      position: "relative",
                    }}
                  >
                    {/* Apartment Number and Name */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        mb: 1,
                      }}
                    >
                      <Business fontSize="small" color="primary" />
                      <Typography variant="body2" fontWeight="bold" noWrap>
                        Apt {firstApartment.number} - {firstApartment.name}
                      </Typography>
                    </Box>

                    {/* Property and Address */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        mb: 1,
                      }}
                    >
                      <LocationOn
                        fontSize="small"
                        color="action"
                        sx={{ fontSize: 14 }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                      >
                        {firstApartment.property_assigned_name} -{" "}
                        {firstApartment.property_address}
                      </Typography>
                    </Box>

                    {/* Cleaning Status + Type */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Chip
                        icon={
                          firstApartment.cleaned ? (
                            <CheckCircle fontSize="small" />
                          ) : (
                            <Warning fontSize="small" />
                          )
                        }
                        label={
                          firstApartment.cleaned ? "Cleaned" : "Needs Cleaning"
                        }
                        color={firstApartment.cleaned ? "success" : "warning"}
                        size="small"
                        variant="outlined"
                        sx={{
                          height: 24,
                          fontSize: "0.75rem",
                          "& .MuiChip-icon": { fontSize: 14 },
                        }}
                      />
                      {renderApartmentType(firstApartment.apartmentType)}
                    </Box>
                  </Paper>

                  {/* Afficher "+X more" en dessous de la carte */}
                  {remainingCount > 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mt: 1,
                        py: 0.5,
                        px: 1,
                        backgroundColor: "primary.light",
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor: "primary.main",
                      }}
                    >
                      <Bed fontSize="small" sx={{ fontSize: 16, mr: 0.5 }} />
                      <Typography
                        variant="body2"
                        color="primary.contrastText"
                        fontWeight="bold"
                        sx={{ fontSize: "0.8rem" }}
                      >
                        +{remainingCount} more apartment
                        {remainingCount > 1 ? "s" : ""}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          );
        },
      },
      {
        field: "guest",
        headerName: "Guest",
        width: 220,
        renderCell: (params) => (
          <div>
            <Typography variant="body2" fontWeight="bold">
              {params.row.guest.user?.first_name}{" "}
              {params.row.guest.user?.last_name}
            </Typography>
            <Typography variant="caption">
              {params.row.guest.user?.email}
            </Typography>
            <br />
            <Typography variant="caption">
              {params.row.guest.user?.phone}
            </Typography>
          </div>
        ),
      },
      {
        field: "dates",
        headerName: "Booking Dates",
        width: 220,
        renderCell: (params) => (
          <div>
            <Typography variant="body2">
              {dayjs(params.row.startDate).format("MMM D, YYYY")} -{" "}
              {dayjs(params.row.endDate).format("MMM D, YYYY")}
            </Typography>
            <Typography variant="caption">
              {params.row.duration} nights
            </Typography>
          </div>
        ),
      },
      {
        field: "totalPrice",
        headerName: "Total Price",
        width: 180,
        renderCell: (params) => {
          const total = params.row.apartments?.reduce(
            (sum: number, apt: any) => sum + (apt.price || 0),
            0
          );
          return (
            <Typography variant="caption" fontWeight="bold">
              {params.row.apartments?.[0]?.currency || ""}{" "}
              {total?.toLocaleString()}
            </Typography>
          );
        },
      },
      {
        field: "dateOfReservation",
        headerName: "Booked On",
        width: 150,
        valueFormatter: (params) => dayjs(params.value).format("MMM D, YYYY"),
      },
    ];
    setColumns(columns);
  };

  return (
    <Box sx={{ display: "flex" }}>
      <Appbar appBarTitle={`Bookings List`} />
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
          {property && (
            <Paper
              elevation={2}
              sx={{
                p: 3,
                mb: 3,
                backgroundColor: "primary.main",
                color: "white",
              }}
            >
              <Typography variant="h5" gutterBottom>
                Property {property[0]?.name}
              </Typography>
              <Typography variant="body1">{property[0]?.address}</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Total Bookings: {bookings.length}
              </Typography>
            </Paper>
          )}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={2}
                sx={{ mb: 2 }}
              >
                <SearchInput
                  value={searchQuery}
                  handleChange={(e) => setSearchQuery(e.target.value)}
                />
                {/* <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate(`/properties/${id}/bookings/new`)}
                  sx={{
                    borderRadius: 1,
                    textTransform: "none",
                    px: 3,
                    py: 1,
                    fontWeight: 600,
                  }}
                >
                  New Booking
                </Button> */}
              </Stack>
              <Paper elevation={3} sx={{ p: 2 }}>
                <DataGrid
                  rows={bookings}
                  columns={columns}
                  rowHeight={150}
                  autoHeight
                  pageSize={paginationModel.pageSize}
                  page={paginationModel.page}
                  paginationMode="server"
                  rowCount={totalItems}
                  loading={loading}
                  rowsPerPageOptions={[5, 10, 25]}
                  onPageChange={(newPage) =>
                    setPaginationModel((prev) => ({ ...prev, page: newPage }))
                  }
                  onPageSizeChange={(newPageSize) =>
                    setPaginationModel((prev) => ({
                      ...prev,
                      pageSize: newPageSize,
                    }))
                  }
                  sx={{
                    "& .MuiDataGrid-cell": {
                      borderBottom: "1px solid #f0f0f0",
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
          <DeleteConfirmationDialog
            open={deleteDialogOpen}
            onClose={handleCloseDeleteDialog}
            onConfirm={handleDeleteConfirm}
            loading={deleteLoading}
            title="Delete Booking"
            description="Are you sure you want to delete this booking? This action cannot be undone."
            itemName={selectedBooking ? `Booking #${selectedBooking.id}` : ""}
            confirmText="Delete Booking"
            cancelText="Cancel"
          />
        </Container>
      </Box>
    </Box>
  );
}
