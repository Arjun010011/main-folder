import React, { Component } from "react";
import {
  Paper,
  Box,
  Button,
  TextField,
  Grid,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import LoadingGif from "Components/LoadingGif";
import { Actions } from "Constants/permissions";
import { getUrlParam, dateFormat } from "Includes/functions";
import Swal from "sweetalert2";
import moment from "moment";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import Schedule from "@material-ui/icons/Schedule";
import Today from "@material-ui/icons/Today";
import Event from "@material-ui/icons/Event";
import List from "@material-ui/icons/List";
import AssignmentTurnedInOutlinedIcon from "@material-ui/icons/AssignmentTurnedInOutlined";
import SaveOutlinedIcon from "@material-ui/icons/SaveOutlined";
import FilterListOutlinedIcon from "@material-ui/icons/FilterListOutlined";
import { Dropdown } from "Components/DropDown";
import Typography from "@material-ui/core/Typography";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class LessonPlanStatus extends Component {
  constructor() {
    super();
    const params = getUrlParam();
    const {
      year,
      standard_section,
      section,
      standard,
      subject_name,
      subject_id,
      is_subject_wise,
    } = params;
    const standardNameFromParams =
      params.standard_name || params.standardName || params.std_name || "";
    const sectionNameFromParams =
      params.section_name || params.sectionName || params.sec_name || "";
    const standardSectionDisplay = params.standard_section_display || params.standardSectionDisplay || "";
    const [stdFromDisplay = "", secFromDisplay = ""] = standardSectionDisplay
      ? standardSectionDisplay.split("-").map((x) => (x || "").trim())
      : ["", ""];
    const normalizedSubjectId =
      subject_id === undefined ||
      subject_id === null ||
      subject_id === "" ||
      subject_id === "undefined" ||
      subject_id === "null" ||
      Number(subject_id) === 0
        ? null
        : subject_id;
    this.state = {
      year,
      standard_section,
      section,
      standard,
      standard_name: standardNameFromParams || stdFromDisplay || "",
      section_name: sectionNameFromParams || secFromDisplay || "",
      subject: {
        subject_name: subject_name || "",
        subject_id: normalizedSubjectId,
      },
      is_subject_wise: is_subject_wise === "1" || is_subject_wise === true,
      dateRangeValueDefault: moment().format("YYYY-MM-DD"),
      loading: true,
      pendingTasks: [],
      todayTasks: [],
      tomorrowTasks: [],
      todayStatusLoading: true,
      todayStatusSaveLoading: false,
      assignedSubjectsList: [],
    };
  }

  navigateToTopicsSubtopicsDatewise = () => {
    const { year, standard_section, section, standard, subject, standard_name, section_name } = this.state;
    const searchParam = new URLSearchParams({
      year,
      standard,
      standard_section,
      section,
      is_subject_wise: "1",
      ...(subject?.subject_id && {
        subject_id: subject.subject_id,
        subject_name: subject.subject_name || "",
      }),
      ...(standard_name && { standard_name }),
      ...(section_name && { section_name }),
    }).toString();
    this.props.history.push({
      pathname: Actions.lesson_plan_topics_subtopics_datewise?.view?.url || "/lesson_plan/topics-subtopics-datewise",
      search: `?${searchParam}`,
    });
  };

  fetchAssignedSubjects = () => {
    const { year, standard, section } = this.state;
    if (!year || !standard || !section) {
      this.setState({ assignedSubjectsList: [], loading: false });
      return;
    }
    const params = { academic_year: year, standard, section };
    getRequest(GET_URL.getAssignSubject?.api || "classes/getassignsubject/", params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const res = response.data?.data ?? response.data ?? {};
          const raw = Array.isArray(res) ? res : (res.assigned_subjects ?? res.assigned ?? []);
          const list = raw.map((item) => ({
            id: item.subject_id ?? item.subject ?? item.id,
            name: item.subject_name ?? item.name ?? "—",
          })).filter((s) => s.id != null);
          this.setState({ assignedSubjectsList: list, loading: false }, () => {
            const currentId = this.state.subject?.subject_id;
            if (currentId != null && currentId !== "" && currentId !== "undefined" && currentId !== "null" && Number(currentId) !== 0) {
              this.fetchTaskStatus();
              return;
            }
            if (list.length === 1) {
              this.setState(
                { subject: { subject_id: list[0].id, subject_name: list[0].name } },
                () => this.fetchTaskStatus()
              );
            }
          });
        } else {
          this.setState({ assignedSubjectsList: [], loading: false });
        }
      })
      .catch(() => this.setState({ assignedSubjectsList: [], loading: false }));
  };

  componentDidMount() {
    if (!this.state.is_subject_wise) {
      this.fetchAssignedSubjects();
    } else if (this.state.subject?.subject_id) {
      this.fetchTaskStatus();
    } else {
      this.setState({ loading: false });
    }
  }

  fetchTaskStatus = () => {
    const currentSubjectId = this.state.subject?.subject_id;
    if (
      currentSubjectId === undefined ||
      currentSubjectId === null ||
      currentSubjectId === "" ||
      currentSubjectId === "undefined" ||
      currentSubjectId === "null" ||
      Number(currentSubjectId) === 0
    ) {
      this.setState({
        pendingTasks: [],
        todayTasks: [],
        tomorrowTasks: [],
        todayStatusLoading: false,
        loading: false,
      });
      return;
    }
    this.setState({ todayStatusLoading: true });
    const { standard_section, subject, dateRangeValueDefault, year } = this.state;
    const params = {
      academic_year: year,
      standard_section,
      subject: subject?.subject_id,
      for_date: dateRangeValueDefault,
    };
    const normalizeTasks = (list) =>
      Array.isArray(list)
        ? list.map((t) => {
            const detail = t.detail ?? {};
            const hasFlag = Object.prototype.hasOwnProperty.call(t, "is_completed");
            if (hasFlag) return t;
            const completed = this.hasCommentDate(detail);
            return { ...t, is_completed: completed };
          })
        : [];
    getRequest(
      GET_URL.updatelessonplanningstatus?.api || "classes/updatelessonplanningstatus/",
      params,
      this.props
    )
      .then((response) => {
        if (response && response.status === 200) {
          const data = response.data?.data ?? response.data ?? {};
          this.setState({
            pendingTasks: normalizeTasks(data.pending_tasks),
            todayTasks: normalizeTasks(data.todays_tasks),
            tomorrowTasks: normalizeTasks(data.tomorrows_tasks),
            todayStatusLoading: false,
            loading: false,
          });
        } else {
          this.setState({
            pendingTasks: [],
            todayTasks: [],
            tomorrowTasks: [],
            todayStatusLoading: false,
            loading: false,
          });
        }
      })
      .catch(() => {
        this.setState({
          pendingTasks: [],
          todayTasks: [],
          tomorrowTasks: [],
          todayStatusLoading: false,
          loading: false,
        });
      });
  };

  hasCommentDate = (detail) =>
    Array.isArray(detail?.comments) && detail.comments.some((c) => c && c.date != null);

  getCompletionDateFromDetail = (detail) => {
    if (!detail) return null;
    const withDate = Array.isArray(detail.comments) && detail.comments.find((c) => c && c.date != null);
    if (withDate && withDate.date) return withDate.date;
    return detail.completion_date || null;
  };

  getCommentsDisplay = (row) => {
    if (row.comments !== undefined && row.comments !== null) {
      return typeof row.comments === "string" ? row.comments : "";
    }
    const comments = row.detail?.comments;
    if (comments == null) return "";
    if (Array.isArray(comments)) {
      return comments
        .map((c) => (typeof c === "string" ? c : c?.message != null ? String(c.message) : ""))
        .filter(Boolean)
        .join(" ");
    }
    return typeof comments === "string" ? comments : "";
  };

  getTaskDisplayRow = (row) => {
    const detail = row.detail ?? {};
    const id = detail.id ?? row.subtopic_detail_id ?? row.id;
    const date = detail.allocated_from_date || detail.allocated_to_date || row.date;
    const comments = this.getCommentsDisplay(row);
    const subtopic_name = row.subtopic_name ?? detail.name ?? "—";
    console.log(row.is_completed,'row.is_completed')
    console.log(!!row.is_completed,'!!row.is_completed')
    const is_completed = !!row.is_completed;
    const completion_date = is_completed ? (detail.completion_date || null) : null;
    return {
      date,
      topic_name: row.topic_name ?? row.title ?? "—",
      subtopic_name,
      comments,
      is_completed,
      completion_date,
      id,
    };
  };

  handleTaskCommentsChange = (taskType, index, value) => {
    const key =
      taskType === "pending" ? "pendingTasks" : taskType === "today" ? "todayTasks" : "tomorrowTasks";
    const tasks = [...this.state[key]];
    if (tasks[index]) {
      tasks[index] = { ...tasks[index], comments: value };
      this.setState({ [key]: tasks });
    }
  };

  handleTaskCompleteChange = (taskType, index, checked) => {
    const key =
      taskType === "pending" ? "pendingTasks" : taskType === "today" ? "todayTasks" : "tomorrowTasks";
    const tasks = [...this.state[key]];
    const task = tasks[index];
    if (!task) return;

    if (checked) {
      const detail = task.detail ?? {};
      tasks[index] = {
        ...task,
        is_completed: true,
        detail: { ...detail, completion_date: this.state.dateRangeValueDefault },
      };
      this.setState({ [key]: tasks });
      return;
    }

    Swal.fire({
      title: "Mark as not completed?",
      text: "Are you sure you need to mark as not completed?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, mark as not completed",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result && (result.isConfirmed === true || result.value === true)) {
        this.setState((prev) => {
          const prevTasks = [...(prev[key] || [])];
          const t = prevTasks[index];
          if (!t) return {};
          const d = t.detail ?? {};
          prevTasks[index] = {
            ...t,
            is_completed: !t.is_completed,
            detail: { ...d, completion_date: null },
          };
          console.log(prevTasks,'prevTasks')
          console.log({[key]: prevTasks},'{[key]: prevTasks}')
          return { [key]: prevTasks };
        });
      }
    });
  };

  saveTodayStatus = () => {
    const {
      pendingTasks,
      todayTasks,
      tomorrowTasks,
      standard_section,
      subject,
      dateRangeValueDefault,
      year,
    } = this.state;
    const forDate = dateFormat(dateRangeValueDefault, "YYYY-MM-DD");
    const toSubtasks = (tasks) =>
      (Array.isArray(tasks) ? tasks : [])
        .map((t) => {
          const detail = t.detail ?? {};
          const subtopicDetailId = detail.id ?? t.subtopic_detail_id ?? t.id;
          if (subtopicDetailId == null) return null;
          const isCompleted = !!t.is_completed;
          let comment = "";
          if (t.comments !== undefined && t.comments !== null) {
            comment = typeof t.comments === "string" ? t.comments : "";
          } else if (Array.isArray(detail.comments)) {
            comment = (detail.comments || [])
              .map((c) => (typeof c === "string" ? c : c?.message != null ? String(c.message) : ""))
              .filter(Boolean)
              .join(" ")
              .trim();
          } else if (typeof detail.comments === "string") {
            comment = detail.comments.trim();
          }
          comment = (comment || "").trim();
          const existingStatusId =
            detail.status_id ??
            detail.completion_record_id ??
            (Array.isArray(detail.comments) && detail.comments.length > 0 && detail.comments[0].id != null
              ? detail.comments[0].id
              : null) ??
            t.status_id ??
            t.completion_record_id;
          const subtask = {
            subtopic_detail_id: Number(subtopicDetailId),
            comment: comment || "",
            completed_date: isCompleted ? forDate : null,
          };
          if (existingStatusId != null) {
            subtask.id = Number(existingStatusId);
          }
          return subtask;
        })
        .filter(Boolean);
    const bySubtopicDetailId = new Map();
    [...toSubtasks(pendingTasks), ...toSubtasks(todayTasks), ...toSubtasks(tomorrowTasks)].forEach(
      (s) => {
        if (s) bySubtopicDetailId.set(s.subtopic_detail_id, s);
      }
    );
    const subtasks = Array.from(bySubtopicDetailId.values());
    const payload = {
      standard_section: Number(standard_section),
      subject: Number(subject?.subject_id ?? subject),
      academic_year: Number(year),
      subtasks,
    };
    return postRequest(
      POST_URL.updatelessonplanningstatus?.api || "classes/updatelessonplanningstatus/",
      payload,
      this.props
    );
  };

  handleSaveTodayStatus = () => {
    this.setState({ todayStatusSaveLoading: true });
    this.saveTodayStatus()
      .then((res) => {
        this.setState({ todayStatusSaveLoading: false });
        if (res && res.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: "Teaching plan updated successfully",
            showConfirmButton: false,
            timer: 1500,
          });
          this.handleBack();
        }
      })
      .catch(() => this.setState({ todayStatusSaveLoading: false }));
  };

  handleBack = () => {
    const { year, standard_section, section, standard } = this.state;
    const searchParam =
      "?" +
      new URLSearchParams({
        year,
        standard,
        standard_section,
        section,
        date: this.state.dateRangeValueDefault,
        is_subject_wise: this.state.is_subject_wise ? "1" : "0",
        ...(this.state.subject?.subject_id && {
          subject_id: this.state.subject.subject_id,
          subject_name: this.state.subject.subject_name,
        }),
      }).toString();
    this.props.history.push({
      pathname: Actions.studentattendance_attendance?.view?.url || "/studentattendance/markattendance",
      search: searchParam,
    });
  };

  onDateChange = (value) => {
    const formattedDate = moment(value).format("YYYY-MM-DD");
    this.setState({ dateRangeValueDefault: formattedDate }, () => {
      if (this.state.subject?.subject_id) {
        this.fetchTaskStatus();
      }
    });
  };

  onSubjectChange = (e) => {
    const selectedId = e.target.value;
    if (selectedId == null || selectedId === "" || selectedId === 0) return;
    const { assignedSubjectsList } = this.state;
    const selected = (assignedSubjectsList || []).find((s) => Number(s.id) === Number(selectedId));
    const subject = selected
      ? { subject_id: selected.id, subject_name: selected.name }
      : { subject_id: null, subject_name: "" };
    this.setState({ subject }, () => this.fetchTaskStatus());
  };

  renderTaskTable = (tasks, taskType, emptyLabel) => (
    <TableContainer component={Paper} variant="outlined" style={{ boxShadow: "none" }}>
      <Table size="small" style={{ tableLayout: "fixed" }}>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Topic</TableCell>
            <TableCell>Subtopic</TableCell>
            <TableCell>Comments</TableCell>
            <TableCell align="center">Done</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(tasks || []).length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                {emptyLabel}
              </TableCell>
            </TableRow>
          ) : (
            (tasks || []).map((row, idx) => {
              const d = this.getTaskDisplayRow(row);
              return (
                <TableRow
                  key={d.id || row.topic_id || row.subtopic_id || idx}
                  style={{ backgroundColor: d.is_completed ? "rgba(76, 175, 80, 0.08)" : undefined }}
                >
                  <TableCell>{d.date ? dateFormat(d.date, "DD-MM-YYYY") : "—"}</TableCell>
                  <TableCell>{d.topic_name}</TableCell>
                  <TableCell>{d.subtopic_name}</TableCell>
                  <TableCell>
                    <TextField
                      multiline
                      minRows={1}
                      maxRows={3}
                      size="small"
                      variant="outlined"
                      placeholder="e.g. DD-MM-YYYY - your comment"
                      value={d.comments || ""}
                      onChange={(e) =>
                        this.handleTaskCommentsChange(taskType, idx, e.target.value)
                      }
                      fullWidth
                    />
                  </TableCell>
                  <TableCell align="center">
                    {d.is_completed && d.completion_date && (
                      <Box component="span" display="block" style={{ fontSize: "0.875rem" }} color="textSecondary">
                        {dateFormat(d.completion_date, "DD-MM-YYYY")}
                      </Box>
                    )}
                    <Switch
                      checked={!!d.is_completed}
                      onChange={(e) =>
                        this.handleTaskCompleteChange(taskType, idx, e.target.checked)
                      }
                      color="primary"
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  render() {
    if (this.state.loading && (this.state.is_subject_wise || this.state.subject?.subject_id)) {
      return <LoadingGif />;
    }
    const {
      standard_name,
      section_name,
      subject,
      dateRangeValueDefault,
      todayStatusLoading,
      pendingTasks,
      todayTasks,
      tomorrowTasks,
      is_subject_wise,
      todayStatusSaveLoading,
      assignedSubjectsList,
    } = this.state;

    return (
      <Paper className="paper-background" elevation={0} style={{ borderRadius: 12, overflow: "hidden" }}>
        <Box px={2} pt={2} pb={1}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12} md={8}>
              <Box display="flex" alignItems="center" flexWrap="wrap" style={{ gap: 12 }}>
                <Box display="flex" alignItems="center" justifyContent="center" style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)" }}>
                  <AssignmentTurnedInOutlinedIcon style={{ fontSize: 28, color: "#1976d2" }} />
                </Box>
                <Box>
                  <Typography variant="h6" style={{ fontWeight: 600, color: "#1565c0" }}>
                    Update Teaching Plan
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Mark lesson plan as done and add comments
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" justifyContent="flex-end" flexWrap="wrap" style={{ gap: 8 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  startIcon={<List />}
                  onClick={this.navigateToTopicsSubtopicsDatewise}
                  disabled={!subject?.subject_id}
                  style={{ textTransform: "none", borderRadius: 8 }}
                >
                  View All Topics and Subtopics Date Wise
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  className="editbutton-view"
                  startIcon={<VisibilityOutlinedIcon />}
                  onClick={this.handleBack}
                  style={{ textTransform: "none", borderRadius: 8 }}
                >
                  Back to Mark Attendance
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Box px={2} py={2} mt={0} style={{ backgroundColor: "#f8f9fa", borderRadius: 12, border: "1px solid #e9ecef", margin: "0 16px 16px" }}>
          <Typography variant="subtitle2" style={{ fontWeight: 600, color: "#495057", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <FilterListOutlinedIcon style={{ fontSize: 20 }} /> Selection
          </Typography>
          <Box display="flex" flexWrap="wrap" alignItems="center" style={{ gap: 12 }}>
            <Box className="exam-mark-heading-box" style={{ padding: "6px 12px", backgroundColor: "#fff", borderRadius: 8, border: "1px solid #dee2e6" }}>
              {alias_names["standard"]}: <strong>{standard_name}</strong>
            </Box>
            <Box className="exam-mark-heading-box" style={{ padding: "6px 12px", backgroundColor: "#fff", borderRadius: 8, border: "1px solid #dee2e6" }}>
              {alias_names["section"]}: <strong>{section_name}</strong>
            </Box>
            {is_subject_wise && subject?.subject_name && (
              <Box className="exam-mark-heading-box" style={{ padding: "6px 12px", backgroundColor: "#fff", borderRadius: 8, border: "1px solid #dee2e6" }}>
                Subject: <strong>{subject.subject_name}</strong>
              </Box>
            )}
            {!is_subject_wise && (
              <Box style={{ minWidth: 200 }}>
                <Dropdown
                  label="Subject"
                  name="subject"
                  data={assignedSubjectsList || []}
                  value={subject?.subject_id ?? ""}
                  onChange={this.onSubjectChange}
                  hideSelect={true}
                  size="small"
                  customId="id"
                  customName="name"
                />
              </Box>
            )}
            <TextField
              type="date"
              variant="outlined"
              size="small"
              value={dateRangeValueDefault}
              onChange={(e) => this.onDateChange(e.target.value)}
              style={{ minWidth: 160 }}
              InputProps={{ style: { borderRadius: 8 } }}
            />
          </Box>
        </Box>

        {!subject?.subject_id || subject?.subject_id === "undefined" || subject?.subject_id === "null" ? (
          <Box py={4} textAlign="center" color="textSecondary" px={2}>
            <Typography variant="body1">Please select the subject to continue.</Typography>
          </Box>
        ) : todayStatusLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Box px={2} pb={2}>
            <Box mt={2} mb={1} display="flex" alignItems="center" style={{ gap: 8 }}>
              <Schedule color="action" fontSize="small" />
              <Typography variant="subtitle1" style={{ fontWeight: 600, color: "#495057" }}>Pending Plan</Typography>
            </Box>
            <Box mb={2}>
              {this.renderTaskTable(pendingTasks, "pending", "No pending plan")}
            </Box>
            <Box mt={2} mb={1} display="flex" alignItems="center" style={{ gap: 8 }}>
              <Today color="primary" fontSize="small" />
              <Typography variant="subtitle1" style={{ fontWeight: 600, color: "#1976d2" }}>Today&apos;s Plan</Typography>
            </Box>
            <Box mb={2}>
              {this.renderTaskTable(todayTasks, "today", "No plan for today")}
            </Box>
            <Box mt={2} mb={1} display="flex" alignItems="center" style={{ gap: 8 }}>
              <Event color="secondary" fontSize="small" />
              <Typography variant="subtitle1" style={{ fontWeight: 600, color: "#7b1fa2" }}>Tomorrow&apos;s Plan</Typography>
            </Box>
            <Box mb={2}>
              {this.renderTaskTable(tomorrowTasks, "tomorrow", "No plan for tomorrow")}
            </Box>
          </Box>
        )}

        <Box display="flex" justifyContent="flex-end" flexWrap="wrap" mt={2} pt={2} px={2} pb={2} style={{ gap: 12, borderTop: "1px solid #e9ecef" }}>
          <Button
            variant="contained"
            size="medium"
            startIcon={todayStatusSaveLoading ? null : <SaveOutlinedIcon />}
            disabled={todayStatusSaveLoading || !subject?.subject_id}
            onClick={this.handleSaveTodayStatus}
            style={{
              textTransform: "none",
              borderRadius: 8,
              backgroundColor: "#2e7d32",
              color: "#fff",
              minWidth: 140,
              minHeight: 40,
              padding: "8px 20px",
            }}
          >
            {todayStatusSaveLoading ? <CircularProgress size={20} color="inherit" /> : "Save"}
          </Button>
        </Box>
      </Paper>
    );
  }
}

export default withRouter(LessonPlanStatus);
