import React from "react";
import { Box, CircularProgress, Grid, List, ListItem, ListItemText, Typography } from "@material-ui/core";
import { APPROVAL_STATUS } from "Constants";

const toListItem = (row) => {
  const desc = row.description || "";
  return {
    id: row.id,
    exam_type_name: row.exam_type_name || "",
    description: desc.length > 140 ? `${desc.slice(0, 137)}…` : desc,
  };
};

const ScheduleDashboardMetricsPanel = ({
  scheduleDashboardSummary,
  scheduleDashboardLoading,
  scheduleDashboardRows,
  loadingExamGet,
  openExamFromDashboard,
}) => {
  const shellSx = {
    borderRadius: 16,
    overflow: "hidden",
    overflowX: "hidden",
    border: "1px solid #e0e7ff",
    background: "linear-gradient(165deg, #fafbff 0%, #ffffff 42%, #f8fafc 100%)",
    boxShadow: "0 4px 28px rgba(15, 23, 42, 0.07)",
  };
  const sectionLabel = (text, hint) => (
    <Box mb={2} mt={0.5}>
      <Typography
        variant="overline"
        style={{
          fontWeight: 800,
          letterSpacing: "0.12em",
          color: "#6366f1",
          display: "block",
          lineHeight: 1.4,
        }}
      >
        {text}
      </Typography>
      {hint ? (
        <Typography variant="body2" style={{ color: "#64748b", marginTop: 2, maxWidth: 720 }}>
          {hint}
        </Typography>
      ) : null}
    </Box>
  );

  if (scheduleDashboardLoading && !scheduleDashboardSummary) {
    return (
      <Box style={shellSx}>
        <Box px={2.5} py={3} display="flex" justifyContent="center" alignItems="center" minHeight={220}>
          <CircularProgress size={32} style={{ color: "#6366f1" }} />
        </Box>
      </Box>
    );
  }
  const s = scheduleDashboardSummary;
  if (!s) return null;

  const totalExams = Number(s.total_exams) || 0;
  const withSched = Number(s.exams_with_schedule_rows) || 0;
  const pct = s.pct_exams_scheduled != null ? s.pct_exams_scheduled : 0;
  const totalSec = Number(s.total_sections_academic_year) || 0;
  const secSched = Number(s.sections_with_schedule) || 0;
  const secPending = Number(s.sections_pending) || 0;
  const lists = s.exam_lists || {};
  const rows = scheduleDashboardRows || [];
  const approvedSchedExams = rows
    .filter((r) => String(r.approval_status) === APPROVAL_STATUS.approved)
    .map((r) => toListItem(r));
  const unapprovedSchedExams = rows
    .filter((r) => String(r.approval_status) !== APPROVAL_STATUS.approved)
    .map((r) => toListItem(r));
  const examsWithoutTimetableCount = Math.max(0, totalExams - withSched);
  const resultsPendingFinalizeCount = rows.filter((r) => {
    const total = Number(r.result_config_total || 0);
    const approved = Number(r.result_config_approved || 0);
    return total > 0 && approved < total;
  }).length;
  const resultsPendingAnnounceCount = rows.filter((r) => {
    const total = Number(r.result_config_total || 0);
    const announced = Number(r.result_config_announced || 0);
    return total > 0 && announced < total;
  }).length;
  const noTimetableExamList = rows
    .filter((r) => Number(r.schedule_count || 0) === 0)
    .map((r) => toListItem(r));
  const pendingActionExamList = rows
    .filter((r) => {
      const isUnapproved = String(r.approval_status) !== APPROVAL_STATUS.approved;
      const total = Number(r.result_config_total || 0);
      const announced = Number(r.result_config_announced || 0);
      return isUnapproved || (total > 0 && announced < total);
    })
    .map((r) => toListItem(r));

  const metricCard = (label, value, sub, accent) => (
    <Grid item xs={12} sm={6} md={3}>
      <Box
        style={{
          height: "100%",
          borderRadius: 14,
          padding: "18px 18px 16px",
          background: "#fff",
          border: "1px solid #eef2ff",
          boxShadow: "0 2px 12px rgba(99, 102, 241, 0.06)",
          borderLeft: `4px solid ${accent}`,
        }}
      >
        <Typography variant="caption" style={{ fontWeight: 700, color: "#64748b", letterSpacing: "0.04em" }}>
          {label}
        </Typography>
        <Typography variant="h4" style={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.15, margin: "6px 0 4px" }}>
          {value}
        </Typography>
        <Typography variant="body2" style={{ color: "#64748b", lineHeight: 1.45 }}>
          {sub}
        </Typography>
      </Box>
    </Grid>
  );

  const listBlock = (title, subtitle, items, mdCols, accentBar) => (
    <Grid item xs={12} md={mdCols}>
      <Box
        style={{
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid #e8ecf4",
          background: "#fff",
          boxShadow: "0 2px 14px rgba(15, 23, 42, 0.05)",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          px={2}
          py={1.5}
          style={{
            borderBottom: "1px solid #f1f5f9",
            background: "linear-gradient(180deg, #f8fafc 0%, #fff 100%)",
            borderLeft: `4px solid ${accentBar}`,
          }}
        >
          <Typography variant="subtitle2" style={{ fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>
            {title}
          </Typography>
          <Typography variant="caption" style={{ color: "#64748b", display: "block", marginTop: 4, lineHeight: 1.4 }}>
            {subtitle}
          </Typography>
        </Box>
        <Box px={1} py={0.5} style={{ flex: 1 }}>
          {!items || !items.length ? (
            <Box py={2} px={1}>
              <Typography variant="body2" style={{ color: "#94a3b8", fontStyle: "italic" }}>
                None for this term.
              </Typography>
            </Box>
          ) : (
            <List dense disablePadding style={{ maxHeight: mdCols >= 6 ? 320 : 200, overflow: "auto" }}>
              {items.map((ex, idx) => (
                <ListItem
                  key={ex.id}
                  button
                  onClick={() => !loadingExamGet && openExamFromDashboard(ex.id)}
                  style={{
                    borderRadius: 8,
                    margin: "2px 6px",
                    paddingTop: 8,
                    paddingBottom: 8,
                    backgroundColor: idx % 2 === 0 ? "rgba(248, 250, 252, 0.85)" : "transparent",
                  }}
                >
                  <ListItemText
                    primary={ex.exam_type_name || `Exam #${ex.id}`}
                    secondary={ex.description || undefined}
                    primaryTypographyProps={{ variant: "body2", style: { fontWeight: 700, color: "#1e293b" } }}
                    secondaryTypographyProps={{ variant: "caption", style: { color: "#64748b" } }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Box>
    </Grid>
  );

  return (
    <Box style={shellSx}>
      <Box
        px={{ xs: 2, sm: 3 }}
        py={2.25}
        style={{
          borderBottom: "1px solid #eef2ff",
          background: "linear-gradient(105deg, rgba(99, 102, 241, 0.09) 0%, rgba(255, 255, 255, 0.9) 55%)",
        }}
      >
        <Typography variant="h6" style={{ fontWeight: 800, color: "#1e1b4b", letterSpacing: "-0.02em" }}>
          Exam dashboard
        </Typography>
        <Typography variant="body2" style={{ color: "#64748b", marginTop: 6, maxWidth: 640, lineHeight: 1.5 }}>
          Action-focused status for timetable completion, approvals, and results.
        </Typography>
      </Box>

      <Box px={{ xs: 2, sm: 3 }} py={2.75}>
        {sectionLabel("Action Required", "Use these counts to quickly identify what needs work this term.")}
        <Grid container spacing={2} style={{ margin: 0, width: "100%", marginBottom: 28 }}>
          {metricCard(
            "Exams without timetable",
            String(examsWithoutTimetableCount),
            `${withSched}/${totalExams} exams already have timetable rows`,
            "#dc2626"
          )}
          {metricCard(
            "Timetable not approved",
            String(unapprovedSchedExams.length),
            "Draft, pending, rejected, or not submitted",
            "#d97706"
          )}
          {metricCard(
            "Results pending finalize",
            String(resultsPendingFinalizeCount),
            "Exams where result configuration is still not fully approved",
            "#7c3aed"
          )}
          {metricCard(
            "Results pending announce",
            String(resultsPendingAnnounceCount),
            "Exams where results are not fully announced yet",
            "#2563eb"
          )}
        </Grid>

        {sectionLabel("Progress Snapshot", "Overall timetable coverage across exams and sections.")}
        <Grid container spacing={2} style={{ margin: 0, width: "100%", marginBottom: 28 }}>
          {metricCard(
            "Exams scheduled",
            `${pct}%`,
            `${withSched} of ${totalExams} exams have at least one timetable row`,
            "#16a34a"
          )}
          {metricCard(
            "Sections with slots",
            String(secSched),
            "Distinct class sections with at least one slot for this term’s exams",
            "#0d9488"
          )}
          {metricCard(
            "Sections pending",
            String(secPending),
            "AY sections with no timetable row yet for these exams",
            "#ea580c"
          )}
          {metricCard(
            "Total sections (AY)",
            String(totalSec),
            "All standard–section mappings this academic year",
            "#64748b"
          )}
        </Grid>

        {sectionLabel("Exam Queues", "Click an exam to open schedule and continue pending work.")}
        <Grid container spacing={2} style={{ margin: 0, width: "100%" }}>
          {listBlock(
            `No timetable yet (${noTimetableExamList.length})`,
            "These exams do not have any timetable rows.",
            noTimetableExamList,
            6,
            "#dc2626"
          )}
          {listBlock(
            `Pending actions (${pendingActionExamList.length})`,
            "Unapproved timetable or results not fully announced.",
            pendingActionExamList,
            6,
            "#d97706"
          )}
        </Grid>
      </Box>
    </Box>
  );
};

export default ScheduleDashboardMetricsPanel;
