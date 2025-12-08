import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Avatar,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
  Toolbar,
  Container,
  Divider,
} from "@mui/material";
import {
  Phone,
  Email,
  Bookmark,
  CalendarToday,
  NightsStay,
  ArrowBack,
  Edit,
  Person,
  Apartment,
} from "@mui/icons-material";
import useApi from "../../hooks/APIHandler";
import Appbar from "../../components/Appbar";
import ErrorPage from "../../components/ErrorPage";
import { startOfDay } from "date-fns/fp";

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  fullName: string;
  email: string;
  role: string;
  phone: string;
  properties_assigned: any[];
  password: string;
  department: string | null;
  is_active: boolean;
  created_at: string;
  currency: string;
  payrules: any[];
}

interface Apartment {
  id: number;
  added_by_user_id: string;
  property_assigned_name: string;
  property_address: string;
  number: number;
  name: string;
  capacity: number;
  numberOfBeds: number;
  apartmentType: string;
  inService: boolean;
  cleaned: boolean;
  price: number;
  currency: string;
  image: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  property_assigned: number;
}

interface Booking {
  id: number;
  apartments: Apartment[];
  guest: number;
  dateOfReservation: string;
  startDate: string;
  endDate: string;
  duration: number;
  added_by_user: User;
  status: string;
  totalPrice: number;
  updated_at: string;
}

interface BookingStats {
  total_bookings: number;
  total_days_stayed: number;
  last_booking_duration: number;
}

