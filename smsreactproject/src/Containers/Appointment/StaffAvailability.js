import React, { Component } from "react";
import {
  Paper,
  Box,
  TextField,
  MenuItem,
  Typography,
  CircularProgress,
  Button,
  Modal,
} from "@material-ui/core";
import moment from "moment";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import Swal from "sweetalert2";

export default class StaffAvailability extends Component {
  constructor(props) {
    super(props);
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const isTeacher = !!user?.staff;
    const loggedStaffId = user?.staff?.id || "";

    this.state = {
      loading: false,
      staffList: [],
      staff_id: isTeacher ? String(loggedStaffId) : "",
      staff_name: "",
      day_of_week: moment().isoWeekday(),
      availability_status: "Available",
      start_time: "",
      end_time: "",
      availableSlots: [],
      showAddModal: false,
      isTeacher,
    };
  }

  componentDidMount() {
    this.fetchAvailability();
    this.fetchStaffInBackground();
  }

  fetchStaffInBackground = () => {
    getRequest(GET_URL.staff.api).then((res) => {
      const staffList = res?.data?.data || [];
      const staff = staffList.find(
        (s) => String(s.users?.staff?.id) === this.state.staff_id
      );

      this.setState({
        staffList,
        staff_name: staff?.users?.staff?.full_name || "",
      });
    });
  };

  fetchAvailability = () => {
    const { staff_id } = this.state;
    if (!staff_id) return;

    this.setState({ loading: true });

    getRequest(`${POST_URL.staffavailability.api}?staff=${staff_id}`).then((res) => {
      const list = Array.isArray(res?.data) ? res.data : res?.data?.data || [];

      const normalized = list.map((s) => ({
        ...s,
        staff_id: s.staff_id ?? s.staff,
        day_of_week_id: s.day_of_week_id ?? s.day_of_week,
      }));

      this.setState({ availableSlots: normalized, loading: false });
    });
  };

  isOverlapping = (newStart, newEnd, newDay) => {
    return this.state.availableSlots.some((slot) => {
      if (slot.day_of_week_id !== newDay) return false;

      const s1 = moment(slot.start_time, "HH:mm:ss");
      const e1 = moment(slot.end_time, "HH:mm:ss");
      const s2 = moment(newStart, "HH:mm");
      const e2 = moment(newEnd, "HH:mm");

      return s2 < e1 && e2 > s1;
    });
  };

  addSlot = () => {
    const { staff_id, day_of_week, start_time, end_time, availability_status } = this.state;

    if (!start_time || !end_time) {
      return this.toast("Please select start and end time");
    }

    if (moment(end_time, "HH:mm").isSameOrBefore(moment(start_time, "HH:mm"))) {
      return this.toast("End time must be after start time");
    }

    if (this.isOverlapping(start_time, end_time, day_of_week)) {
      return this.toast("Slot overlaps with existing slot");
    }

    postRequest(POST_URL.staffavailability.api, {
      staff: Number(staff_id),
      day_of_week,
      start_time: moment(start_time, "HH:mm").format("HH:mm:ss"),
      end_time: moment(end_time, "HH:mm").format("HH:mm:ss"),
      availability_status,
    }).then(() => {
      this.setState({ start_time: "", end_time: "", showAddModal: false });
      this.fetchAvailability();
    });
  };

  toast = (msg, icon = "error") => {
    Swal.fire({ icon, title: msg, position: "center", showConfirmButton: true });
  };

