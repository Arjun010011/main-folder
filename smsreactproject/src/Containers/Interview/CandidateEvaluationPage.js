import React, { Component } from "react";
import {
  Paper, Box, Grid, Button, TextField, Chip, Dialog, DialogContent,
  IconButton
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import FullscreenIcon from "@material-ui/icons/Fullscreen";
import { withRouter } from "react-router-dom";
import classNames from "classnames";
import Swal from "sweetalert2";

import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import { dateFormat } from "Includes/functions";
import LoadingGif from "Components/LoadingGif";

class CandidateEvaluationPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      application: null,
      rounds: [],
      evaluations: [],
      notes: "",
      decision: "",
      loading: true,
      submitting: false,
      currentRoundInfo: null,
      resumeDialogOpen: false,
      docDialogOpen: false,
      docDialogUrl: "",
      docDialogLabel: "",
    };
  }

  componentDidMount() {
    const params = new URLSearchParams(this.props.location.search);
    const applicationId = params.get("application_id");
    if (applicationId) {
      this.fetchApplicationDetail(applicationId);
    }
  }

  fetchApplicationDetail = (id) => {
    const url = `${GET_URL.jobapplication.api}${id}/`;
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.data && response.data.data) {
        const app = response.data.data;
        this.setState({ application: app, evaluations: app.evaluations || [] });
        if (app.interview_setup) {
          this.fetchRounds(app.interview_setup, app.current_round);
        } else {
          this.setState({ loading: false });
        }
      } else {
        this.setState({ loading: false });
      }
    });
  };

  fetchRounds = (setupId, currentRound) => {
    const url = `${GET_URL.interviewround.api}?interview_setup=${setupId}&limit=15&pageno=1`;
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.data && response.data.data) {
        const rounds = response.data.data.data_list || response.data.data || [];
        const currentRoundInfo = rounds.find((r) => r.round_number === currentRound) || null;
        this.setState({ rounds, currentRoundInfo, loading: false });
      } else {
        this.setState({ loading: false });
      }
    });
  };

  handleSubmitEvaluation = () => {
    const { application, currentRoundInfo, notes, decision, evaluations } = this.state;

    if (!decision) {
      Swal.fire({ icon: "warning", title: "Required", text: "Please select a decision (Select / On Hold / Reject)" });
      return;
    }

    // Check if this is a re-evaluation (existing evaluation for current round)
    const currentRoundEval = evaluations.find(
      (ev) => ev.round_number === (application.current_round || 1)
    );

    // Notes are required only for first-time evaluations
    if (!currentRoundEval && !notes.trim()) {
      Swal.fire({ icon: "warning", title: "Required", text: "Please enter your evaluation notes" });
      return;
    }

    this.setState({ submitting: true });

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const payload = {
      job_application: application.id,
      interview_round: currentRoundInfo.id,
      evaluator: user.staff_id || null,
      notes: notes.trim() || (currentRoundEval ? currentRoundEval.notes : ""),
      decision: decision,
    };

    const url = POST_URL.interviewevaluation.api;
    postRequest(url, payload, this.props).then((response) => {
      this.setState({ submitting: false });
      if (response && response.data && response.data.data) {
        const result = response.data.data;
        let msg = "";
        if (result.decision === "selected" && result.application_status === 4) {
          msg = "Candidate has cleared all rounds and is marked as SELECTED!";
        } else if (result.decision === "selected") {
          msg = `Candidate advanced to Round ${result.current_round}`;
        } else if (result.decision === "rejected") {
          msg = "Candidate has been REJECTED.";
        } else if (result.decision === "on_hold") {
          msg = "Candidate has been put ON HOLD.";
        }
        Swal.fire({ icon: "success", title: "Evaluation Submitted", text: msg }).then(() => {
          this.props.history.push("/interview/candidates/list");
        });
      } else {
        Swal.fire({ icon: "error", title: "Error", text: response?.data?.error || "Failed to submit evaluation" });
      }
    });
  };

  getDecisionStyle = (dec) => {
    const map = {
      selected: { bg: "#e8f5e9", color: "#2e7d32", label: "Selected" },
      on_hold: { bg: "#fff3e0", color: "#e65100", label: "On Hold" },
      rejected: { bg: "#fce4ec", color: "#c62828", label: "Rejected" },
    };
    return map[dec] || { bg: "#f5f5f5", color: "#333", label: dec || "-" };
  };



  render() {
    const { application, evaluations, notes, decision, loading, submitting, currentRoundInfo } = this.state;

    if (loading) return <LoadingGif />;

    if (!application) {
      return (
        <Paper className={"paper-background"} style={{ textAlign: "center", padding: "40px" }}>
          Application not found.
        </Paper>
      );
    }

    const isFinalized = application.status === 6; // Only Hired is truly finalized
    const canEvaluate = !isFinalized && (application.is_my_round || application.is_incharge);

    // Get previous round evaluations (all rounds before current)
    const previousEvals = evaluations.filter(
      (ev) => ev.round_number && ev.round_number < (application.current_round || 1)
    );

    // Get current round evaluation (if re-evaluating)
    const currentRoundEval = evaluations.find(
      (ev) => ev.round_number === (application.current_round || 1)
    );

    return (
      <Paper className={classNames("paper-background")}>
        <Grid container>
          <Grid item md={6} xs={12} className={classNames("header-align")}>
            <Box className="heading">Evaluate Candidate</Box>
          </Grid>
          <Grid item md={6} xs={12}>
            <Box className={classNames("header-align", "end-flex-prop")}>
              <Button variant="contained" className="editbutton-view" onClick={() => this.props.history.goBack()}>
                Back
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Grid container spacing={3} className="margin-top-20">
          {/* LEFT: Candidate details + Rounds + evaluation form */}
          <Grid item lg={7} md={7} xs={12}>
            {/* Candidate Info Card */}
            <Paper style={{ padding: "20px", marginBottom: "16px" }}>
              <Box className="sub-heading" style={{ marginBottom: "16px" }}>Candidate Information</Box>
              <Grid container spacing={2} alignItems="center">
                {application.photo_url && (
                  <Grid item>
                    <img
                      src={application.photo_url}
                      alt="Candidate"
                      style={{ width: "70px", height: "70px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--table-header-background)" }}
                    />
                  </Grid>
                )}
                <Grid item>
                  <Box style={{ fontWeight: 600, fontSize: "18px" }}>
                    {application.full_name || `${application.first_name} ${application.last_name || ""}`}
                  </Box>
                  <Box style={{ color: "var(--table-header-background)", fontWeight: 600, fontSize: "14px" }}>
                    {application.job_role_name || "N/A"} | Round {application.current_round || 1}
                  </Box>
                </Grid>
              </Grid>

              <Grid container spacing={2} className="margin-top-20">
                <Grid item md={6} xs={12}><strong>Email:</strong> {application.email || "-"}</Grid>
                <Grid item md={6} xs={12}><strong>Phone:</strong> {application.mobile_num || "-"}</Grid>
                <Grid item md={6} xs={12}><strong>DOB:</strong> {application.dob ? dateFormat(application.dob, 'DD/MM/YYYY') : "-"}</Grid>
                <Grid item md={6} xs={12}><strong>Gender:</strong> {application.gender || "-"}</Grid>
                <Grid item md={6} xs={12}><strong>Qualification:</strong> {application.qualification || "-"}</Grid>
                <Grid item md={6} xs={12}><strong>Experience:</strong> {application.experience_years ? `${application.experience_years} years` : "-"}</Grid>
                <Grid item md={6} xs={12}><strong>Current Org:</strong> {application.current_organization || "-"}</Grid>
                <Grid item md={6} xs={12}><strong>Applied:</strong> {application.applied_date ? dateFormat(application.applied_date, 'DD/MM/YYYY') : "-"}</Grid>
                {application.address && (
                  <Grid item md={12} xs={12}><strong>Address:</strong> {application.address}</Grid>
                )}
              </Grid>
            </Paper>

            {/* Previous Round Evaluations (shown for round 2+ when evaluations exist) */}
            {previousEvals.length > 0 && (
              <Paper style={{ padding: "20px", marginBottom: "16px" }}>
                <Box className="sub-heading" style={{ marginBottom: "16px" }}>Previous Round Evaluations</Box>
                {previousEvals.map((ev, i) => {
                  const ds = this.getDecisionStyle(ev.decision);
                  return (
                    <Box key={i} style={{
                      border: "1px solid #e0e0e0", borderRadius: "8px",
                      padding: "16px", marginBottom: i < previousEvals.length - 1 ? "10px" : 0,
                      background: "#fafafa",
                    }}>
                      <Box style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <Box style={{ fontWeight: 600, fontSize: "15px", color: "#333" }}>
                          Round {ev.round_number}: {ev.round_name || ""}
                        </Box>
                        <Chip label={ds.label} size="small" style={{ background: ds.bg, color: ds.color, fontWeight: 600, fontSize: "11px" }} />
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Box style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Evaluated By</Box>
                          <Box style={{ fontSize: "14px", fontWeight: 600, color: "#333" }}>
                            {ev.evaluator_name || "-"}
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Date</Box>
                          <Box style={{ fontSize: "14px", fontWeight: 500, color: "#333" }}>
                            {ev.created ? dateFormat(ev.created, 'DD/MM/YYYY hh:mm A') : "-"}
                          </Box>
                        </Grid>
                        <Grid item xs={12}>
                          <Box style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Notes</Box>
                          <Box style={{
                            fontSize: "13px", color: "#333", background: "#fff",
                            padding: "12px", borderRadius: "6px", border: "1px solid #eee",
                            whiteSpace: "pre-wrap", lineHeight: "1.5",
                          }}>
                            {ev.notes || "No notes provided."}
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  );
                })}
              </Paper>
            )}

            {/* Re-evaluation: Current round already has evaluation (On Hold / Rejected) */}
            {canEvaluate && currentRoundInfo && currentRoundEval && (
              <Paper style={{ padding: "20px", marginBottom: "16px" }}>
                <Box className="sub-heading" style={{ marginBottom: "16px" }}>
                  Round {currentRoundInfo.round_number}: {currentRoundInfo.round_name} — Current Evaluation
                </Box>

                {/* Show existing evaluation details */}
                <Box style={{
                  border: "1px solid #e0e0e0", borderRadius: "8px",
                  padding: "16px", background: "#fafafa", marginBottom: "20px",
                }}>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Box style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Evaluated By</Box>
                      <Box style={{ fontSize: "14px", fontWeight: 600, color: "#333" }}>
                        {currentRoundEval.evaluator_name || "-"}
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Decision</Box>
                      {(() => {
                        const ds = this.getDecisionStyle(currentRoundEval.decision);
                        return (
                          <Chip label={ds.label} size="small" style={{ background: ds.bg, color: ds.color, fontWeight: 600, fontSize: "11px" }} />
                        );
                      })()}
                    </Grid>
                    <Grid item xs={4}>
                      <Box style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Date</Box>
                      <Box style={{ fontSize: "14px", fontWeight: 500, color: "#333" }}>
                        {currentRoundEval.created ? dateFormat(currentRoundEval.created, 'DD/MM/YYYY hh:mm A') : "-"}
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Box style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Notes</Box>
                      <Box style={{
                        fontSize: "13px", color: "#333", background: "#fff",
                        padding: "12px", borderRadius: "6px", border: "1px solid #eee",
                        whiteSpace: "pre-wrap", lineHeight: "1.5",
                      }}>
                        {currentRoundEval.notes || "No notes provided."}
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                {/* Change Decision */}
                <Box style={{ borderTop: "1px solid #eee", paddingTop: "16px" }}>
                  <Box style={{ fontWeight: 600, fontSize: "14px", color: "#333", marginBottom: "12px" }}>
                    Change Decision
                  </Box>
                  <Box style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    {[
                      { value: "selected", label: "Select → Advance", color: "#2e7d32" },
                      { value: "on_hold", label: "On Hold", color: "#f57f17" },
                      { value: "rejected", label: "Reject", color: "#c62828" },
                    ].filter((btn) => btn.value !== currentRoundEval.decision).map((btn) => (
                      <Button
                        key={btn.value}
                        variant={decision === btn.value ? "contained" : "outlined"}
                        onClick={() => this.setState({ decision: btn.value })}
                        style={{
                          backgroundColor: decision === btn.value ? btn.color : "#fff",
                          color: decision === btn.value ? "#fff" : btn.color,
                          borderColor: btn.color,
                          fontWeight: 600,
                        }}
                      >
                        {btn.label}
                      </Button>
                    ))}
                  </Box>
                  {decision && (
                    <Box style={{ marginTop: "16px" }}>
                      <TextField
                        label="Update Notes (optional)"
                        value={notes}
                        onChange={(e) => this.setState({ notes: e.target.value })}
                        placeholder="Add any additional notes for the decision change..."
                        variant="outlined"
                        multiline
                        rows={3}
                        className="width-100"
                        style={{ marginBottom: "16px" }}
                      />
                      <Button
                        variant="contained"
                        color="primary"
                        className="editbutton-view"
                        onClick={this.handleSubmitEvaluation}
                        disabled={submitting}
                      >
                        {submitting ? "Updating..." : "Update Decision"}
                      </Button>
                    </Box>
                  )}
                </Box>
              </Paper>
            )}

            {/* First-time Evaluation Form (no existing evaluation for current round) */}
            {canEvaluate && currentRoundInfo && !currentRoundEval && (
              <Paper style={{ padding: "20px" }}>
                <Box className="sub-heading" style={{ marginBottom: "16px" }}>
                  Round {currentRoundInfo.round_number}: {currentRoundInfo.round_name}
                </Box>

                <TextField
                  label="Your Notes *"
                  value={notes}
                  onChange={(e) => this.setState({ notes: e.target.value })}
                  placeholder="Enter your observations, questions asked, candidate performance..."
                  variant="outlined"
                  multiline
                  rows={6}
                  className="width-100"
                  style={{ marginBottom: "20px" }}
                />

                <Box style={{ marginBottom: "20px" }}>
                  <Box style={{ fontWeight: 600, fontSize: "13px", color: "#555", marginBottom: "10px" }}>
                    Decision *
                  </Box>
                  <Box style={{ display: "flex", gap: "12px" }}>
                    {[
                      { value: "selected", label: "Select", color: "#2e7d32" },
                      { value: "on_hold", label: "On Hold", color: "#f57f17" },
                      { value: "rejected", label: "Reject", color: "#c62828" },
                    ].map((btn) => (
                      <Button
                        key={btn.value}
                        variant={decision === btn.value ? "contained" : "outlined"}
                        onClick={() => this.setState({ decision: btn.value })}
                        style={{
                          backgroundColor: decision === btn.value ? btn.color : "#fff",
                          color: decision === btn.value ? "#fff" : btn.color,
                          borderColor: btn.color,
                          fontWeight: 600,
                        }}
                      >
                        {btn.label}
                      </Button>
                    ))}
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  className="editbutton-view"
                  onClick={this.handleSubmitEvaluation}
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Evaluation"}
                </Button>
              </Paper>
            )}

            {!canEvaluate && !isFinalized && currentRoundInfo && (
              <Paper style={{ padding: "20px", textAlign: "center" }}>
                <Box style={{ fontSize: "14px", color: "#999", padding: "20px 0" }}>
                  <strong>Round {currentRoundInfo.round_number}: {currentRoundInfo.round_name}</strong>
                  <br /><br />
                  You are not assigned to evaluate this round. The assigned interviewer will handle this evaluation.
                </Box>
              </Paper>
            )}

            {isFinalized && (
              <Paper style={{ padding: "20px", textAlign: "center" }}>
                <Box style={{ fontSize: "16px", fontWeight: 600, color: application.status === 4 ? "#2e7d32" : "#00695c" }}>
                  This candidate is marked as: {application.status_display || "Finalized"}
                </Box>
                {application.status === 4 && (
                  <Button
                    variant="contained"
                    style={{ backgroundColor: "#2e7d32", color: "#fff", marginTop: "10px" }}
                    onClick={() => this.props.history.push(`/hr/staff/add?prefill=interview&application_id=${application.id}`)}
                  >
                    Hire - Add as Staff
                  </Button>
                )}
              </Paper>
            )}
          </Grid>

          {/* RIGHT: Resume preview + Documents */}
          <Grid item lg={5} md={5} xs={12}>
            {/* Resume Preview */}
            <Paper style={{ padding: "20px", marginBottom: "16px" }}>
              <Box style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <Box className="sub-heading">Resume</Box>
                {application.resume_url && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => this.setState({ resumeDialogOpen: true })}
                    style={{ fontSize: "12px", textTransform: "none" }}
                  >
                    <FullscreenIcon style={{ fontSize: "16px", marginRight: "4px" }} />
                    Enlarge
                  </Button>
                )}
              </Box>
              {application.resume_url ? (
                <iframe
                  src={application.resume_url}
                  title="Resume Preview"
                  style={{ width: "100%", height: "600px", border: "1px solid #ddd", borderRadius: "6px" }}
                />
              ) : (
                <Box style={{ textAlign: "center", padding: "40px", color: "#999", background: "#f8f9fa", borderRadius: "6px" }}>
                  No resume uploaded
                </Box>
              )}

              {/* Documents - below resume in same card */}
              {application.documents && application.documents.length > 0 && (
                <Box style={{ marginTop: "16px", borderTop: "1px solid #eee", paddingTop: "16px" }}>
                  <Box style={{ fontWeight: 600, fontSize: "14px", color: "#333", marginBottom: "10px" }}>Documents</Box>
                  {application.documents.map((doc, i) => (
                    <Box
                      key={i}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "8px 12px", background: "#f8f9fa", borderRadius: "6px", marginBottom: "6px"
                      }}
                    >
                      <span style={{ fontSize: "13px", fontWeight: 500 }}>{doc.document_label || "Document"}</span>
                      {doc.document_url && (
                        <Button
                          size="small"
                          style={{ fontSize: "12px", color: "var(--table-header-background)", fontWeight: 600, textTransform: "none", minWidth: "auto" }}
                          onClick={() => this.setState({ docDialogOpen: true, docDialogUrl: doc.document_url, docDialogLabel: doc.document_label || "Document" })}
                        >
                          View
                        </Button>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Fullscreen Resume Dialog */}
        {application.resume_url && (
          <Dialog
            open={this.state.resumeDialogOpen}
            onClose={() => this.setState({ resumeDialogOpen: false })}
            fullScreen
          >
            <DialogContent style={{ padding: 0, display: "flex", flexDirection: "column" }}>
              <Box
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 16px", background: "#f5f5f5", borderBottom: "1px solid #ddd"
                }}
              >
                <Box style={{ fontWeight: 600, fontSize: "16px" }}>
                  Resume — {application.full_name || application.first_name}
                </Box>
                <IconButton onClick={() => this.setState({ resumeDialogOpen: false })}>
                  <CloseIcon />
                </IconButton>
              </Box>
              <iframe
                src={application.resume_url}
                title="Resume Full View"
                style={{ flex: 1, width: "100%", border: "none" }}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Fullscreen Document Dialog */}
        <Dialog
          open={this.state.docDialogOpen}
          onClose={() => this.setState({ docDialogOpen: false })}
          fullScreen
        >
          <DialogContent style={{ padding: 0, display: "flex", flexDirection: "column" }}>
            <Box
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 16px", background: "#f5f5f5", borderBottom: "1px solid #ddd"
              }}
            >
              <Box style={{ fontWeight: 600, fontSize: "16px" }}>
                {this.state.docDialogLabel}
              </Box>
              <IconButton onClick={() => this.setState({ docDialogOpen: false })}>
                <CloseIcon />
              </IconButton>
            </Box>
            <iframe
              src={this.state.docDialogUrl}
              title="Document View"
              style={{ flex: 1, width: "100%", border: "none" }}
            />
          </DialogContent>
        </Dialog>
      </Paper>
    );
  }
}

export default withRouter(CandidateEvaluationPage);
