import React, { useState, useEffect, useMemo } from "react";
import { withRouter } from "react-router-dom";
import {
  Paper,
  Box,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  Typography,
  Divider,
  Grid,
  Chip,
  makeStyles,
  InputAdornment,
} from "@material-ui/core";

import EventAvailableIcon from "@material-ui/icons/EventAvailable";
import ScheduleIcon from "@material-ui/icons/Schedule";
import ClassIcon from "@material-ui/icons/Class";
import DescriptionIcon from "@material-ui/icons/Description";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";

import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { checkLocalAcademicYear, SetAcademicYear } from "Includes/functions";
import { Dropdown } from "Components/DropDown";
import Swal from "sweetalert2";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(0), // Set to 0 to allow header to touch edges
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: "0px 15px 40px rgba(0, 0, 0, 0.08)",
    border: "1px solid #edf2f7",
    backgroundColor: "#fff",
  },
  headerBanner: {
    padding: theme.spacing(4),
  },
  contentPadding: {
    padding: theme.spacing(4),
  },
  formSection: {
    backgroundColor: "#f9fafb",
    padding: theme.spacing(3),
    borderRadius: 12,
    marginBottom: theme.spacing(4),
    border: "1px solid #f1f5f9",
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    fontWeight: 700,
    fontSize: "0.95rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: theme.spacing(2.5),
    color: "#475569",
    "& svg": {
      marginRight: theme.spacing(1.5),
      color: "#6366f1",
    },
  },
  chipContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.5),
    padding: "4px 0",
  },
  customChip: {
    borderRadius: 6,
    fontWeight: 500,
    backgroundColor: "#eef2ff",
    color: "#4338ca",
    border: "1px solid #c7d2fe",
  },
  submitBtn: {
    padding: theme.spacing(1.8, 6),
    borderRadius: 12,
    fontWeight: 800,
    textTransform: "none",
    fontSize: "1rem",
    boxShadow: "0 10px 15px -3px rgba(79, 70, 229, 0.3)",
    transition: "all 0.3s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 20px 25px -5px rgba(79, 70, 229, 0.4)",
    },
  },
  inputField: {
    "& .MuiOutlinedInput-root": {
      borderRadius: 10,
      backgroundColor: "#fff",
    },
  },
}));

