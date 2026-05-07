import React, { useEffect, useState } from "react";
import {
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Box,
  Paper,
  Typography,
  Button,
  Avatar,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField
} from "@material-ui/core";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";

const ITEM_HEIGHT = 35;

function TabPanel({ children, value, index }) {
  return value === index ? <Box p={2}>{children}</Box> : null;
}

function MentorStudentListActions(props) {
  const {
    id,
    index,
    deleteStudent,
    enabledActions = ["view"],
    student, // pass full student object
    currentUserId, // 👈 pass logged-in user_id from parent (mentor/staff)
  } = props;

  const [anchorEl, setAnchorEl] = useState(null);
  const [enabledActionsNew, setEnabledAction] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [openMeetingDialog, setOpenMeetingDialog] = useState(false);

  const [meetingData, setMeetingData] = useState({
    description: "",
    date: "",
    start_time: "",
    end_time: "",
  });

  // states for data
  const [subjectAllocation, setSubjectAllocation] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [feeDetails, setFeeDetails] = useState([]);
  const [proctorMeetings, setProctorMeetings] = useState([]);

  const openMenu = Boolean(anchorEl);

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  const handleView = () => {
    handleCloseMenu();
    setOpenDialog(true);
    fetchAcademic();
    fetchAdministrative();
    fetchProctor();
  };

  const handleDelete = () => {
    handleCloseMenu();
    if (deleteStudent) deleteStudent(id, index);
  };

  useEffect(() => {
    if (enabledActions.length > 0) {
      let arrData = enabledActions.map((data) =>
        data === "update" ? "edit" : data
      );
      setEnabledAction(arrData);
    }
  }, [enabledActions]);

  const fetchAcademic = async () => {
    getRequest(
      GET_URL.studentacademicdetails.api,
      {
        student_id: student.student_id,
        standard_section_id: student.standard_section,
      },
      props
    ).then((res) => {
      if (res?.status === 200) {
        const subjects =
          res.data.standard_section_data?.assigned_subjects || [];
        const attData =
          res.data.attendance_data?.[student.student_id] || {};
        setSubjectAllocation(subjects);
        setAttendanceData(attData);
      } else {
        setSubjectAllocation([]);
        setAttendanceData({});
      }
    });
  };

  const fetchAdministrative = async () => {
    const studentId = student.student_id;
    const postData = { student_ids: [parseInt(studentId)] };

    postRequest(POST_URL.getfeelistforstudent.api, postData, props).then(
      (response) => {
        try {
          if (response && response.status === 200) {
            let feeData = null;
            if (response.data.data?.[studentId]) {
              feeData = response.data.data[studentId][0];
            }
            if (feeData) {
              setFeeDetails({
                academicYear: feeData.year_name,
                standard: feeData.standard_name,
                total: feeData.total_amount,
                paid: feeData.paid_amount,
                pending: feeData.pending_amount,
              });
            } else {
              setFeeDetails(null);
            }
          } else {
            setFeeDetails(null);
          }
        } catch (err) {
          console.error("Error processing fee details", err);
          setFeeDetails(null);
        }
      }
    );
  };

  const fetchProctor = async () => {
    getRequest(GET_URL.bookappointment.api, { limit: 10, page: 1 }, props).then(
      (response) => {
        try {
          if (response && response.status === 200) {
            setProctorMeetings(response.data.data || []);
          } else {
            setProctorMeetings([]);
          }
        } catch (err) {
          console.error("Error fetching appointments", err);
          setProctorMeetings([]);
        }
      }
    );
  };

  const handleMeetingChange = (e) => {
    const { name, value } = e.target;
    setMeetingData((prev) => ({ ...prev, [name]: value }));
  };

  // save meeting
  const handleSaveMeeting = () => {
    const payload = {
      name: "Parents Teachers Meeting",
      description: meetingData.description,
      meeting_type: "Parents Teachers Meeting",
      mode_of_meeting: "Offline Meeting",
      date: meetingData.date,
      start_time: meetingData.start_time,
      end_time: meetingData.end_time,
      organizer_list: [currentUserId], // logged in mentor/staff
      attender_list: [student.user_id], // this student’s user_id
    };

    postRequest(POST_URL.bookappointment.api, payload, props).then((res) => {
      if (res && res.status === 200) {
        setOpenMeetingDialog(false);
        fetchProctor(); // refresh list
      } else {
        alert("Failed to create meeting");
      }
    });
  };

  return (
    <div>
      <Tooltip title="Actions" enterDelay={400} placement="top-start">
        <IconButton
          aria-label="more"
          aria-controls="mentor-actions-menu"
          aria-haspopup="true"
          onClick={handleClick}
        >
          <MoreHorizIcon />
        </IconButton>
      </Tooltip>

      <Menu
        id="mentor-actions-menu"
        anchorEl={anchorEl}
        keepMounted
        open={openMenu}
        onClose={handleCloseMenu}
        PaperProps={{ style: { maxHeight: ITEM_HEIGHT * 7, width: 150 } }}
      >
        {enabledActionsNew.includes("view") && (
          <MenuItem onClick={handleView}>View</MenuItem>
        )}
        {enabledActionsNew.includes("delete") && (
          <MenuItem onClick={handleDelete}>Delete</MenuItem>
        )}
      </Menu>

      {/* Student Details Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullScreen>
        <DialogTitle>Student Information</DialogTitle>
        <DialogContent>
          {/* Profile Section */}
          <Box display="flex" alignItems="center" mb={2}>
            <Avatar
              src={student?.profile_pic || "https://via.placeholder.com/100"}
              alt={student?.name}
              style={{ width: 100, height: 100, marginRight: 16 }}
            />
            <Box>
              <Typography variant="h6">{student?.name}</Typography>
              <Typography>
                {student?.standard_name} - {student?.section_name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Student ID: {student?.student_id}
              </Typography>
            </Box>
          </Box>
          <Divider />

          {/* Tabs */}
          <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)}>
            <Tab label="Academic" />
            <Tab label="Administrative" />
            <Tab label="Proctor" />
          </Tabs>

          {/* Academic */}
          <TabPanel value={tabIndex} index={0}>
            {subjectAllocation.length === 0 ? (
              <Typography>No academic subjects</Typography>
            ) : (
              subjectAllocation.map((s, i) => {
                const att = attendanceData[s.subject_id] || {
                  present: 0,
                  absent: 0,
                  total: 0,
                  todays_status: "-",
                };
                const percent =
                  att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;
                return (
                  <Paper key={i} style={{ padding: 12, marginBottom: 8 }}>
                    <Typography variant="subtitle1">{s.subject_name}</Typography>
                    <Typography variant="body2">
                      Staff: {s.staff_name || "N/A"}
                    </Typography>
                    <Typography variant="body2">
                      Attendance: {att.present}/{att.total} ({percent}%)
                    </Typography>
                    <Typography variant="body2">
                      Today: {att.todays_status}
                    </Typography>
                  </Paper>
                );
              })
            )}
          </TabPanel>

          {/* Administrative */}
          <TabPanel value={tabIndex} index={1}>
            {!feeDetails ? (
              <Typography>No fee details available</Typography>
            ) : (
              <Paper style={{ padding: 16 }}>
                <Typography variant="h6" gutterBottom>
                  Fee Summary
                </Typography>
                <Divider style={{ marginBottom: 12 }} />
                <Typography>
                  <strong>Academic Year:</strong> {feeDetails.academicYear}
                </Typography>
                <Typography>
                  <strong>Standard:</strong> {feeDetails.standard}
                </Typography>
                <Typography>
                  <strong>Total Amount:</strong> ₹{feeDetails.total}
                </Typography>
                <Typography>
                  <strong>Paid Amount:</strong> ₹{feeDetails.paid}
                </Typography>
                <Typography>
                  <strong>Pending Amount:</strong> ₹{feeDetails.pending}
                </Typography>
              </Paper>
            )}
          </TabPanel>

          {/* Proctor */}
          <TabPanel value={tabIndex} index={2}>
            {proctorMeetings.length === 0 ? (
              <Typography>No appointments found</Typography>
            ) : (
              <Paper>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Start Time</TableCell>
                      <TableCell>End Time</TableCell>
                      <TableCell>Organizer</TableCell>
                      <TableCell>Attenders</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {proctorMeetings.map((m, i) => {
                      const organizer = m.user_data.find(
                        (u) => u.user_type === "Organizer"
                      );
                      const attenders = m.user_data
                        .filter((u) => u.user_type === "Attender")
                        .map((u) => u.user_name)
                        .join(", ");
                      return (
                        <TableRow key={i}>
                          <TableCell>{m.date}</TableCell>
                          <TableCell>{m.start_time}</TableCell>
                          <TableCell>{m.end_time}</TableCell>
                          <TableCell>{organizer?.user_name || "-"}</TableCell>
                          <TableCell>{attenders || "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>
            )}
            <Box mt={2} textAlign="right">
              <Button
                variant="contained"
                color="primary"
                onClick={() => setOpenMeetingDialog(true)}
              >
                Create New Meeting
              </Button>
            </Box>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Meeting Dialog */}
      <Dialog
        open={openMeetingDialog}
        onClose={() => setOpenMeetingDialog(false)}
      >
        <DialogTitle>Create New Meeting</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="Description"
            name="description"
            value={meetingData.description}
            onChange={handleMeetingChange}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Date"
            type="date"
            name="date"
            InputLabelProps={{ shrink: true }}
            value={meetingData.date}
            onChange={handleMeetingChange}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Start Time"
            type="time"
            name="start_time"
            InputLabelProps={{ shrink: true }}
            value={meetingData.start_time}
            onChange={handleMeetingChange}
          />
          <TextField
            fullWidth
            margin="dense"
            label="End Time"
            type="time"
            name="end_time"
            InputLabelProps={{ shrink: true }}
            value={meetingData.end_time}
            onChange={handleMeetingChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMeetingDialog(false)}>Cancel</Button>
          <Button color="primary" variant="contained" onClick={handleSaveMeeting}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default MentorStudentListActions;
