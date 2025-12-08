import * as React from "react";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import PieChart from "./PieChart";
import BarChart from "./BarChart";
import HealthCard from "./HealthCard";
import Appbar from "../../components/Appbar";
import useApi from "../../hooks/APIHandler";

import PeopleIcon from "@mui/icons-material/People";
import TodayIcon from "@mui/icons-material/Today";
import BedroomParentIcon from "@mui/icons-material/BedroomParent";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";

// Define types for better type safety
interface Property {
  id: number;
  name: string;
}

interface DashboardStats {
  currency: string[];
  number_of_guests: number;
  number_of_reservations: number;
  occupancy_rate: number;
  current_month_income: number;
  number_of_check_ins: number;
  total_check_ins: number;
  guests_registered_per_day_current_week: Record<string, number>;
}

const initialStats: DashboardStats = {
  currency: [],
  number_of_guests: 0,
  number_of_reservations: 0,
  occupancy_rate: 0,
  current_month_income: 0,
  number_of_check_ins: 0,
  total_check_ins: 0,
  guests_registered_per_day_current_week: {},
};

// Memoized components to prevent unnecessary re-renders
const MemoizedHealthCard = React.memo(HealthCard);
const MemoizedPieChart = React.memo(PieChart);
const MemoizedBarChart = React.memo(BarChart);

// Custom hook for property selection
const usePropertySelection = () => {
  const [selectedPropertyId, setSelectedPropertyId] = React.useState<number | "">("");
  
  const handlePropertyChange = (event: SelectChangeEvent<number>) => {
    setSelectedPropertyId(event.target.value as number);
  };
  
  return { selectedPropertyId, handlePropertyChange };
};

// Custom hook for data fetching
const useDashboardData = (selectedPropertyId: number | "") => {
  const [stats, setStats] = React.useState<DashboardStats>(initialStats);
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [hasFetchedProperties, setHasFetchedProperties] = React.useState(false);
  const [hasFetchedStats, setHasFetchedStats] = React.useState(false);
  const { callApi, loading, error } = useApi();

  // Fetch properties on initial load
  React.useEffect(() => {
    if (!hasFetchedProperties) {
      const fetchProperties = async () => {
        try {
          const response = await callApi({
            url: `/properties/`,
            params: { page: 1, pageSize: 100, ordering: "-id" },
          });

          if (response?.data?.data?.data) {
            const propertiesData = response.data.data.data;
            setProperties(propertiesData);
            setHasFetchedProperties(true);
          }
        } catch (err) {
          console.error("Failed to fetch properties:", err);
        }
      };
      
      fetchProperties();
    }
  }, [hasFetchedProperties]);

  // Fetch stats whenever the selected property ID changes
  React.useEffect(() => {
    if (selectedPropertyId && !hasFetchedStats) {
      const fetchStats = async () => {
        try {
          const response = await callApi({
            url: `/properties/stats/?property_id=${selectedPropertyId}`,
            method: "GET",
          });
          if (response?.data) {
            setStats(response.data);
            setHasFetchedStats(true);
          }
        } catch (err) {
          console.error("Failed to fetch dashboard stats:", err);
        }
      };
      fetchStats();
    } else if (!selectedPropertyId) {
      // Auto-select first property if none is selected
      setStats(initialStats);
    }
  }, [selectedPropertyId, properties, hasFetchedStats]);

  // Reset stats fetch flag when property changes
  React.useEffect(() => {
    setHasFetchedStats(false);
  }, [selectedPropertyId]);

  return { stats, properties, loading, error };
};

// Memoized card data to prevent re-computation on every render
const useCardData = (stats: DashboardStats) => {
  return React.useMemo(() => [
    {
      id: 1,
      icon: <PeopleIcon />,
      title: "Guests this month",
      value: stats.number_of_guests,
    },
    {
      id: 2,
      icon: <TodayIcon />,
      title: "Reservations this month",
      value: stats.number_of_reservations,
    },
    {
      id: 3,
      icon: <BedroomParentIcon />,
      title: "Occupancy Rate",
      value: `${stats.occupancy_rate.toFixed(2)}%`,
    },
    {
      id: 4,
      icon: <CurrencyExchangeIcon />,
      title: "Income this month",
      value: `${stats.currency[0] ?? ""} ${stats.current_month_income.toLocaleString()}`,
    },
    {
      id: 5,
      icon: <CheckBoxIcon />,
      title: "Check-ins Today",
      value: stats.number_of_check_ins,
    },
  ], [stats]);
};

