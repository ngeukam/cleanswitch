import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  TextField,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Autocomplete,
  Toolbar,
  Container,
  IconButton,
  Stack,
} from "@mui/material";
import {
  People,
  CalendarToday,
  Schedule,
  Add,
  Delete,
  Visibility,
} from "@mui/icons-material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { motion } from "framer-motion";
import useApi from "../../hooks/APIHandler";
import { format } from "date-fns";
import { toast } from "react-toastify";
import Appbar from "../../components/Appbar";
import Slider from "@mui/material/Slider";
import DownloadIcon from "@mui/icons-material/Download";
import { useNavigate } from "react-router-dom";

interface User {
  id: number;
  username: string;
  fullName: string;
  department: string;
}

interface StaffMember {
  id: number;
  username: string;
  fullName: string;
  department: string;
}

interface BalanceSuggestion {
  adjust_weeks: string;
  adjust_staff: string;
  adjust_ranges?: string;
  required_slots_per_staff?: number;
}

interface GeneratedSchedule {
  weekNumber: number;
  days: {
    day: string;
    date: string;
    staffAssignments: {
      staff: StaffMember;
      hours: number;
      startTime?: string;
      endTime?: string;
    }[];
  }[];
}

interface ApiScheduleItem {
  id: number;
  staff: {
    id: number;
    username: string;
    fullName: string;
    department: string;
  };
  day: string;
  hours: number;
  week_number: number;
  date: string;
  start_time: string;
  end_time: string;
}

interface TimeRange {
  id: number;
  start: string;
  end: string;
  staffPerRange: number;
}

interface PreviewScheduleItem {
  staff: StaffMember;
  day: string;
  hours: number;
  week_number: number;
  date: string;
  start_time: string;
  end_time: string;
}

