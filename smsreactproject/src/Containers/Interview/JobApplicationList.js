import React, { Component } from "react";
import {
  Paper, Box, Grid, CircularProgress, Button,
  Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField
} from "@material-ui/core";
import { withRouter, Link } from "react-router-dom";
import classNames from "classnames";
import Swal from "sweetalert2";
import EventIcon from "@material-ui/icons/Event";
import { AsyncPaginate } from "react-select-async-paginate";

import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import { MuiPickersUtilsProvider, KeyboardTimePicker } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';

import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL } from "Includes/urls";
import LoadingGif from "Components/LoadingGif";
import { options } from "Constants";
import { dateFormat } from "Includes/functions";

class JobApplicationList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      loading: true,
      tableUpdating: false,
      totalCount: 0,
      pagination: {
        page: 1,
        limit: 10,
        searchText: "",
        sortOrder: "desc",
        sortField: "id",
      },
      // Schedule / Reschedule dialog
      scheduleDialogOpen: false,
      scheduleAppId: null,
      scheduleAppName: "",
      selectedSetup: null,      // { value, label } for AsyncPaginate
      scheduledDate: "",
      scheduledTime: "",
      isReschedule: false,
      scheduling: false,
      columns: [
        {
          name: "id",
          label: "id",
          options: { filter: false, sort: false, display: false },
        },
        {
          name: "full_name",
          label: "Name",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta) => {
              const row = this.state.data[tableMeta.rowIndex];
              if (!row) return "";
              if (value) return value;
              return `${row.first_name} ${row.last_name || ""}`.trim();
            },
          },
        },
        {
          name: "job_role_name",
          label: "Job Role",
          options: { filter: true, sort: true },
        },
        {
          name: "mobile_num",
          label: "Phone",
          options: { filter: false, sort: false },
        },
        {
          name: "applied_date",
          label: "Applied Date",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value) => dateFormat(value, "DD/MM/YYYY"),
          },
        },
        {
          name: "status",
          label: "Status",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value) => {
              const statusStyle = this.getStatusColor(value);
              return (
                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: statusStyle.bg,
                    color: statusStyle.color,
                  }}
                >
                  {this.getStatusLabel(value)}
                </span>
              );
            },
          },
        },
        {
          name: "scheduled_date",
          label: "Scheduled",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta) => {
              const row = this.state.data[tableMeta.rowIndex];
              if (!row) return "";
              if (!value) return <span style={{ color: "#999", fontSize: "13px" }}>—</span>;
              let formattedTime = "";
              if (row.scheduled_time) {
                const parts = row.scheduled_time.split(":");
                if (parts.length >= 2) {
                  const h = parseInt(parts[0], 10);
                  const suffix = h >= 12 ? "PM" : "AM";
                  const displayH = h % 12 || 12;
                  formattedTime = `${displayH}:${parts[1]} ${suffix}`;
                }
              }
              return (
                <div style={{ fontSize: "13px" }}>
                  <div style={{ fontWeight: 500 }}>{dateFormat(value, "DD/MM/YYYY")}</div>
                  {formattedTime && <div style={{ color: "#666" }}>{formattedTime}</div>}
                </div>
              );
            },
          },
        },
        {
          name: "Actions",
          label: "Action",
          options: {
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta) => {
              const row = this.state.data[tableMeta.rowIndex];
              if (!row) return "";
              const hasSchedule = !!row.scheduled_date;
              return (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {!hasSchedule ? (
                    <Button
                      size="small"
                      variant="outlined"
                      style={{
                        fontSize: "12px", textTransform: "none", borderRadius: "2px",
                        borderColor: "#1565c0", color: "#1565c0", padding: "4px 14px",
                      }}
                      onClick={() => this.openScheduleDialog(row, false)}
                    >
                      Schedule
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      style={{
                        fontSize: "12px", textTransform: "none", borderRadius: "2px",
                        borderColor: "#1565c0", color: "#1565c0", padding: "4px 14px",
                      }}
                      onClick={() => this.openScheduleDialog(row, true)}
                    >
                      <EventIcon style={{ fontSize: "14px", marginRight: "4px" }} />
                      Reschedule
                    </Button>
                  )}
                </div>
              );
            },
          },
        },
      ],
    };
  }

  componentDidMount() {
    this.fetchData();
  }

  getStatusLabel = (status) => {
    const labels = { 1: "New", 2: "In Progress", 3: "On Hold", 4: "Selected", 5: "Rejected", 6: "Hired" };
    return labels[status] || "Unknown";
  };

  getStatusColor = (status) => {
    const colors = {
      1: { bg: "#e3f2fd", color: "#1565c0" },
      2: { bg: "#fff3e0", color: "#e65100" },
      3: { bg: "#fafafa", color: "#757575" },
      4: { bg: "#e8f5e9", color: "#2e7d32" },
      5: { bg: "#fce4ec", color: "#c62828" },
      6: { bg: "#e8f5e9", color: "#1b5e20" },
    };
    return colors[status] || { bg: "#f5f5f5", color: "#333" };
  };

  fetchData = () => {
    const { pagination } = this.state;
    const url = `${GET_URL.jobapplication.api}?pageno=${pagination.page}&limit=${pagination.limit}`;
    this.setState({ tableUpdating: true });

    getRequest(url, {}, this.props)
      .then((response) => {
        if (response && response.data && response.data.data) {
          this.setState({
            data: response.data.data.data_list || [],
            totalCount: response.data.data.count || 0,
            loading: false,
            tableUpdating: false,
          });
        } else {
          this.setState({ loading: false, tableUpdating: false });
        }
      })
      .catch(() => this.setState({ loading: false, tableUpdating: false }));
  };

  loadSetupOptions = async (search, prevOptions, { page }) => {
    let filteredOptions = [];
    let hasMore = false;
    const url = `${GET_URL.interviewsetup.api}?pageno=${page + 1}&limit=15${search ? `&search=${search}` : ""}`;
    try {
      const response = await getRequest(url, {}, this.props);
      if (response && response.data && response.data.data) {
        const items = response.data.data.data_list || [];
        filteredOptions = items.map((s) => ({
          value: s.id,
          label: `${s.name} — ${s.job_role_name || ""} (${s.no_of_rounds} rounds)`,
        }));
        hasMore = response.data.data.next ? true : false;
      }
    } catch (err) { /* ignore */ }
    return { options: filteredOptions, hasMore, additional: { page: page + 1 } };
  };

  openScheduleDialog = (row, isReschedule) => {
    const name = row.full_name || `${row.first_name} ${row.last_name || ""}`.trim();
    this.setState({
      scheduleDialogOpen: true,
      scheduleAppId: row.id,
      scheduleAppName: name,
      selectedSetup: row.interview_setup
        ? { value: row.interview_setup, label: row.interview_setup_name || `Setup #${row.interview_setup}` }
        : null,
      scheduledDate: row.scheduled_date || "",
      scheduledTime: row.scheduled_time ? row.scheduled_time.substring(0, 5) : "",
      isReschedule,
    });
  };

  closeScheduleDialog = () => {
    this.setState({
      scheduleDialogOpen: false, scheduleAppId: null,
      selectedSetup: null, scheduledDate: "", scheduledTime: "", isReschedule: false,
    });
  };

  handleSchedule = () => {
    const { scheduleAppId, selectedSetup, scheduledDate, scheduledTime, isReschedule } = this.state;

    if (!isReschedule && !selectedSetup) {
      Swal.fire({ icon: "warning", title: "Required", text: "Please select an interview setup." });
      return;
    }
    if (!scheduledDate) {
      Swal.fire({ icon: "warning", title: "Required", text: "Please select a date." });
      return;
    }

    this.setState({ scheduling: true });
    const url = `${PUT_URL.jobapplication.api}${scheduleAppId}/`;
    const payload = {
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime || null,
    };
    if (!isReschedule) {
      payload.interview_setup = selectedSetup.value;
      payload.status = 2; // In Progress
    }

    putRequest(url, payload, this.props).then((response) => {
      this.setState({ scheduling: false });
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end", icon: "success",
          title: isReschedule ? "Interview Rescheduled" : "Interview Scheduled",
          showConfirmButton: false, timer: 1500,
        });
        this.closeScheduleDialog();
        this.fetchData();
      } else {
        Swal.fire({ icon: "error", title: "Error", text: "Something went wrong." });
      }
    }).catch(() => {
      this.setState({ scheduling: false });
      Swal.fire({ icon: "error", title: "Error", text: "Something went wrong." });
    });
  };


  onTableChange = (tableState, action) => {
    if (action === "changePage") {
      let temp = { ...this.state.pagination };
      temp.page = tableState.page + 1;
      this.setState({ pagination: temp }, this.fetchData);
    } else if (action === "changeRowsPerPage") {
      let temp = { ...this.state.pagination };
      temp.limit = tableState.rowsPerPage;
      temp.page = 1;
      this.setState({ pagination: temp }, this.fetchData);
    }
  };

  renderExpandableRow = (rowData, rowMeta) => {
    const row = this.state.data[rowMeta.dataIndex];
    if (!row) return null;

    const infoStyle = { padding: "4px 0", fontSize: "13px", color: "#333" };
    const labelStyle = { fontWeight: 600, color: "#555", minWidth: "140px", display: "inline-block" };

    return (
      <TableRow>
        <TableCell colSpan={10} style={{ padding: "16px 50px", background: "#f8f9fa" }}>
          <div style={{ padding: "16px", background: "#fff", borderRadius: "8px", border: "1px solid #e9ecef" }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <div style={infoStyle}><span style={labelStyle}>Email:</span> {row.email || "-"}</div>
                <div style={infoStyle}><span style={labelStyle}>Date of Birth:</span> {row.dob ? dateFormat(row.dob, "DD/MM/YYYY") : "-"}</div>
                <div style={infoStyle}><span style={labelStyle}>Gender:</span> {row.gender || "-"}</div>
                <div style={infoStyle}><span style={labelStyle}>Qualification:</span> {row.qualification || "-"}</div>
              </Grid>
              <Grid item xs={12} md={6}>
                <div style={infoStyle}><span style={labelStyle}>Experience:</span> {row.experience_years != null ? `${row.experience_years} years` : "-"}</div>
                <div style={infoStyle}><span style={labelStyle}>Current Org:</span> {row.current_organization || "-"}</div>
                <div style={infoStyle}><span style={labelStyle}>Address:</span> {row.address || "-"}</div>
                <div style={infoStyle}><span style={labelStyle}>Application #:</span> {row.application_num || "-"}</div>
              </Grid>
              {row.interview_setup_name && (
                <Grid item xs={12}>
                  <div style={{ ...infoStyle, marginTop: "8px", padding: "8px 12px", background: "#e8f5e9", borderRadius: "6px" }}>
                    <span style={labelStyle}>Interview:</span> {row.interview_setup_name}
                  </div>
                </Grid>
              )}
            </Grid>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  render() {
    const {
      data, loading, tableUpdating, columns, totalCount, pagination,
      scheduleDialogOpen, scheduleAppName, selectedSetup,
      scheduling, scheduledDate, scheduledTime, isReschedule
    } = this.state;

    if (loading) {
      return <LoadingGif />;
    }

    let modifiedOptions = {
      ...options,
      serverSide: true,
      expandableRows: true,
      expandableRowsHeader: false,
      renderExpandableRow: this.renderExpandableRow,
      textLabels: {
        body: {
          noMatch: tableUpdating
            ? "Loading..."
            : "Sorry, there is no matching data to display",
        },
      },
    };

    return (
      <Paper className={classNames("paper-background")}>
        <Grid container>
          <Grid item md={6} xs={12} className={classNames("header-align")}>
            <Box className="heading">Job Applications</Box>
          </Grid>
          <Grid item md={6} xs={12}>
            <Box className={classNames("header-align", "end-flex-prop")}>
              <Button
                variant="contained"
                component={Link}
                to="/interview/applications/add"
                className="editbutton-view"
              >
                <AddCircleOutlineIcon className="visibility-icon" />{" "}
                Add Application
              </Button>
              <Button
                variant="contained"
                onClick={() => this.props.history.goBack()}
                className="editbutton-view ml-10"
              >
                Back
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Grid container spacing={3} className={classNames("flex-justify-center")}>
          <Grid item md={12} xs={12}>
            <Box mt={2} width="100%">
              <Paper>
                <AllMUIDataTable
                  key={data}
                  title={
                    tableUpdating ? (
                      <CircularProgress className="white-text" />
                    ) : (
                      ""
                    )
                  }
                  data={data}
                  columns={columns}
                  options={modifiedOptions}
                  onTableChange={this.onTableChange}
                  serverSide={true}
                  pagination={pagination}
                  count={totalCount}
                />
              </Paper>
            </Box>
          </Grid>
        </Grid>

        {/* Schedule / Reschedule Dialog */}
        <Dialog open={scheduleDialogOpen} onClose={this.closeScheduleDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{isReschedule ? "Reschedule Interview" : "Schedule Interview"}</DialogTitle>
          <DialogContent>
            <Box mb={2} style={{ fontSize: "14px", color: "#555" }}>
              {isReschedule
                ? <>Change the date and time for <strong>{scheduleAppName}</strong></>
                : <>Assign an interview and pick a date for <strong>{scheduleAppName}</strong></>
              }
            </Box>

            {/* Interview Setup (only for new schedule) */}
            {!isReschedule && (
              <Box style={{ marginBottom: "16px" }}>
                <Box style={{ fontSize: "12px", color: "#555", marginBottom: "4px" }}>Interview Setup *</Box>
                <AsyncPaginate
                  value={selectedSetup}
                  loadOptions={this.loadSetupOptions}
                  onChange={(val) => this.setState({ selectedSetup: val })}
                  additional={{ page: 0 }}
                  placeholder="Search interview setup..."
                  isClearable
                  styles={{
                    control: (base) => ({ ...base, minHeight: 40, fontSize: 14 }),
                    menu: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                />
              </Box>
            )}

            {/* Date and Time */}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Date *"
                  type="date"
                  fullWidth
                  size="small"
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  value={scheduledDate}
                  onChange={(e) => this.setState({ scheduledDate: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                  <KeyboardTimePicker
                    label="Time *"
                    placeholder="08:00 AM"
                    mask="__:__ _M"
                    ampm={true}
                    inputVariant="outlined"
                    fullWidth
                    size="small"
                    value={scheduledTime ? new Date(`2000-01-01T${scheduledTime}`) : null}
                    onChange={(date) => {
                      if (date && !isNaN(date.getTime())) {
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        this.setState({ scheduledTime: `${hours}:${minutes}` });
                      } else {
                        this.setState({ scheduledTime: "" });
                      }
                    }}
                  />
                </MuiPickersUtilsProvider>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.closeScheduleDialog} disabled={scheduling}>
              Cancel
            </Button>
            <Button
              onClick={this.handleSchedule}
              color="primary"
              variant="contained"
              disabled={scheduling}
            >
              {scheduling ? "Saving..." : isReschedule ? "Reschedule" : "Schedule"}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    );
  }
}

export default withRouter(JobApplicationList);
