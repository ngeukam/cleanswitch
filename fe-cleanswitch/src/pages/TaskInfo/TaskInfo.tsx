import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import {
  TextField,
  Button,
  Grid,
  Box,
  Paper,
  IconButton,
  Toolbar,
  Container,
  Typography,
  CircularProgress,
  MenuItem,
  Chip,
  Autocomplete,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate, useParams } from "react-router-dom";
import Appbar from "../../components/Appbar";
import useApi from "../../hooks/APIHandler";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getUser } from "../../utils/Helper";

const TaskInfoSchema = Yup.object().shape({
  title: Yup.string().required("Required"),
  description: Yup.string().required("Required"),
  due_date: Yup.string().required("Required"),
  assigned_to: Yup.array().min(1, "At least one assignee is required"),
  property_assigned: Yup.string().required("Required"),
  apartments_assigned: Yup.array().min(0),
  status: Yup.string().required("Required"),
  priority: Yup.string().required("Required"),
  duration: Yup.string().required("Required"),
});

interface TaskData {
  title: string;
  description: string;
  due_date: string;
  assigned_to: string[];
  apartments_assigned: string[];
  property_assigned: string;
  status: string;
  priority: string;
  duration: number;
}

const TaskInfo = () => {
  const { id } = useParams<{ id: string }>();
  const { callApi, loading } = useApi();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskData | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [filteredApartments, setFilteredApartments] = useState<any[]>([]);

  const initialValues: TaskData = {
    title: "",
    description: "",
    due_date: "",
    assigned_to: [],
    apartments_assigned: [],
    property_assigned: "",
    status: "pending",
    priority: "medium",
    duration: 0,
  };

  useEffect(() => {
    if (id) getTaskInfo();
    getUsers();
    getProperties();
  }, [id]);

  // Add this useEffect to handle property changes
  useEffect(() => {
    if (task?.property_assigned) {
      fetchUsersByProperty(task.property_assigned);
      fetchApartmentsByProperty(task.property_assigned);
    }
  }, [task?.property_assigned]);

  const getTaskInfo = async () => {
    const response = await callApi({
      url: `/tasks/${id}/`,
    });
    if (response?.status === 200) {
      const taskData = response.data;
      console.log('taskData', taskData);
      const formattedTask = {
        ...taskData,
        assigned_to: taskData.assigned_to?.map((id: any) => id?.toString()) || [],
        apartments_assigned: taskData.apartments_assigned?.map((a: any) => a.toString()) || [],
      };
      
      setTask(formattedTask);
    }
  };

  const getUsers = async () => {
    const response = await callApi({
      url: "/users/",
      params: { page: 1, pageSize: 100, ordering: "-id" },
    });
    if (response?.status === 200) {
      setAllUsers(response.data.data.data);
      // Don't set filteredUsers here - wait for property selection
    }
  };

  const getProperties = async () => {
    const response = await callApi({
      url: "/properties/",
      params: { page: 1, pageSize: 100, ordering: "-id" },
    });
    if (response?.status === 200) {
      setProperties(response.data.data.data);
    }
  };

  const fetchUsersByProperty = async (propertyId: string) => {
    if (!propertyId) {
      setFilteredUsers([]);
      return;
    }

    try {
      const res = await callApi({
        url: `/properties/${propertyId}/staff/`,
        method: "GET",
      });

      if (res) {
        setFilteredUsers(res.data);
      }
    } catch (error) {
      console.error("Error fetching users by property:", error);
      setFilteredUsers([]);
    }
  };

  const fetchApartmentsByProperty = async (propertyId: string) => {
    if (!propertyId) {
      setFilteredApartments([]);
      return;
    }
    
    try {
      const response = await callApi({
        url: `/properties/${propertyId}/apartments/`,
        params: {
          page: 1,
          pageSize: 100,
        },
      });
      
      if (response) {
        const apartments = response.data.data.data || [];
        setFilteredApartments(apartments);
      }
    } catch (error) {
      console.error("Error fetching apartments by property:", error);
      setFilteredApartments([]);
    }
  };

  const handlePropertyChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setFieldValue: any
  ) => {
    const propertyId = e.target.value;
    
    // Clear previous selections
    setFieldValue("property_assigned", propertyId);
    setFieldValue("assigned_to", []);
    setFieldValue("apartments_assigned", []);
    
    // Fetch users and apartments for the selected property
    await fetchUsersByProperty(propertyId);
    await fetchApartmentsByProperty(propertyId);
  };

  const handleSubmit = async (values: TaskData) => {
    try {
      const response = await callApi({
        url: `/tasks/${id}/`,
        method: "PATCH",
        body: {
          ...values,
          assigned_to: values.assigned_to.map((id) => parseInt(id)),
          apartments_assigned: values.apartments_assigned.map((id) =>
            parseInt(id)
          ),
        },
      });
      if (response?.status === 200) {
        toast.success("Task updated successfully!");
        navigate(-1);
        getTaskInfo();
      }
    } catch (error) {
      toast.error("Failed to update task.");
    }
  };

  if (id && !task) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex" }}>
      <Appbar appBarTitle="Edit Task" />
      <Box
        component="main"
        sx={{
          backgroundColor: (theme) => theme.palette.grey[100],
          flexGrow: 1,
        }}
      >
        <Toolbar />
        <Container sx={{ mt: 4, mb: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <IconButton onClick={() => navigate(-1)} color="inherit">
                  <ArrowBackIcon />
                </IconButton>
              </Grid>
              <Grid item>
                <Typography variant="h6">Edit Task</Typography>
              </Grid>
            </Grid>

            <Formik
              enableReinitialize
              initialValues={task || initialValues}
              validationSchema={TaskInfoSchema}
              onSubmit={handleSubmit}
            >
              {({ errors, touched, values, setFieldValue, isSubmitting }) => {
                return (
                  <Form>
                    <Grid container spacing={2} sx={{ mt: 2 }}>
                      <Grid item xs={12} sm={6}>
                        <Field
                          as={TextField}
                          name="title"
                          label="Title"
                          fullWidth
                          error={touched.title && !!errors.title}
                          helperText={touched.title && errors.title}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Field
                          as={TextField}
                          name="due_date"
                          type="datetime-local"
                          fullWidth
                          label="Due Date"
                          InputLabelProps={{ shrink: true }}
                          error={touched.due_date && !!errors.due_date}
                          helperText={touched.due_date && errors.due_date}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Field
                          as={TextField}
                          name="description"
                          label="Description"
                          fullWidth
                          multiline
                          rows={6}
                          error={touched.description && !!errors.description}
                          helperText={touched.description && errors.description}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Field
                          as={TextField}
                          name="property_assigned"
                          label="Property"
                          select
                          fullWidth
                          error={
                            touched.property_assigned &&
                            !!errors.property_assigned
                          }
                          helperText={
                            touched.property_assigned && errors.property_assigned
                          }
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handlePropertyChange(e, setFieldValue)
                          }
                        >
                          {properties.map((property) => (
                            <MenuItem key={property.id} value={property.id}>
                              {property.name} - {property.address}
                            </MenuItem>
                          ))}
                        </Field>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Field
                          as={TextField}
                          name="duration"
                          label="Duration in minutes"
                          type="number"
                          fullWidth
                          disabled={getUser()?.role === "receptionist"}
                          inputProps={{ step: "0.5", min: "0" }}
                          error={touched.duration && !!errors.duration}
                          helperText={touched.duration && errors.duration}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Field
                          as={TextField}
                          name="status"
                          label="Status"
                          select
                          fullWidth
                          error={touched.status && !!errors.status}
                          helperText={touched.status && errors.status}
                        >
                          <MenuItem value="pending">Pending</MenuItem>
                          <MenuItem value="in_progress">In Progress</MenuItem>
                          <MenuItem value="completed">Completed</MenuItem>
                          <MenuItem value="cancelled">Cancelled</MenuItem>
                        </Field>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Field
                          as={TextField}
                          name="priority"
                          label="Priority"
                          select
                          fullWidth
                          error={touched.priority && !!errors.priority}
                          helperText={touched.priority && errors.priority}
                        >
                          <MenuItem value="low">Low</MenuItem>
                          <MenuItem value="medium">Medium</MenuItem>
                          <MenuItem value="high">High</MenuItem>
                        </Field>
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
                            values.apartments_assigned.includes(apartment.id.toString())
                          )}
                          isOptionEqualToValue={(option, value) => 
                            option.id.toString() === value.id.toString()
                          }
                          onChange={(_, newValue) => {
                            setFieldValue(
                              "apartments_assigned",
                              newValue.map((apartment) => apartment.id.toString())
                            );
                          }}
                          disabled={!values.property_assigned}
                          renderTags={(tagValue, getTagProps) =>
                            tagValue.map((option, index) => (
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
                                values.property_assigned
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
                            values.assigned_to.includes(u.id.toString())
                          )}
                          isOptionEqualToValue={(option, value) => 
                            option.id.toString() === value.id.toString()
                          }
                          onChange={(_, newValue) => {
                            setFieldValue(
                              "assigned_to",
                              newValue.map((u) => u.id.toString())
                            );
                          }}
                          disabled={!values.property_assigned}
                          renderTags={(tagValue, getTagProps) =>
                            tagValue.map((option, index) => (
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
                              error={
                                touched.assigned_to && Boolean(errors.assigned_to)
                              }
                              helperText={
                                touched.assigned_to && errors.assigned_to
                                  ? String(errors.assigned_to)
                                  : "Assign staff members responsible for this task"
                              }
                            />
                          )}
                        />
                      </Grid>
                    </Grid>

                    <Grid
                      container
                      justifyContent="flex-end"
                      spacing={2}
                      sx={{ mt: 3 }}
                    >
                      <Grid item>
                        <Button
                          variant="outlined"
                          onClick={() => navigate(-1)}
                          color="inherit"
                        >
                          Cancel
                        </Button>
                      </Grid>
                      <Grid item>
                        <Button type="submit" variant="contained" disabled={loading || isSubmitting}>
                          {loading ? <CircularProgress size={24} /> : "Save"}
                        </Button>
                      </Grid>
                    </Grid>
                  </Form>
                );
              }}
            </Formik>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default TaskInfo;