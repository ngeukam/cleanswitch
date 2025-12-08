import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Card,
  CardHeader,
  CardContent,
  Divider,
  Chip,
  useTheme,
  Toolbar,
  Stack,
  CircularProgress,
} from "@mui/material";
import {
  Edit,
  Delete,
  Person,
  Phone,
  Email,
  CalendarMonth,
  ArrowBack,
  CheckCircle,
  Cancel,
  Timer,
  Groups,
  ChildCare,
  Payment,
  Flag,
  Business,
  Notes,
} from "@mui/icons-material";
import dayjs, { Dayjs } from "dayjs";
import { toast } from "react-toastify";
import useApi from "../../hooks/APIHandler";
import Appbar from "../../components/Appbar";
import { useNavigate, useParams } from "react-router-dom";
import DeleteConfirmationDialog from "../../components/DeleteConfirmationDialog";
import ErrorPage from "../../components/ErrorPage";
import StatusChip from "../../components/StatusChip";

interface Refund {
  id: string;
  amount: number;
  reason: string;
  status: string;
  created_at: string;
}

interface Apartment {
  id: string;
  name: string;
  number: number;
  price: number;
  property_assigned_name: string;
  property_address: string;
  currency: string;
  cleaned: boolean;
  apartmentType: string | null; // Updated to allow null
}

interface User {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
}

interface Guest {
  id: string;
  idCard?: any;
  user: User;
}

interface Settings {
  id: string;
  commission_percentage: string;
  commission_type: string;
}

interface Booking {
  id: string;
  apartments: Apartment[];
  startDate: string;
  endDate: string;
  guest: Guest;
  status: string;
  totalPrice: number;
  dateOfReservation: string;
  updatedAt: string;
  // New fields
  persons: number;
  adults: number;
  children: number;
  settings: Settings | null; // Updated to allow null
  payment_status: string | null; // Updated to allow null
  payment_method: string | null; // Updated to allow null
  remarks: string | null; // Updated to allow null
  booker_country: string | null; // Updated to allow null
  travel_purpose: string | null; // Updated to allow null
}