  render() {
    const {
      staff_name,
      day_of_week,
      availability_status,
      start_time,
      end_time,
      availableSlots,
      loading,
      showAddModal,
      isTeacher,
    } = this.state;

    const days = [1, 2, 3, 4, 5, 6, 7];
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const grouped = {};
    days.forEach((d) => {
      grouped[d] = { Available: [], "Not Available": [] };
    });

    availableSlots.forEach((s) => {
      const day = s.day_of_week_id;
      const status = s.availability_status;
      if (grouped[day] && grouped[day][status]) {
        grouped[day][status].push(s);
      }
    });

    return (
      <>
        <Paper style={{ padding: 32, borderRadius: 16 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" style={{ fontWeight: 700, color: "#1976d2" }}>
                Staff Availability
              </Typography>
              {staff_name && (
                <Typography variant="subtitle1" style={{ color: "#555", marginTop: 4 }}>
                  {staff_name}
                </Typography>
              )}
            </Box>

            {isTeacher && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => this.setState({ showAddModal: true })}
                style={{ borderRadius: 20, padding: "6px 20px" }}
              >
                + Add Slot
              </Button>
            )}
          </Box>

          <Box mt={10} style={{ overflowX: "auto" }}>
            {loading && <CircularProgress />}

            {!loading && (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={cornerCell}></th>
                    {dayNames.map((d) => (
                      <th key={d} style={dayHeader}>{d}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {["Available", "Not Available"].map((status, idx) => (
                    <tr key={status} style={idx === 0 ? availableRow : unavailableRow}>
                      <td style={rowHeader}>{status}</td>

                      {days.map((day) => (
                        <td key={day} style={cell}>
                          {grouped[day][status].length === 0 && (
                            <span style={{ color: "#bbb" }}>—</span>
                          )}

                          {grouped[day][status].map((slot) => (
                            <div key={slot.id} style={slotPill}>
                              {moment(slot.start_time, "HH:mm:ss").format("hh:mm A")} –{" "}
                              {moment(slot.end_time, "HH:mm:ss").format("hh:mm A")}
                            </div>
                          ))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Box>
        </Paper>

        <Modal open={showAddModal} onClose={() => this.setState({ showAddModal: false })}>
  <Box style={modalOverlay}>
    <Box style={prettyModal}>
      <Typography variant="h5" style={{ fontWeight: 700, marginBottom: 4 }}>
        Add Availability Slot
      </Typography>
      <Typography variant="body2" style={{ color: "#777", marginBottom: 24 }}>
        Choose the day, status, and time range for this staff member.
      </Typography>

      <Box display="grid" gridTemplateColumns="1fr 1fr" gap={16}>
        <TextField
          select
          label="Day"
          fullWidth
          value={day_of_week}
          onChange={(e) => this.setState({ day_of_week: Number(e.target.value) })}
        >
          {days.map((d) => (
            <MenuItem key={d} value={d}>
              {dayNames[d - 1]}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Status"
          fullWidth
          value={availability_status}
          onChange={(e) => this.setState({ availability_status: e.target.value })}
        >
          <MenuItem value="Available">Available</MenuItem>
          <MenuItem value="Not Available">Not Available</MenuItem>
        </TextField>
      </Box>

      <Box mt={3} display="grid" gridTemplateColumns="1fr 1fr" gap={16}>
        <TextField
          type="time"
          label="Start Time"
          fullWidth
          value={start_time}
          InputLabelProps={{ shrink: true }}
          onChange={(e) => this.setState({ start_time: e.target.value })}
        />

        <TextField
          type="time"
          label="End Time"
          fullWidth
          value={end_time}
          InputLabelProps={{ shrink: true }}
          onChange={(e) => this.setState({ end_time: e.target.value })}
        />
      </Box>

      <Box mt={4} display="flex" justifyContent="flex-end" gap={12}>
        <Button onClick={() => this.setState({ showAddModal: false })}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={this.addSlot}>
          Save Slot
        </Button>
      </Box>
    </Box>
  </Box>
</Modal>

      </>
    );
  }
}

const tableStyle = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: "0 8px",
};

const dayHeader = {
  padding: "12px",
  textAlign: "center",
  fontWeight: 600,
  color: "#555",
};

const cornerCell = {
  width: 140,
};

const rowHeader = {
  padding: "12px 16px",
  fontWeight: 600,
  textAlign: "left",
  color: "#333",
  whiteSpace: "nowrap",
};

const cell = {
  padding: "12px",
  textAlign: "left",
  verticalAlign: "top",
};

const slotPill = {
  display: "inline-block",
  padding: "4px 10px",
  marginBottom: 6,
  borderRadius: 12,
  fontSize: 13,
  background: "#e3f2fd",
  color: "#1976d2",
};

const availableRow = {
  background: "#f1f8e9",
  borderRadius: 12,
};

const unavailableRow = {
  background: "#fdecea",
  borderRadius: 12,
};

const modalStyle = {
  background: "#fff",
  padding: 28,
  borderRadius: 16,
  width: 420,
  margin: "10% auto",
  boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
};
const modalOverlay = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh",
};

const prettyModal = {
  background: "#fff",
  padding: "32px 36px",
  borderRadius: 20,
  width: 440,
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};

