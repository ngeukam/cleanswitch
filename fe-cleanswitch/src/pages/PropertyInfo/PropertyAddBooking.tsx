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
  CheckCircle,
  CalendarMonth,
  Email,
  Search,
} from "@mui/icons-material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { toast } from "react-toastify";
import useApi from "../../hooks/APIHandler";
import Appbar from "../../components/Appbar";
import ImageUpload from "../../components/ImageUpload";
import { useNavigate, useParams } from "react-router-dom";

// Extend dayjs with UTC and timezone plugins
dayjs.extend(utc);
dayjs.extend(timezone);

interface Apartment {
  id: string;
  name: string;
  number: number;
  inService: boolean;
  price: number;
  property_assigned_name: string;
  property_address: string;
  currency: string;
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
  idCard?: {};
  user: User;
}

const bookingStatus = [
  { value: "checked_in", label: "Checked In" },
  { value: "upcoming", label: "Upcoming" },
  { value: "active", label: "Active" },
];

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

export default function AddBooking() {
  const theme = useTheme();
  const { callApi, loading, error } = useApi();

  // Form state
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [selectedApartments, setSelectedApartments] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>(() => {
    const today = dayjs();
    return today.hour(17).minute(0).format("YYYY-MM-DDTHH:mm");
  });

  const [endDate, setEndDate] = useState<string>(() => {
    const tomorrow = dayjs().add(1, "day");
    return tomorrow.hour(11).minute(0).format("YYYY-MM-DDTHH:mm");
  });
  const [guestData, setGuestData] = useState<Guest>({
    id: "",
    user: {
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
    },
    idCard: {},
  });
  const [showGuestDetails, setShowGuestDetails] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isLoadingApartments, setIsLoadingApartments] = useState(true);
  const [isLoadingGuests, setIsLoadingGuests] = useState(false);
  const [guestOptions, setGuestOptions] = useState<Guest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showGuestSearchDialog, setShowGuestSearchDialog] = useState(false);
  const [isNewGuest, setIsNewGuest] = useState(true);
  const [status, setStatus] = useState<string>("upcoming");
  const [property, setProperty] = useState<any[]>([]);
  const navigate = useNavigate();
  const { id } = useParams();
  // Form state
  useEffect(() => {
    const fetchApartments = async () => {
      try {
        setIsLoadingApartments(true);
        const response = await callApi({
          url: `/properties/${id}/available-apartments/`,
          method: "GET",
        });
        if (response?.status === 200) {
          setApartments(response.data);
        }
      } catch (err) {
        console.error("Error fetching apartments:", err);
      } finally {
        setIsLoadingApartments(false);
      }
    };
    fetchApartments();
  }, []);
  useEffect(() => {
    if (startDate) {
      const start = dayjs(startDate);
      const newEndDate = start
        .add(1, "day")
        .hour(11)
        .minute(0)
        .format("YYYY-MM-DDTHH:mm");
      setEndDate(newEndDate);
    }
  }, [startDate]);

  // Fetch available apartments
  useEffect(() => {
    const fetchApartments = async () => {
      try {
        setIsLoadingApartments(true);
        const response = await callApi({
          url: "/available/apartments/",
          method: "GET",
        });
        if (response?.status === 200) {
          setApartments(response.data);
        }
      } catch (err) {
        console.error("Error fetching apartments:", err);
      } finally {
        setIsLoadingApartments(false);
      }
    };
    fetchApartments();
  }, []);
  useEffect(() => {
    const fetchProperty = async () => {
      const result = await callApi({
        url: `/properties/${id}/`,
      });
      if (result) {
        setProperty([result.data]);
      }
    };
    fetchProperty();
  }, []);

  // Search for guests when dialog opens or query changes
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

  // Calculate duration and total price
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

    return {
      durationHours,
      durationDays,
      totalPrice,
      apartments: selectedApartmentObjects, // Now returns array
    };
  };

  const bookingDetails = calculateBookingDetails();

  // Validate form fields
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
      };

      const response = await callApi({
        url: "/apartments/bookings/",
        method: "POST",
        body: bookingData,
      });

      if (response?.status === 201) {
        toast.success("Booking created successfully!");
        resetForm();
        navigate("/bookings");
      }
    } catch (err) {
      toast.error("Failed to create booking");
      console.error("Error creating booking:", err);
    }
  };

  const resetForm = () => {
    setSelectedApartments([]);
    setStartDate("");
    setEndDate("");
    setStatus("");
    setGuestData({
      id: "",
      user: {
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
      },
      idCard: [],
    });
    setIsNewGuest(true);
    setValidationErrors({});
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
      idCard: guest.idCard || [],
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
      idCard: [],
    });
    setIsNewGuest(true);
    setShowGuestSearchDialog(false);
    setSearchQuery("");
  };

  const getFullName = (user: User) => {
    return `${user.first_name} ${user.last_name}`;
  };

  return (
    <Box sx={{ display: "flex" }}>
      <Appbar appBarTitle={`New Booking for Property ${property[0]?.name}`} />
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
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {`New Booking for Property ${property[0]?.name}`}
            </Typography>
            <Typography color="text.secondary">
              Create a new booking for a guest
            </Typography>
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
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={status}
                      label="Status"
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {bookingStatus.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
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
                      {isNewGuest && (
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
                            />
                          </Box>
                        </Grid>
                      )}
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
                    onClick={resetForm}
                  >
                    Clear Form
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                    disabled={loading}
                    startIcon={
                      loading ? <CircularProgress size={20} /> : <CheckCircle />
                    }
                  >
                    {loading ? "Creating..." : "Create Booking"}
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
                      <strong>Duration:</strong> {bookingDetails.durationHours}{" "}
                      hours ({bookingDetails.durationDays} nights)
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
                      <Typography variant="subtitle1">
                        <strong>Phone:</strong> {guestData.user.phone}
                      </Typography>
                      <Typography variant="subtitle1">
                        <strong>Email:</strong> {guestData.user.email}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          )}
        </Container>
      </Box>
    </Box>
  );
}
