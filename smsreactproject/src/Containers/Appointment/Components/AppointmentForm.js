import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import {
  Paper,
  Box,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
} from "@material-ui/core";

import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import Swal from "sweetalert2";
import { FormattedMessage } from "react-intl";
import messages from "../messages";

import SelectStudent from "Containers/Miscellaneous/SelectStudent";

class AppointmentForm extends Component {
  constructor(props) {
    super(props);

    const initial = props.initialData || {};
    const logged = JSON.parse(localStorage.getItem("user") || "{}");

    let userType = "admin";
    if (logged?.student) userType = "student";
    else if (
      logged?.staff &&
      Array.isArray(logged.staff.group_name) &&
      logged.staff.group_name.includes("Teacher")
    ) {
      userType = "teacher";
    }

    const today = new Date().toISOString().split("T")[0];
    const loggedInUserId = logged?.id || logged?.user?.id || null;

    this.state = {
      loading: false,
      staffList: [],
      userType,
      loggedInUserId,
      loggedInStaffName: logged?.staff?.full_name || "",
      loggedInStudentName: logged?.student?.name || "",

      // ✅ ORGANIZER ALWAYS LOGGED USER
      form: {
        organizer_list: [loggedInUserId],
        attender_list: initial.attender_list || [],
        teacher_id: initial.teacher_user_id || "", // ✅ NEW (ADMIN SUPPORT)
        meeting_type: initial.meeting_type || "Parents Teachers Meeting",
        date: initial.date || today,
        start_time: initial.start_time || "",
        end_time: initial.end_time || "",
        description: initial.description || "",
        id: initial.id || null,
      },

      teacherSearch: "",
      openStudentPopup: false,
      selectedStudentDetails: null,
    };
  }

  componentDidMount() {
    this.fetchStaff();
  }

  // ---------------- STAFF LIST ----------------
  fetchStaff = () => {
    getRequest(GET_URL.staff.api).then((res) => {
      this.setState({ staffList: res?.data?.data || [] });
    });
  };

  // ---------------- HANDLERS ----------------
  handleChange = (e) => {
    const { name, value } = e.target;
    this.setState((prev) => ({
      form: { ...prev.form, [name]: value },
    }));
  };

  // STUDENT → SELECT TEACHER
  handleTeacherSelect = (e) => {
    const teacherId = Number(e.target.value);

    this.setState((prev) => ({
      form: {
        ...prev.form,
        attender_list: [teacherId], // student flow unchanged
      },
    }));
  };

  // ADMIN → SELECT TEACHER (STORE SEPARATELY)
  handleAdminTeacherSelect = (e) => {
    const teacherId = Number(e.target.value);

    this.setState((prev) => ({
      form: {
        ...prev.form,
        teacher_id: teacherId,
      },
    }));
  };

  // TEACHER / ADMIN → SELECT STUDENT
  handleStudentSelect = (student) => {
    this.setState((prev) => ({
      selectedStudentDetails: student,
      form: {
        ...prev.form,
        attender_list: [student.studentID],
      },
      openStudentPopup: false,
    }));
  };

  // ---------------- VALIDATION ----------------
  validateForm = () => {
    const { form, userType } = this.state;

    if (
      !form.organizer_list.length ||
      !form.attender_list.length ||
      !form.meeting_type ||
      !form.date ||
      !form.start_time ||
      !form.end_time ||
      !form.description.trim()
    ) {
      Swal.fire("Error", "Please fill all required fields", "error");
      return false;
    }

    // 🔴 ADMIN MUST SELECT TEACHER ALSO
    if (userType === "admin" && !form.teacher_id) {
      Swal.fire("Error", "Please select teacher", "error");
      return false;
    }

    if (form.start_time >= form.end_time) {
      Swal.fire("Error", "End time must be after start time", "error");
      return false;
    }

    return true;
  };

  // ---------------- SUBMIT ----------------
  handleSubmit = () => {
    if (!this.validateForm()) return;

    const { form, userType, loggedInUserId } = this.state;

    const payload = {
      ...form,
      user_id: loggedInUserId,
      meeting_type: "One on One Meeting",
    };

    // ✅ ADMIN → ADD TEACHER INTO ATTENDER LIST
    if (userType === "admin") {
      payload.attender_list = [
        form.teacher_id,
        ...form.attender_list,
      ];
    }

    this.setState({ loading: true });

    postRequest(POST_URL.appointment.api, payload)
      .then((res) => {
        this.setState({ loading: false });

        if (res?.status === 200) {
          if (this.props.onClose) {
            this.props.onClose(true);
            }

          Swal.fire("Appointment Scheduled!", "", "success");
        } else {
          Swal.fire("Error", "Error saving appointment", "error");
        }
      })
      .catch(() => {
        this.setState({ loading: false });
        Swal.fire("Error", "Network error", "error");
      });
  };

