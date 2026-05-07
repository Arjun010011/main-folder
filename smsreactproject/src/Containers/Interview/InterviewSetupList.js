import React, { Component } from "react";
import {
  Paper, Box, Button, Grid, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody
} from "@material-ui/core";
import { Link, withRouter } from "react-router-dom";
import classNames from "classnames";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import GetAppIcon from "@material-ui/icons/GetApp";
import Swal from "sweetalert2";

import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest, deleteRequest } from "Includes/api/apicall";
import { GET_URL, DEL_URL } from "Includes/urls";
import LoadingGif from "Components/LoadingGif";
import { options } from "Constants";
import { isUserHasPermission } from "Includes/functions";
import {
  buildQrPosterDataUrl,
  getInstituteNameFromStorage,
  triggerQrPosterDownload,
} from "Includes/buildQrPosterImage";
import StudentListActions from "Includes/StudentListActions";
import { Actions } from "Constants/permissions";

class InterviewSetupList extends Component {
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
      columns: [
        {
          name: "id",
          label: "id",
          options: { filter: false, sort: false, display: false },
        },
        {
          name: "name",
          label: "Name",
          options: { filter: true, sort: true },
        },
        {
          name: "job_role_name",
          label: "Job Role",
          options: { filter: true, sort: true },
        },
        {
          name: "no_of_rounds",
          label: "Rounds",
          options: { filter: false, sort: true },
        },
        {
          name: "incharge_staff_name",
          label: "Incharge Staff",
          options: {
            filter: true, sort: true,
            customBodyRender: (value) => value || "—",
          },
        },
        {
          name: "Actions",
          label: "Action",
          options: {
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta) => {
              const rowId = tableMeta.rowData[0];
              const row = this.state.data[tableMeta.rowIndex];
              return (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Button
                    size="small"
                    variant="outlined"
                    style={{
                      fontSize: "12px", textTransform: "none", borderRadius: "2px",
                      borderColor: "#1565c0", color: "#1565c0", padding: "4px 14px",
                    }}
                    onClick={() => this.generateQRCode(row ? row.public_token : rowId)}
                  >
                    <GetAppIcon style={{ fontSize: 16, marginRight: 4 }} /> QR
                  </Button>
                  <StudentListActions
                    id={rowId}
                    index={tableMeta.rowIndex}
                    deleteStudent={this.handleDelete}
                    editURL={"/interview/setup/edit"}
                    viewURL={"/interview/setup/view"}
                    viewExtraParams={{ id: rowId }}
                    editExtraParams={{ id: rowId }}
                    enabledActions={["view", "edit", "delete"]}
                  />
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

  fetchData = () => {
    const { pagination } = this.state;
    const url = `${GET_URL.interviewsetup.api}?pageno=${pagination.page}&limit=${pagination.limit}`;
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

  handleDelete = (id, index) => {
    Swal.fire({
      title: "Are you sure?",
      text: "Once deleted, you will not be able to recover this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.value) {
        const url = `${DEL_URL.interviewsetup.api}${id}/`;
        deleteRequest(url, {}, this.props).then((response) => {
          if (response && response.status === 200) {
            Swal.fire({
              position: "top-end",
              icon: "success",
              title: "Deleted Successfully",
              showConfirmButton: false,
              timer: 1500,
            });
            this.fetchData();
          }
        });
      }
    });
  };

  generateQRCode = (token) => {
    if (!token) {
      Swal.fire({ icon: "warning", title: "Missing token", text: "Public form token is not available for this setup." });
      return;
    }
    const baseUrl = window.location.origin;
    const publicFormUrl = `${baseUrl}/public-job-application?token=${token}`;
    const schoolName = getInstituteNameFromStorage();

    buildQrPosterDataUrl(
      publicFormUrl,
      {
        schoolName,
        headline: "Scan this QR code to submit a job application",
        subline: "",
        footer: "Open your phone camera and scan the code above.\nYou will be taken to the online job application form.",
        qrWidth: 280,
        theme: "enquiry",
      },
      (err, dataUrl) => {
        if (err || !dataUrl) {
          Swal.fire({ icon: "error", title: "Error", text: "Failed to generate QR code" });
          return;
        }
        triggerQrPosterDownload(dataUrl, `job-application-qr-${token}.png`);

        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "QR poster downloaded successfully",
          showConfirmButton: false,
          timer: 1500,
        });
      }
    );
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
    if (!row || !row.rounds || row.rounds.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} style={{ padding: "16px 50px", background: "#f8f9fa" }}>
            <p style={{ color: "#999", margin: 0, fontSize: "14px" }}>No rounds configured.</p>
          </TableCell>
        </TableRow>
      );
    }

    return (
      <TableRow>
        <TableCell colSpan={6} style={{ padding: "16px 50px", background: "#f8f9fa" }}>
          <div style={{ padding: "16px", background: "#fff", borderRadius: "8px", border: "1px solid #e9ecef" }}>
            <strong style={{ fontSize: "14px" }}>Interview Rounds</strong>
            <Table size="small" style={{ marginTop: "10px" }}>
              <TableHead>
                <TableRow>
                  <TableCell style={{ fontWeight: 600 }}>Round</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>Assigned Staff</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {row.rounds.map((round, i) => (
                  <TableRow key={i}>
                    <TableCell>Round {round.round_number}</TableCell>
                    <TableCell>{round.round_name || "-"}</TableCell>
                    <TableCell>{round.assigned_staff_name || "-"}</TableCell>
                    <TableCell>{round.description || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  render() {
    const { data, loading, tableUpdating, columns, totalCount, pagination } = this.state;

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
          <Grid item md={4} xs={12} className={classNames("header-align")}>
            <Box className="heading">Interview Setups</Box>
          </Grid>
          <Grid item md={8} xs={12}>
            <Box className={classNames("header-align", "end-flex-prop")}>

              <Button
                variant="contained"
                onClick={() => this.props.history.push("/interview/candidates/list")}
                className="editbutton-view ml-10"
              >
                Candidates
              </Button>
              <Button
                variant="contained"
                onClick={() => this.props.history.push("/interview/applications/list")}
                className="editbutton-view ml-10"
              >
                Applications
              </Button>
              <Button
                variant="contained"
                component={Link}
                to={"/interview/setup/add"}
                className="editbutton-view ml-10"
              >
                <AddCircleOutlineIcon className="visibility-icon" /> Add Setup
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Grid
          container
          spacing={3}
          className={classNames("flex-justify-center")}
        >
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

export default withRouter(InterviewSetupList);