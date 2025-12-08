import React, { useState, useEffect } from "react";
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
  Card,
  CardContent,
  CardHeader,
  Divider,
} from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
  Edit,
  Delete,
  Visibility,
  Add,
  Settings as SettingsIcon,
  Percent,
  Category,
  Update,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import Appbar from "../../components/Appbar";
import useApi from "../../hooks/APIHandler";
import { toast } from "react-toastify";
import DeleteConfirmationDialog from "../../components/DeleteConfirmationDialog";
import SearchInput from "../../components/SearchInput";

export interface CommissionSettings {
  id: number;
  commission_percentage: number | string;
  commission_type: string;
  created_at: string;
  updated_at: string;
}

export default function CommissionSettingsList() {
  const { callApi, loading } = useApi();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<CommissionSettings[]>([]);
  const [columns, setColumns] = useState<GridColDef[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [debounceSearch, setDebounceSearch] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<CommissionSettings | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounceSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    getSettings();
  }, [paginationModel, debounceSearch]);

  const getSettings = async () => {
    try {
      const result = await callApi({
        url: "/bookings/settings/",
        params: {
          page: paginationModel.page + 1,
          pageSize: paginationModel.pageSize,
          search: debounceSearch,
        },
      });
      if (result?.data) {
        setSettings(result.data.data.data || []);
        setTotalItems(result.data.data.totalItems || 0);
        generateColumns();
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load commission settings");
      setSettings([]);
      setTotalItems(0);
    }
  };

  const handleDeleteClick = (params: GridRenderCellParams) => {
    setSelectedSetting(params.row);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!selectedSetting) return;
    setDeleteLoading(true);
    try {
      const response = await callApi({
        url: `/bookings/settings/${selectedSetting.id}/`,
        method: "DELETE",
      });

      if (response?.status === 204) {
        toast.success("Commission setting deleted successfully!");
        setDeleteDialogOpen(false);
        setSelectedSetting(null);
        getSettings();
      }
    } catch (err) {
      console.error("Error deleting setting:", err);
      toast.error("Failed to delete commission setting");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCloseDeleteDialog = (): void => {
    if (!deleteLoading) {
      setDeleteDialogOpen(false);
      setSelectedSetting(null);
    }
  };

  const formatCommissionPercentage = (percentage: number | string): string => {
    const num = typeof percentage === 'string' ? parseFloat(percentage) : percentage;
    return `${num}%`;
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
            <IconButton 
              onClick={() => navigate(`/commissions/edit/${params.row.id}`)}
              color="primary"
            >
              <Edit />
            </IconButton>
            <IconButton 
              onClick={() => handleDeleteClick(params)}
              color="error"
            >
              <Delete />
            </IconButton>
          </>
        ),
      },
      {
        field: "commission_percentage",
        headerName: "Commission %",
        width: 150,
        renderCell: (params: GridRenderCellParams) => (
          <Chip
            icon={<Percent />}
            label={formatCommissionPercentage(params.value)}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: "bold" }}
          />
        ),
      },
      {
        field: "commission_type",
        headerName: "Commission Type",
        width: 200,
        renderCell: (params: GridRenderCellParams) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Category color="action" />
            <Typography variant="body2">
              {params.value || "Not specified"}
            </Typography>
          </Box>
        ),
      },
      {
        field: "created_at",
        headerName: "Created",
        width: 150,
        valueFormatter: (params) => new Date(params.value).toLocaleDateString(),
      },
      {
        field: "updated_at",
        headerName: "Last Updated",
        width: 150,
        valueFormatter: (params) => new Date(params.value).toLocaleDateString(),
        renderCell: (params: GridRenderCellParams) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Update fontSize="small" color="action" />
            <Typography variant="body2">
              {new Date(params.value).toLocaleDateString()}
            </Typography>
          </Box>
        ),
      },
    ];
    setColumns(columns);
  };

  return (
    <Box sx={{ display: "flex" }}>
      <Appbar appBarTitle="Commission Settings" />
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
          {/* Header Section */}
          <Paper
            elevation={2}
            sx={{
              p: 3,
              mb: 3,
              backgroundColor: "primary.main",
              color: "white",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <Typography
                  variant="h4"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 2 }}
                >
                  <SettingsIcon fontSize="large" />
                  Commission Settings
                </Typography>
                <Typography variant="body1">
                  Manage commission percentages and types for bookings
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<Add />}
                onClick={() => navigate("/commissions/create")}
                sx={{
                  borderRadius: 1,
                  textTransform: "none",
                  px: 3,
                  py: 1.5,
                  fontWeight: 600,
                }}
              >
                New Commission Setting
              </Button>
            </Box>
          </Paper>

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
                  //   placeholder="Search commission settings..."
                />
              </Stack>

              {/* Summary Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card elevation={2}>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Total Settings
                      </Typography>
                      <Typography variant="h4" component="div">
                        {totalItems}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card elevation={2}>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Active Types
                      </Typography>
                      <Typography variant="h4" component="div">
                        {new Set(settings?.map((s) => s.commission_type)).size}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Paper elevation={3} sx={{ p: 2 }}>
                <DataGrid
                  rows={settings}
                  columns={columns}
                  getRowId={(row) => row.id}
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
            title="Delete Commission Setting"
            description="Are you sure you want to delete this commission setting? This action cannot be undone and may affect existing bookings."
            itemName={
              selectedSetting
                ? `Commission ${selectedSetting.commission_percentage}% - ${selectedSetting.commission_type}`
                : ""
            }
            confirmText="Delete Setting"
            cancelText="Cancel"
          />
        </Container>
      </Box>
    </Box>
  );
}
