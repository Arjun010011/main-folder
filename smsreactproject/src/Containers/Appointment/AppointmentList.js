import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { Paper, Box, Grid, Button, Modal } from "@material-ui/core";

import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import LayersIcon from "@material-ui/icons/Layers";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import HourglassEmptyIcon from "@material-ui/icons/HourglassEmpty";
import CancelIcon from "@material-ui/icons/Cancel";
import DoneAllIcon from "@material-ui/icons/DoneAll";

import LoadingGif from "Components/LoadingGif";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";

import messages from "./messages";
import AppointmentCard from "./Components/AppointmentCard";
import AppointmentForm from "./Components/AppointmentForm";
import { FormattedMessage } from "react-intl";
import moment from "moment";
import Swal from "sweetalert2";

import { Dropdown } from "Components/DropDown";
import { checkLocalAcademicYear, SetAcademicYear } from "Includes/functions";

import "./styles.scss";

class AppointmentList extends Component {
  constructor(props) {
    super(props);

    // Get logged user + type
    let loggedInUserId = null;
    let loggedInUserType = "";
    const academicYear = props.academicYear;

    try {
      const raw = localStorage.getItem("user");
      const parsed = raw ? JSON.parse(raw) : {};

      loggedInUserId = parsed?.id || parsed?.user?.id || null;
      loggedInUserType = parsed?.groups?.[0]?.name?.toLowerCase() || "";
    } catch (e) {
      console.log("Error parsing user: ", e);
    }

    this.state = {
      loading: true,
      selectedSummary: "all",

      yearList: [],
      year: "",

      currentPage: 1,
      totalPages: 1,
      pageSize: 10,

      fullAppointments: [],
      filteredAppointments: [],
      paginatedAppointments: [],

      summary: {
        all: 0,
        approved: 0,
        requested: 0,
        rejected: 0,
        attended: 0,
      },

      startDate: moment().format("YYYY-MM-DD"),
      endDate: moment().format("YYYY-MM-DD"),

      showAddModal: false,
      selectedAppointment: null,

      loggedInUserId,
      loggedInUserType,
    };
  }