const AddParentTeacherMeeting = () => {
  const classes = useStyles();
  const today = new Date().toISOString().split("T")[0];

  const logged = JSON.parse(localStorage.getItem("user") || "{}");
  const loggedInUserId = logged?.id || logged?.user?.id || null;

  const [loading, setLoading] = useState(false);
  const [yearList, setYearList] = useState([]);
  const [year, setYear] = useState("");

  const [standardList, setStandardList] = useState([]);
  const [standards, setStandards] = useState([]);
  const [sections, setSections] = useState([]);

  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");

  const aliasNames = JSON.parse(localStorage.getItem("alias_name") || "{}");
  const standardLabel = aliasNames.standard || "Standard";
  const sectionLabel = aliasNames.section || "Section";

  const sectionList = useMemo(() => {
    if (!standardList) return [];
    const seen = new Set();
    const list = [];
    standardList.forEach((std) => {
      (std.sections || []).forEach((sec) => {
        const id = sec.standard_section ?? sec.id;
        if (!seen.has(id)) {
          seen.add(id);
          list.push({
            id,
            name: sec.section_name || sec.name,
            standard_name: std.name,
            standard_id: std.id,
          });
        }
      });
    });
    return list;
  }, [standardList]);

  const filteredSectionList = useMemo(() => {
    return sectionList.filter((sec) => standards.includes(sec.standard_id));
  }, [sectionList, standards]);

  useEffect(() => {
    getRequest(GET_URL.getacademicyear.api).then((res) => {
      const list = res?.data?.data || [];
      setYearList(list);
      const selectedYear = checkLocalAcademicYear(list);
      setYear(selectedYear || "");
    });
  }, []);

  useEffect(() => {
    if (!year) return;
    getRequest(GET_URL.getstandardandsection.api, { is_active: true, academic_year: year }).then((res) => {
      const list = res?.data?.data || [];
      setStandardList(list);
      setStandards([]);
      setSections([]);
    });
  }, [year]);

  const handleSchedule = () => {
    if (!year || !standards.length || !date || !startTime || !endTime) {
      return Swal.fire("Incomplete Form", "Please fill in all mandatory fields to continue.", "warning");
    }
    if (startTime >= endTime) {
      return Swal.fire("Timing Error", "The meeting end time must be after the start time.", "error");
    }

    setLoading(true);
    const payload = {
      meeting_type: "Teachers Parents Meeting",
      name: `PTM - ${date}`,
      date,
      start_time: startTime,
      end_time: endTime,
      description: description || "Parent Teacher Meeting",
      academic_year: year,
      standard_ids: standards,
      section_ids: sections.length ? sections : undefined,
      organizer_list: [loggedInUserId],
      mode_of_meeting: "Offline Meeting",
    };

    postRequest(POST_URL.appointment.api, payload)
      .then((res) => {
        setLoading(false);
        if (res?.status === 200) {
          Swal.fire({
            icon: "success",
            title: "Meeting Scheduled",
            text: "The PTM has been successfully created.",
            confirmButtonColor: "#4f46e5",
          });
        }
      })
      .catch(() => {
        setLoading(false);
        Swal.fire("System Error", "Failed to schedule the meeting. Please try again.", "error");
      });
  };

  return (
    <Paper className={classes.root} elevation={0}>
      {/* Header Banner */}
      <Box className={classes.headerBanner}>
        <Box display="flex" alignItems="center">
          <Box bgcolor="rgba(255,255,255,0.2)" p={1.5} borderRadius={12} mr={2.5} display="flex">
            <EventAvailableIcon fontSize="large" />
          </Box>
          <Box className="heading">
            <Typography variant="h4" style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
              Schedule PTM
            </Typography>
            <Typography variant="body1" style={{ opacity: 0.9 }}>
              Initialize Parent-Teacher interactions for the current term
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box className={classes.contentPadding}>
        <Grid container spacing={0}>
          {/* Step 1: Academic Context */}
          <Grid item xs={12} className={classes.formSection}>
            <Typography className={classes.sectionTitle}>
              <ClassIcon /> 1. Audience Selection
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <InputLabel shrink style={{ fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>Academic Year *</InputLabel>
                <Dropdown
                  data={yearList}
                  value={year}
                  onChange={(e) => {
                    SetAcademicYear(e.target.value);
                    setYear(e.target.value);
                  }}
                  customName="name"
                  customId="id"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <InputLabel shrink style={{ fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>Target {standardLabel}s *</InputLabel>
                <FormControl variant="outlined" size="small" fullWidth className={classes.inputField}>
                  <Select
                    multiple
                    displayEmpty
                    value={standards}
                    onChange={(e) => setStandards(e.target.value)}
                    renderValue={(selected) => {
                      if (selected.length === 0) return <em style={{ color: "#94a3b8", fontStyle: "normal" }}>Select {standardLabel}s</em>;
                      return (
                        <div className={classes.chipContainer}>
                          {selected.map((value) => (
                            <Chip key={value} label={standardList.find(s => s.id === value)?.name} size="small" className={classes.customChip} />
                          ))}
                        </div>
                      );
                    }}
                  >
                    {standardList.map((std) => (
                      <MenuItem key={std.id} value={std.id}>{std.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <InputLabel shrink style={{ fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>{sectionLabel}s (Optional)</InputLabel>
                <FormControl variant="outlined" size="small" fullWidth disabled={!standards.length} className={classes.inputField}>
                  <Select
                    multiple
                    displayEmpty
                    value={sections}
                    onChange={(e) => setSections(e.target.value)}
                    renderValue={(selected) => {
                      if (selected.length === 0) return <em style={{ color: "#94a3b8", fontStyle: "normal" }}>All {sectionLabel}s</em>;
                      return (
                        <div className={classes.chipContainer}>
                          {selected.map((value) => (
                            <Chip key={value} label={filteredSectionList.find(s => s.id === value)?.name} size="small" variant="outlined" color="primary" />
                          ))}
                        </div>
                      );
                    }}
                  >
                    {filteredSectionList.map((sec) => (
                      <MenuItem key={sec.id} value={sec.id}>{sec.standard_name} - {sec.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Grid>

          {/* Step 2: Date & Time */}
          <Grid item xs={12} className={classes.formSection}>
            <Typography className={classes.sectionTitle}>
              <ScheduleIcon /> 2. Date & Time Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  type="date"
                  label="Meeting Date"
                  variant="outlined"
                  size="small"
                  fullWidth
                  className={classes.inputField}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <TextField
                  type="time"
                  label="Start Time"
                  variant="outlined"
                  size="small"
                  fullWidth
                  className={classes.inputField}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <TextField
                  type="time"
                  label="End Time"
                  variant="outlined"
                  size="small"
                  fullWidth
                  className={classes.inputField}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Step 3: Additional Details */}
          <Grid item xs={12} className={classes.formSection}>
            <Typography className={classes.sectionTitle}>
              <DescriptionIcon /> 3. Agenda & Details
            </Typography>
            <TextField
              label="Meeting Agenda"
              multiline
              rows={4}
              fullWidth
              variant="outlined"
              className={classes.inputField}
              placeholder="Provide context for parents (e.g., Progress report discussion, extracurricular activities update...)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Box display="flex" alignItems="center" mt={2} color="#64748b">
              <InfoOutlinedIcon style={{ fontSize: "1rem", marginRight: 6 }} />
              <Typography variant="caption">
                This description will be visible to parents in their mobile application notifications.
              </Typography>
            </Box>
          </Grid>

          {/* Action Footer */}
          <Grid item xs={12}>
            <Box display="flex" justifyContent="flex-end" alignItems="center" mt={2}>
              <Button
                variant="contained"
                color="primary"
                className={classes.submitBtn}
                onClick={handleSchedule}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <EventAvailableIcon />}
              >
                {loading ? "Scheduling Meeting..." : "Publish PTM Schedule"}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default withRouter(AddParentTeacherMeeting);