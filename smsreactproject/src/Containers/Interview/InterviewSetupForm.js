import React, { Component } from "react";
import { Paper, Box, Grid, Button, TextField, IconButton } from "@material-ui/core";
import { withRouter } from "react-router-dom";
import classNames from "classnames";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import RemoveCircleOutlineIcon from "@material-ui/icons/RemoveCircleOutline";
import Swal from "sweetalert2";
import { AsyncPaginate } from "react-select-async-paginate";

import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import { getRequest, postRequest, putRequest } from "Includes/api/apicall";
import LoadingGif from "Components/LoadingGif";

// ─── Generic paginated loader for AsyncPaginate ────────────────────
const loadPaginatedOptions = async (url, search, { page }, labelFn, props) => {
  let filteredOptions = [];
  let hasMore = false;
  const fullUrl = `${url}?pageno=${page + 1}&limit=15${search ? `&search=${search}` : ""}`;

  try {
    const response = await getRequest(fullUrl, {}, props);
    if (response && response.data && response.data.data) {
      const items = response.data.data.data_list || response.data.data || [];
      filteredOptions = items.map((item) => ({
        value: item.id,
        label: labelFn(item),
      }));
      hasMore = response.data.data.next ? true : false;
    }
  } catch (err) {
    console.error("loadPaginatedOptions error:", err);
  }

  return {
    options: filteredOptions,
    hasMore,
    additional: { page: page + 1 },
  };
};

// ─── Consistent react-select styling ───────────────────────────────
const selectStyles = {
  control: (base) => ({
    ...base,
    minHeight: 40,
    fontSize: 14,
  }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
  }),
};

class InterviewSetupForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: "",
      selectedJobRole: null,    // { value, label }
      selectedIncharge: null,   // { value, label }
      description: "",
      requirements: "",
      instructions: "",
      rounds: [{ round_number: 1, round_name: "", selectedStaff: null, description: "" }],
      editMode: false,
      editId: null,
      loading: true,
      submitting: false,
    };
  }

  componentDidMount() {
    const params = new URLSearchParams(this.props.location.search);
    const editId = params.get("id");
    if (editId) {
      this.setState({ editMode: true, editId }, this.fetchSetupData);
    } else {
      this.setState({ loading: false });
    }
  }

  fetchSetupData = () => {
    const url = `${GET_URL.interviewsetup.api}${this.state.editId}/`;
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.data && response.data.data) {
        const d = response.data.data;

        // Build prefilled select objects
        const selectedJobRole = d.job_role
          ? { value: d.job_role, label: d.job_role_name || `Role #${d.job_role}` }
          : null;

        const selectedIncharge = d.incharge_staff
          ? { value: d.incharge_staff, label: d.incharge_staff_name || `Staff #${d.incharge_staff}` }
          : null;

        const rounds = d.rounds && d.rounds.length > 0
          ? d.rounds.map((r) => ({
            round_number: r.round_number,
            round_name: r.round_name,
            selectedStaff: r.assigned_staff
              ? { value: r.assigned_staff, label: r.assigned_staff_name || `Staff #${r.assigned_staff}` }
              : null,
            description: r.description || "",
          }))
          : [{ round_number: 1, round_name: "", selectedStaff: null, description: "" }];

        this.setState({
          name: d.name,
          selectedJobRole,
          selectedIncharge,
          description: d.description || "",
          requirements: d.requirements || "",
          instructions: d.instructions || "",
          rounds,
          loading: false,
        });
      } else {
        this.setState({ loading: false });
      }
    });
  };

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  handleRoundChange = (index, field, value) => {
    const rounds = [...this.state.rounds];
    rounds[index] = { ...rounds[index], [field]: value };
    this.setState({ rounds });
  };

  addRound = () => {
    const { rounds } = this.state;
    const nextNum = rounds.length + 1;
    this.setState({
      rounds: [...rounds, { round_number: nextNum, round_name: "", selectedStaff: null, description: "" }],
    });
  };

  removeRound = (index) => {
    if (this.state.rounds.length <= 1) return;
    const rounds = [...this.state.rounds];
    rounds.splice(index, 1);
    const renumbered = rounds.map((r, i) => ({ ...r, round_number: i + 1 }));
    this.setState({ rounds: renumbered });
  };

  // ─── AsyncPaginate loaders ─────────────────────────────────────
  loadJobRoles = (search, prevOptions, additional) => {
    return loadPaginatedOptions(
      GET_URL.jobrole.api, search, additional,
      (item) => item.name,
      this.props
    );
  };

  loadStaffOptions = (search, prevOptions, additional) => {
    return loadPaginatedOptions(
      GET_URL.staff.api, search, additional,
      (item) => `${item.first_name || ""} ${item.last_name || ""}`.trim() || `Staff #${item.id}`,
      this.props
    );
  };

  handleSubmit = (e) => {
    e.preventDefault();

    if (!this.state.name.trim()) {
      Swal.fire({ icon: "warning", title: "Validation", text: "Interview name is required" });
      return;
    }
    if (!this.state.selectedJobRole) {
      Swal.fire({ icon: "warning", title: "Validation", text: "Please select a job role" });
      return;
    }

    this.setState({ submitting: true });

    const payload = {
      name: this.state.name,
      job_role: this.state.selectedJobRole ? this.state.selectedJobRole.value : null,
      incharge_staff: this.state.selectedIncharge ? this.state.selectedIncharge.value : null,
      no_of_rounds: this.state.rounds.length,
      description: this.state.description,
      requirements: this.state.requirements,
      instructions: this.state.instructions,
      rounds: this.state.rounds.map((r) => ({
        round_number: r.round_number,
        round_name: r.round_name,
        assigned_staff: r.selectedStaff ? r.selectedStaff.value : null,
        description: r.description,
      })),
    };

    if (this.state.editMode) {
      const url = `${PUT_URL.interviewsetup.api}${this.state.editId}/`;
      putRequest(url, payload, this.props).then((response) => {
        this.setState({ submitting: false });
        if (response && response.data) {
          Swal.fire({ icon: "success", title: "Success!", text: "Interview setup updated successfully!", timer: 1500, showConfirmButton: false });
          this.props.history.goBack();
        }
      }).catch(() => this.setState({ submitting: false }));
    } else {
      const url = POST_URL.interviewsetup.api;
      postRequest(url, payload, this.props).then((response) => {
        this.setState({ submitting: false });
        if (response && response.data) {
          Swal.fire({ icon: "success", title: "Success!", text: "Interview setup created successfully!", timer: 1500, showConfirmButton: false });
          this.props.history.goBack();
        }
      }).catch(() => this.setState({ submitting: false }));
    }
  };

  render() {
    const { name, selectedJobRole, selectedIncharge, description, requirements, instructions, rounds, editMode, loading, submitting } = this.state;

    if (loading) {
      return <LoadingGif />;
    }

    return (
      <Paper className={classNames("paper-background")}>
        <Grid container>
          <Grid item md={6} xs={12} className={classNames("header-align")}>
            <Box className="heading">{editMode ? "Edit" : "Add"} Interview Setup</Box>
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

        <form onSubmit={this.handleSubmit}>
          {/* Basic Details Section */}
          <Paper className="margin-top-20" style={{ padding: "20px" }}>
            <Box className="sub-heading" style={{ marginBottom: "16px" }}>Basic Details</Box>
            <Grid container spacing={3}>
              <Grid item md={4} xs={12}>
                <TextField
                  label="Interview Name *"
                  name="name"
                  value={name}
                  onChange={this.handleChange}
                  variant="outlined"
                  size="small"
                  className="width-100"
                  placeholder="e.g. Math Teacher Hiring 2026"
                />
              </Grid>
              <Grid item md={4} xs={12}>
                <Box style={{ fontSize: "12px", color: "#555", marginBottom: "4px" }}>Job Role *</Box>
                <AsyncPaginate
                  value={selectedJobRole}
                  loadOptions={this.loadJobRoles}
                  onChange={(val) => this.setState({ selectedJobRole: val })}
                  additional={{ page: 0 }}
                  placeholder="Search job role..."
                  isClearable
                  styles={selectStyles}
                />
              </Grid>
              <Grid item md={4} xs={12}>
                <TextField
                  label="Description"
                  name="description"
                  value={description}
                  onChange={this.handleChange}
                  variant="outlined"
                  size="small"
                  className="width-100"
                  placeholder="Optional description"
                />
              </Grid>
              <Grid item md={4} xs={12}>
                <Box style={{ fontSize: "12px", color: "#555", marginBottom: "4px" }}>Incharge Staff</Box>
                <AsyncPaginate
                  value={selectedIncharge}
                  loadOptions={this.loadStaffOptions}
                  onChange={(val) => this.setState({ selectedIncharge: val })}
                  additional={{ page: 0 }}
                  placeholder="Search incharge staff..."
                  isClearable
                  styles={selectStyles}
                />
              </Grid>
              <Grid item md={6} xs={12}>
                <TextField
                  label="Requirements"
                  name="requirements"
                  value={requirements}
                  onChange={this.handleChange}
                  variant="outlined"
                  size="small"
                  className="width-100"
                  placeholder="Optional requirements shown to applicants"
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item md={6} xs={12}>
                <TextField
                  label="Instructions"
                  name="instructions"
                  value={instructions}
                  onChange={this.handleChange}
                  variant="outlined"
                  size="small"
                  className="width-100"
                  placeholder="Optional instructions shown to applicants"
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Round Configuration Section */}
          <Paper className="margin-top-20" style={{ padding: "20px" }}>
            <Box style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <Box className="sub-heading">
                Interview Rounds ({rounds.length})
              </Box>
              <Button
                variant="outlined"
                color="primary"
                onClick={this.addRound}
                size="small"
              >
                <AddCircleOutlineIcon style={{ marginRight: "4px", fontSize: "18px" }} /> Add Round
              </Button>
            </Box>

            {rounds.map((round, index) => (
              <Paper
                key={index}
                variant="outlined"
                style={{ padding: "16px", marginBottom: "12px", background: "#f8f9fa" }}
              >
                <Grid container spacing={2} alignItems="center">
                  <Grid item md={1} xs={1}>
                    <Box style={{ fontWeight: 700, color: "var(--table-header-background)", fontSize: "14px" }}>
                      R{round.round_number}
                    </Box>
                  </Grid>
                  <Grid item md={3} xs={11}>
                    <TextField
                      label="Round Name"
                      value={round.round_name}
                      onChange={(e) => this.handleRoundChange(index, "round_name", e.target.value)}
                      variant="outlined"
                      size="small"
                      className="width-100"
                      placeholder="e.g. Written Test, Demo Class"
                    />
                  </Grid>
                  <Grid item md={3} xs={6}>
                    <Box style={{ fontSize: "12px", color: "#555", marginBottom: "4px" }}>Assigned Staff</Box>
                    <AsyncPaginate
                      value={round.selectedStaff}
                      loadOptions={this.loadStaffOptions}
                      onChange={(val) => this.handleRoundChange(index, "selectedStaff", val)}
                      additional={{ page: 0 }}
                      placeholder="Search staff..."
                      isClearable
                      styles={selectStyles}
                    />
                  </Grid>
                  <Grid item md={4} xs={5}>
                    <TextField
                      label="Description"
                      value={round.description}
                      onChange={(e) => this.handleRoundChange(index, "description", e.target.value)}
                      variant="outlined"
                      size="small"
                      className="width-100"
                      placeholder="Round description"
                    />
                  </Grid>
                  <Grid item md={1} xs={1}>
                    {rounds.length > 1 && (
                      <IconButton
                        onClick={() => this.removeRound(index)}
                        size="small"
                        style={{ color: "#c62828" }}
                      >
                        <RemoveCircleOutlineIcon />
                      </IconButton>
                    )}
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Paper>

          {/* Submit Buttons */}
          <Box className="margin-top-20" style={{ display: "flex", gap: "12px" }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              className="editbutton-view"
              disabled={submitting}
            >
              {submitting ? "Saving..." : editMode ? "Update" : "Create"}
            </Button>
            <Button
              variant="contained"
              className="editbutton-view"
              onClick={() => this.props.history.goBack()}
            >
              Cancel
            </Button>
          </Box>
        </form>
      </Paper>
    );
  }
}

export default withRouter(InterviewSetupForm);
