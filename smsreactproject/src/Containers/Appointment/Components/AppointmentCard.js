import React from "react";
import { Box, Paper, Typography, Button, IconButton, Tooltip } from "@material-ui/core";
import GroupIcon from "@material-ui/icons/Group";
import EventIcon from "@material-ui/icons/Event";
import AccessTimeIcon from "@material-ui/icons/AccessTime";
import DescriptionIcon from "@material-ui/icons/Description";
import EditTwoToneIcon from "@material-ui/icons/EditTwoTone";
import moment from "moment";

const AppointmentCard = ({
  appointment,
  loggedInUserId,
  loggedInUserType,
  onApprove,
  onReject,
  onReschedule,
}) => {
  const userData = appointment.user_data || [];

  const organizer = userData.find(
    (u) => (u.user_type || "").toLowerCase() === "organizer"
  );
  const attender = userData.find(
    (u) => (u.user_type || "").toLowerCase() === "attender"
  );

  const currentUserEntry = userData.find(
    (u) => Number(u.user) === Number(loggedInUserId)
  );

  const teacherName = organizer?.user_name || "Unknown Organizer";
  const studentName =
    attender?.user_name || appointment.name || "Unknown Attender";

  const meetingType = appointment.meeting_type || "Meeting";

  const date = appointment.date || appointment.created?.split("T")?.[0] || "";
  const time = appointment.start_time || appointment.start || "";
  const formattedTime = time ? moment(time, "HH:mm:ss").format("hh:mm A") : "";

  const subject = appointment.description || "";

  // final status
  const status =
    appointment.computed_status || appointment.status || "Requested";

  const statusColor =
    {
      requested: "#fbbf24",
      approved: "#22c55e",
      rejected: "#ef4444",
      attended: "#0ea5e9",
    }[status?.toLowerCase()] || "#6b7280";

  const isRequested = status?.toLowerCase() === "requested";

  const role = (currentUserEntry?.user_type || "").toLowerCase();
  const isAttender = role === "attender";
  const isOrganizer = role === "organizer";

  const isAdmin = Number(loggedInUserId) === 1;
  const normalizedUserType = (loggedInUserType || "").toLowerCase();

  // Approve/Reject allowed only for attender (teacher) when pending
  const canApproveReject =
    !isAdmin && isAttender && isRequested && normalizedUserType !== "student";

  // Show edit button for organizer / attender / admin
  const showReschedule = (isOrganizer || isAttender || isAdmin) && isRequested;

  return (
    <Paper
      style={{
        padding: "20px",
        marginBottom: "20px",
        borderRadius: "16px",
        boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
        background: "#ffffff",
        transition: "0.25s",
      }}
    >
      {/* HEADER */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography style={{ fontSize: "20px", fontWeight: 700 }}>
            {teacherName}
          </Typography>
          <Typography style={{ fontSize: "14px", color: "#6c6c6c" }}>
            {studentName}
          </Typography>
        </Box>

        {/* EDIT / RESCHEDULE BUTTON */}
        {showReschedule && (
          <Tooltip title="Edit / Reschedule Appointment">
            <IconButton
              onClick={onReschedule}
              style={{
                background: "#e3f2fd",
                color: "#1565c0",
                borderRadius: "8px",
                padding: 6,
              }}
            >
              <EditTwoToneIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* STATUS BADGE */}
      <Box
        style={{
          marginTop: "10px",
          display: "inline-block",
          padding: "5px 14px",
          borderRadius: "20px",
          background: statusColor + "22",
          color: statusColor,
          fontSize: "13px",
          fontWeight: 600,
          textTransform: "capitalize",
        }}
      >
        {status}
      </Box>

      {/* MEETING TYPE */}
      <Box display="flex" alignItems="center" mt={2}>
        <GroupIcon style={{ marginRight: 8, color: "#5c6bc0" }} />
        <Typography
          style={{
            fontSize: "14px",
            padding: "4px 10px",
            background: "#e8eaf6",
            borderRadius: "20px",
            color: "#3f51b5",
            fontWeight: 500,
          }}
        >
          {meetingType}
        </Typography>
      </Box>

      {/* DATE & TIME */}
      <Box display="flex" alignItems="center" mt={2}>
        <EventIcon style={{ marginRight: 8, color: "#1976d2" }} />
        <Typography style={{ fontSize: "14px" }}>{date}</Typography>

        <Box width={20} />

        <AccessTimeIcon style={{ marginRight: 6, color: "#1976d2" }} />
        <Typography style={{ fontSize: "14px" }}>{formattedTime}</Typography>
      </Box>

      {/* DESCRIPTION */}
      {subject && (
        <Box display="flex" alignItems="center" mt={2}>
          <DescriptionIcon style={{ marginRight: 8, color: "#616161" }} />
          <Typography style={{ fontSize: "14px", fontStyle: "italic" }}>
            {subject}
          </Typography>
        </Box>
      )}

      {/* APPROVE / REJECT BUTTONS */}
      <Box display="flex" justifyContent="flex-end" mt={3}>
        {canApproveReject && currentUserEntry && (
          <>
            <Button
              variant="contained"
              style={{
                background: "#2e7d32",
                color: "#fff",
                borderRadius: "8px",
                padding: "6px 18px",
                marginRight: 10,
              }}
              onClick={() => onApprove?.(currentUserEntry.user)}
            >
              Approve
            </Button>

            <Button
              variant="contained"
              style={{
                background: "#c62828",
                color: "#fff",
                borderRadius: "8px",
                padding: "6px 18px",
              }}
              onClick={() => onReject?.(currentUserEntry.user)}
            >
              Reject
            </Button>
          </>
        )}
      </Box>
    </Paper>
  );
};

export default AppointmentCard;