interface PreviewResponse {
  preview: PreviewScheduleItem[];
  total_assignments: number;
  hours_distribution: any;
  range_distribution: any;
}

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const PlanningGenerator: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const navigate = useNavigate();
  const steps = ["Staff Selection", "Schedule Parameters", "Preview & Save"];
  const { callApi, loading } = useApi();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [weeksToGenerate, setWeeksToGenerate] = useState(1);
  const [selectedDays, setSelectedDays] = useState<string[]>([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  ]);
  const [dailyHours, setDailyHours] = useState(8);
  const [staffPerDay, setStaffPerDay] = useState(2);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [generatedSchedule, setGeneratedSchedule] = useState<
    GeneratedSchedule[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [balanceError, setBalanceError] = useState<{
    message: string;
    suggestion: BalanceSuggestion;
  } | null>(null);
  const [workingHourRanges, setWorkingHourRanges] = useState<TimeRange[]>([
    { id: 1, start: "09:00", end: "17:00", staffPerRange: 2 },
  ]);

  const [previewData, setPreviewData] = useState<PreviewScheduleItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await callApi({ url: "/users/staff/" });
        if (response?.status === 200) {
          setAllUsers(response.data.users || []);
        }
      } catch (err) {
        setError("Failed to load users");
        console.error("Error fetching users:", err);
      }
    };

    fetchUsers();
  }, []);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addTimeRange = () => {
    const newId =
      workingHourRanges.length > 0
        ? Math.max(...workingHourRanges.map((range) => range.id)) + 1
        : 1;

    setWorkingHourRanges([
      ...workingHourRanges,
      { id: newId, start: "09:00", end: "17:00", staffPerRange: 1 },
    ]);
  };

  const removeTimeRange = (id: number) => {
    if (workingHourRanges.length > 1) {
      setWorkingHourRanges(
        workingHourRanges.filter((range) => range.id !== id)
      );
    }
  };

  const updateTimeRange = (
    id: number,
    field: string,
    value: string | number
  ) => {
    setWorkingHourRanges(
      workingHourRanges.map((range) =>
        range.id === id ? { ...range, [field]: value } : range
      )
    );
  };

  const downloadSchedule = () => {
    let csvContent = "Week,Day,Date,Time Range,Staff,Hours\n";

    // Utiliser les données de prévisualisation pour le téléchargement CSV
    previewData.forEach((item) => {
      const timeRange = item.start_time && item.end_time
        ? `${item.start_time}-${item.end_time}`
        : "N/A";
      csvContent += `${item.week_number},${item.day},${new Date(item.date).toLocaleDateString()},${timeRange},${item.staff.fullName},${item.hours}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `schedule_preview_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const previewSchedule = async () => {
    try {
      setPreviewLoading(true);
      setError(null);
      setBalanceError(null);
      setPreviewData([]);

      if (staffList.length === 0) {
        toast.error("Please select at least one staff member");
        return;
      }
      if (selectedDays.length === 0) {
        toast.error("Please select at least one working day");
        return;
      }

      const totalStaffPerDay = workingHourRanges.reduce(
        (total, range) => total + range.staffPerRange,
        0
      );

      if (totalStaffPerDay > staffList.length) {
        toast.error("Total staff per day cannot exceed total staff members");
        return;
      }

      const staffUsernames = staffList.map((staff) => staff.username);
      const formattedDate = startDate ? format(startDate, "yyyy-MM-dd") : null;

      const apiWorkingHourRanges = workingHourRanges.map((range) => [
        range.start,
        range.end,
      ]);

      const response = await callApi({
        url: "/users/preview-schedule/",
        method: "POST",
        body: {
          staff_usernames: staffUsernames,
          weeks: weeksToGenerate,
          working_days: selectedDays,
          daily_hours: dailyHours,
          staff_per_day: totalStaffPerDay,
          start_date: formattedDate,
          working_hour_ranges: apiWorkingHourRanges,
        },
      });

      if (response?.status === 200 && response.data?.error) {
        setBalanceError({
          message: response.data.message,
          suggestion: response.data.suggestion,
        });
        return;
      }

      if (response?.status === 200) {
        setPreviewData(response.data.preview.reverse());
        setShowPreview(true);
        setActiveStep(2);
        return;
      }

      throw new Error("Unexpected response from server");
    } catch (err:any) {
      setError(err?.message || "Failed to generate preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const saveSchedule = async () => {
    try {
      const staffUsernames = staffList.map((staff) => staff.username);
      const formattedDate = startDate ? format(startDate, "yyyy-MM-dd") : null;
      const apiWorkingHourRanges = workingHourRanges.map((range) => [
        range.start,
        range.end,
      ]);

      const response = await callApi({
        url: "/users/generate-schedule/",
        method: "POST",
        body: {
          staff_usernames: staffUsernames,
          weeks: weeksToGenerate,
          working_days: selectedDays,
          daily_hours: dailyHours,
          staff_per_day: workingHourRanges.reduce(
            (total, range) => total + range.staffPerRange,
            0
          ),
          start_date: formattedDate,
          working_hour_ranges: apiWorkingHourRanges,
        },
      });

      if (response?.status === 201) {
        const apiSchedules = response.data.schedule as ApiScheduleItem[];
        const transformedSchedule = transformApiResponse(apiSchedules);
        setGeneratedSchedule(transformedSchedule);
        setShowPreview(false);
        toast.success("Schedule saved successfully!");
      }
    } catch (err:any) {
      setError(err.message || "Failed to save schedule");
    }
  };

  const transformApiResponse = (
    apiSchedules: ApiScheduleItem[]
  ): GeneratedSchedule[] => {
    const transformedSchedule: GeneratedSchedule[] = [];
    const weeks = Array.from(
      new Set(apiSchedules.map((s) => s.week_number))
    ).sort();

    weeks.forEach((weekNumber) => {
      const weekSchedules = apiSchedules.filter(
        (s) => s.week_number === weekNumber
      );
      const days = Array.from(new Set(weekSchedules.map((s) => s.day)));

      const weekData: GeneratedSchedule = {
        weekNumber,
        days: days.map((day) => {
          const daySchedules = weekSchedules.filter((s) => s.day === day);
          return {
            day,
            date: new Date(daySchedules[0].date).toLocaleDateString(),
            staffAssignments: daySchedules.map((s) => ({
              staff: {
                id: s.staff.id,
                username: s.staff.username,
                fullName: s.staff.fullName,
                department: s.staff.department,
              },
              hours: s.hours,
              startTime: s.start_time,
              endTime: s.end_time,
            })),
          };
        }),
      };
      transformedSchedule.push(weekData);
    });

    return transformedSchedule;
  };

  const renderBalanceError = () => {
    if (!balanceError) return null;

    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3, backgroundColor: "#fff8e1" }}>
        <Typography variant="h6" color="error" gutterBottom>
          ⚠️ Schedule Balance Issue
        </Typography>

        <Typography variant="body1" sx={{ mb: 2 }}>
          {balanceError.message}
        </Typography>

        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
          Suggestions to achieve balance:
        </Typography>

        <Box sx={{ ml: 2 }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            • {balanceError.suggestion.adjust_weeks}
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            • {balanceError.suggestion.adjust_staff}
          </Typography>
          {balanceError.suggestion.adjust_ranges && (
            <Typography variant="body1" sx={{ mb: 1 }}>
              • {balanceError.suggestion.adjust_ranges}
            </Typography>
          )}
          {balanceError.suggestion.required_slots_per_staff && (
            <Typography variant="body1" sx={{ mb: 1 }}>
              • Each staff needs ~
              {balanceError.suggestion.required_slots_per_staff.toFixed(1)}{" "}
              slots
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              // Auto-apply the weeks suggestion
              const suggestedWeeks = balanceError.suggestion.adjust_weeks.match(
                /\d+/
              );
              if (suggestedWeeks) {
                setWeeksToGenerate(parseInt(suggestedWeeks[0]));
              }
              setBalanceError(null);
            }}
            sx={{ mr: 2 }}
          >
            Apply Suggestion
          </Button>
          <Button variant="outlined" onClick={() => setBalanceError(null)}>
            Continue Anyway
          </Button>
        </Box>
      </Paper>
    );
  };

  const handleNext = () => {
    if (activeStep === 1) {
      previewSchedule();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep === 2 && showPreview) {
      setShowPreview(false);
      setActiveStep(1);
    } else {
      setActiveStep((prev) => prev - 1);
    }
  };

  const ExitSchedule = async () => {
    navigate("/calender");
  };

  // Fonction pour regrouper les données de prévisualisation par semaine et jour
  const groupPreviewDataByWeekAndDay = () => {
    const grouped: {[key: string]: PreviewScheduleItem[]} = {};
    
    previewData.forEach(item => {
      const key = `${item.week_number}-${item.day}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });
    
    return grouped;
  };

  // Fonction pour obtenir les semaines uniques dans les données de prévisualisation
  const getUniqueWeeks = () => {
    const weeks = Array.from(new Set(previewData.map(item => item.week_number)));
    return weeks.sort((a, b) => a - b);
  };

  return (
    <Box sx={{ display: "flex" }}>
      <Appbar appBarTitle="Schedule Planning Generator" />
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
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Paper elevation={3} sx={{ p: 4, maxWidth: 1200, mx: "auto" }}>
              <Typography
                variant="h5"
                gutterBottom
                sx={{ mb: 4, fontWeight: "bold" }}
              >
                Schedule Planning Generator
              </Typography>
              {balanceError && renderBalanceError()}

              <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {loading && (
                <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                  <CircularProgress />
                </Box>
              )}

              {activeStep === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                        <CalendarMonthIcon
                          sx={{ verticalAlign: "middle", mr: 1 }}
                        />
                        Start Date
                      </Typography>
                      <DatePicker
                        value={startDate}
                        onChange={(newValue) =>
                          setStartDate(newValue as Date | null)
                        }
                        minDate={new Date()}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                        <People sx={{ verticalAlign: "middle", mr: 1 }} />
                        Select Staff Members
                      </Typography>
                      <Autocomplete
                        multiple
                        options={allUsers}
                        getOptionLabel={(option) =>
                          `${option.fullName} (${option.department})`
                        }
                        filterSelectedOptions
                        value={allUsers.filter((user) =>
                          staffList.some((staff) => staff.id === user.id)
                        )}
                        onChange={(_, newValue) => {
                          setStaffList(
                            newValue.map((user) => ({
                              id: user.id,
                              username: user.username,
                              fullName: user.fullName,
                              department: user.department,
                            }))
                          );
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Select Staff"
                            placeholder="Search staff members..."
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              {...getTagProps({ index })}
                              key={option.id}
                              label={`${option.fullName} (${option.department})`}
                            />
                          ))
                        }
                        disabled={loading}
                      />
                    </Grid>
                  </Grid>
                  {staffList.length > 0 ? (
                    <Box
                      sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}
                    >
                      {staffList.map((staff) => (
                        <Chip
                          key={staff.id}
                          label={`${staff.fullName} (${staff.department})`}
                          onDelete={() =>
                            setStaffList(
                              staffList.filter((s) => s.id !== staff.id)
                            )
                          }
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 3 }}
                    >
                      No staff members selected
                    </Typography>
                  )}
                </motion.div>
              )}

              {activeStep === 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                    <CalendarToday sx={{ verticalAlign: "middle", mr: 1 }} />
                    Schedule Parameters
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Weeks to Generate"
                        type="number"
                        value={weeksToGenerate}
                        onChange={(e) =>
                          setWeeksToGenerate(
                            Math.max(1, parseInt(e.target.value) || 1)
                          )
                        }
                        inputProps={{ min: 1 }}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="subtitle1" gutterBottom>
                        Working Days
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {daysOfWeek.map((day) => (
                          <Chip
                            key={day}
                            label={day}
                            clickable
                            color={
                              selectedDays.includes(day) ? "primary" : "default"
                            }
                            onClick={() => toggleDay(day)}
                          />
                        ))}
                      </Box>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography
                        variant="subtitle1"
                        gutterBottom
                        sx={{ mt: 2 }}
                      >
                        Working Hour Ranges
                      </Typography>
                      <Button
                        startIcon={<Add />}
                        onClick={addTimeRange}
                        variant="outlined"
                        sx={{ mb: 2 }}
                      >
                        Add Time Range
                      </Button>

                      <Stack spacing={2}>
                        {workingHourRanges.map((range) => (
                          <Paper
                            key={range.id}
                            variant="outlined"
                            sx={{ p: 2 }}
                          >
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={12} sm={4}>
                                <TextField
                                  label="Start Time"
                                  type="time"
                                  value={range.start}
                                  onChange={(e) =>
                                    updateTimeRange(
                                      range.id,
                                      "start",
                                      e.target.value
                                    )
                                  }
                                  fullWidth
                                  InputLabelProps={{ shrink: true }}
                                />
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <TextField
                                  label="End Time"
                                  type="time"
                                  value={range.end}
                                  onChange={(e) =>
                                    updateTimeRange(
                                      range.id,
                                      "end",
                                      e.target.value
                                    )
                                  }
                                  fullWidth
                                  InputLabelProps={{ shrink: true }}
                                />
                              </Grid>
                              <Grid item xs={12} sm={3}>
                                <TextField
                                  label="Staff Needed"
                                  type="number"
                                  value={range.staffPerRange}
                                  onChange={(e) =>
                                    updateTimeRange(
                                      range.id,
                                      "staffPerRange",
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  fullWidth
                                  inputProps={{ min: 1 }}
                                />
                              </Grid>
                              <Grid item xs={12} sm={1}>
                                <IconButton
                                  onClick={() => removeTimeRange(range.id)}
                                  disabled={workingHourRanges.length <= 1}
                                  color="error"
                                >
                                  <Delete />
                                </IconButton>
                              </Grid>
                            </Grid>
                          </Paper>
                        ))}
                      </Stack>
                    </Grid>

                    <Grid item xs={12}>
                      <Alert severity="info">
                        Total staff needed per day:{" "}
                        <strong>
                          {workingHourRanges.reduce(
                            (total, range) => total + range.staffPerRange,
                            0
                          )}
                        </strong>
                      </Alert>
                    </Grid>
                  </Grid>
                </motion.div>
              )}

              {activeStep === 2 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {showPreview ? (
                    <>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                          📋 Schedule Preview
                        </Typography>
                        <Box>
                          <Button
                            variant="outlined"
                            onClick={downloadSchedule}
                            startIcon={<DownloadIcon />}
                            sx={{ mr: 2 }}
                          >
                            Download CSV
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setShowPreview(false);
                              setActiveStep(1);
                            }}
                          >
                            Modify Parameters
                          </Button>
                        </Box>
                      </Box>
                      
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 3 }}
                      >
                        This is a preview of the schedule. Click "Save Schedule" to confirm.
                      </Typography>

                      {previewData.length > 0 && (
                        <Box sx={{ mb: 4 }}>
                          <Box sx={{ mb: 3 }}>
                            <Typography gutterBottom>Week Selection</Typography>
                            <Slider
                              value={currentWeek}
                              onChange={(_, value) => setCurrentWeek(value as number)}
                              min={1}
                              max={getUniqueWeeks().length}
                              step={1}
                              marks={getUniqueWeeks().map((week) => ({
                                value: week,
                                label: `Week ${week}`,
                              }))}
                              valueLabelDisplay="auto"
                              sx={{ maxWidth: 600 }}
                            />
                          </Box>

                          {/* Display only the selected week */}
                          <Box key={currentWeek}>
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: "bold", mb: 2 }}
                            >
                              Week {currentWeek}
                            </Typography>

                            <Box
                              sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                  xs: "1fr",
                                  sm: "repeat(2, 1fr)",
                                  md: "repeat(3, 1fr)",
                                },
                                gap: 2,
                              }}
                            >
                              {Object.entries(groupPreviewDataByWeekAndDay())
                                .filter(([key]) => key.startsWith(`${currentWeek}-`))
                                .map(([key, dayAssignments]) => {
                                  const day = key.split('-')[1];
                                  const firstAssignment = dayAssignments[0];
                                  
                                  return (
                                    <Paper
                                      key={key}
                                      elevation={2}
                                      sx={{ p: 2 }}
                                    >
                                      <Typography
                                        variant="subtitle2"
                                        sx={{ fontWeight: "bold" }}
                                      >
                                        {day} ({new Date(firstAssignment.date).toLocaleDateString()})
                                      </Typography>

                                      <Divider sx={{ my: 1 }} />

                                      <Box sx={{ mt: 1 }}>
                                        {dayAssignments.map(
                                          (assignment, idx) => (
                                            <Box
                                              key={idx}
                                              sx={{
                                                display: "flex",
                                                flexDirection: "column",
                                                mb: 2,
                                                p: 1,
                                                backgroundColor: "grey.50",
                                                borderRadius: 1,
                                              }}
                                            >
                                              <Box
                                                sx={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                }}
                                              >
                                                <Schedule color="action" sx={{ mr: 1 }} />
                                                <Typography
                                                  variant="body2"
                                                  fontWeight="bold"
                                                >
                                                  {assignment.staff.fullName}
                                                </Typography>
                                              </Box>
                                              {assignment.start_time &&
                                                assignment.end_time && (
                                                  <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                  >
                                                    {assignment.start_time} -{" "}
                                                    {assignment.end_time}
                                                  </Typography>
                                                )}
                                              <Typography
                                                variant="caption"
                                                display="block"
                                              >
                                                {assignment.hours} hours
                                              </Typography>
                                            </Box>
                                          )
                                        )}
                                      </Box>
                                    </Paper>
                                  );
                                })}
                            </Box>
                          </Box>
                        </Box>
                      )}

                      <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                        <Button
                          variant="contained"
                          onClick={saveSchedule}
                          disabled={loading}
                        >
                          {loading ? (
                            <CircularProgress size={20} />
                          ) : (
                            "Save Schedule"
                          )}
                        </Button>
                      </Box>
                    </>
                  ) : (
                    <Box sx={{ textAlign: "center", py: 4 }}>
                      <Typography variant="h6" gutterBottom>
                        No preview available
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Click "Preview Schedule" to generate a preview of your schedule
                      </Typography>
                      <Button
                        variant="contained"
                        onClick={previewSchedule}
                        disabled={previewLoading}
                        startIcon={<Visibility />}
                      >
                        {previewLoading ? (
                          <CircularProgress size={20} />
                        ) : (
                          "Preview Schedule"
                        )}
                      </Button>
                    </Box>
                  )}
                </motion.div>
              )}

              <Box
                sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}
              >
                <Button
                  onClick={handleBack}
                  disabled={activeStep === 0 || loading}
                  variant="outlined"
                >
                  Back
                </Button>

                {activeStep < steps.length - 1 ? (
                  <Button
                    onClick={handleNext}
                    variant="contained"
                    disabled={
                      (activeStep === 0 && staffList.length === 0) ||
                      (activeStep === 1 && selectedDays.length === 0) ||
                      loading
                    }
                  >
                    {activeStep === 1 ? "Preview Schedule" : "Next"}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={ExitSchedule}
                    disabled={loading}
                  >
                    Exit Schedule
                  </Button>
                )}
              </Box>
            </Paper>
          </LocalizationProvider>
        </Container>
      </Box>
    </Box>
  );
};

export default PlanningGenerator;