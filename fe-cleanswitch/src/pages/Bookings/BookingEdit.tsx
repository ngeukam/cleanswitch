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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  CircularProgress,
  Chip,
  useTheme,
  Toolbar,
  Paper,
  Collapse,
  InputAdornment,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Person,
  Phone,
  ContactMail,
  ExpandMore,
  ExpandLess,
  CalendarMonth,
  Email,
  Search,
  Save,
  Groups,
  ChildCare,
  Payment,
  Flag,
  Business,
  Notes,
} from "@mui/icons-material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { toast } from "react-toastify";
import useApi from "../../hooks/APIHandler";
import Appbar from "../../components/Appbar";
import ImageUpload from "../../components/ImageUpload";
import { useNavigate, useParams } from "react-router-dom";
import StatusChip from "../../components/StatusChip";

// Extend dayjs with UTC and timezone plugins
dayjs.extend(utc);
dayjs.extend(timezone);

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
  inService: boolean;
  price: number;
  property_assigned_name: string;
  property_address: string;
  currency: string;
  cleaned: boolean;
  apartmentType: string;
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
  refunds?: Refund[];
  // New fields
  persons: number;
  adults: number;
  children: number;
  settings: Settings | null;
  payment_status: string;
  payment_method: string;
  remarks: string;
  booker_country: string;
  travel_purpose: string;
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

const getAvailableStatusOptions = (currentStatus: string) => {
  const allStatusOptions = [
    { value: "confirmed", label: "Confirmed" },
    { value: "checked_in", label: "Checked In" },
    { value: "checked_out", label: "Checked Out" },
    { value: "cancelled", label: "Cancelled" },
    { value: "upcoming", label: "Upcoming" },
    { value: "active", label: "Active" },
  ];

  switch (currentStatus) {
    case "checked_in":
      return allStatusOptions.filter((option) =>
        ["checked_in", "checked_out"].includes(option.value)
      );
    case "checked_out":
      return allStatusOptions.filter(
        (option) => option.value === "checked_out"
      ); // Only show current status
    case "cancelled":
      return allStatusOptions.filter((option) =>
        ["confirmed", "upcoming", "active", "cancelled"].includes(option.value)
      );
    default:
      return allStatusOptions.filter(
        (option) => option.value !== "checked_out"
      );
  }
};

