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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  CircularProgress,
  useTheme,
  Toolbar,
  Alert,
  Divider,
  Chip,
  InputAdornment,
} from "@mui/material";
import {
  Save,
  Cancel,
  Settings as SettingsIcon,
  Percent,
  Category,
  ArrowBack,
  Edit,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import useApi from "../../hooks/APIHandler";
import Appbar from "../../components/Appbar";

interface CommissionSettingsForm {
  commission_percentage: string;
  commission_type: string;
}

const commissionTypeOptions = [
  { value: "airbnb", label: "AirBnb" },
  { value: "booking", label: "Booking" },
  { value: "direct", label: "Direct" },
  { value: "partner", label: "Partner" },
  { value: "custom", label: "Custom" },
];

export default function CommissionSettingsForm() {
  const theme = useTheme();
  const { callApi, loading } = useApi();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<CommissionSettingsForm>({
    commission_percentage: "",
    commission_type: "",
  });
  const [customType, setCustomType] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      fetchSetting();
    }
  }, [id, isEdit]);

  useEffect(() => {
    // Show custom input when commission_type is "custom"
    setShowCustomInput(formData.commission_type === "custom");
    
    // If switching away from custom, clear custom type
    if (formData.commission_type !== "custom") {
      setCustomType("");
    }
  }, [formData.commission_type]);

  const fetchSetting = async () => {
    try {
      setIsLoading(true);
      const response = await callApi({
        url: `/bookings/settings/${id}/`,
        method: "GET",
      });

      if (response?.status === 200) {
        const settingData = response.data;
        const commissionType = settingData.commission_type || "";
        
        // Check if the commission type is custom (not in predefined options)
        const isCustomType = commissionType && !commissionTypeOptions.find(opt => opt.value === commissionType);
        
        setFormData({
          commission_percentage: settingData.commission_percentage?.toString() || "",
          commission_type: isCustomType ? "custom" : commissionType,
        });
        
        // If it's a custom type, set the custom type value
        if (isCustomType) {
          setCustomType(commissionType);
        }
      }
    } catch (err) {
      console.error("Error fetching setting:", err);
      toast.error("Failed to load commission setting");
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate commission percentage
    if (!formData.commission_percentage.trim()) {
      errors.commission_percentage = "Commission percentage is required";
    } else {
      const percentage = parseFloat(formData.commission_percentage);
      if (isNaN(percentage)) {
        errors.commission_percentage = "Commission percentage must be a valid number";
      } else if (percentage < 0) {
        errors.commission_percentage = "Commission percentage cannot be negative";
      } else if (percentage > 100) {
        errors.commission_percentage = "Commission percentage cannot exceed 100%";
      } else if (!/^\d+(\.\d{1,2})?$/.test(formData.commission_percentage)) {
        errors.commission_percentage = "Commission percentage can have up to 2 decimal places";
      }
    }

    // Validate commission type
    if (!formData.commission_type.trim()) {
      errors.commission_type = "Commission type is required";
    } else if (formData.commission_type === "custom" && !customType.trim()) {
      errors.commission_type = "Custom commission type is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof CommissionSettingsForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };

  const handleCustomTypeChange = (value: string) => {
    setCustomType(value);
    
    // Clear validation error when user starts typing
    if (validationErrors.commission_type) {
      setValidationErrors(prev => ({
        ...prev,
        commission_type: ""
      }));
    }
  };

  const getFinalCommissionType = (): string => {
    if (formData.commission_type === "custom" && customType.trim()) {
      return customType.trim();
    }
    return formData.commission_type;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      const url = isEdit ? `/bookings/settings/${id}/` : "/bookings/settings/";
      const method = isEdit ? "PUT" : "POST";

      // Prepare data for API - use custom type if applicable
      const apiData = {
        commission_percentage: parseFloat(formData.commission_percentage),
        commission_type: getFinalCommissionType(),
      };

      const response = await callApi({
        url,
        method,
        body: apiData,
      });

      if (response?.status === (isEdit ? 200 : 201)) {
        toast.success(
          `Commission setting ${isEdit ? 'updated' : 'created'} successfully!`
        );
        navigate("/commissions");
      }
    } catch (err: any) {
      console.error("Error saving setting:", err);
      
      // Handle validation errors from backend
      if (err.response?.data) {
        const backendErrors = err.response.data;
        const formattedErrors: Record<string, string> = {};
        
        Object.keys(backendErrors).forEach(key => {
          if (Array.isArray(backendErrors[key])) {
            formattedErrors[key] = backendErrors[key][0];
          } else {
            formattedErrors[key] = backendErrors[key];
          }
        });
        
        setValidationErrors(formattedErrors);
        
        if (formattedErrors.non_field_errors) {
          toast.error(formattedErrors.non_field_errors);
        }
      } else {
        toast.error(`Failed to ${isEdit ? 'update' : 'create'} commission setting`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/commissions");
  };

  const getDisplayCommissionType = (): string => {
    if (formData.commission_type === "custom") {
      return customType || "Custom Type";
    }
    return commissionTypeOptions.find(opt => opt.value === formData.commission_type)?.label || formData.commission_type;
  };

  if (isLoading && isEdit) {
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
      <Appbar appBarTitle={`${isEdit ? 'Edit' : 'Create'} Commission Setting`} />
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
              <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SettingsIcon fontSize="large" />
                {isEdit ? 'Edit Commission Setting' : 'Create New Commission Setting'}
              </Typography>
              <Typography color="text.secondary">
                {isEdit 
                  ? 'Update commission percentage and type' 
                  : 'Define a new commission setting for bookings'
                }
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={handleCancel}
            >
              Back to List
            </Button>
          </Box>

          {/* Main Form Card */}
          <Card elevation={2}>
            <CardHeader
              title="Commission Details"
              sx={{
                backgroundColor: theme.palette.primary.light,
                color: theme.palette.primary.contrastText,
                py: 1.5,
              }}
            />
            <CardContent>
              <Grid container spacing={3}>
                {/* Commission Percentage */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Commission Percentage"
                    type="number"
                    value={formData.commission_percentage}
                    onChange={(e) => handleInputChange('commission_percentage', e.target.value)}
                    error={!!validationErrors.commission_percentage}
                    helperText={validationErrors.commission_percentage || "Enter percentage value (0-100) with up to 2 decimal places"}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Percent color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <Typography color="text.secondary">
                            %
                          </Typography>
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{
                      min: 0,
                      max: 100,
                      step: 0.01,
                      pattern: "^\\d+(\\.\\d{1,2})?$"
                    }}
                    placeholder="e.g., 15.50"
                  />
                </Grid>

                {/* Commission Type */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={!!validationErrors.commission_type}>
                    <InputLabel>Commission Type</InputLabel>
                    <Select
                      value={formData.commission_type}
                      label="Commission Type"
                      onChange={(e) => handleInputChange('commission_type', e.target.value)}
                      startAdornment={
                        <Category color="action" sx={{ mr: 1 }} />
                      }
                    >
                      {commissionTypeOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {validationErrors.commission_type && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                        {validationErrors.commission_type}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>

                {/* Custom Commission Type Input */}
                {showCustomInput && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Custom Commission Type"
                      value={customType}
                      onChange={(e) => handleCustomTypeChange(e.target.value)}
                      placeholder="Enter your custom commission type..."
                      helperText="Enter a custom name for this commission type"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Edit color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                )}

                {/* Information Section */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Note:</strong> Commission settings will be applied to all bookings 
                      that use this setting. The commission amount is calculated as: 
                      (Total Booking Price × Commission Percentage) / 100
                    </Typography>
                    {showCustomInput && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>Custom Types:</strong> Use custom types for special commission rates 
                        like seasonal promotions, corporate rates, or partner agreements.
                      </Typography>
                    )}
                  </Alert>
                </Grid>
              </Grid>

              {/* Action Buttons */}
              <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end" }}>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    <Cancel sx={{ mr: 1 }} />
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    startIcon={
                      isLoading ? <CircularProgress size={20} /> : <Save />
                    }
                  >
                    {isLoading 
                      ? (isEdit ? "Updating..." : "Creating...") 
                      : (isEdit ? "Update Setting" : "Create Setting")
                    }
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          {/* Preview Card */}
          {formData.commission_percentage && (
            <Card elevation={2} sx={{ mt: 3 }}>
              <CardHeader
                title="Commission Preview"
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
                      <strong>Commission Percentage:</strong>
                    </Typography>
                    <Chip
                      label={`${formData.commission_percentage}%`}
                      color="primary"
                      variant="filled"
                      sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Commission Type:</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {formData.commission_type === "custom" && customType && (
                        <Chip 
                          label="Custom" 
                          color="secondary" 
                          size="small" 
                        />
                      )}
                      <Typography variant="body1">
                        {getDisplayCommissionType()}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Example: For a $1,000 booking, commission would be ${(1000 * parseFloat(formData.commission_percentage || '0') / 100).toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </Container>
      </Box>
    </Box>
  );
}