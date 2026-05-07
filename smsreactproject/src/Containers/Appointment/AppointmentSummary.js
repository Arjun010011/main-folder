import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import {
  Paper,
  Box,
  Grid,
  Typography,
  CircularProgress,
} from "@material-ui/core";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { Dropdown } from "Components/DropDown";
import { checkLocalAcademicYear } from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import "./styles.scss";

class AppointmentSummary extends Component {
  state = {
    loading: true,
    staffList: [],
    appointmentList: [],
    summaryData: [],
    yearList: [],
    year: "",
  };

  componentDidMount() {
    this.fetchAcademicYears();
  }

  // ---------------- ACADEMIC YEAR ----------------
  fetchAcademicYears = () => {
    getRequest(GET_URL.getacademicyear.api)
      .then((res) => {
        const yearList = res?.data?.data || [];
        const year = checkLocalAcademicYear(yearList);

        this.setState(
          { yearList, year, loading: false },
          () => year && this.fetchData()
        );
      })
      .catch(() => this.setState({ loading: false }));
  };

  onChangeYear = (e) => {
    const year = e.target.value;
    this.setState({ year, loading: true }, this.fetchData);
  };

  // ---------------- FETCH STAFF + APPOINTMENTS ----------------
  fetchData = async () => {
    const { year } = this.state;

    try {
      const staffRes = await getRequest(GET_URL.staff.api);
      const appointmentRes = await getRequest(GET_URL.appointment.api, {
        academic_year: year,
        academic_year_id: year,
        limit: 100000,
        page_no: 1,
      });

      const staffList = staffRes?.data?.data || [];
      const appointments = appointmentRes?.data?.data || [];

      this.prepareSummary(staffList, appointments);
    } catch {
      this.setState({ loading: false });
    }
  };

  // ---------------- PREPARE SUMMARY ----------------
  prepareSummary = (staffList, appointments) => {
    const summary = staffList.map((staff) => {
      const staffAppointments = appointments.filter((a) =>
        a.user_data?.some(
          (u) =>
            u.user_type === "Organizer" &&
            Number(u.user) === Number(staff.user_id)
        )
      );

      const countByStatus = (status) =>
        staffAppointments.filter(
          (a) => (a.computed_status || a.status || "")
            .toLowerCase() === status
        ).length;

      return {
        staffId: staff.user_id,
        name: staff.full_name,
        total: staffAppointments.length,
        approved: countByStatus("approved"),
        requested: countByStatus("requested"),
        rejected: countByStatus("rejected"),
        attended: countByStatus("attended"),
      };
    });

    this.setState({ summaryData: summary, loading: false });
  };

  // ---------------- NAVIGATION ----------------
  openStaffAppointments = (staffId) => {
    this.props.history.push("/my-appointment", {
      staffId,
    });
  };

  // ---------------- RENDER ----------------
  render() {
    const { loading, summaryData, yearList, year } = this.state;

    if (loading) return <LoadingGif />;

    return (
      <Paper className="paper-background" style={{ padding: 20 }}>
        {/* HEADER */}
        <Box mb={2}>
          <Typography variant="h5" fontWeight={700}>
            Appointment Summary
          </Typography>

          <Box mt={2} width={260}>
            <Dropdown
              data={yearList}
              name="year"
              value={year}
              onChange={this.onChangeYear}
              label="Academic Year"
              hideSelect
            />
          </Box>
        </Box>

        {/* TABLE HEADER */}
        <Grid
          container
          style={{
            padding: "12px",
            fontWeight: 600,
            background: "#f1f5f9",
            borderRadius: 8,
          }}
        >
          <Grid item md={3}>Staff</Grid>
          <Grid item md={1}>Total</Grid>
          <Grid item md={2}>Approved</Grid>
          <Grid item md={2}>Pending</Grid>
          <Grid item md={2}>Rejected</Grid>
          <Grid item md={2}>Completed</Grid>
        </Grid>

        {/* TABLE ROWS */}
        {summaryData.map((row) => (
          <Grid
            container
            key={row.staffId}
            onClick={() => this.openStaffAppointments(row.staffId)}
            style={{
              padding: "12px",
              marginTop: 8,
              cursor: "pointer",
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
            }}
          >
            <Grid item md={3}>{row.name}</Grid>
            <Grid item md={1}>{row.total}</Grid>
            <Grid item md={2}>{row.approved}</Grid>
            <Grid item md={2}>{row.requested}</Grid>
            <Grid item md={2}>{row.rejected}</Grid>
            <Grid item md={2}>{row.attended}</Grid>
          </Grid>
        ))}
      </Paper>
    );
  }
}

export default withRouter(AppointmentSummary);