// Memoized chart data
const useChartData = (stats: DashboardStats) => {
  const pieChartData = React.useMemo(() => [
    { value: stats.number_of_guests, name: "Guests" },
    { value: stats.number_of_reservations, name: "Reservations" },
    { value: stats.total_check_ins, name: "Check In" },
  ], [stats]);

  const barChartData = React.useMemo(() => 
    Object.entries(stats.guests_registered_per_day_current_week)
      .map(([date, guests]) => ({
        name: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
        guests,
      }))
      .sort((a, b) => {
        // Sort by day of week for better visualization
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return days.indexOf(a.name) - days.indexOf(b.name);
      }), 
  [stats.guests_registered_per_day_current_week]);

  return { pieChartData, barChartData };
};

// Loading component to reduce JSX complexity
const LoadingIndicator = () => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "50vh",
    }}
  >
    <CircularProgress />
  </Box>
);

// Error display component
const ErrorAlert = ({ error }: { error: string }) => (
  <Alert severity="error" sx={{ mb: 4 }}>
    {error || "Failed to load dashboard data. Please try again."}
  </Alert>
);

// Property selector component
const PropertySelector = ({ 
  properties, 
  selectedPropertyId, 
  onChange 
}: { 
  properties: Property[]; 
  selectedPropertyId: number | ""; 
  onChange: (event: SelectChangeEvent<number>) => void;
}) => (
  <FormControl sx={{ minWidth: 200 }} size="small">
    <InputLabel id="property-select-label">Select Property</InputLabel>
    <Select
      labelId="property-select-label"
      id="property-select"
      value={selectedPropertyId}
      label="Select Property"
      onChange={onChange}
    >
      {properties.map((prop) => (
        <MenuItem key={prop.id} value={prop.id}>
          {prop.name}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);

// Main Dashboard component
export default function Dashboard() {
  const { selectedPropertyId, handlePropertyChange } = usePropertySelection();
  const { stats, properties, loading, error } = useDashboardData(selectedPropertyId);
  const cardData = useCardData(stats);
  const { pieChartData, barChartData } = useChartData(stats);

  // Auto-select first property when properties are loaded
  React.useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      handlePropertyChange({ 
        target: { value: properties[0].id } 
      } as SelectChangeEvent<number>);
    }
  }, [properties, selectedPropertyId, handlePropertyChange]);

  return (
    <Box sx={{ display: "flex" }}>
      <Appbar appBarTitle="Dashboard" />

      <Box
        component="main"
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === "light" 
              ? theme.palette.grey[100] 
              : theme.palette.grey[900],
          flexGrow: 1,
          overflow: "auto",
          minHeight: "100vh",
        }}
      >
        <Toolbar />
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          {/* Header Section with Title and Property Selector */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: 'wrap',
              gap: 2,
              mb: 4,
            }}
          >
            <Typography variant="h4" component="h1" fontWeight="bold">
              Dashboard Overview
            </Typography>
            <PropertySelector 
              properties={properties} 
              selectedPropertyId={selectedPropertyId} 
              onChange={handlePropertyChange} 
            />
          </Box>

          {/* Loading and Error States */}
          {loading && <LoadingIndicator />}
          {error && <ErrorAlert error={`${error}`} />}

          {/* Main Dashboard Grid */}
          {!loading && !error && selectedPropertyId && (
            <Grid container spacing={3}>
              {/* Health Cards */}
              {cardData.map((item) => (
                <Grid key={item.id} item xs={12} sm={6} md={4} lg={2.4}>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      display: "flex",
                      flexDirection: "column",
                      height: 140,
                      justifyContent: "center",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: 3,
                      },
                    }}
                  >
                    <MemoizedHealthCard
                      icon={item.icon}
                      title={item.title}
                      value={item.value}
                    />
                  </Paper>
                </Grid>
              ))}

              {/* Charts Section */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ 
                  p: 2, 
                  display: "flex", 
                  flexDirection: "column", 
                  height: 400 
                }}>
                  <MemoizedPieChart data={pieChartData} />
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ 
                  p: 2, 
                  display: "flex", 
                  flexDirection: "column", 
                  height: 400 
                }}>
                  <Typography variant="h6" gutterBottom>
                    Guests Registered This Week
                  </Typography>
                  <MemoizedBarChart data={barChartData} />
                </Paper>
              </Grid>
            </Grid>
          )}
        </Container>
      </Box>
    </Box>
  );
}