interface Guest {
  id: number;
  user: User;
  id_card_url: string | null;
  booking_stats: BookingStats;
  recent_bookings: Booking[];
  booking_count: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({
  children,
  value,
  index,
  ...other
}) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`guest-tabpanel-${index}`}
      aria-labelledby={`guest-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const GuestDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { callApi, loading } = useApi();
  const navigate = useNavigate();
  const [guest, setGuest] = useState<Guest | null>(null);
  const [tabValue, setTabValue] = useState<number>(0);

  useEffect(() => {
    if (id) {
      fetchGuestDetail();
    }
  }, [id]);

  const fetchGuestDetail = async () => {
    try {
      const response = await callApi({
        url: `/guests/${id}/`,
        method: "GET",
      });

      if (response?.status === 200) {
        setGuest(response.data);
      }
    } catch (error) {
      console.error("Error fetching guest details:", error);
    }
  };

  const handleEditClick = () => {
    navigate(`/guests/edit/${id}`);
  };

  // Calculate current status based on recent bookings
  const getCurrentStatus = () => {
    if (!guest?.recent_bookings || guest.recent_bookings.length === 0) {
      return { status: "No bookings", apartments: [] };
    }

    const currentBooking = guest.recent_bookings.find(
      (booking) =>
        booking.status === "checked_in" || booking.status === "active"
    );

    if (currentBooking) {
      return {
        status:
          currentBooking.status === "checked_in" ? "Checked In" : "Active",
        apartments: currentBooking.apartments,
      };
    }

    const upcomingBooking = guest.recent_bookings.find(
      (booking) => booking.status === "upcoming"
    );

    if (upcomingBooking) {
      return {
        status: "Upcoming Booking",
        apartments: upcomingBooking.apartments,
      };
    }

    return { status: "No current stay", apartments: [] };
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      confirmed: "#2196f3", // Blue
      checked_in: "#4caf50", // Green
      checked_out: "#f44336", // Red
      cancelled: "#9e9e9e", // Grey
      upcoming: "#ff9800", // Orange
      active: "#673ab7", // Purple
    };

    const statusColor = statusColors[status] || "#757575";
    return statusColor;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

  if (!guest) {
    return <ErrorPage />;
  }

  const currentStatus = getCurrentStatus();

  return (
    <Box sx={{ display: "flex" }}>
      <Appbar appBarTitle="Guest Details" />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          overflow: "auto",
        }}
      >
        <Toolbar />
        <Container maxWidth="lg" sx={{ py: 3 }}>
          {/* Header */}
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={3}
          >
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate(-1)}
              color="inherit"
              variant="outlined"
            >
              Back to Guests
            </Button>
            <Button
              startIcon={<Edit />}
              onClick={handleEditClick}
              variant="contained"
            >
              Edit Guest
            </Button>
          </Box>

          {/* Profile Header */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Box display="flex" alignItems="center" gap={3}>
                    <Avatar
                      sx={{
                        width: 80,
                        height: 80,
                        bgcolor: "primary.main",
                        fontSize: "2rem",
                      }}
                    >
                      {guest.user.first_name?.[0]?.toUpperCase()}
                      {guest.user.last_name?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="h4" gutterBottom>
                        {guest.user.first_name} {guest.user.last_name}
                      </Typography>
                      <Typography
                        variant="body1"
                        color="text.secondary"
                        gutterBottom
                      >
                        Guest #{guest.id}
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        <Chip label={guest.user.role} size="small" />
                        {guest.booking_stats && (
                          <Chip
                            icon={<Bookmark />}
                            label={`${guest.booking_stats.total_bookings} bookings`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {currentStatus.status !== "No current stay" && (
                          <Chip
                            label={(currentStatus.status as string)
                              .toUpperCase()
                              .replaceAll("_", " ")}
                            sx={{
                              backgroundColor: getStatusColor(
                                currentStatus.status
                              ),
                              color: "white",
                              fontWeight: "bold",
                              "&:hover": {
                                backgroundColor: getStatusColor(
                                  currentStatus.status
                                ),
                                opacity: 0.9,
                              },
                            }}
                            size="small"
                          />
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Contact Information
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Email fontSize="small" color="action" />
                      <Typography variant="body2">
                        {guest.user.email}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Phone fontSize="small" color="action" />
                      <Typography variant="body2">
                        {guest.user.phone}
                      </Typography>
                    </Box>
                    {guest.id_card_url && (
                      <Box display="flex" alignItems="center" gap={1} mt={1}>
                        <Person fontSize="small" color="action" />
                        <Button
                          size="small"
                          href={guest.id_card_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View ID Card
                        </Button>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
            >
              <Tab label="Overview" />
              <Tab label="Booking History" />
              <Tab label="Statistics" />
            </Tabs>
          </Box>

          {/* Overview Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              {/* Current Status */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Current Status
                    </Typography>
                    {currentStatus.apartments.length > 0 ? (
                      <Box>
                        <Chip
                          label={(currentStatus.status as string)
                            .toUpperCase()
                            .replaceAll("_", " ")}
                          sx={{
                            backgroundColor: getStatusColor(
                              currentStatus.status
                            ),
                            color: "white",
                            fontWeight: "bold",
                            "&:hover": {
                              backgroundColor: getStatusColor(
                                currentStatus.status
                              ),
                              opacity: 0.9,
                            },
                          }}
                          size="small"
                        />
                        <Typography variant="subtitle2" gutterBottom>
                          Current Apartments:
                        </Typography>
                        {currentStatus.apartments.map((apartment, index) => (
                          <Box key={apartment.id} sx={{ mb: 1, pl: 1 }}>
                            <Typography variant="body2">
                              • {apartment.number} - {apartment.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {apartment.property_assigned_name} •{" "}
                              {apartment.currency}
                              {apartment.price}/night
                            </Typography>
                            {index < currentStatus.apartments.length - 1 && (
                              <Divider sx={{ my: 1 }} />
                            )}
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Not currently checked in
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Quick Stats */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Quick Stats
                    </Typography>
                    {guest.booking_stats && (
                      <List dense>
                        <ListItem>
                          <ListItemIcon>
                            <Bookmark />
                          </ListItemIcon>
                          <ListItemText
                            primary="Total Bookings"
                            secondary={guest.booking_stats.total_bookings}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <NightsStay />
                          </ListItemIcon>
                          <ListItemText
                            primary="Total Nights Stayed"
                            secondary={guest.booking_stats.total_days_stayed}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CalendarToday />
                          </ListItemIcon>
                          <ListItemText
                            primary="Last Stay Duration"
                            secondary={`${guest.booking_stats.last_booking_duration} nights`}
                          />
                        </ListItem>
                      </List>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Assigned Properties */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Assigned Properties
                    </Typography>
                    {guest.user.properties_assigned &&
                    guest.user.properties_assigned.length > 0 ? (
                      <Grid container spacing={2}>
                        {guest.user.properties_assigned.map((property) => (
                          <Grid item xs={12} sm={6} md={4} key={property.id}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                              <Typography variant="subtitle2">
                                {property.name}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {property.address}
                              </Typography>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No properties assigned
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Booking History Tab */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Booking History ({guest.recent_bookings?.length || 0})
            </Typography>
            {guest.recent_bookings && guest.recent_bookings.length > 0 ? (
              <Grid container spacing={2}>
                {guest.recent_bookings.map((booking) => (
                  <Grid item xs={12} key={booking.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="start"
                          mb={2}
                        >
                          <Box>
                            <Typography variant="subtitle1" gutterBottom>
                              Booking #{booking.id}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(booking.startDate)} -{" "}
                              {formatDate(booking.endDate)}
                            </Typography>
                            <Typography variant="body2">
                              Duration: {booking.duration} nights • Total:{" "}
                              {formatCurrency(
                                booking.totalPrice,
                                booking.apartments[0]?.currency || "USD"
                              )}
                            </Typography>
                          </Box>

                          <Chip
                            label={(booking.status as string)
                              .toUpperCase()
                              .replaceAll("_", " ")}
                            sx={{
                              backgroundColor: getStatusColor(booking.status),
                              color: "white",
                              fontWeight: "bold",
                              "&:hover": {
                                backgroundColor: getStatusColor(booking.status),
                                opacity: 0.9,
                              },
                            }}
                            size="small"
                          />
                        </Box>

                        {/* Apartments in this booking */}
                        <Typography variant="subtitle2" gutterBottom>
                          Apartments ({booking.apartments.length}):
                        </Typography>
                        <Grid container spacing={1}>
                          {booking.apartments.map((apartment) => (
                            <Grid item xs={12} sm={6} key={apartment.id}>
                              <Paper variant="outlined" sx={{ p: 1.5 }}>
                                <Box
                                  display="flex"
                                  alignItems="center"
                                  gap={1}
                                  mb={1}
                                >
                                  <Apartment fontSize="small" color="action" />
                                  <Typography variant="body2" fontWeight="bold">
                                    {apartment.number} - {apartment.name}
                                  </Typography>
                                </Box>
                                <Typography
                                  variant="caption"
                                  display="block"
                                  color="text.secondary"
                                >
                                  {apartment.property_assigned_name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  display="block"
                                  color="text.secondary"
                                >
                                  {apartment.currency}
                                  {apartment.price}/night •{" "}
                                  {apartment.apartmentType}
                                </Typography>
                              </Paper>
                            </Grid>
                          ))}
                        </Grid>

                        <Box
                          mt={2}
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography variant="caption" color="text.secondary">
                            Booked on: {formatDate(booking.dateOfReservation)}
                          </Typography>
                          <Button
                            size="small"
                            onClick={() => navigate(`/bookings/${booking.id}`)}
                          >
                            View Booking Details
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography color="text.secondary">No booking history</Typography>
            )}
          </TabPanel>

          {/* Statistics Tab */}
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Booking Statistics
                    </Typography>
                    {guest.booking_stats ? (
                      <List>
                        <ListItem>
                          <ListItemText
                            primary="Total Bookings"
                            secondary={guest.booking_stats.total_bookings}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Total Nights Stayed"
                            secondary={guest.booking_stats.total_days_stayed}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Average Stay Duration"
                            secondary={`${guest.booking_stats.last_booking_duration} nights`}
                          />
                        </ListItem>
                      </List>
                    ) : (
                      <Typography color="text.secondary">
                        No statistics available
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Guest Information
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Member Since"
                          secondary={formatDate(guest.user.created_at)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Account Status"
                          secondary={
                            guest.user.is_active ? "Active" : "Inactive"
                          }
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Preferred Currency"
                          secondary={guest.user.currency}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </Container>
      </Box>
    </Box>
  );
};

export default GuestDetail;
