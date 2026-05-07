import React, { Component } from "react";
import { Paper, Box, Grid, Button, Table, TableHead, TableRow, TableCell, TableBody } from "@material-ui/core";
import { withRouter } from "react-router-dom";
import classNames from "classnames";
import PeopleOutlinedIcon from "@material-ui/icons/PeopleOutlined";

import { GET_URL } from "Includes/urls";
import { getRequest } from "Includes/api/apicall";
import LoadingGif from "Components/LoadingGif";

class InterviewSetupView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      loading: true,
    };
  }

  componentDidMount() {
    const params = new URLSearchParams(this.props.location.search);
    const id = params.get("id");
    if (id) {
      this.fetchData(id);
    }
  }

  fetchData = (id) => {
    const url = `${GET_URL.interviewsetup.api}${id}/`;
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.data && response.data.data) {
        this.setState({ data: response.data.data, loading: false });
      } else {
        this.setState({ loading: false });
      }
    });
  };

  render() {
    const { data, loading } = this.state;

    if (loading) {
      return <LoadingGif />;
    }

    if (!data) {
      return (
        <Paper className={"paper-background"} style={{ textAlign: "center", padding: "40px" }}>
          Interview setup not found.
        </Paper>
      );
    }

    return (
      <Paper className={classNames("paper-background")}>
        <Grid container>
          <Grid item md={4} xs={12} className={classNames("header-align")}>
            <Box className="heading">Interview Setup Details</Box>
          </Grid>
          <Grid item md={8} xs={12}>
            <Box className={classNames("header-align", "end-flex-prop")}>
              <Button
                variant="contained"
                color="primary"
                className="editbutton-view"
                onClick={() => this.props.history.push("/interview/candidates/list")}
              >
                <PeopleOutlinedIcon className="visibility-icon" /> Candidates
              </Button>
              <Button
                variant="contained"
                className="editbutton-view ml-10"
                onClick={() => this.props.history.goBack()}
              >
                Back
              </Button>
            </Box>
          </Grid>
        </Grid>

        {/* Basic Details */}
        <Paper className="margin-top-20" style={{ padding: "20px" }}>
          <Box className="sub-heading" style={{ marginBottom: "16px" }}>Basic Details</Box>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell style={{ fontWeight: 600, width: "200px", border: "none" }}>Interview Name</TableCell>
                <TableCell style={{ border: "none" }}>{data.name}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell style={{ fontWeight: 600, border: "none" }}>Job Role</TableCell>
                <TableCell style={{ border: "none" }}>{data.job_role_name || "-"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell style={{ fontWeight: 600, border: "none" }}>Number of Rounds</TableCell>
                <TableCell style={{ border: "none" }}>{data.no_of_rounds}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell style={{ fontWeight: 600, border: "none" }}>Description</TableCell>
                <TableCell style={{ border: "none" }}>{data.description || "-"}</TableCell>
              </TableRow>
              {data.requirements ? (
                <TableRow>
                  <TableCell style={{ fontWeight: 600, border: "none" }}>Requirements</TableCell>
                  <TableCell style={{ border: "none", whiteSpace: "pre-line" }}>{data.requirements}</TableCell>
                </TableRow>
              ) : null}
              {data.instructions ? (
                <TableRow>
                  <TableCell style={{ fontWeight: 600, border: "none" }}>Instructions</TableCell>
                  <TableCell style={{ border: "none", whiteSpace: "pre-line" }}>{data.instructions}</TableCell>
                </TableRow>
              ) : null}
              <TableRow>
                <TableCell style={{ fontWeight: 600, border: "none" }}>Status</TableCell>
                <TableCell style={{ border: "none" }}>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      background: data.is_active ? "#e8f5e9" : "#fce4ec",
                      color: data.is_active ? "#2e7d32" : "#c62828",
                    }}
                  >
                    {data.is_active ? "Active" : "Inactive"}
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Paper>

        {/* Interview Rounds */}
        <Paper className="margin-top-20" style={{ padding: "20px" }}>
          <Box className="sub-heading" style={{ marginBottom: "16px" }}>Interview Rounds</Box>

          {data.rounds && data.rounds.length > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell style={{ fontWeight: 600 }}>Round</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>Assigned Staff</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.rounds.map((round) => (
                  <TableRow key={round.id || round.round_number}>
                    <TableCell>Round {round.round_number}</TableCell>
                    <TableCell>{round.round_name || "-"}</TableCell>
                    <TableCell>{round.assigned_staff_name || "-"}</TableCell>
                    <TableCell>{round.description || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Box style={{ color: "#999", padding: "16px 0" }}>No rounds configured.</Box>
          )}
        </Paper>
      </Paper>
    );
  }
}

export default withRouter(InterviewSetupView);