  // ================== LIFECYCLE ==================
  componentDidMount() {
    console.log(JSON.parse(localStorage.getItem("user")));

    let loggedInUserId = null;
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        loggedInUserId = parsed?.id || parsed?.user?.id || null;
      }
    } catch {}

    this.setState({ loggedInUserId }, () => {
      this.fetchAcademicYears();
    });
  }
  componentDidUpdate(prevProps) {
  const refreshNow =
    this.props.location?.state?.refresh &&
    this.props.location !== prevProps.location;

  if (refreshNow) {
    this.fetchAppointments();

    // clear state to avoid infinite loop
    this.props.history.replace("/appointment", {});
  }
}


  // ================== ACADEMIC YEAR ==================
  fetchAcademicYears = () => {
    getRequest(GET_URL.getacademicyear.api)
      .then((res) => {
        const yearList = res?.data?.data || [];
        const year = checkLocalAcademicYear(yearList);

        this.setState(
          { yearList, year: year || "", loading: false },
          () => year && this.fetchAppointments()
        );
      })
      .catch(() => this.setState({ loading: false }));
  };

  onChangeYear = (e) => {
    const value = e.target.value;
    if (!value) return;

    SetAcademicYear(value);

    this.setState(
      { year: value, currentPage: 1, loading: true },
      () => this.fetchAppointments()
    );
  };

  // ================== STATUS NORMALIZATION ==================
  // -> Compute a *global* status so both organizer & attender see same result
  getComputedStatus = (appt /*, loggedInUserId */) => {
    const users = appt.user_data || [];
    const statuses = users
      .map((u) => (u.status || "").toLowerCase())
      .filter(Boolean);

    if (statuses.includes("rejected")) return "Rejected";
    if (statuses.includes("approved")) return "Approved";
    if (statuses.includes("attended") || statuses.includes("completed")) {
      return "Attended";
    }

    const globalStatus = (appt.status || "").toLowerCase();
    if (globalStatus === "attended" || globalStatus === "completed") {
      return "Attended";
    }
    if (globalStatus) return appt.status;

    return "Requested";
  };

  // ================== FETCH APPOINTMENTS ==================
  fetchAppointments = () => {
    const { startDate, endDate, loggedInUserId, year } = this.state;

    if (!year) {
      return this.setState({
        fullAppointments: [],
        filteredAppointments: [],
        paginatedAppointments: [],
        totalPages: 1,
        loading: false,
      });
    }

    const isAdmin = Number(loggedInUserId) === 1;

    const params = {
      start_date: startDate,
      end_date: endDate,
      limit: 100000,
      page_no: 1,
      academic_year: year,
      academic_year_id: year,
    };

    // For non-admin users, many backends filter by user_id
    if (!isAdmin && loggedInUserId) {
      params.user_id = loggedInUserId;
    }
    const staffIdFromSummary = this.props.location?.state?.staffId;

if (staffIdFromSummary) {
  params.user_id = staffIdFromSummary;
}


    getRequest(`${GET_URL.appointment.api}${loggedInUserId}/`, params)
      .then((res) => {
        const list = res?.data?.data || [];
        console.log(res.data.data,'res');
        const normalized = list.map((a) => ({
          ...a,
          computed_status: this.getComputedStatus(a, loggedInUserId),
        }));

        this.setState(
          { fullAppointments: normalized, loading: false },
          () => {
            this.computeFrontendSummary();
            this.applySummaryFilter(this.state.selectedSummary);
          }
        );
      })
      .catch(() => this.setState({ loading: false }));
  };

  // ================== FRONTEND SUMMARY CALC ==================
  computeFrontendSummary = () => {
    const { fullAppointments } = this.state;

    const summary = {
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

    this.setState({ summary });
  };

  // ================== FILTERING ==================
  applySummaryFilter = (type) => {
    const { fullAppointments } = this.state;

    let filtered = fullAppointments;

    if (type !== "all") {
      filtered = fullAppointments.filter((a) =>
        (a.computed_status || "").toLowerCase().includes(type)
      );
    }

    this.setState(
      { selectedSummary: type, filteredAppointments: filtered, currentPage: 1 },
      this.paginateResults
    );
  };

  // ================== PAGINATION ==================
  paginateResults = () => {
    const { filteredAppointments, currentPage, pageSize } = this.state;

    const start = (currentPage - 1) * pageSize;
    const pageItems = filteredAppointments.slice(start, start + pageSize);

    const totalPages = Math.max(
      1,
      Math.ceil(filteredAppointments.length / pageSize)
    );

    this.setState({
      paginatedAppointments: pageItems,
      totalPages,
    });
  };

  // ================== ACTIONS ==================
  handleApprove = (appointmentId, userId) => {
    postRequest(POST_URL.appointment.api, {
      id: appointmentId,
      user_id: userId,
      status: "Approved",
      status_remark: "Approved by attender",
      is_status_update: true,
    }).then(() => {
      Swal.fire("Approved!", "", "success");
      this.fetchAppointments();
    });
  };

  handleReject = (appointmentId, userId) => {
    postRequest(POST_URL.appointment.api, {
      id: appointmentId,
      user_id: userId,
      status: "Rejected",
      status_remark: "Rejected by attender",
      is_status_update: true,
    }).then(() => {
      Swal.fire("Rejected!", "", "warning");
      this.fetchAppointments();
    });
  };

  handleOpenAdd = () => {
    this.setState({ showAddModal: true, selectedAppointment: null });
  };

  handleCloseAdd = (saved = false) => {
    this.setState({ showAddModal: false });
    if (saved) this.fetchAppointments();
  };

  handleReschedule = (appointment) => {
    this.setState({ showAddModal: true, selectedAppointment: appointment });
  };

  // ================== SUMMARY CARD UI ==================
  renderSummaryCard(id, label, count, icon, color) {
    const isSelected = this.state.selectedSummary === id;
    return (
      <Box
        onClick={() => this.applySummaryFilter(id)}
        style={{
          flex: 1,
          minWidth: "180px",
          height: "130px",
          padding: "20px",
          marginRight: "18px",
          borderRadius: "20px",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transform: isSelected ? "scale(1.06)" : "scale(1)",
          transition: "0.3s",
          border: isSelected ? `3px solid ${color}` : "2px solid #e0e0e0",
          boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
        }}
      >
        <Box style={{ fontSize: 36, color }}>{icon}</Box>
        <Box style={{ fontSize: 26, fontWeight: 700 }}>{count}</Box>
        <Box style={{ fontSize: 15 }}>
          <FormattedMessage {...messages[label]} />
        </Box>
      </Box>
    );
  }

  // ================== RENDER ==================
  render() {
    const {
      loading,
      summary,
      filteredAppointments,
      paginatedAppointments,
      yearList,
      year,
      showAddModal,
      selectedAppointment,
      currentPage,
      totalPages,
      loggedInUserId,
      loggedInUserType,
    } = this.state;

    if (loading) return <LoadingGif />;

    return (
      <>
        <Paper className="paper-background" style={{ padding: "0 20px 20px" }}>
          {/* HEADER */}
          <Grid container>
            <Grid item md={7}>
              <div className="header-align heading">
                <FormattedMessage {...messages.appointmentsHeading} />
              </div>

              <Box style={{ marginTop: 12, maxWidth: 260 }}>
                <Dropdown
                  data={yearList}
                  name="year"
                  value={year}
                  onChange={this.onChangeYear}
                  label={"Academic Year"}
                  hideSelect={true}
                />
              </Box>
            </Grid>

            <Grid item md={5}>
              <div className="end-flex-prop header-align">
                <Button
                  variant="contained"
                  onClick={this.handleOpenAdd}
                  style={{
                    background: "#1976d2",
                    padding: "10px 24px",
                    borderRadius: "30px",
                    color: "#fff",
                  }}
                >
                  <AddCircleOutlineOutlinedIcon style={{ marginRight: 6 }} />
                  <FormattedMessage {...messages.scheduleAppointment} />
                </Button>
              </div>
            </Grid>
          </Grid>

          {/* SUMMARY CARDS */}
          <Box display="flex" justifyContent="space-between" marginTop="20px">
            {this.renderSummaryCard(
              "all",
              "all",
              summary.all,
              <LayersIcon />,
              "#3f51b5"
            )}
            {this.renderSummaryCard(
              "approved",
              "scheduled",
              summary.approved,
              <CheckCircleIcon />,
              "green"
            )}
            {this.renderSummaryCard(
              "requested",
              "pending",
              summary.requested,
              <HourglassEmptyIcon />,
              "orange"
            )}
            {this.renderSummaryCard(
              "rejected",
              "rejected",
              summary.rejected,
              <CancelIcon />,
              "red"
            )}
            {this.renderSummaryCard(
              "attended",
              "completed",
              summary.attended,
              <DoneAllIcon />,
              "#673ab7"
            )}
          </Box>

          {/* LIST */}
          <Grid container style={{ marginTop: "25px" }}>
            <Grid item xs={12}>
              {filteredAppointments.length === 0 ? (
                <Box className="empty">No appointments</Box>
              ) : (
                paginatedAppointments.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    loggedInUserId={loggedInUserId}
                    loggedInUserType={loggedInUserType}
                    onApprove={(userId) =>
                      this.handleApprove(appt.id, userId)
                    }
                    onReject={(userId) =>
                      this.handleReject(appt.id, userId)
                    }
                    onReschedule={() => this.handleReschedule(appt)}
                  />
                ))
              )}
            </Grid>
          </Grid>

          {/* PAGINATION */}
          <Box display="flex" justifyContent="center" mt={3}>
            <Button
              variant="outlined"
              disabled={currentPage === 1}
              onClick={() =>
                this.setState(
                  { currentPage: currentPage - 1 },
                  this.paginateResults
                )
              }
              style={{ marginRight: 10 }}
            >
              Previous
            </Button>

            <span
              style={{
                padding: "8px 16px",
                background: "#f3f4f6",
                borderRadius: "8px",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outlined"
              disabled={currentPage === totalPages}
              onClick={() =>
                this.setState(
                  { currentPage: currentPage + 1 },
                  this.paginateResults
                )
              }
              style={{ marginLeft: 10 }}
            >
              Next
            </Button>
          </Box>
        </Paper>

        {/* MODAL */}
        <Modal open={showAddModal} onClose={() => this.handleCloseAdd(false)}>
          <Box className="modal-body">
            <AppointmentForm
              initialData={selectedAppointment}
              onClose={this.handleCloseAdd}
              appointments={this.state.fullAppointments}
              loggedInUserId={loggedInUserId}
              userType={this.state.loggedInUserType}
              academicYear={year} 
            />
          </Box>
        </Modal>
      </>
    );
  }
}

export default withRouter(AppointmentList);
