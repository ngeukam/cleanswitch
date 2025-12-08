// AccountInfoForm.tsx
import React from "react";
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  InputAdornment,
  FormHelperText,
  Stack,
  Button,
} from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LockIcon from "@mui/icons-material/Lock";
import SecurityIcon from "@mui/icons-material/Security";
import { Controller } from "react-hook-form";
import { Property } from "../../PropertyInfo/PropertyList";
import { FormValues } from "./types";
import { getUser } from "../../../utils/Helper";

interface AccountInfoFormProps {
  properties: Property[];
  control: any;
  register: any;
  errors: any;
  watch: any;
}

export default function AccountInfoForm({
  properties,
  control,
  register,
  errors,
  watch,
}: AccountInfoFormProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const currentUserRole = getUser()?.role;
  const selectedRole = watch("role");

  // Filter roles based on current user's role - return array directly
  const getRoleMenuItems = () => {
    if (currentUserRole === "manager") {
      return [
        <MenuItem key="receptionist" value="receptionist">Receptionist</MenuItem>,
        <MenuItem key="cleaning" value="cleaning">Cleaning Staff</MenuItem>,
        <MenuItem key="technical" value="technical">Technical Staff</MenuItem>,
        // <MenuItem key="guest" value="guest">Guest</MenuItem>
      ];
    } else {
      return [
        <MenuItem key="admin" value="admin">Admin</MenuItem>,
        <MenuItem key="manager" value="manager">Manager</MenuItem>,
        <MenuItem key="receptionist" value="receptionist">Receptionist</MenuItem>,
        <MenuItem key="cleaning" value="cleaning">Cleaning Staff</MenuItem>,
        <MenuItem key="technical" value="technical">Technical Staff</MenuItem>,
        // <MenuItem key="guest" value="guest">Guest</MenuItem>
      ];
    }
  };

  // Filter departments based on selected role - return array directly
  const getDepartmentMenuItems = () => {
    if (!selectedRole) {
      return [
        <MenuItem key="HK" value="HK">HK</MenuItem>,
        <MenuItem key="FO" value="FO">FO</MenuItem>,
        <MenuItem key="TECHNICAL" value="TECHNICAL">TECHNICAL</MenuItem>,
        <MenuItem key="SALE" value="SALE">SALE</MenuItem>,
        <MenuItem key="FINANCE" value="FINANCE">FINANCE</MenuItem>,
        <MenuItem key="DG" value="DG">DG</MenuItem>,
        <MenuItem key="HR" value="HR">HR</MenuItem>
      ];
    }

    switch (selectedRole) {
      case "admin":
      case "manager":
        return [
          <MenuItem key="HK" value="HK">HK</MenuItem>,
          <MenuItem key="FO" value="FO">FO</MenuItem>,
          <MenuItem key="TECHNICAL" value="TECHNICAL">TECHNICAL</MenuItem>,
          <MenuItem key="SALE" value="SALE">SALE</MenuItem>,
          <MenuItem key="FINANCE" value="FINANCE">FINANCE</MenuItem>,
          <MenuItem key="DG" value="DG">DG</MenuItem>,
          <MenuItem key="HR" value="HR">HR</MenuItem>
        ];
      case "receptionist":
        return [
          <MenuItem key="FO" value="FO">FO</MenuItem>,
          <MenuItem key="SALE" value="SALE">SALE</MenuItem>
        ];
      case "cleaning":
        return [
          <MenuItem key="HK" value="HK">HK</MenuItem>
        ];
      case "technical":
        return [
          <MenuItem key="TECHNICAL" value="TECHNICAL">TECHNICAL</MenuItem>
        ];
      case "guest":
        return [
          <MenuItem key="GUEST" value="GUEST">GUEST</MenuItem>
        ];
      default:
        return [
          <MenuItem key="HK" value="HK">HK</MenuItem>,
          <MenuItem key="FO" value="FO">FO</MenuItem>,
          <MenuItem key="TECHNICAL" value="TECHNICAL">TECHNICAL</MenuItem>,
          <MenuItem key="SALE" value="SALE">SALE</MenuItem>,
          <MenuItem key="FINANCE" value="FINANCE">FINANCE</MenuItem>,
          <MenuItem key="DG" value="DG">DG</MenuItem>,
          <MenuItem key="HR" value="HR">HR</MenuItem>
        ];
    }
  };

  return (
    <>
      <TextField
        label="Username"
        fullWidth
        margin="normal"
        variant="outlined"
        size="medium"
        {...register("username", {
          required: "Username is required",
        })}
        error={!!errors.username}
        helperText={errors.username?.message}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <AccountCircleIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
      />
      <TextField
        label="Password"
        fullWidth
        margin="normal"
        variant="outlined"
        size="medium"
        type={showPassword ? "text" : "password"}
        {...register("password", {
          required: "Password is required",
        })}
        error={!!errors.password}
        helperText={errors.password?.message}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LockIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <Button onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "Hide" : "Show"}
            </Button>
          ),
        }}
      />
      <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
        <InputLabel id="role-label">Role</InputLabel>
        <Select
          labelId="role-label"
          label="Role"
          variant="outlined"
          size="medium"
          {...register("role", { required: "Role is required" })}
          error={!!errors.role}
          startAdornment={
            <InputAdornment position="start">
              <SecurityIcon fontSize="small" color="action" />
            </InputAdornment>
          }
        >
          {getRoleMenuItems()}
        </Select>
        {errors.role && (
          <FormHelperText error>{errors.role.message}</FormHelperText>
        )}
      </FormControl>
      <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
        <InputLabel id="department-label">Department</InputLabel>
        <Select
          labelId="department-label"
          label="Department"
          variant="outlined"
          size="medium"
          {...register("department", {
            required: "Department is required",
          })}
          error={!!errors.department}
        >
          {getDepartmentMenuItems()}
        </Select>
        {errors.department && (
          <FormHelperText error>{errors.department.message}</FormHelperText>
        )}
      </FormControl>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <FormControl fullWidth margin="normal">
          <InputLabel id="payType-label">Pay Type</InputLabel>
          <Select
            labelId="payType-label"
            label="Pay Type"
            variant="outlined"
            size="medium"
            {...register("payType", {
              // required: "Pay Type is required",
            })}
            error={!!errors.payType}
          >
            <MenuItem value="hourly">Hourly</MenuItem>
            <MenuItem value="salaried">Salaried</MenuItem>
          </Select>
          {errors.payType && (
            <FormHelperText error>{errors.payType.message}</FormHelperText>
          )}
        </FormControl>

        <TextField
          label="Amount"
          type="number"
          fullWidth
          margin="normal"
          variant="outlined"
          defaultValue={0}
          size="medium"
          {...register("payRate", {
            // required: "Amount is required",
          })}
          error={!!errors.payRate}
          helperText={errors.payRate?.message}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {watch("currency") ? watch("currency") : "€"}
              </InputAdornment>
            ),
          }}
        />
      </Stack>
      <FormControl
        fullWidth
        margin="normal"
        error={!!errors.properties}
        sx={{ mb: 2 }}
      >
        <InputLabel id="property-label">Properties</InputLabel>
        <Controller<FormValues>
          control={control}
          name="properties"
          rules={{ required: "At least one property is required" }}
          render={({ field }) => (
            <Select
              {...field}
              multiple
              label="Properties"
              labelId="property-label"
              variant="outlined"
              size="medium"
              renderValue={(selected) =>
                Array.isArray(selected)
                  ? properties
                      .filter((p) => selected.includes(p.id.toString()))
                      .map((p) => p.name + " - " + p.address)
                      .join(", ")
                  : ""
              }
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300,
                  },
                },
              }}
            >
              {properties.map((prop) => (
                <MenuItem key={prop.id} value={prop.id.toString()}>
                  <Checkbox
                    checked={
                      Array.isArray(field.value) &&
                      field.value.includes(prop.id.toString())
                    }
                    color="primary"
                  />
                  <ListItemText primary={prop.name + " - " + prop.address} />
                </MenuItem>
              ))}
            </Select>
          )}
        />
        {errors.properties && (
          <FormHelperText error>{errors.properties.message}</FormHelperText>
        )}
      </FormControl>
    </>
  );
}