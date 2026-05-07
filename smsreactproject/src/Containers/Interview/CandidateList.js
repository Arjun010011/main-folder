import React, { Component } from "react";
import {
  Paper, Box, Grid, CircularProgress, Button,
  Table, TableHead, TableRow, TableCell, TableBody, Tabs, Tab
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import classNames from "classnames";

import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import LoadingGif from "Components/LoadingGif";
import { options } from "Constants";
import { dateFormat } from "Includes/functions";

class CandidateList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      loading: true,
      tableUpdating: false,
      totalCount: 0,
      statusFilterIndex: 0,
      statusFilters: [
        { value: "", label: "All" },
        { value: "1", label: "New" },
        { value: "2", label: "In Progress" },
        { value: "3", label: "On Hold" },
        { value: "4", label: "Selected" },
        { value: "5", label: "Rejected" },
        { value: "6", label: "Hired" },
      ],
      pagination: {
        page: 1,
        limit: 10,
        searchText: "",
        sortOrder: "desc",
        sortField: "id",
      },
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
          name: "current_round",
          label: "Round",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value) => value || 1,
          },
        },
        {
          name: "status",
          label: "Status",
          options: {
            filter: false,
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
          name: "applied_date",
          label: "Applied Date",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value) => dateFormat(value, 'DD/MM/YYYY'),
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

              return (
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  {(() => {
                    const currentRound = row.current_round || 1;
                    const hasCurrentRoundEval = row.evaluations && row.evaluations.some(
                      (ev) => ev.round_number === currentRound
                    );
                    const isMyCandidate = row.is_my_round || row.is_incharge;
                    const buttons = [];

                    // Active evaluation: candidate is in progress and can be evaluated
                    if (row.can_evaluate && isMyCandidate) {
                      buttons.push(
                        <Button
                          key="eval"
                          size="small"
                          variant="outlined"
                          style={{
                            fontSize: "12px", textTransform: "none", borderRadius: "2px",
                            borderColor: "#1565c0", color: "#1565c0", padding: "4px 14px",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            this.handleEvaluate(row);
                          }}
                        >
                          {hasCurrentRoundEval ? `Re-evaluate Rd ${currentRound}` : `Evaluate Rd ${currentRound}`}
                        </Button>
                      );
                    } else if (row.can_evaluate && !isMyCandidate) {
                      buttons.push(
                        <span key="other" style={{ fontSize: "11px", color: "#999", fontStyle: "italic" }}>Assigned to other staff</span>
                      );
                    } else if ((row.status === 4 || row.status === 5) && isMyCandidate) {
                      // Selected/Rejected — allow re-evaluation to change decision
                      buttons.push(
                        <Button
                          key="re-eval"
                          size="small"
                          variant="outlined"
                          style={{
                            fontSize: "12px", textTransform: "none", borderRadius: "2px",
                            borderColor: "#1565c0", color: "#1565c0", padding: "4px 14px",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            this.handleEvaluate(row);
                          }}
                        >
                          Re-evaluate Rd {currentRound}
                        </Button>
                      );
                    } else if (row.status !== 4 && row.status !== 5 && row.status !== 6) {
                      buttons.push(
                        <span key="await" style={{ fontSize: "11px", color: "#999", fontStyle: "italic" }}>Awaiting previous round</span>
                      );
                    }

                    return buttons;
                  })()}
                  {row.status === 4 && (
                    <Button
                      size="small"
                      variant="contained"
                      style={{
                        backgroundColor: "#1565c0", color: "#fff",
                        fontSize: "12px", textTransform: "none", borderRadius: "2px", padding: "4px 14px",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        this.handleHire(row);
                      }}
                    >
                      Hire
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
      2: { bg: "#fff8e1", color: "#f57f17" },
      3: { bg: "#fff3e0", color: "#e65100" },
      4: { bg: "#e8f5e9", color: "#2e7d32" },
      5: { bg: "#fce4ec", color: "#c62828" },
      6: { bg: "#e0f2f1", color: "#00695c" },
    };
    return colors[status] || { bg: "#f5f5f5", color: "#333" };
  };

  handleEvaluate = (item) => {
    this.props.history.push(`/interview/candidate/evaluate?application_id=${item.id}`);
  };

  handleHire = (item) => {
    this.props.history.push(`/hr/staff/add?prefill=interview&application_id=${item.id}`);
  };

  handleTabChange = (event, newValue) => {
    let temp = { ...this.state.pagination };
    temp.page = 1;
    this.setState({ statusFilterIndex: newValue, pagination: temp }, this.fetchData);
  };

  fetchData = () => {
    const { pagination, statusFilterIndex, statusFilters } = this.state;
    const filterValue = statusFilters[statusFilterIndex].value;

    let url = `${GET_URL.jobapplication.api}?pageno=${pagination.page}&limit=${pagination.limit}&my_interviews=1`;
    if (filterValue) url += `&status=${filterValue}`;

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
    if (!row || !row.evaluations || row.evaluations.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={9} style={{ padding: "16px 50px", background: "#f8f9fa" }}>
            <p style={{ color: "#999", margin: 0, fontSize: "14px" }}>No evaluations yet.</p>
          </TableCell>
        </TableRow>
      );
    }

    return (
      <TableRow>
        <TableCell colSpan={9} style={{ padding: "16px 50px", background: "#f8f9fa" }}>
          <div style={{ padding: "16px", background: "#fff", borderRadius: "8px", border: "1px solid #e9ecef" }}>
            <strong style={{ fontSize: "14px" }}>Evaluation History</strong>
            <Table size="small" style={{ marginTop: "10px" }}>
              <TableHead>
                <TableRow>
                  <TableCell style={{ fontWeight: 600 }}>Round</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>Interviewer</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>Notes</TableCell>
                  <TableCell style={{ fontWeight: 600 }} align="center">Decision</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {row.evaluations.map((ev, i) => {
                  const decisionColors = {
                    selected: { bg: "#e8f5e9", color: "#2e7d32" },
                    on_hold: { bg: "#fff3e0", color: "#e65100" },
                    rejected: { bg: "#fce4ec", color: "#c62828" },
                  };
                  const dc = decisionColors[ev.decision] || { bg: "#f5f5f5", color: "#333" };
                  return (
                    <TableRow key={i}>
                      <TableCell>Round {ev.round_number} - {ev.round_name || ""}</TableCell>
                      <TableCell>{ev.evaluator_name || "-"}</TableCell>
                      <TableCell style={{ maxWidth: "300px", wordBreak: "break-word" }}>{ev.notes || "-"}</TableCell>
                      <TableCell align="center">
                        <span style={{ padding: "3px 10px", borderRadius: "10px", fontSize: "11px", fontWeight: 600, background: dc.bg, color: dc.color }}>
                          {ev.decision || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {ev.created ? dateFormat(ev.created, 'DD/MM/YYYY') : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  render() {
    const { data, loading, tableUpdating, columns, totalCount, pagination, statusFilterIndex, statusFilters } = this.state;

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
            <Box className="heading">Candidates</Box>
          </Grid>
          <Grid item md={6} xs={12}>
            <Box className={classNames("header-align", "end-flex-prop")}>
              <Button
                variant="contained"
                onClick={() => this.props.history.goBack()}
                className="editbutton-view"
              >
                Back
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Box mt={2}>
          <Paper>
            <Tabs
              value={statusFilterIndex}
              onChange={this.handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="scrollable"
              scrollButtons="auto"
            >
              {statusFilters.map((filter, index) => (
                <Tab key={index} label={filter.label} />
              ))}
            </Tabs>
          </Paper>
        </Box>

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
      </Paper>
    );
  }
}

export default withRouter(CandidateList);
