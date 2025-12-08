// AddTaskDialog.tsx
import React, { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  MenuItem,
  Stack,
  Grid,
  Chip,
  Box,
  Tabs,
  Tab,
  Autocomplete,
  FormHelperText,
} from "@mui/material";
import useApi from "../../hooks/APIHandler";
import SearchInput from "../../components/SearchInput";
import AddIcon from "@mui/icons-material/Add";
import { toast } from "react-toastify";
import { getUser } from "../../utils/Helper";
import { Refresh } from "@mui/icons-material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useSearchParams } from "react-router-dom";

dayjs.extend(utc);
dayjs.extend(timezone);

interface AddTaskDialogProps {
  handleChange: () => void;
  searchQuery: string;
  searchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  userId?: number | string;
  propertyId?: string;
  handleRefresh?: () => void;
}
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

// Improved form state type
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

const AddTaskDialog: React.FC<AddTaskDialogProps> = ({
  handleChange,
  searchQuery,
  searchChange,
  userId,
  propertyId,
  handleRefresh,
}) => {
  const { callApi } = useApi();
  const [open, setOpen] = useState(false);
  const [searchParams] = useSearchParams();
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
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [filteredApartments, setFilteredApartments] = useState<any[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // Get URL parameters
  const urlUserId = searchParams.get('user');
  const urlApartmentId = searchParams.get('apartment');

  useEffect(() => {
    fetchUsers();
    fetchProperties();
    fetchTemplates();
  }, []);

  // Handle prefill when users and apartments are loaded
  useEffect(() => {
    if ((urlUserId || urlApartmentId) && allUsers.length > 0) {
      handlePrefillFromUrl();
    }
  }, [allUsers, filteredApartments, urlUserId, urlApartmentId]);

  const handlePrefillFromUrl = () => {
    const updates: Partial<TaskFormData> = {};

    // Prefill user if URL user ID exists and user is found
    if (urlUserId) {
      const userFromUrl = allUsers.find(user => user.id.toString() === urlUserId);
      if (userFromUrl) {
        updates.assigned_to = [urlUserId];
      }
    }

    // Prefill apartment if URL apartment ID exists and apartment is found
    if (urlApartmentId && filteredApartments.length > 0) {
      const apartmentFromUrl = filteredApartments.find(
        apartment => apartment.id.toString() === urlApartmentId
      );
      if (apartmentFromUrl) {
        updates.apartments_assigned = [urlApartmentId];
      }
    }

    // Only update if we have changes
    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({
        ...prev,
        ...updates
      }));
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
      if (userId) {
        const filteredUser = allUsers.filter((prop: any) => prop.id === userId);
        setAllUsers(filteredUser);
        setFilteredUsers(filteredUser);
      } else {
        setAllUsers(allUsers);
        setFilteredUsers(allUsers);
      }
    }
  };

  const fetchProperties = async () => {
    const res = await callApi({
      url: "/properties/",
      params: { page: 1, pageSize: 100, ordering: "-id" },
    });
    if (res) {
      const allProperties = res.data.data.data;
      if (propertyId) {
        const filteredProperty = allProperties.filter(
          (prop: any) => prop.id === parseInt(propertyId)
        );
        setProperties(filteredProperty);
        
        // If propertyId is provided, also fetch apartments for that property
        fetchApartmentsByProperty(propertyId);
      } else {
        setProperties(allProperties);
      }
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
    }
  };

  const handleClickOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setFormData({
      title: "",
      description: "",
      due_date: new Date().toISOString().slice(0, 16),
      duration: "",
      assigned_to: [],
      property_assigned: "",
      apartments_assigned: [],
      status: "pending",
      priority: "medium",
      template_id: "",
    } as TaskFormData);
    setErrors({});
    setTabValue(0);
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
      setFormData((prev) => ({
        ...prev,
        assigned_to: [],
        apartments_assigned: [], // Clear apartments array
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
          ) || [], // Handle array
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
      } else {
        setFormData((prev) => ({
          ...prev,
          template_id: "",
        }));
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

    const payload = {
      ...formData,
      duration: formData.duration ? parseFloat(formData.duration) : null,
      template_id: formData.template_id || null,
      apartments_assigned: formData.apartments_assigned.map((id) =>
        parseInt(id)
      ), // Send as array of numbers
    };

    const res = await callApi({
      url: "/tasks/",
      method: "POST",
      body: payload,
    });
    if (res) {
      handleClose();
      toast.success("Task added successfully!");
      handleChange();
    }
  };

  return (
    <div>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={2}
        sx={{ mb: 2 }}
      >
        <SearchInput value={searchQuery} handleChange={searchChange} />
        <Box>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => handleRefresh}
            sx={{ mr: 2, borderRadius: 1, textTransform: "none" }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleClickOpen}
            sx={{
              borderRadius: 1,
              textTransform: "none",
              px: 3,
              py: 1,
              fontWeight: 600,
            }}
          >
            Add Task
          </Button>
        </Box>
      </Stack>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle>Add New Task</DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Create from Template" />
              {(getUser()?.role === "admin" ||
                getUser()?.role === "manager") && (
                <Tab label="Create Custom Task" />
              )}
            </Tabs>
          </Box>

          <Box component="form" noValidate sx={{ mt: 2 }}>
            <Grid container spacing={2}>
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
                >
                  {properties.map((property) => (
                    <MenuItem key={property.id} value={property.id.toString()}>
                      {property.name} - {property.address}
                    </MenuItem>
                  ))}
                </TextField>
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
                      apartments_assigned: newValue.map((u) => u.id.toString()),
                    });
                  }}
                  disabled={!formData.property_assigned}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.id}
                        label={`${option.number} - ${option.name || "No Name"}`}
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
                      helperText="Select specific apartments if applicable"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={12}>
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="inherit" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AddTaskDialog;