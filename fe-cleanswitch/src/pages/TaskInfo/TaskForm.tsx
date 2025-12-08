// CreateTaskPage.tsx
import React, { useState, useEffect } from "react";
import {
  Button,
  Container,
  Paper,
  TextField,
  MenuItem,
  Grid,
  Chip,
  Box,
  Tabs,
  Tab,
  Autocomplete,
  FormHelperText,
  Typography,
  Stack,
  CircularProgress,
  Alert,
  Toolbar,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import useApi from "../../hooks/APIHandler";
import AddIcon from "@mui/icons-material/Add";
import { toast } from "react-toastify";
import { getUser } from "../../utils/Helper";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import Appbar from "../../components/Appbar";

dayjs.extend(utc);
dayjs.extend(timezone);

interface User {
  id: number;
  first_name: string;
  last_name: string;
  department: string;
}

interface Apartment {
  id: number;
  number: number;
  name: string | null;
}

interface Property {
  id: number;
  name: string;
  address: string;
}

interface TaskTemplate {
  id: number;
  title: string;
  description: string;
  duration: number | null;
  priority: string;
  default_property: string;
  default_assignees: User[];
  default_apartments: Apartment[];
}

interface TaskFormData {
  title: string;
  description: string;
  due_date: string;
  duration: string;
  assigned_to: string[];
  apartments_assigned: string[];
  property_assigned: string;
  status: string;
  priority: string;
  template_id: string;
}

const CreateTaskPage: React.FC = () => {
  const { callApi } = useApi();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [propertyLoading, setPropertyLoading] = useState(true);

  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState<TaskFormData>({
    title: "",
    description: "",
    due_date: dayjs().hour(11).minute(30).format("YYYY-MM-DDTHH:mm"),
    duration: "",
    assigned_to: [] as string[],
    apartments_assigned: [] as string[],
    property_assigned: "",
    status: "pending",
    priority: "medium",
    template_id: "",
  });

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null
  );
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [filteredApartments, setFilteredApartments] = useState<any[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Get parameters from URL
  const apartmentId = searchParams.get("apartment");
  const propertyId = searchParams.get("property");

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Set property from URL parameter
  useEffect(() => {
    if (propertyId && properties.length > 0) {
      const property = properties.find(
        (prop) => prop.id.toString() === propertyId
      );
      if (property) {
        setSelectedProperty(property);
        setFormData((prev) => ({
          ...prev,
          property_assigned: propertyId,
        }));
        fetchUsersByProperty(propertyId);
        fetchApartmentsByProperty(propertyId);
      }
      setPropertyLoading(false);
    } else if (properties.length > 0) {
      setPropertyLoading(false);
    }
  }, [propertyId, properties]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchUsers(), fetchProperties(), fetchTemplates()]);
    } catch (error) {
      toast.error("Failed to load initial data");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.due_date) {
      newErrors.due_date = "Due date is required";
    }

    if (!formData.duration || parseFloat(formData.duration) <= 0) {
      newErrors.duration = "Valid duration is required";
    }

    if (!formData.property_assigned) {
      newErrors.property_assigned = "Property assignment is required";
    }

    if (!formData.status) {
      newErrors.status = "Status is required";
    }

    if (!formData.priority) {
      newErrors.priority = "Priority is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchTemplates = async () => {
    const res = await callApi({
      url: "/tasks-templates/",
      params: { page: 1, pageSize: 100, ordering: "-id" },
    });
    if (res) {
      setTemplates(res.data.data.data);
    }
  };

  const fetchUsers = async () => {
    const res = await callApi({
      url: "/users/",
      params: { page: 1, pageSize: 100, ordering: "-id" },
    });
    if (res) {
      const allUsers = res.data.data.data;
      setAllUsers(allUsers);
      setFilteredUsers(allUsers);
    }
  };

  const fetchProperties = async () => {
    const res = await callApi({
      url: "/properties/",
      params: { page: 1, pageSize: 100, ordering: "-id" },
    });
    if (res) {
      const allProperties = res.data.data.data;
      setProperties(allProperties);
    }
  };

  const fetchUsersByProperty = async (propertyId: string) => {
    if (!propertyId) {
      setFilteredUsers(allUsers);
      return;
    }

    const res = await callApi({
      url: `/properties/${propertyId}/staff/`,
      method: "GET",
    });

    if (res) {
      setFilteredUsers(res.data);
    }
  };

  const fetchApartmentsByProperty = async (propertyId: string) => {
    if (!propertyId) {
      setFilteredApartments([]);
      return;
    }

    const res = await callApi({
      url: `/properties/${propertyId}/apartments/`,
      params: {
        page: 1,
        pageSize: 100,
      },
    });
    if (res) {
      setFilteredApartments(res.data.data.data);

      // If apartmentId is provided in URL, pre-select it
      if (
        apartmentId &&
        res.data.data.data.some(
          (apt: Apartment) => apt.id.toString() === apartmentId
        )
      ) {
        setFormData((prev) => ({
          ...prev,
          apartments_assigned: [apartmentId],
        }));
      }
    }
  };

  const handleChangeField = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const { name, value } = e.target;
    if (!name) return;

    // Clear error when field is changed
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    const processedValue = typeof value === "number" ? value.toString() : value;

    setFormData((prev: TaskFormData) => ({
      ...prev,
      [name]: processedValue,
    }));

    if (name === "property_assigned") {
      const selectedProp = properties.find(
        (prop) => prop.id.toString() === value
      );
      setSelectedProperty(selectedProp || null);

      setFormData((prev) => ({
        ...prev,
        assigned_to: [],
        apartments_assigned: [],
      }));
      setErrors((prev) => ({
        ...prev,
        assigned_to: "",
        apartments_assigned: "",
      }));
      fetchUsersByProperty(processedValue as string);
      fetchApartmentsByProperty(processedValue as string);
    }
    if (errors.template_id) {
      setErrors((prev) => ({ ...prev, template_id: "" }));
    }
  };

  const handleTemplateChangeField = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const { name, value } = e.target;
    if (!name) return;

    // Clear error when field is changed
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    // When handling template selection
    const selectedTemplate = templates.find((t) => t.id.toString() === value);

    if (selectedTemplate) {
      const templateProperty = properties.find(
        (prop) =>
          prop.id.toString() === selectedTemplate.default_property?.toString()
      );

      setSelectedProperty(templateProperty || null);

      setFormData((prev) => ({
        ...prev,
        title: selectedTemplate.title,
        description: selectedTemplate.description,
        duration: selectedTemplate.duration?.toString() || "",
        priority: selectedTemplate.priority,
        property_assigned: selectedTemplate.default_property?.toString() || "",
        apartments_assigned:
          selectedTemplate.default_apartments?.map((id: any) =>
            id.toString()
          ) || [],
        template_id: value as string,
        assigned_to:
          selectedTemplate.default_assignees?.map((u: any) =>
            u.id.toString()
          ) || [],
      }));
      setErrors({
        title: "",
        description: "",
        duration: "",
        priority: "",
        property_assigned: "",
        apartments_assigned: "",
        assigned_to: "",
        template_id: "",
      });

      // Fetch apartments for the property from the template
      if (selectedTemplate.default_property) {
        fetchApartmentsByProperty(selectedTemplate.default_property);
      }
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setLoading(true);

    const payload = {
      ...formData,
      duration: formData.duration ? parseFloat(formData.duration) : null,
      template_id: formData.template_id || null,
      apartments_assigned: formData.apartments_assigned.map((id) =>
        parseInt(id)
      ),
    };

    try {
      const res = await callApi({
        url: "/tasks/",
        method: "POST",
        body: payload,
      });

      if (res) {
        toast.success("Task created successfully!");
        navigate("/tasks-list"); // Redirect to tasks list after creation
      }
    } catch (error) {
      toast.error("Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1); // Redirect back to tasks list
  };

  if (propertyLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="50vh"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ display: "flex" }}>
      <Appbar appBarTitle="Create New Task" />
      <Box
        component="main"
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === "light"
              ? theme.palette.grey[100]
              : theme.palette.grey[900],
          flexGrow: 1,
        }}
      >
        <Toolbar />
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 4 }}
            >
              <Typography variant="h4" component="h1" fontWeight="bold">
                Create New Task
              </Typography>
              <Button
                variant="outlined"
                onClick={handleCancel}
                sx={{ borderRadius: 1, textTransform: "none" }}
              >
                Back to Tasks
              </Button>
            </Stack>

            {propertyId && selectedProperty && (
              <Alert severity="info" sx={{ mb: 3 }}>
                Creating task for property:{" "}
                <strong>{selectedProperty.name}</strong>
                {apartmentId && " (Apartment pre-selected from URL)"}
              </Alert>
            )}

            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 4 }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label="Create from Template" />
                {(getUser()?.role === "admin" ||
                  getUser()?.role === "manager") && (
                  <Tab label="Create Custom Task" />
                )}
              </Tabs>
            </Box>

            <Box component="form" noValidate>
              <Grid container spacing={3}>
                {tabValue === 0 && (
                  <Grid item xs={12}>
                    <TextField
                      select
                      fullWidth
                      label="Select Template"
                      name="template_id"
                      value={formData.template_id}
                      onChange={handleTemplateChangeField}
                      helperText="Choose a template to pre-fill task details"
                      error={!!errors.template_id}
                    >
                      {templates.map((template) => (
                        <MenuItem
                          key={template.id}
                          value={template.id.toString()}
                        >
                          {template.title} ({template.priority})
                        </MenuItem>
                      ))}
                    </TextField>
                    {errors.template_id && (
                      <FormHelperText error>
                        {errors.template_id}
                      </FormHelperText>
                    )}
                  </Grid>
                )}

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChangeField}
                    error={!!errors.title}
                    helperText={
                      errors.title || "Enter a descriptive title for the task"
                    }
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Due Date"
                    name="due_date"
                    type="datetime-local"
                    InputLabelProps={{ shrink: true }}
                    value={formData.due_date}
                    onChange={handleChangeField}
                    error={!!errors.due_date}
                    helperText={
                      errors.due_date ||
                      "Select when this task should be completed"
                    }
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description"
                    name="description"
                    value={formData.description}
                    onChange={handleChangeField}
                    error={!!errors.description}
                    helperText={
                      errors.description ||
                      "Provide detailed instructions for this task"
                    }
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Estimated duration in minutes"
                    name="duration"
                    type="number"
                    required
                    disabled={getUser()?.role === "receptionist"}
                    inputProps={{ step: "0.1", min: "0.1" }}
                    value={formData.duration}
                    onChange={handleChangeField}
                    error={!!errors.duration}
                    helperText={
                      errors.duration ||
                      "Estimated time needed to complete the task (minutes)"
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Property Assigned"
                    name="property_assigned"
                    value={formData.property_assigned}
                    onChange={handleChangeField}
                    error={!!errors.property_assigned}
                    helperText={
                      errors.property_assigned ||
                      "Select the property where this task should be performed"
                    }
                    required
                    disabled={!!propertyId} // Disable if property is provided in URL
                  >
                    {/* Show only the property from URL parameters, or all properties if no parameter */}
                    {(propertyId && selectedProperty
                      ? [selectedProperty]
                      : properties
                    ).map((property) => (
                      <MenuItem
                        key={property.id}
                        value={property.id.toString()}
                      >
                        {property.name} - {property.address}
                      </MenuItem>
                    ))}
                  </TextField>
                  {propertyId && (
                    <FormHelperText>
                      Property is pre-selected from URL parameters
                    </FormHelperText>
                  )}
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Status"
                    name="status"
                    value={formData.status}
                    onChange={handleChangeField}
                    error={!!errors.status}
                    helperText={errors.status || "Current status of the task"}
                    required
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChangeField}
                    error={!!errors.priority}
                    helperText={errors.priority || "Urgency level of the task"}
                    required
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    disableCloseOnSelect
                    options={filteredApartments}
                    getOptionLabel={(option) =>
                      `${option.number} - ${option.name || "No Name"}`
                    }
                    value={filteredApartments.filter((apartment) =>
                      formData.apartments_assigned.includes(
                        apartment.id.toString()
                      )
                    )}
                    onChange={(_, newValue) => {
                      if (errors.apartments_assigned) {
                        setErrors((prev) => ({
                          ...prev,
                          apartments_assigned: "",
                        }));
                      }
                      setFormData({
                        ...formData,
                        apartments_assigned: newValue.map((u) =>
                          u.id.toString()
                        ),
                      });
                    }}
                    disabled={!formData.property_assigned}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option.id}
                          label={`${option.number} - ${
                            option.name || "No Name"
                          }`}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Apartments Assigned"
                        placeholder={
                          formData.property_assigned
                            ? "Select apartments"
                            : "Select a property first"
                        }
                        helperText={
                          apartmentId
                            ? "Apartment pre-selected from URL parameters"
                            : "Select specific apartments if applicable"
                        }
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    disableCloseOnSelect
                    options={filteredUsers}
                    getOptionLabel={(option) =>
                      `${option.first_name} ${option.last_name} (${option.department})`
                    }
                    value={filteredUsers.filter((u) =>
                      formData.assigned_to.includes(u.id.toString())
                    )}
                    onChange={(_, newValue) => {
                      if (errors.assigned_to) {
                        setErrors((prev) => ({ ...prev, assigned_to: "" }));
                      }
                      setFormData({
                        ...formData,
                        assigned_to: newValue.map((u) => u.id.toString()),
                      });
                    }}
                    disabled={!formData.property_assigned}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option.id}
                          label={`${option.first_name} ${option.last_name} (${option.department})`}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select staff"
                        placeholder="Select staff"
                        error={!!errors.assigned_to}
                        helperText={
                          errors.assigned_to ||
                          "Assign staff members responsible for this task"
                        }
                        required
                      />
                    )}
                  />
                  {errors.assigned_to && (
                    <FormHelperText error>{errors.assigned_to}</FormHelperText>
                  )}
                </Grid>
              </Grid>

              <Box
                sx={{
                  mt: 4,
                  display: "flex",
                  gap: 2,
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? "Creating..." : "Create Task"}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default CreateTaskPage;