  // ---------------- RENDER ----------------
  render() {
    const {
      staffList,
      userType,
      form,
      loading,
      loggedInStaffName,
      loggedInStudentName,
      teacherSearch,
      selectedStudentDetails,
      openStudentPopup,
    } = this.state;

    const isStudent = userType === "student";
    const isAdmin = userType === "admin";

    const teacherList = staffList.filter((s) =>
      s.group_name?.includes("Teacher")
    );

    const filteredTeachers = teacherList.filter((t) =>
      t.full_name?.toLowerCase().includes(teacherSearch.toLowerCase())
    );

    return (
      <Paper className="appointment-form">
        <Box p={3}>
          <Box className="form-heading">
            <FormattedMessage {...messages.newAppointmentHeading} />
          </Box>

          {/* ORGANIZER */}
          <Box mt={2}>
            <TextField
              label="Organizer (You)"
              fullWidth
              value={isStudent ? loggedInStudentName : loggedInStaffName}
              disabled
              variant="outlined"
              size="small"
            />
          </Box>

          {/* STUDENT & ADMIN → SELECT TEACHER */}
          {(isStudent || isAdmin) && (
            <Box mt={2}>
              <TextField
                select
                label="Select Teacher *"
                fullWidth
                value={isStudent ? form.attender_list[0] || "" : form.teacher_id}
                onChange={
                  isStudent
                    ? this.handleTeacherSelect
                    : this.handleAdminTeacherSelect
                }
                variant="outlined"
                size="small"
              >
                {filteredTeachers.map((t) => (
                  <MenuItem key={t.user_id} value={t.user_id}>
                    {t.full_name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          )}

          {/* TEACHER & ADMIN → SELECT STUDENT */}
          {!isStudent && (
            <Box mt={2}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => this.setState({ openStudentPopup: true })}
              >
                {selectedStudentDetails
                  ? `${selectedStudentDetails.studentName} (${selectedStudentDetails.regNumber})`
                  : "Select Student *"}
              </Button>
            </Box>
          )}

          {/* MEETING TYPE */}
          <Box mt={2}>
            <TextField
              select
              label="Meeting Type *"
              fullWidth
              name="meeting_type"
              value={form.meeting_type}
              onChange={this.handleChange}
              variant="outlined"
              size="small"
            >
              <MenuItem value="Parents Teachers Meeting">
                Parents Teachers Meeting
              </MenuItem>
              <MenuItem value="Teacher Student Meeting">
                Teacher Student Meeting
              </MenuItem>
            </TextField>
          </Box>

          {/* DATE + TIME */}
          <Box mt={2} display="flex" gap={10}>
            <TextField
              type="date"
              label="Date *"
              fullWidth
              name="date"
              value={form.date}
              onChange={this.handleChange}
              variant="outlined"
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="time"
              label="Start Time *"
              fullWidth
              name="start_time"
              value={form.start_time}
              onChange={this.handleChange}
              variant="outlined"
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="time"
              label="End Time *"
              fullWidth
              name="end_time"
              value={form.end_time}
              onChange={this.handleChange}
              variant="outlined"
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          {/* DESCRIPTION */}
          <Box mt={2}>
            <TextField
              label="Description *"
              multiline
              rows={3}
              fullWidth
              name="description"
              value={form.description}
              onChange={this.handleChange}
              variant="outlined"
            />
          </Box>

          {/* ACTIONS */}
          <Box mt={3} display="flex" justifyContent="flex-end" gap={12}>
            <Button onClick={() => this.props.onClose(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="primary"
              onClick={this.handleSubmit}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : "Save"}
            </Button>
          </Box>
        </Box>

        {openStudentPopup && (
          <SelectStudent
            year={2025}
            closeSelectStudent={() =>
              this.setState({ openStudentPopup: false })
            }
            getStudentDetails={this.handleStudentSelect}
          />
        )}
      </Paper>
    );
  }
}

export default withRouter(AppointmentForm);
