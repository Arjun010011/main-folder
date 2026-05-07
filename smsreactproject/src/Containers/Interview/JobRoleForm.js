import React, { Component } from "react";
import { Paper, Box, Grid, Button, TextField, IconButton } from "@material-ui/core";
import { withRouter } from "react-router-dom";
import classNames from "classnames";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import RemoveCircleOutlineIcon from "@material-ui/icons/RemoveCircleOutline";
import Swal from "sweetalert2";

import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import { getRequest, postRequest, putRequest } from "Includes/api/apicall";
import LoadingGif from "Components/LoadingGif";
import { getUrlParam } from "Includes/functions";

class JobRoleForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      rows: [{ name: "", description: "" }],
      editMode: false,
      editId: null,
      loading: false,
      submitting: false,
    };
  }

  componentDidMount() {
    const params = getUrlParam();
    if (params.id) {
      this.setState({ editMode: true, editId: params.id, loading: true });
      this.fetchData(params.id);
    }
  }

  fetchData = (id) => {
    const url = `${GET_URL.jobrole.api}${id}/`;
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.data && response.data.data) {
        const data = response.data.data;
        this.setState({
          rows: [{ name: data.name || "", description: data.description || "" }],
          loading: false,
        });
      } else {
        this.setState({ loading: false });
      }
    });
  };

  handleRowChange = (index, field, value) => {
    const rows = [...this.state.rows];
    rows[index] = { ...rows[index], [field]: value };
    this.setState({ rows });
  };

  addRow = () => {
    this.setState({ rows: [...this.state.rows, { name: "", description: "" }] });
  };

  removeRow = (index) => {
    if (this.state.rows.length <= 1) return;
    const rows = [...this.state.rows];
    rows.splice(index, 1);
    this.setState({ rows });
  };

  handleSubmit = () => {
    const { rows, editMode, editId } = this.state;

    // Validate all rows have names
    const invalid = rows.some((r) => !r.name.trim());
    if (invalid) {
      Swal.fire({ icon: "warning", title: "Required", text: "Please enter a role name for all rows" });
      return;
    }

    this.setState({ submitting: true });

    if (editMode) {
      // Edit mode: single update
      const payload = { name: rows[0].name, description: rows[0].description };
      const url = `${PUT_URL.jobrole.api}${editId}/`;
      putRequest(url, payload, this.props).then((response) => {
        this.setState({ submitting: false });
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Job Role Updated",
            showConfirmButton: false,
            timer: 1500,
          }).then(() => this.props.history.goBack());
        } else {
          Swal.fire({ icon: "error", title: "Error", text: "Failed to update" });
        }
      });
    } else {
      // Add mode: multi-add
      const payload = { job_roles: rows };
      const url = POST_URL.jobrole.api;
      postRequest(url, payload, this.props).then((response) => {
        this.setState({ submitting: false });
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: `${rows.length} Job Role(s) Created`,
            showConfirmButton: false,
            timer: 1500,
          }).then(() => this.props.history.goBack());
        } else {
          Swal.fire({ icon: "error", title: "Error", text: response?.data?.error || "Failed to create" });
        }
      });
    }
  };

  render() {
    const { rows, editMode, loading, submitting } = this.state;

    if (loading) {
      return <LoadingGif />;
    }

    return (
      <Paper className={classNames("paper-background")}>
        <Grid container>
          <Grid item md={6} xs={12} className={classNames("header-align")}>
            <Box className="heading">{editMode ? "Edit" : "Add"} Job Role</Box>
          </Grid>
          <Grid item md={6} xs={12}>
            <Box className={classNames("header-align", "end-flex-prop")}>
              <Button
                variant="contained"
                className="editbutton-view"
                onClick={() => this.props.history.goBack()}
              >
                Back
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Paper className="margin-top-20" style={{ padding: "20px" }}>
          {rows.map((row, index) => (
            <Grid container spacing={3} key={index} alignItems="center"
              style={{ marginBottom: index < rows.length - 1 ? "12px" : "0" }}
            >
              <Grid item md={1} xs={1}>
                <Box style={{ fontWeight: 600, color: "#555", fontSize: "14px" }}>
                  {index + 1}.
                </Box>
              </Grid>
              <Grid item md={5} xs={5}>
                <TextField
                  label="Role Name *"
                  value={row.name}
                  onChange={(e) => this.handleRowChange(index, "name", e.target.value)}
                  variant="outlined"
                  className="width-100"
                  size="small"
                />
              </Grid>
              <Grid item md={5} xs={5}>
                <TextField
                  label="Description"
                  value={row.description}
                  onChange={(e) => this.handleRowChange(index, "description", e.target.value)}
                  variant="outlined"
                  className="width-100"
                  size="small"
                />
              </Grid>
              <Grid item md={1} xs={1}>
                {!editMode && rows.length > 1 && (
                  <IconButton
                    onClick={() => this.removeRow(index)}
                    size="small"
                    style={{ color: "#c62828" }}
                  >
                    <RemoveCircleOutlineIcon />
                  </IconButton>
                )}
              </Grid>
            </Grid>
          ))}

          <Box mt={2} display="flex" alignItems="center" style={{ gap: "12px" }}>
            {!editMode && (
              <Button
                variant="outlined"
                color="primary"
                onClick={this.addRow}
                size="small"
              >
                <AddCircleOutlineIcon style={{ marginRight: "4px", fontSize: "18px" }} /> Add More
              </Button>
            )}
            <Button
              variant="contained"
              color="primary"
              className="editbutton-view"
              onClick={this.handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Saving..." : editMode ? "Update" : `Save ${rows.length > 1 ? `(${rows.length})` : ""}`}
            </Button>
          </Box>
        </Paper>
      </Paper>
    );
  }
}

export default withRouter(JobRoleForm);
