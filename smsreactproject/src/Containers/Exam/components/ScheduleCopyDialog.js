import React from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  TextField,
  Typography,
} from "@material-ui/core";
import FileCopyOutlinedIcon from "@material-ui/icons/FileCopyOutlined";
import { Dropdown } from "Components/DropDown";

const ScheduleCopyDialog = ({ vm }) => {
  const {
    copyDialogOpen,
    copyCreateNewExam,
    yearList,
    selectedYear,
    copySourceAcademicYear,
    copyTargetAcademicYear,
    copySourceExamId,
    copyTargetExamId,
    copyFromTerm,
    copyTargetTerm,
    copyNewTerm,
    copyNewExamType,
    copyNewFromDate,
    copyNewToDate,
    copyNewDescription,
    copyExamTypeList,
    examTermList,
    copySourceExamList,
    copyTargetExamList,
    copyTargetStartDate,
    copyRespectCalendars,
    copyReplaceExisting,
    copyLoading,
    copyInlineTargetMode,
    copyInlineTargetExamName,
    copyMismatchDetail,
  } = vm.state;

  return (
    <Dialog
      open={copyDialogOpen}
      onClose={vm.closeCopyDialog}
      maxWidth="sm"
      fullWidth
      aria-labelledby="copy-schedule-dialog"
    >
      <DialogTitle id="copy-schedule-dialog">
        <Box display="flex" alignItems="center">
          <FileCopyOutlinedIcon style={{ marginRight: 8, color: "#1976d2" }} />
          Copy exam schedule
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText style={{ marginBottom: 16, color: "#555" }}>
          {copyCreateNewExam ? (
            <>
              Creates a <strong>new</strong> exam with the same standards and sections as the exam selected on this
              page (only term, exam type, description, and dates change). Then copies the full schedule from the
              source exam: subjects, times, marks, cumulative splits, grade plans, linked papers, frame/marks-entry
              deadlines, and per-section attendance settings. Calendar dates are rebuilt from your first date;
              weekends and holidays can be skipped if enabled below.
            </>
          ) : (
            <>
              Copies the full structure from the source exam into the <strong>current</strong> exam: subjects, times,
              marks, cumulative splits, grade plans, linked papers, frame/marks-entry deadlines, and per-section
              attendance settings. Calendar exam dates are rebuilt from your start date: gaps between the source
              exam&apos;s distinct days are kept, then Saturdays, Sundays, and holidays from the student holiday
              calendar are skipped (unless you turn that off).
            </>
          )}
        </DialogContentText>
        <Grid container spacing={2}>
          {copyMismatchDetail && (
            <Grid item xs={12}>
              <Box
                p={1.5}
                style={{
                  border: "1px solid #fecaca",
                  borderRadius: 10,
                  background: "#fff1f2",
                }}
              >
                <Typography variant="subtitle2" style={{ fontWeight: 800, color: "#991b1b", marginBottom: 8 }}>
                  Subject mismatch found
                </Typography>
                <Typography variant="caption" style={{ color: "#7f1d1d", display: "block", marginBottom: 8 }}>
                  Source subjects: {copyMismatchDetail.sourceCount} | Target subjects: {copyMismatchDetail.targetCount}
                </Typography>
                <Box
                  component="table"
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                    background: "#fff",
                    border: "1px solid #fecaca",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #fecaca", color: "#9f1239" }}>
                        Missing in target
                      </th>
                      <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #fecaca", color: "#9f1239" }}>
                        Extra in target
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(
                      { length: Math.max(copyMismatchDetail.missingNames?.length || 0, copyMismatchDetail.extraNames?.length || 0, 1) },
                      (_, idx) => (
                        <tr key={`mismatch-row-${idx}`}>
                          <td style={{ padding: "8px", borderTop: "1px solid #ffe4e6", verticalAlign: "top" }}>
                            {copyMismatchDetail.missingNames?.[idx] || "-"}
                          </td>
                          <td style={{ padding: "8px", borderTop: "1px solid #ffe4e6", verticalAlign: "top" }}>
                            {copyMismatchDetail.extraNames?.[idx] || "-"}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </Box>
              </Box>
            </Grid>
          )}
          <Grid item xs={12}>
            <Box
              px={1.5}
              py={1}
              style={{
                border: "1px solid #dbeafe",
                borderRadius: 10,
                background: "linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)",
              }}
            >
              <Typography variant="subtitle2" style={{ fontWeight: 800, color: "#1e3a8a" }}>
                From exam (source)
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Select academic year, term and source exam below. Schedule will be copied from this exam.
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth size="small" variant="outlined">
              <Box mb={1} fontWeight={600} fontSize="0.875rem">
                From academic year
              </Box>
              <Dropdown
                data={[...(yearList || [])].sort((a, b) => new Date(b.start_date) - new Date(a.start_date))}
                name="copySourceAcademicYear"
                value={copySourceAcademicYear || selectedYear}
                onChange={(e) => {
                  const y = e.target.value;
                  vm.setState({ copySourceAcademicYear: y, copySourceExamId: "" }, () => {
                    if (vm.state.copyCreateNewExam) {
                      vm.fetchCopySourceExams(null);
                    } else if (vm.state.copyFromTerm) {
                      vm.fetchCopySourceExams(vm.state.copyFromTerm);
                    }
                  });
                }}
                label=""
                hideSelect
                size="small"
              />
              <Box mt={0.5} fontSize="0.75rem" color="textSecondary">
                Choose a past academic year to copy from that year&apos;s exams (same term filter applies when not
                creating a new exam).
              </Box>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(copyCreateNewExam)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    vm.setState(
                      (prev) => ({
                        copyCreateNewExam: checked,
                        copyReplaceExisting: checked ? false : true,
                        copySourceExamId:
                          !checked && String(prev.copySourceExamId) === String(prev.selectedExam)
                            ? ""
                            : prev.copySourceExamId,
                      }),
                      () => {
                        if (vm.state.copyCreateNewExam) {
                          vm.fetchCopySourceExams(null);
                        } else if (vm.state.copyFromTerm) {
                          vm.fetchCopySourceExams(vm.state.copyFromTerm);
                        }
                      }
                    );
                  }}
                  color="primary"
                />
              }
              label="Create new exam (same standards as the exam selected above) and copy schedule into it"
              style={{ display: copyInlineTargetMode ? "none" : "flex" }}
            />
          </Grid>
          {copyCreateNewExam && (
            <>
              <Grid item xs={12}>
                <Box
                  px={1.5}
                  py={1}
                  style={{
                    border: "1px solid #c7d2fe",
                    borderRadius: 10,
                    background: "linear-gradient(180deg, #f5f3ff 0%, #eef2ff 100%)",
                  }}
                >
                  <Typography variant="subtitle2" style={{ fontWeight: 800, color: "#4338ca" }}>
                    To exam (target: new exam)
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    New exam is created with these details, then schedule is copied into it.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" variant="outlined">
                  <Box mb={1} fontWeight={600} fontSize="0.875rem">
                    Term (new exam)
                  </Box>
                  <Dropdown
                    data={examTermList}
                    name="copyNewTerm"
                    value={copyNewTerm}
                    onChange={(e) => vm.setState({ copyNewTerm: e.target.value })}
                    label=""
                    hideSelect
                    size="small"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" variant="outlined">
                  <Box mb={1} fontWeight={600} fontSize="0.875rem">
                    Exam type (new exam)
                  </Box>
                  <Dropdown
                    data={copyExamTypeList}
                    name="copyNewExamType"
                    value={copyNewExamType}
                    onChange={(e) => vm.setState({ copyNewExamType: e.target.value })}
                    label=""
                    customName="name"
                    customId="id"
                    hideSelect
                    size="small"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label="From date (new exam)"
                  value={copyNewFromDate}
                  onChange={(e) => vm.setState({ copyNewFromDate: e.target.value }, () => vm.alignCopyTargetStartIfNeeded())}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label="To date (new exam)"
                  value={copyNewToDate}
                  onChange={(e) => vm.setState({ copyNewToDate: e.target.value }, () => vm.alignCopyTargetStartIfNeeded())}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description (optional)"
                  value={copyNewDescription}
                  onChange={(e) => vm.setState({ copyNewDescription: e.target.value })}
                  variant="outlined"
                  size="small"
                  placeholder="Short label if your school uses it"
                />
              </Grid>
            </>
          )}
          {copyInlineTargetMode && (
            <>
              <Grid item xs={12}>
                <FormControl fullWidth size="small" variant="outlined">
                  <Box mb={1} fontWeight={600} fontSize="0.875rem">
                    From term
                  </Box>
                  <Dropdown
                    data={examTermList}
                    name="copyFromTerm"
                    value={copyFromTerm}
                    onChange={(e) => {
                      const termId = e.target.value;
                      vm.setState({ copyFromTerm: termId, copySourceExamId: "" }, () =>
                        vm.fetchCopySourceExams(termId)
                      );
                    }}
                    label=""
                    hideSelect
                    size="small"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small" variant="outlined">
                  <Box mb={1} fontWeight={700} fontSize="0.875rem" color="#1e3a8a">
                    From exam
                  </Box>
                  <Dropdown
                    data={copySourceExamList}
                    name="copySourceExamId"
                    value={copySourceExamId}
                    onChange={(e) => {
                      const sourceId = e.target.value;
                      const src = (copySourceExamList || []).find((x) => String(x.id) === String(sourceId));
                      vm.setState((prev) => ({
                        copySourceExamId: sourceId,
                        copyTargetStartDate: prev.copyTargetStartDate || src?.from_date || "",
                      }));
                    }}
                    label=""
                    customName="name"
                    customId="id"
                    hideSelect
                    size="small"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Box
                  px={1.5}
                  py={1}
                  style={{
                    border: "1px solid #bbf7d0",
                    borderRadius: 10,
                    background: "linear-gradient(180deg, #f0fdf4 0%, #ecfeff 100%)",
                  }}
                >
                  <Typography variant="subtitle2" style={{ fontWeight: 800, color: "#047857" }}>
                    To exam (target)
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {copyInlineTargetExamName || "Selected exam"} schedule will be updated.
                    If timetable rows already exist, they will be replaced after confirmation.
                  </Typography>
                </Box>
              </Grid>
            </>
          )}
          {!copyCreateNewExam && !copyInlineTargetMode && (
            <>
              <Grid item xs={12}>
                <Box
                  px={1.5}
                  py={1}
                  style={{
                    border: "1px solid #bbf7d0",
                    borderRadius: 10,
                    background: "linear-gradient(180deg, #f0fdf4 0%, #ecfeff 100%)",
                  }}
                >
                  <Typography variant="subtitle2" style={{ fontWeight: 800, color: "#047857" }}>
                    To exam (target: current exam)
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Schedule is copied into the exam currently selected on this page.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small" variant="outlined">
                  <Box mb={1} fontWeight={600} fontSize="0.875rem">
                    From term
                  </Box>
                  <Dropdown
                    data={examTermList}
                    name="copyFromTerm"
                    value={copyFromTerm}
                    onChange={(e) => {
                      const termId = e.target.value;
                      vm.setState({ copyFromTerm: termId, copySourceExamId: "" }, () =>
                        vm.fetchCopySourceExams(termId)
                      );
                    }}
                    label=""
                    hideSelect
                    size="small"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small" variant="outlined">
                  <Box mb={1} fontWeight={700} fontSize="0.875rem" color="#1e3a8a">
                    From exam
                  </Box>
                  <Dropdown
                    data={copySourceExamList}
                    name="copySourceExamId"
                    value={copySourceExamId}
                    onChange={(e) => {
                      const sourceId = e.target.value;
                      const src = (copySourceExamList || []).find((x) => String(x.id) === String(sourceId));
                      vm.setState((prev) => ({
                        copySourceExamId: sourceId,
                        copyTargetStartDate: prev.copyTargetStartDate || src?.from_date || "",
                      }));
                    }}
                    label=""
                    customName="name"
                    customId="id"
                    hideSelect
                    size="small"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Box
                  px={1.5}
                  py={1}
                  style={{
                    border: "1px solid #bbf7d0",
                    borderRadius: 10,
                    background: "linear-gradient(180deg, #f0fdf4 0%, #ecfeff 100%)",
                  }}
                >
                  <Typography variant="subtitle2" style={{ fontWeight: 800, color: "#047857" }}>
                    To exam (target)
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small" variant="outlined">
                  <Box mb={1} fontWeight={600} fontSize="0.875rem">
                    To academic year
                  </Box>
                  <Dropdown
                    data={[...(yearList || [])].sort((a, b) => new Date(b.start_date) - new Date(a.start_date))}
                    name="copyTargetAcademicYear"
                    value={copyTargetAcademicYear || selectedYear}
                    onChange={(e) => {
                      const y = e.target.value;
                      vm.setState(
                        { copyTargetAcademicYear: y, copyTargetExamId: "", copyTargetExamList: [] },
                        () => vm.fetchCopyTargetExams(y, vm.state.copyTargetTerm)
                      );
                    }}
                    label=""
                    hideSelect
                    size="small"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small" variant="outlined">
                  <Box mb={1} fontWeight={600} fontSize="0.875rem">
                    To term
                  </Box>
                  <Dropdown
                    data={examTermList}
                    name="copyTargetTerm"
                    value={copyTargetTerm}
                    onChange={(e) => {
                      const termId = e.target.value;
                      vm.setState({ copyTargetTerm: termId, copyTargetExamId: "" }, () =>
                        vm.fetchCopyTargetExams(vm.state.copyTargetAcademicYear || vm.state.selectedYear, termId)
                      );
                    }}
                    label=""
                    hideSelect
                    size="small"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small" variant="outlined">
                  <Box mb={1} fontWeight={700} fontSize="0.875rem" color="#047857">
                    To exam name
                  </Box>
                  <Dropdown
                    data={copyTargetExamList}
                    name="copyTargetExamId"
                    value={copyTargetExamId}
                    onChange={(e) => {
                      const targetId = e.target.value;
                      const ex = (copyTargetExamList || []).find((x) => String(x.id) === String(targetId));
                      vm.setState({
                        copyTargetExamId: targetId,
                        copyTargetStartDate: ex?.from_date || vm.state.copyTargetStartDate || "",
                      });
                    }}
                    label=""
                    customName="name"
                    customId="id"
                    hideSelect
                    size="small"
                  />
                </FormControl>
              </Grid>
            </>
          )}
          {copyCreateNewExam && (
          <Grid item xs={12}>
            <FormControl fullWidth size="small" variant="outlined">
              <Box mb={1} fontWeight={700} fontSize="0.875rem" color="#1e3a8a">
                From exam (source)
              </Box>
              {copyCreateNewExam && (
                <Box mb={1} fontSize="0.8125rem" color="textSecondary" component="p" style={{ marginTop: 0 }}>
                  The exam you set up above is only created when you click Copy schedule, so it cannot appear here yet.
                  Choose an existing exam to copy its timetable from. When creating a new exam, this list includes
                  <strong> all terms </strong>
                  in the year.
                </Box>
              )}
              <Dropdown
                data={copySourceExamList}
                name="copySourceExamId"
                value={copySourceExamId}
                onChange={(e) => {
                  const sourceId = e.target.value;
                  const src = (copySourceExamList || []).find((x) => String(x.id) === String(sourceId));
                  vm.setState((prev) => ({
                    copySourceExamId: sourceId,
                    copyTargetStartDate: prev.copyTargetStartDate || src?.from_date || "",
                  }));
                }}
                label=""
                customName="name"
                customId="id"
                hideSelect
                size="small"
              />
            </FormControl>
          </Grid>
          )}
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              type="date"
              label={
                copyCreateNewExam
                  ? "To exam first calendar date (new exam schedule)"
                  : "To exam first calendar date (current exam schedule)"
              }
              value={copyTargetStartDate}
              onChange={(e) => vm.setState({ copyTargetStartDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(copyRespectCalendars)}
                  onChange={(e) => vm.setState({ copyRespectCalendars: e.target.checked })}
                  color="primary"
                />
              }
              label="Skip weekends & school holidays (student holiday calendar)"
            />
          </Grid>
          {!copyCreateNewExam && (
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(copyReplaceExisting)}
                    onChange={(e) => vm.setState({ copyReplaceExisting: e.target.checked })}
                    color="primary"
                  />
                }
                label="Replace existing schedule on this exam if one exists"
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions style={{ padding: "16px 24px" }}>
        <Button onClick={vm.closeCopyDialog}>Cancel</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={vm.handleCopySchedule}
          disabled={copyLoading}
        >
          {copyLoading ? "Copying…" : "Copy schedule"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduleCopyDialog;