// Fixed renderApartmentType function with null check
const renderApartmentType = (type: string | null) => {
  if (!type) {
    return (
      <Chip
        label="Not Specified"
        color="default"
        size="small"
        sx={{ ml: 1 }}
      />
    );
  }

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

// Payment status options
const paymentStatusOptions = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "partially_paid", label: "Partially Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

// Payment method options
const paymentMethodOptions = [
  { value: "credit_card", label: "Credit Card" },
  { value: "paypal", label: "PayPal" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

// Travel purpose options
const travelPurposeOptions = [
  { value: "business", label: "Business" },
  { value: "leisure", label: "Leisure" },
  { value: "family", label: "Family Visit" },
  { value: "medical", label: "Medical" },
  { value: "other", label: "Other" },
];

export default function BookingDetails() {
  const theme = useTheme();
  const { callApi, loading, error } = useApi();
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingRefunds, setBookingRefunds] = useState<Refund[]>([]);
  useEffect(() => {
    if (!id) return;
    fetchBooking();
    fetchRefunds();
  }, [id]);

  const fetchBooking = async () => {
    try {
      setLoadingBooking(true);
      const response = await callApi({
        url: `/apartments/bookings/${id}/`,
        method: "GET",
      });
      if (response?.status === 200) {
        setBooking(response.data);
      }
    } catch (err) {
      console.error("Error fetching booking:", err);
    } finally {
      setLoadingBooking(false);
    }
  };

  const fetchRefunds = async () => {
    try {
      const response = await callApi({
        url: `/bookings/${id}/process_refund/`,
        method: "GET",
      });
      if (response?.status === 200) {
        setBookingRefunds(response.data);
      }
    } catch (err) {
      console.error("Error fetching refunds:", err);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await callApi({
        url: `/apartments/bookings/${id}/`,
        method: "DELETE",
      });

      if (response?.status === 204) {
        toast.success("Booking deleted successfully!");
        navigate("/bookings");
      }
    } catch (err) {
      console.error("Error deleting booking:", err);
    } finally {
      setDeleteDialogOpen(false);
    }
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle />;
      case "checked_in":
        return <CheckCircle />;
      case "checked_out":
        return <CheckCircle />;
      case "cancelled":
        return <Cancel />;
      case "upcoming":
        return <Timer />;
      case "active":
        return <CheckCircle />;
      default:
        return <CheckCircle />;
    }
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format("MMM D, YYYY h:mm A");
  };

  // Calculate commission amount with null checks
  const calculateCommission = () => {
    if (!booking?.settings || !booking?.totalPrice) return 0;
    const commissionPercentage = parseFloat(booking.settings.commission_percentage) || 0;
    return (booking.totalPrice * commissionPercentage) / 100;
  };

  // Safe value getter with fallbacks
  const getSafeValue = (value: any, fallback: any = "") => {
    return value || fallback;
  };

  if (loadingBooking) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!booking) {
    return <ErrorPage />;
  }

  const apartmentCurrencies = Array.from(
    new Set(booking.apartments?.map((a) => a.currency) || [])
  );
  const currencyDisplay =
    apartmentCurrencies.length === 1 ? apartmentCurrencies[0] : "Multiple";
  const totalPrice =
    typeof booking.totalPrice === "number"
      ? booking.totalPrice
      : booking.apartments?.reduce((sum, a) => sum + (a.price ?? 0), 0) ?? 0;

  const commissionAmount = calculateCommission();

  return (
    <Box sx={{ display: "flex" }}>
      <Appbar appBarTitle="Booking Details" />
      <Box
        component="main"
        sx={{
          backgroundColor: theme.palette.background.default,
          flexGrow: 1,
          overflow: "auto",
        }}
      >
        <Toolbar />
        <Container maxWidth="lg" sx={{ py: 3 }}>
          {/* Header Section */}
          <Box
            sx={{
              mb: 3,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Booking #{booking.id}
              </Typography>
              <Typography color="text.secondary">
                Created on {formatDate(booking.dateOfReservation)}
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={() => navigate(-1)}
              >
                Back
              </Button>
              <Button
                variant="contained"
                startIcon={<Edit />}
                onClick={() => navigate(`/bookings/edit/${booking.id}`)}
              >
                Edit Booking
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete
              </Button>
            </Stack>
          </Box>

          <Grid container spacing={3}>
            {/* Booking Details Card */}
            <Grid item xs={12} md={8}>
              <Card elevation={2}>
                <CardHeader
                  title="Booking Information"
                  sx={{
                    backgroundColor: theme.palette.primary.light,
                    color: theme.palette.primary.contrastText,
                    py: 1.5,
                  }}
                />
                <CardContent>
                  <Grid container spacing={3}>
                    {/* Status and Payment Status */}
                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Booking Status
                      </Typography>
                      <Chip
                        icon={getStatusIcon(booking.status)}
                        label={getSafeValue(booking.status, "Unknown")
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
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Payment Status
                      </Typography>
                      <StatusChip
                        status={getSafeValue(booking.payment_status, "pending")}
                        labels={{
                          pending: "Pending",
                          paid: "Paid",
                          partially_paid: "Partially Paid",
                          failed: "Failed",
                          refunded: "Refunded",
                        }}
                        colors={{
                          pending: "warning",
                          paid: "success",
                          partially_paid: "info",
                          failed: "error",
                          refunded: "secondary",
                        }}
                      />
                    </Grid>

                    {/* Pricing Information */}
                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Total Price
                      </Typography>
                      <Typography variant="h6" color="primary">
                        {currencyDisplay === "Multiple" ? "" : currencyDisplay}
                        {totalPrice.toLocaleString()}
                      </Typography>
                      {currencyDisplay === "Multiple" && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          Multiple currencies — check each apartment above.
                        </Typography>
                      )}
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Commission
                      </Typography>
                      <Typography variant="body1">
                        {currencyDisplay === "Multiple" ? "" : currencyDisplay}
                        {commissionAmount.toFixed(2)}
                        {booking.settings && (
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            ({getSafeValue(booking.settings.commission_percentage, "0")}% - {getSafeValue(booking.settings.commission_type, "Standard")})
                          </Typography>
                        )}
                      </Typography>
                    </Grid>

                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                    </Grid>

                    {/* Dates */}
                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Check-in Date
                      </Typography>
                      <Typography variant="body1">
                        {formatDate(
                          dayjs(booking.startDate)
                            .utc()
                            .format("YYYY-MM-DDTHH:mm")
                        )}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Check-out Date
                      </Typography>
                      <Typography variant="body1">
                        {formatDate(
                          dayjs(booking.endDate)
                            .utc()
                            .format("YYYY-MM-DDTHH:mm")
                        )}
                      </Typography>
                    </Grid>

                    {/* Duration */}
                    <Grid item xs={12}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Duration
                      </Typography>
                      <Typography variant="body1">
                        {dayjs(booking.endDate).diff(
                          dayjs(booking.startDate),
                          "hour"
                        )}{" "}
                        hours (
                        {Math.ceil(
                          dayjs(booking.endDate).diff(
                            dayjs(booking.startDate),
                            "hour"
                          ) / 24
                        )}{" "}
                        nights)
                      </Typography>
                    </Grid>

                    {/* Occupancy Details */}
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Typography
                        variant="subtitle1"
                        gutterBottom
                        sx={{ display: 'flex', alignItems: 'center' }}
                      >
                        <Groups sx={{ mr: 1 }} />
                        Occupancy Details
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Total Persons
                      </Typography>
                      <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                        <Groups sx={{ mr: 1, fontSize: 16 }} />
                        {getSafeValue(booking.persons, 0)}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Adults
                      </Typography>
                      <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                        <Person sx={{ mr: 1, fontSize: 16 }} />
                        {getSafeValue(booking.adults, 0)}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Children
                      </Typography>
                      <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                        <ChildCare sx={{ mr: 1, fontSize: 16 }} />
                        {getSafeValue(booking.children, 0)}
                      </Typography>
                    </Grid>

                    {/* Additional Information */}
                    {(booking.payment_method || booking.booker_country || booking.travel_purpose) && (
                      <>
                        <Grid item xs={12}>
                          <Divider sx={{ my: 2 }} />
                          <Typography
                            variant="subtitle1"
                            gutterBottom
                            sx={{ display: 'flex', alignItems: 'center' }}
                          >
                            <Business sx={{ mr: 1 }} />
                            Additional Information
                          </Typography>
                        </Grid>

                        {booking.payment_method && (
                          <Grid item xs={12} md={6}>
                            <Typography
                              variant="subtitle2"
                              color="text.secondary"
                              gutterBottom
                            >
                              Payment Method
                            </Typography>
                            <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                              <Payment sx={{ mr: 1, fontSize: 16 }} />
                              {paymentMethodOptions.find(p => p.value === booking.payment_method)?.label || booking.payment_method}
                            </Typography>
                          </Grid>
                        )}

                        {booking.booker_country && (
                          <Grid item xs={12} md={6}>
                            <Typography
                              variant="subtitle2"
                              color="text.secondary"
                              gutterBottom
                            >
                              Booker Country
                            </Typography>
                            <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                              <Flag sx={{ mr: 1, fontSize: 16 }} />
                              {booking.booker_country}
                            </Typography>
                          </Grid>
                        )}

                        {booking.travel_purpose && (
                          <Grid item xs={12}>
                            <Typography
                              variant="subtitle2"
                              color="text.secondary"
                              gutterBottom
                            >
                              Travel Purpose
                            </Typography>
                            <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                              <Business sx={{ mr: 1, fontSize: 16 }} />
                              {travelPurposeOptions.find(t => t.value === booking.travel_purpose)?.label || booking.travel_purpose}
                            </Typography>
                          </Grid>
                        )}
                      </>
                    )}

                    {/* Remarks */}
                    {booking.remarks && (
                      <>
                        <Grid item xs={12}>
                          <Divider sx={{ my: 2 }} />
                          <Typography
                            variant="subtitle1"
                            gutterBottom
                            sx={{ display: 'flex', alignItems: 'center' }}
                          >
                            <Notes sx={{ mr: 1 }} />
                            Remarks
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            {booking.remarks}
                          </Typography>
                        </Grid>
                      </>
                    )}
                  </Grid>
                </CardContent>
              </Card>

              {/* Apartments Details Card */}
              <Card elevation={2} sx={{ mt: 3 }}>
                <CardHeader
                  title="Apartments Details"
                  sx={{
                    backgroundColor: theme.palette.info.light,
                    color: theme.palette.info.contrastText,
                    py: 1.5,
                  }}
                />
                <CardContent>
                  {booking.apartments?.map((apt) => (
                    <Box
                      key={apt.id}
                      sx={{
                        mb: 3,
                        p: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                      }}
                    >
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            gutterBottom
                          >
                            Apartment Number
                          </Typography>
                          <Typography variant="body1">{getSafeValue(apt.number)}</Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            gutterBottom
                          >
                            Apartment Name
                          </Typography>
                          <Typography variant="body1">{getSafeValue(apt.name)}</Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            gutterBottom
                          >
                            Property
                          </Typography>
                          <Typography variant="body1">
                            {getSafeValue(apt.property_assigned_name)} -{" "}
                            {getSafeValue(apt.property_address)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            gutterBottom
                          >
                            Price per Night
                          </Typography>
                          <Typography variant="body1">
                            {getSafeValue(apt.currency)}
                            {getSafeValue(apt.price, 0)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            gutterBottom
                          >
                            Apartment Type
                          </Typography>
                          {renderApartmentType(apt.apartmentType)}
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            gutterBottom
                          >
                            Cleaning Status
                          </Typography>
                          <Chip
                            label={getSafeValue(apt.cleaned, false) ? "Cleaned" : "Needs Cleaning"}
                            color={getSafeValue(apt.cleaned, false) ? "success" : "warning"}
                            size="small"
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </CardContent>
              </Card>

              {/* Refunds History Card */}
              {bookingRefunds.length > 0 && (
                <Card elevation={2} sx={{ mt: 3 }}>
                  <CardHeader
                    title="Refund History"
                    sx={{
                      backgroundColor: theme.palette.warning.light,
                      color: theme.palette.warning.contrastText,
                      py: 1.5,
                    }}
                  />
                  <CardContent>
                    {bookingRefunds.map((refund) => (
                      <Box
                        key={refund.id}
                        sx={{
                          mb: 2,
                          p: 2,
                          bgcolor: "grey.50",
                          borderRadius: 1,
                        }}
                      >
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body1">
                              <strong>Amount:</strong>{" "}
                              {booking.apartments?.[0]?.currency}
                              {getSafeValue(refund.amount, 0).toFixed(2)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Status:</strong>
                              <StatusChip
                                status={getSafeValue(refund.status, "pending")}
                                labels={{
                                  pending: "Pending",
                                  approved: "Approved",
                                  rejected: "Rejected",
                                }}
                                colors={{
                                  pending: "warning",
                                  approved: "success",
                                  rejected: "error",
                                }}
                              />
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2">
                              <strong>Reason:</strong> {getSafeValue(refund.reason, "No reason provided")}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {dayjs(getSafeValue(refund.created_at)).format(
                                "MMM D, YYYY h:mm A"
                              )}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              )}
            </Grid>

            {/* Guest Details Card */}
            <Grid item xs={12} md={4}>
              <Card elevation={2}>
                <CardHeader
                  title="Guest Information"
                  avatar={<Person />}
                  sx={{
                    backgroundColor: theme.palette.success.light,
                    color: theme.palette.success.contrastText,
                    py: 1.5,
                  }}
                />
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Full Name
                    </Typography>
                    <Typography variant="body1">
                      {getSafeValue(booking.guest?.user.first_name)}{" "}
                      {getSafeValue(booking.guest?.user.last_name)}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Phone Number
                    </Typography>
                    <Typography variant="body1">
                      <Phone
                        sx={{ fontSize: 16, mr: 1, verticalAlign: "middle" }}
                      />
                      {getSafeValue(booking.guest?.user.phone, "Not provided")}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Email Address
                    </Typography>
                    <Typography variant="body1">
                      <Email
                        sx={{ fontSize: 16, mr: 1, verticalAlign: "middle" }}
                      />
                      {getSafeValue(booking.guest?.user.email, "Not provided")}
                    </Typography>
                  </Box>

                  {booking.guest?.idCard && (
                    <Box>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom
                      >
                        ID Card
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() =>
                          window.open(booking.guest?.idCard?.url, "_blank")
                        }
                      >
                        View ID Card
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Timeline Card */}
              <Card elevation={2} sx={{ mt: 3 }}>
                <CardHeader
                  title="Booking Timeline"
                  avatar={<CalendarMonth />}
                  sx={{
                    backgroundColor: theme.palette.warning.light,
                    color: theme.palette.warning.contrastText,
                    py: 1.5,
                  }}
                />
                <CardContent>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Created
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(booking.dateOfReservation)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Last Updated
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(booking.updatedAt)}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <DeleteConfirmationDialog
            open={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            onConfirm={handleDelete}
            loading={loading}
            title="Confirm Delete Booking"
            description="Are you sure you want to delete this booking? This action cannot be undone."
            confirmText="Delete Booking"
            cancelText="Cancel"
          />
        </Container>
      </Box>
    </Box>
  );
}