export default function BookingEdit() {
  const theme = useTheme();
  const { callApi } = useApi();
  const { id } = useParams();
  const navigate = useNavigate();

  // Form state
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [selectedApartments, setSelectedApartments] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [guestData, setGuestData] = useState<Guest>({
    id: "",
    user: {
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
    },
    idCard: null,
  });
  const [showGuestDetails, setShowGuestDetails] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isLoadingApartments, setIsLoadingApartments] = useState(true);
  const [isLoadingGuests, setIsLoadingGuests] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestOptions, setGuestOptions] = useState<Guest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showGuestSearchDialog, setShowGuestSearchDialog] = useState(false);
  const [isNewGuest, setIsNewGuest] = useState(true);
  const [originalBooking, setOriginalBooking] = useState<Booking | null>(null);
  const [status, setStatus] = useState<string>("");

  // New state for additional fields
  const [persons, setPersons] = useState<number>(1);
  const [adults, setAdults] = useState<number>(1);
  const [children, setChildren] = useState<number>(0);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [settingsOptions, setSettingsOptions] = useState<Settings[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [bookerCountry, setBookerCountry] = useState<string>("");
  const [travelPurpose, setTravelPurpose] = useState<string>("");

  const availableStatusOptions = getAvailableStatusOptions(status);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState<string>("");
  const [refundStatus, setRefundStatus] = useState<string>("");
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [bookingRefunds, setBookingRefunds] = useState<Refund[]>([]);

  // Fetch settings options
  const fetchSettings = async () => {
    try {
      const response = await callApi({
        url: "/bookings/settings/",
        params: {
          limit:100
        },
      });
      if (response?.status === 200) {
        setSettingsOptions(response.data.data.data);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  // Fetch refunds for this booking
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

  // Fetch booking details and available apartments
  const fetchBooking = async () => {
    try {
      setIsLoadingApartments(true);

      // Fetch booking details
      const bookingResponse = await callApi({
        url: `/apartments/bookings/${id}/`,
        method: "GET",
      });

      if (bookingResponse?.status === 200) {
        const bookingData = bookingResponse.data;
        setOriginalBooking(bookingData);
        setSelectedApartments(
          bookingData.apartments?.map((apt: Apartment) => apt.id) || []
        );
        setStartDate(
          dayjs(bookingData.startDate).utc().format("YYYY-MM-DDTHH:mm")
        );
        setEndDate(dayjs(bookingData.endDate).utc().format("YYYY-MM-DDTHH:mm"));
        setGuestData(bookingData.guest);
        setIsNewGuest(false);
        setStatus(bookingData.status);

        // Set new fields
        setPersons(bookingData.persons || 1);
        setAdults(bookingData.adults || 1);
        setChildren(bookingData.children || 0);
        setSettings(bookingData.settings || null);
        setPaymentStatus(bookingData.payment_status || "pending");
        setPaymentMethod(bookingData.payment_method || "");
        setRemarks(bookingData.remarks || "");
        setBookerCountry(bookingData.booker_country || "");
        setTravelPurpose(bookingData.travel_purpose || "");
      }

      // Fetch available apartments
      const apartmentsResponse = await callApi({
        url: "/apartments/mixed-up/",
        method: "GET",
      });

      if (apartmentsResponse?.status === 200) {
        setApartments(apartmentsResponse.data);
      }

      // Fetch settings and refunds
      await Promise.all([fetchSettings(), fetchRefunds()]);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoadingApartments(false);
    }
  };

  // Calculate maximum refund amount
  const calculateMaxRefund = () => {
    if (!originalBooking) return 0;

    const totalRefunded = bookingRefunds.reduce((sum, refund) => {
      // Skip refunds with cancelled status
      if (refund.status === "rejected") {
        return sum;
      }
      return sum + refund.amount;
    }, 0);

    return Math.max(0, originalBooking.totalPrice - totalRefunded);
  };

  // Process refund
  const handleProcessRefund = async () => {
    if (!refundReason.trim()) {
      toast.error("Please provide a reason for the refund");
      return;
    }

    if (refundAmount <= 0) {
      toast.error("Refund amount must be greater than 0");
      return;
    }

    setIsProcessingRefund(true);
    try {
      const response = await callApi({
        url: `/bookings/${id}/process_refund/`,
        method: "POST",
        body: {
          amount: refundAmount,
          reason: refundReason,
          status: refundStatus,
        },
      });

      if (response?.status === 200 || response?.status === 201) {
        toast.success("Refund processed successfully!");
        setShowRefundDialog(false);
        setRefundAmount(0);
        setRefundReason("");
        setRefundStatus("pending");

        // Refresh booking data and refunds
        fetchBooking();
        fetchRefunds();
      }
    } catch (err) {
      console.error("Error processing refund:", err);
    } finally {
      setIsProcessingRefund(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchBooking();
  }, [id]);

  // Update persons when adults or children change
  useEffect(() => {
    setPersons(adults + children);
  }, [adults, children]);

  // Search for guests
  useEffect(() => {
    if (!showGuestSearchDialog) return;

    const searchGuests = async () => {
      try {
        setIsLoadingGuests(true);
        const response = await callApi({
          url: `/guests/search?q=${searchQuery}`,
          method: "GET",
        });
        if (response?.status === 200) {
          setGuestOptions(response.data);
        }
      } catch (err) {
        console.error("Error searching guests:", err);
      } finally {
        setIsLoadingGuests(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        searchGuests();
      } else {
        setGuestOptions([]);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, showGuestSearchDialog]);

  // Calculate booking details
  const calculateBookingDetails = () => {
    if (!startDate || !endDate || selectedApartments.length === 0) return null;

    const start = dayjs(startDate);
    const end = dayjs(endDate);

    if (!start.isValid() || !end.isValid()) return null;

    const selectedApartmentObjects = apartments.filter((a) =>
      selectedApartments.includes(a.id)
    );
    if (selectedApartmentObjects.length === 0) return null;

    const durationHours = end.diff(start, "hour");
    const durationDays = Math.ceil(durationHours / 24);

    // Calculate total price for all selected apartments
    const totalPrice = selectedApartmentObjects.reduce((total, apartment) => {
      return total + durationDays * apartment.price;
    }, 0);

    // Calculate commission if settings exist
    const commissionAmount = settings
      ? (totalPrice * parseFloat(settings.commission_percentage)) / 100
      : 0;

    return {
      durationHours,
      durationDays,
      totalPrice,
      commissionAmount,
      apartments: selectedApartmentObjects,
    };
  };

  const bookingDetails = calculateBookingDetails();

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (selectedApartments.length === 0)
      errors.apartment = "At least one apartment is required";
    if (!startDate) errors.startDate = "Start date is required";
    if (!endDate) errors.endDate = "End date is required";

    const start = dayjs(startDate);
    const end = dayjs(endDate);

    if (start.isValid() && end.isValid() && start.isAfter(end)) {
      errors.dateRange = "End date must be after start date";
    }

    if (!guestData.user.first_name)
      errors.first_name = "First name is required";
    if (!guestData.user.last_name) errors.last_name = "Last name is required";
    if (!guestData.user.phone) errors.phone = "Phone number is required";
    if (!guestData.user.email) errors.email = "Email address is required";

    if (persons < 1) errors.persons = "At least 1 person is required";
    if (adults < 1) errors.adults = "At least 1 adult is required";
    if (children < 0) errors.children = "Children cannot be negative";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleImageUpload = (uploadedImages: any) => {
    if (uploadedImages && uploadedImages.length > 0) {
      setGuestData((prev) => ({
        ...prev,
        idCard: uploadedImages[0],
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    setLoading(true);
    if (!validateForm()) return;
    if (!guestData.idCard && isNewGuest) {
      return toast.error("ID card is required for new guests");
    }

    try {
      const bookingData = {
        apartments: selectedApartments,
        startDate: startDate,
        endDate: endDate,
        first_name: guestData.user.first_name,
        last_name: guestData.user.last_name,
        phone: guestData.user.phone,
        email: guestData.user.email,
        idCard: guestData.idCard,
        guest_id: !isNewGuest ? guestData.id : undefined,
        status: status,
        // New fields
        persons: persons,
        adults: adults,
        children: children,
        settings: settings?.id,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        remarks: remarks,
        booker_country: bookerCountry,
        travel_purpose: travelPurpose,
      };

      const response = await callApi({
        url: `/apartments/bookings/${id}/`,
        method: "PUT",
        body: bookingData,
      });

      if (response?.status === 200) {
        toast.success("Booking updated successfully!");
        navigate("/bookings");
      }
    } catch (err) {
      console.error("Error updating booking:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGuest = (guest: Guest) => {
    setGuestData({
      id: guest.id,
      user: {
        first_name: guest.user.first_name,
        last_name: guest.user.last_name,
        phone: guest.user.phone,
        email: guest.user.email,
      },
      idCard: guest.idCard || null,
    });
    setIsNewGuest(false);
    setShowGuestSearchDialog(false);
    setSearchQuery("");
  };

  const handleNewGuest = () => {
    setGuestData({
      id: "",
      user: {
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
      },
      idCard: null,
    });
    setIsNewGuest(true);
    setShowGuestSearchDialog(false);
    setSearchQuery("");
  };

  const getFullName = (user: User) => {
    return `${user.first_name} ${user.last_name}`;
  };

  const hasChanges = () => {
    if (!originalBooking) return false;

    const originalStartDate = dayjs(originalBooking.startDate).format(
      "YYYY-MM-DDTHH:mm"
    );
    const originalEndDate = dayjs(originalBooking.endDate).format(
      "YYYY-MM-DDTHH:mm"
    );

    // Compare apartment arrays
    const originalApartmentIds =
      originalBooking.apartments?.map((apt) => apt.id) || [];
    const apartmentsChanged =
      selectedApartments.length !== originalApartmentIds.length ||
      !selectedApartments.every((id) => originalApartmentIds.includes(id)) ||
      !originalApartmentIds.every((id) => selectedApartments.includes(id));

    // Compare basic fields
    const basicFieldsChanged =
      apartmentsChanged ||
      startDate !== originalStartDate ||
      endDate !== originalEndDate ||
      guestData.user.first_name !== originalBooking.guest.user.first_name ||
      guestData.user.last_name !== originalBooking.guest.user.last_name ||
      guestData.user.phone !== originalBooking.guest.user.phone ||
      guestData.user.email !== originalBooking.guest.user.email ||
      guestData.idCard !== originalBooking.guest.idCard ||
      status !== originalBooking.status;

    // Compare new fields
    const newFieldsChanged =
      persons !== originalBooking.persons ||
      adults !== originalBooking.adults ||
      children !== originalBooking.children ||
      settings?.id !== originalBooking.settings?.id ||
      paymentStatus !== originalBooking.payment_status ||
      paymentMethod !== originalBooking.payment_method ||
      remarks !== originalBooking.remarks ||
      bookerCountry !== originalBooking.booker_country ||
      travelPurpose !== originalBooking.travel_purpose;

    return basicFieldsChanged || newFieldsChanged;
  };

  if (isLoadingApartments) {
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

  return (
    <Box sx={{ display: "flex" }}>
      <Appbar appBarTitle="Edit Booking" />
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
                Edit Booking #{id}
              </Typography>
              <Typography color="text.secondary">
                Update booking details and guest information
              </Typography>
            </Box>
            <Button
              onClick={() => navigate(-1)}
              color="inherit"
              variant="outlined"
            >
              Cancel
            </Button>
          </Box>

          {/* Main Form Card */}
          <Card elevation={2}>
            <CardHeader
              title="Booking Details"
              sx={{
                backgroundColor: theme.palette.primary.light,
                color: theme.palette.primary.contrastText,
                py: 1.5,
              }}
            />
            <CardContent>
              <Grid container spacing={3}>
                {/* Apartment Selection */}
                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    disableCloseOnSelect
                    options={apartments}
                    getOptionLabel={(option) =>
                      `${option.number} - ${option.name}`
                    }
                    value={apartments.filter((apartment) =>
                      selectedApartments.includes(apartment.id)
                    )}
                    onChange={(_, newValue) => {
                      setSelectedApartments(
                        newValue.map((apartment) => apartment.id)
                      );
                    }}
                    disabled={isLoadingApartments}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option.id}
                          label={`${option.number} - ${option.name}`}
                          color={
                            option.inService === false ? "success" : "error"
                          }
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Apartments"
                        placeholder={
                          isLoadingApartments
                            ? "Loading apartments..."
                            : "Select apartments"
                        }
                        error={!!validationErrors.apartment}
                        helperText={
                          validationErrors.apartment ||
                          "Select one or more apartments for this booking"
                        }
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            width: "100%",
                            alignItems: "center",
                          }}
                        >
                          <Box>
                            <Typography
                              fontWeight="bold"
                              sx={{
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              {option.number} - {option.name}
                              {renderApartmentType(option.apartmentType)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {option.property_assigned_name} -{" "}
                              {option.property_address}
                            </Typography>
                          </Box>
                          <Typography>
                            {option.currency}
                            {option.price}/night
                          </Typography>
                        </Box>
                      </li>
                    )}
                  />
                  {validationErrors.apartment && (
                    <Typography variant="caption" color="error">
                      {validationErrors.apartment}
                    </Typography>
                  )}
                </Grid>

                {/* Status and Settings */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={status}
                      label="Status"
                      onChange={(e) => setStatus(e.target.value)}
                      disabled={status === "checked_out"} // Disable if checked out
                    >
                      {availableStatusOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Commission</InputLabel>
                    <Select
                      value={settings?.id || ""}
                      label="Commission"
                      onChange={(e) => {
                        const selectedSetting = settingsOptions.find(
                          (s) => s.id === e.target.value
                        );
                        setSettings(selectedSetting || null);
                      }}
                    >
                      {settingsOptions.map((option) => (
                        <MenuItem key={option.id} value={option.id}>
                          {option.commission_percentage}% Commission -{" "}
                          {option.commission_type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Date Time Pickers */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Start Date & Time"
                    name="startDate"
                    type="datetime-local"
                    InputLabelProps={{ shrink: true }}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    error={!!validationErrors.startDate}
                    helperText={validationErrors.startDate}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="End Date & Time"
                    name="endDate"
                    type="datetime-local"
                    InputLabelProps={{ shrink: true }}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    error={
                      !!validationErrors.endDate || !!validationErrors.dateRange
                    }
                    helperText={
                      validationErrors.endDate || validationErrors.dateRange
                    }
                    required
                  />
                </Grid>

                {/* Occupancy Details */}
                <Grid item xs={12}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    <Groups sx={{ mr: 1 }} />
                    Occupancy Details
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Total Persons"
                    type="number"
                    value={persons}
                    onChange={(e) => {
                      const total = parseInt(e.target.value) || 0;
                      setPersons(total);
                      if (total < adults + children) {
                        setAdults(Math.max(1, total - children));
                      }
                    }}
                    error={!!validationErrors.persons}
                    helperText={validationErrors.persons}
                    InputProps={{
                      startAdornment: <Groups color="action" sx={{ mr: 1 }} />,
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Adults"
                    type="number"
                    value={adults}
                    onChange={(e) => {
                      const newAdults = parseInt(e.target.value) || 0;
                      setAdults(newAdults);
                      setPersons(newAdults + children);
                    }}
                    error={!!validationErrors.adults}
                    helperText={validationErrors.adults}
                    InputProps={{
                      startAdornment: <Person color="action" sx={{ mr: 1 }} />,
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Children"
                    type="number"
                    value={children}
                    onChange={(e) => {
                      const newChildren = parseInt(e.target.value) || 0;
                      setChildren(newChildren);
                      setPersons(adults + newChildren);
                    }}
                    error={!!validationErrors.children}
                    helperText={validationErrors.children}
                    InputProps={{
                      startAdornment: (
                        <ChildCare color="action" sx={{ mr: 1 }} />
                      ),
                    }}
                  />
                </Grid>

                {/* Payment Information */}
                <Grid item xs={12}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    <Payment sx={{ mr: 1 }} />
                    Payment Information
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Payment Status</InputLabel>
                    <Select
                      value={paymentStatus}
                      label="Payment Status"
                      onChange={(e) => setPaymentStatus(e.target.value)}
                    >
                      {paymentStatusOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Payment Method</InputLabel>
                    <Select
                      value={paymentMethod}
                      label="Payment Method"
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      {paymentMethodOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Additional Information */}
                <Grid item xs={12}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    <Business sx={{ mr: 1 }} />
                    Additional Information
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Booker Country"
                    value={bookerCountry}
                    onChange={(e) => setBookerCountry(e.target.value)}
                    InputProps={{
                      startAdornment: <Flag color="action" sx={{ mr: 1 }} />,
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Travel Purpose</InputLabel>
                    <Select
                      value={travelPurpose}
                      label="Travel Purpose"
                      onChange={(e) => setTravelPurpose(e.target.value)}
                    >
                      {travelPurposeOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Remarks"
                    multiline
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Any special requests or notes..."
                    InputProps={{
                      startAdornment: (
                        <Notes
                          color="action"
                          sx={{ mr: 1, alignSelf: "flex-start", mt: 1 }}
                        />
                      ),
                    }}
                  />
                </Grid>

                {/* Refund Button */}
                <Grid item xs={12}>
                  {(status === "cancelled" || status === "checked_out") && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => setShowRefundDialog(true)}
                      sx={{ mt: 1 }}
                      fullWidth
                    >
                      Process Refund
                    </Button>
                  )}
                </Grid>
              </Grid>

              {/* Guest Details Section */}
              <Box sx={{ mt: 4 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Button
                    variant="text"
                    startIcon={
                      showGuestDetails ? <ExpandLess /> : <ExpandMore />
                    }
                    endIcon={<Person />}
                    onClick={() => setShowGuestDetails(!showGuestDetails)}
                    sx={{ mb: 1 }}
                  >
                    Guest Details
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Search />}
                    onClick={() => setShowGuestSearchDialog(true)}
                    sx={{ mb: 1 }}
                  >
                    {isNewGuest ? "Find Existing Guest" : "Change Guest"}
                  </Button>
                </Box>

                <Collapse in={showGuestDetails}>
                  <Paper
                    elevation={0}
                    sx={{ p: 3, backgroundColor: theme.palette.grey[50] }}
                  >
                    {!isNewGuest && (
                      <Typography
                        variant="subtitle2"
                        color="primary"
                        gutterBottom
                      >
                        Using existing guest profile
                      </Typography>
                    )}
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="First Name"
                          value={guestData.user.first_name}
                          onChange={(e) =>
                            setGuestData({
                              ...guestData,
                              user: {
                                ...guestData.user,
                                first_name: e.target.value,
                              },
                            })
                          }
                          error={!!validationErrors.first_name}
                          helperText={validationErrors.first_name}
                          InputProps={{
                            startAdornment: (
                              <ContactMail color="action" sx={{ mr: 1 }} />
                            ),
                          }}
                          disabled={!isNewGuest}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Last Name"
                          value={guestData.user.last_name}
                          onChange={(e) =>
                            setGuestData({
                              ...guestData,
                              user: {
                                ...guestData.user,
                                last_name: e.target.value,
                              },
                            })
                          }
                          error={!!validationErrors.last_name}
                          helperText={validationErrors.last_name}
                          disabled={!isNewGuest}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Phone Number"
                          value={guestData.user.phone}
                          onChange={(e) =>
                            setGuestData({
                              ...guestData,
                              user: {
                                ...guestData.user,
                                phone: e.target.value,
                              },
                            })
                          }
                          error={!!validationErrors.phone}
                          helperText={validationErrors.phone}
                          InputProps={{
                            startAdornment: (
                              <Phone color="action" sx={{ mr: 1 }} />
                            ),
                          }}
                          disabled={!isNewGuest}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Email Address"
                          fullWidth
                          variant="outlined"
                          type="email"
                          value={guestData.user.email}
                          placeholder="ex: test@test.com"
                          onChange={(e) =>
                            setGuestData({
                              ...guestData,
                              user: {
                                ...guestData.user,
                                email: e.target.value,
                              },
                            })
                          }
                          error={!!validationErrors.email}
                          helperText={validationErrors.email}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Email fontSize="small" color="action" />
                              </InputAdornment>
                            ),
                          }}
                          disabled={!isNewGuest}
                        />
                      </Grid>
                      {/* {isNewGuest && ( */}
                      <Grid item xs={12}>
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            ID Card Upload
                          </Typography>
                          <ImageUpload
                            onUpload={handleImageUpload}
                            multiple={true}
                            maxFiles={1}
                            maxFileSize={10}
                            allowedTypes={[
                              "image/jpeg",
                              "image/png",
                              "image/webp",
                              "image/gif",
                            ]}
                            initialFiles={
                              guestData.idCard ? [guestData.idCard] : []
                            }
                          />
                        </Box>
                      </Grid>
                      {/* )} */}
                    </Grid>
                  </Paper>
                </Collapse>
              </Box>

              {/* Action Buttons */}
              <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end" }}>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => navigate("/bookings")}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                    disabled={!hasChanges()}
                    startIcon={
                      loading ? <CircularProgress size={20} /> : <Save />
                    }
                  >
                    {loading ? "Updating..." : "Update Booking"}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          {/* Guest Search Dialog */}
          <Dialog
            open={showGuestSearchDialog}
            onClose={() => setShowGuestSearchDialog(false)}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle>Find Existing Guest</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <Autocomplete
                  options={guestOptions}
                  getOptionLabel={(option) =>
                    `${getFullName(option.user)} (${option.user.email})`
                  }
                  loading={isLoadingGuests}
                  onInputChange={(_, value) => setSearchQuery(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search by name, email, or phone"
                      variant="outlined"
                      fullWidth
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <Search sx={{ mr: 1, color: "action.active" }} />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box>
                        <Typography>{getFullName(option.user)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.user.email} • {option.user.phone}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  onChange={(_, value) => {
                    if (value) {
                      handleSelectGuest(value);
                    }
                  }}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowGuestSearchDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleNewGuest} color="primary">
                New Guest
              </Button>
            </DialogActions>
          </Dialog>

          {/* Summary Card */}
          {bookingDetails && (
            <Card elevation={2} sx={{ mt: 3 }}>
              <CardHeader
                title="Booking Summary"
                avatar={<CalendarMonth />}
                sx={{
                  backgroundColor: theme.palette.info.light,
                  color: theme.palette.info.contrastText,
                  py: 1.5,
                }}
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Apartments:</strong>
                    </Typography>
                    {bookingDetails.apartments.map((apartment) => (
                      <Box key={apartment.id} sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          • {apartment.number} - {apartment.name}
                          <Chip
                            label={
                              apartment.inService === false
                                ? "Available"
                                : "Occupied"
                            }
                            color={
                              apartment.inService === false
                                ? "success"
                                : "error"
                            }
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {apartment.property_assigned_name} •{" "}
                          {apartment.currency}
                          {apartment.price}/night
                        </Typography>
                      </Box>
                    ))}
                    <Typography variant="subtitle1" sx={{ mt: 2 }}>
                      <strong>Occupancy:</strong> {persons} person(s) ({adults}{" "}
                      adults, {children} children)
                    </Typography>
                    {travelPurpose && (
                      <Typography variant="subtitle1">
                        <strong>Travel Purpose:</strong>{" "}
                        {travelPurposeOptions.find(
                          (t) => t.value === travelPurpose
                        )?.label || travelPurpose}
                      </Typography>
                    )}
                    {bookerCountry && (
                      <Typography variant="subtitle1">
                        <strong>Country:</strong> {bookerCountry}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Check-in:</strong>{" "}
                      {dayjs(startDate).format("MMM D, YYYY h:mm A")}
                    </Typography>
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Check-out:</strong>{" "}
                      {dayjs(endDate).format("MMM D, YYYY h:mm A")}
                    </Typography>
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Duration:</strong> {bookingDetails.durationDays}{" "}
                      days ({bookingDetails.durationHours} hours)
                    </Typography>
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Total Price:</strong>
                      <Chip
                        label={`${
                          bookingDetails.apartments[0]?.currency
                        }${bookingDetails.totalPrice.toFixed(2)}`}
                        color="primary"
                        variant="outlined"
                        size="medium"
                        sx={{ ml: 1, fontWeight: "bold" }}
                      />
                    </Typography>
                    {settings && (
                      <Typography variant="subtitle1" gutterBottom>
                        <strong>Commission:</strong>
                        <Chip
                          label={`${
                            bookingDetails.apartments[0]?.currency
                          }${bookingDetails.commissionAmount.toFixed(2)} (${
                            settings.commission_percentage
                          }%)`}
                          color="secondary"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                    )}
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Payment Status:</strong>
                      <StatusChip
                        status={paymentStatus}
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
                    </Typography>
                    {paymentMethod && (
                      <Typography variant="subtitle1">
                        <strong>Payment Method:</strong>{" "}
                        {paymentMethodOptions.find(
                          (p) => p.value === paymentMethod
                        )?.label || paymentMethod}
                      </Typography>
                    )}
                  </Grid>
                  {guestData.user.first_name && (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle1">
                        <strong>Guest:</strong> {getFullName(guestData.user)}
                        {!isNewGuest && (
                          <Chip
                            label="Existing Guest"
                            color="info"
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                    </Grid>
                  )}
                  {remarks && (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle1">
                        <strong>Remarks:</strong> {remarks}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          )}
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
                    sx={{ mb: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}
                  >
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body1">
                          <strong>Amount:</strong>{" "}
                          {originalBooking?.apartments[0]?.currency}
                          {refund.amount.toFixed(2)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Status:</strong>
                          <StatusChip
                            status={refund.status}
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
                          <strong>Reason:</strong> {refund.reason}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {dayjs(refund.created_at).format(
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
          {/* Refund Dialog */}
          <Dialog
            open={showRefundDialog}
            onClose={() => setShowRefundDialog(false)}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle>Process Refund</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Maximum refundable amount:{" "}
                  {originalBooking?.apartments[0]?.currency}
                  {calculateMaxRefund().toFixed(2)}
                </Typography>

                <TextField
                  fullWidth
                  label="Refund Amount"
                  type="number"
                  value={refundAmount}
                  onChange={(e) =>
                    setRefundAmount(parseFloat(e.target.value) || 0)
                  }
                  inputProps={{
                    min: 0,
                    max: calculateMaxRefund(),
                    step: 0.01,
                  }}
                  sx={{ mb: 2 }}
                />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Refund Status</InputLabel>
                  <Select
                    value={refundStatus}
                    label="Refund Status"
                    onChange={(e) => setRefundStatus(e.target.value)}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Refund Reason"
                  multiline
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Please provide a reason for the refund..."
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setShowRefundDialog(false)}
                disabled={isProcessingRefund}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProcessRefund}
                variant="contained"
                disabled={isProcessingRefund || refundAmount <= 0}
                startIcon={
                  isProcessingRefund ? <CircularProgress size={20} /> : null
                }
              >
                {isProcessingRefund ? "Processing..." : "Process Refund"}
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    </Box>
  );
}
