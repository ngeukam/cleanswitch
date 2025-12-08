import React, { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  Paper,
  Toolbar,
  Typography,
  Divider,
  Chip,
  Stack,
  Button,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useParams, useNavigate } from "react-router-dom";
import Appbar from "../../components/Appbar";
import useApi from "../../hooks/APIHandler";
import { Property } from "../PropertyInfo/PropertyList";
import { toast } from "react-toastify";
import { ArrowBack } from "@mui/icons-material";

// Define User data interface
interface PayRules {
  payType: string;
  payRate: number;
}

interface UserData {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  username: string;
  password?: string;
  role: string;
  department: string;
  currency: string;
  payrules: PayRules;
  properties_assigned: string[];
  is_active: boolean;
}

const UserDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { callApi, loading } = useApi();
  const navigate = useNavigate();

  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    if (!id) return;
    getUserInfo();
  }, [id]);

  const getUserInfo = async () => {
    try {
      const response = await callApi({ url: `/users/${id}/`, method: "GET" });
      if (response?.status === 200) {
        const assigned = response.data.properties_assigned || [];
        const payrules = response.data.payrules[0] || {};
        const assignedNames = assigned.map((prop: any) =>
          typeof prop === "object" ? prop.name.toString() : prop.toString()
        );

        setUser({
          ...response.data,
          properties_assigned: assignedNames,
          payrules: payrules,
        });
      }
    } catch (error) {
      toast.error("Error fetching user details");
    }
  };

  if (loading || !user) {
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
      <Appbar appBarTitle="User Details" />
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
        <Container sx={{ mt: 4, mb: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Grid container alignItems="center" spacing={1}>
              <Grid item>
                <IconButton onClick={() => navigate(-1)} color="inherit">
                  <ArrowBackIcon />
                </IconButton>
              </Grid>
              <Grid item>
                <Typography variant="h6">
                  {user.first_name} {user.last_name}
                  <Box
                    component="span"
                    ml={2}
                    color={user.is_active ? "success.main" : "error.main"}
                  >
                    ({user.is_active ? "Active" : "Inactive"})
                  </Box>
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Username
                </Typography>
                <Typography>{user.username}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography>{user.email || "—"}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Phone
                </Typography>
                <Typography>{user.phone}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Role
                </Typography>
                <Typography sx={{ textTransform: "capitalize" }}>
                  {user.role}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Department
                </Typography>
                <Typography>{user.department}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Currency
                </Typography>
                <Typography>{user.currency}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Pay Type
                </Typography>
                <Typography>{user.payrules?.payType || "—"}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Pay Rate
                </Typography>
                <Typography>{user.payrules?.payRate || "—"}</Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Properties Assigned
                </Typography>
                {user.properties_assigned?.length ? (
                  <Stack direction="row" flexWrap="wrap" spacing={1}>
                    {user.properties_assigned.map((propId) => (
                      <Chip key={propId} label={`Property #${propId}`} />
                    ))}
                  </Stack>
                ) : (
                  <Typography color="text.secondary">
                    No properties assigned
                  </Typography>
                )}
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Box textAlign="right"></Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                onClick={() => navigate(`/tasks-list?user=${user.id}&fullName=${encodeURIComponent(user.first_name + user.last_name)}`)}
              >
                View Tasks
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate(`/users/edit/${id}`)}
              >
                Edit User
              </Button>
            </Stack>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default UserDetails;
