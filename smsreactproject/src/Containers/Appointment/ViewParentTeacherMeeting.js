import React, { useState, useEffect, useCallback } from "react";
import { withRouter } from "react-router-dom";
import {
  Paper,
  Box,
  Typography,
  Button,
  TextField,
} from "@material-ui/core";
import EventAvailableIcon from "@material-ui/icons/EventAvailable";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import LayersIcon from "@material-ui/icons/Layers";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import HourglassEmptyIcon from "@material-ui/icons/HourglassEmpty";
import CancelIcon from "@material-ui/icons/Cancel";
import DoneAllIcon from "@material-ui/icons/DoneAll";

import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { checkLocalAcademicYear, SetAcademicYear } from "Includes/functions";
import { Dropdown } from "Components/DropDown";
import LoadingGif from "Components/LoadingGif";
import AppointmentCard from "./Components/AppointmentCard";
import Swal from "sweetalert2";

import "./styles.scss";

const PTM_MEETING_TYPES = ["Teachers Parents Meeting", "Parents Teachers Meeting"];

const ViewParentTeacherMeeting = ({ history }) => {
  const logged = JSON.parse(localStorage.getItem("user") || "{}");
  const loggedInUserId = logged?.id || logged?.user?.id || null;
  const loggedInUserType = logged?.groups?.[0]?.name?.toLowerCase() || "";

  const [loading, setLoading] = useState(true);
  const [yearList, setYearList] = useState([]);
  const [year, setYear] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fullAppointments, setFullAppointments] = useState([]);
  const [selectedSummary, setSelectedSummary] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const [summary, setSummary] = useState({
    all: 0,
    approved: 0,
    requested: 0,
    rejected: 0,
    attended: 0,
  });

  const getComputedStatus = useCallback((appt) => {
    const users = appt.user_data || [];
    const statuses = users.map((u) => (u.status || "").toLowerCase()).filter(Boolean);

    if (statuses.includes("rejected")) return "Rejected";
    if (statuses.includes("approved")) return "Approved";
    if (statuses.includes("attended") || statuses.includes("completed")) return "Attended";

    const globalStatus = (appt.status || "").toLowerCase();
    if (globalStatus === "attended" || globalStatus === "completed") return "Attended";
    if (globalStatus) return appt.status;

    return "Requested";
  }, []);

  const fetchAcademicYears = useCallback(() => {
    getRequest(GET_URL.getacademicyear.api).then((res) => {
      const list = res?.data?.data || [];
      setYearList(list);
      const selectedYear = checkLocalAcademicYear(list);
      setYear(selectedYear || "");
    });
  }, []);

  const fetchAppointments = useCallback(() => {
    if (!year) {
      setFullAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const today = new Date().toISOString().split("T")[0];

    const params = {
      start_date: startDate || today,
      end_date: endDate || today,
      limit: 100000,
      page_no: 1,
      academic_year: year,
      academic_year_id: year,
    };

    if (loggedInUserId && Number(loggedInUserId) !== 1) {
      params.user_id = loggedInUserId;
    }

    const url = `${GET_URL.appointment.api}${loggedInUserId || ""}/`;

    getRequest(url, params)
      .then((res) => {
        const list = res?.data?.data || [];

        const ptmOnly = list.filter((a) =>
          PTM_MEETING_TYPES.includes(a.meeting_type || "")
        );

        const normalized = ptmOnly.map((a) => ({
          ...a,
          computed_status: getComputedStatus(a),
        }));

        setFullAppointments(normalized);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [year, startDate, endDate, loggedInUserId, getComputedStatus]);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  useEffect(() => {
    if (year) fetchAppointments();
    else setLoading(false);
  }, [year, fetchAppointments]);

  useEffect(() => {
    const s = {
      all: fullAppointments.length,
      approved: fullAppointments.filter(
        (a) => (a.computed_status || "").toLowerCase() === "approved"
      ).length,
      requested: fullAppointments.filter(
        (a) => (a.computed_status || "").toLowerCase() === "requested"
      ).length,
      rejected: fullAppointments.filter(
        (a) => (a.computed_status || "").toLowerCase() === "rejected"
      ).length,
      attended: fullAppointments.filter(
        (a) => (a.computed_status || "").toLowerCase() === "attended"
      ).length,
    };

    setSummary(s);
  }, [fullAppointments]);

  const handleYearChange = (e) => {
    const value = e.target.value;
    if (!value) return;

    SetAcademicYear(value);
    setYear(value);
    setCurrentPage(1);
  };

  const filteredAppointments =
    selectedSummary === "all"
      ? fullAppointments
      : fullAppointments.filter((a) =>
          (a.computed_status || "").toLowerCase().includes(selectedSummary)
        );

  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / pageSize));
  const startIdx = (currentPage - 1) * pageSize;

  const paginatedAppointments = filteredAppointments.slice(
    startIdx,
    startIdx + pageSize
  );

  const handleApprove = (appointmentId, userId) => {
    postRequest(POST_URL.appointment.api, {
      id: appointmentId,
      user_id: userId,
      status: "Approved",
      status_remark: "Approved by attender",
      is_status_update: true,
    }).then(() => {
      Swal.fire("Approved!", "", "success");
      fetchAppointments();
    });
  };

  const handleReject = (appointmentId, userId) => {
    postRequest(POST_URL.appointment.api, {
      id: appointmentId,
      user_id: userId,
      status: "Rejected",
      status_remark: "Rejected by attender",
      is_status_update: true,
    }).then(() => {
      Swal.fire("Rejected!", "", "warning");
      fetchAppointments();
    });
  };

  const handleReschedule = () => {
    fetchAppointments();
  };

  const goToAddPTM = () => {
    history.push("/appointment/parent-teacher-meeting/add");
  };

  const renderSummaryCard = (id, label, count, icon, color) => {
    const isSelected = selectedSummary === id;

    return (
      <Box
        key={id}
        onClick={() => {
          setSelectedSummary(id);
          setCurrentPage(1);
        }}
        className="ptm-view__summary-card"
        style={{
          border: isSelected ? `3px solid ${color}` : "2px solid #e8ecf4",
          boxShadow: isSelected
            ? `0 6px 20px ${color}33`
            : "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <Box style={{ fontSize: 36, color }}>{icon}</Box>
        <Box className="ptm-view__summary-count">{count}</Box>
        <Box className="ptm-view__summary-label">{label}</Box>
      </Box>
    );
  };

  if (loading && fullAppointments.length === 0) return <LoadingGif />;

  return (
    <Paper
      className="paper-background ptm-view"
      style={{ width: "100%", maxWidth: "100%" }}
    >
      <Box
        className="ptm-view__inner"
        style={{ width: "100%", maxWidth: "100%" }}
      >
        {/* Header */}
        <Box
          className="ptm-view__header"
          style={{ width: "100%" }}
        >
          <Box display="flex" alignItems="center" flexWrap="wrap">
            <EventAvailableIcon className="ptm-view__icon" />

            <Typography variant="h5" className="heading">
              Parent Teacher Meetings
            </Typography>
          </Box>

          <Box className="ptm-view__header-actions">
            <Dropdown
              data={yearList}
              name="year"
              value={year}
              onChange={handleYearChange}
              label="Academic Year"
              hideSelect={true}
              customName="name"
              customId="id"
              style={{ minWidth: 200 }}
            />

            <Button
              variant="contained"
              color="primary"
              onClick={goToAddPTM}
              className="ptm-view__btn-schedule"
              startIcon={<AddCircleOutlineOutlinedIcon />}
            >
              Schedule PTM
            </Button>
          </Box>
        </Box>

        {/* Date filters */}
        <Box
          className="ptm-view__filters"
          style={{ width: "100%" }}
        >
          <TextField
            type="date"
            label="From date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setCurrentPage(1);
            }}
            variant="outlined"
            size="small"
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            type="date"
            label="To date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setCurrentPage(1);
            }}
            variant="outlined"
            size="small"
            InputLabelProps={{ shrink: true }}
          />

          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setCurrentPage(1);
            }}
          >
            Clear
          </Button>
        </Box>

        {/* Summary */}
        <Box
          className="ptm-view__summary"
          style={{ width: "100%" }}
        >
          {renderSummaryCard("all", "All", summary.all, <LayersIcon />, "#3f51b5")}
          {renderSummaryCard("approved", "Scheduled", summary.approved, <CheckCircleIcon />, "#2e7d32")}
          {renderSummaryCard("requested", "Pending", summary.requested, <HourglassEmptyIcon />, "#ed6c02")}
          {renderSummaryCard("rejected", "Rejected", summary.rejected, <CancelIcon />, "#c62828")}
          {renderSummaryCard("attended", "Completed", summary.attended, <DoneAllIcon />, "#673ab7")}
        </Box>

        {/* Appointment List */}
        <Box
          className="ptm-view__list"
          style={{ width: "100%" }}
        >
          {paginatedAppointments.length === 0 ? (
            <Box className="ptm-view__empty">
              <EventAvailableIcon style={{ fontSize: 48, color: "#9e9e9e" }} />

              <Typography variant="body1" color="textSecondary">
                No Parent Teacher Meetings found.
              </Typography>

              <Button
                variant="contained"
                color="primary"
                onClick={goToAddPTM}
                style={{ marginTop: 16 }}
              >
                Schedule a PTM
              </Button>
            </Box>
          ) : (
            paginatedAppointments.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                loggedInUserId={loggedInUserId}
                loggedInUserType={loggedInUserType}
                onApprove={(userId) => handleApprove(appt.id, userId)}
                onReject={(userId) => handleReject(appt.id, userId)}
                onReschedule={handleReschedule}
              />
            ))
          )}
        </Box>

        {/* Pagination */}
        {filteredAppointments.length > pageSize && (
          <Box
            className="ptm-view__pagination"
            style={{ width: "100%" }}
          >
            <Button
              variant="outlined"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>

            <Typography variant="body2">
              Page {currentPage} of {totalPages}
            </Typography>

            <Button
              variant="outlined"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default withRouter(ViewParentTeacherMeeting);