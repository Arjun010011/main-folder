import React, { Component } from "react";
import {
  Paper,
  Box,
  Button,
  TextField,
  Grid,
  Typography,
  Chip,
  Divider,
  InputAdornment,
  Switch,
  CircularProgress,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import LoadingGif from "Components/LoadingGif";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { Actions } from "Constants/permissions";
import { getUrlParam, dateFormat } from "Includes/functions";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import List from "@material-ui/icons/List";
import Search from "@material-ui/icons/Search";
import EventNoteOutlinedIcon from "@material-ui/icons/EventNoteOutlined";
import MenuBookOutlinedIcon from "@material-ui/icons/MenuBookOutlined";
import ClassOutlinedIcon from "@material-ui/icons/ClassOutlined";
import PersonOutlineOutlinedIcon from "@material-ui/icons/PersonOutlineOutlined";
import Swal from "sweetalert2";
import moment from "moment";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class TopicsSubtopicsDatewise extends Component {
  constructor() {
    super();
    const {
      year,
      standard_section,
      section,
      standard,
      standard_name,
      section_name,
      subject_name,
      subject_id,
    } = getUrlParam();
    this.state = {
      year,
      standard_section,
      section,
      standard,
      standard_name: standard_name || "",
      section_name: section_name || "",
      subject_name: subject_name || "",
      subject_id: subject_id || null,
      loading: true,
      datewiseData: [],
      dateFilter: "",
      rowEdits: {},
      saveLoading: false,
      heading: {
        standard_name: standard_name || "",
        section_name: section_name || "",
        subject_name: subject_name || "",
        staff_names: "",
      },
    };
  }

  componentDidMount() {
    this.fetchAllocationAndTopics();
  }

  fetchAllocationAndTopics = () => {
    this.setState({ loading: true });
    const { standard_section, subject_id, year } = this.state;
    const listUrl =
      GET_URL.lessonplantemplateacademicyear?.api || "classes/lessonplantemplateacademicyear/";
    const listParams = { academic_year: year, standard_section, limit: 100 };
    getRequest(listUrl, listParams, this.props)
      .then((response) => {
        if (!response || response.status !== 200) {
          this.setState({ datewiseData: [], loading: false });
          return;
        }
        const res = response.data;
        const rawList = res?.data?.data_list ?? res?.data ?? res?.results ?? res;
        const list = Array.isArray(rawList) ? rawList : [];
        const subjId = subject_id ? parseInt(subject_id, 10) : null;
        const allocation =
          (subjId &&
            list.find((row) => {
              const rid = row.subject?.id ?? row.subject;
              return rid != null && (parseInt(rid, 10) === subjId || rid === subjId);
            })) ||
          list[0];
        if (!allocation || !allocation.id) {
          this.setState({ datewiseData: [], loading: false });
          return;
        }
        getRequest(listUrl + allocation.id + "/", {}, this.props)
          .then((detailRes) => {
            if (!detailRes || detailRes.status !== 200) {
              this.setState({ datewiseData: [], loading: false });
              return;
            }
            const data = detailRes.data?.data ?? detailRes.data ?? {};
            const rawTopics = data.topics ?? data.topics_data ?? [];
            const lessonPlan = data.lesson_plan ?? allocation;
            const stdSec = lessonPlan.standard_section ?? allocation.standard_section ?? {};
            const subj = lessonPlan.subject ?? allocation.subject ?? {};
            const staff =
              data.assigned_staff ??
              data.staff ??
              allocation.assigned_staff ??
              allocation.staff ??
              [];
            const staffNames = Array.isArray(staff)
              ? staff.map((s) => s.name ?? s.full_name ?? s.username ?? "—").filter(Boolean).join(", ") || "—"
              : typeof staff === "string"
                ? staff
                : "—";
            const dateMap = {};
            rawTopics.forEach((t) => {
              const topicName = t.name ?? t.topic_name ?? "—";
              const rawSubtopics = t.subtopics ?? t.subtopic_list ?? [];
              rawSubtopics.forEach((s) => {
                const details = s.subtopic_details ?? s.details ?? s.subtopic_detail ?? [];
                const first = Array.isArray(details) ? details[0] : details;
                const fromDate = s.allocated_from_date ?? first?.allocated_from_date ?? null;
                const toDate = s.allocated_to_date ?? first?.allocated_to_date ?? null;
                const dateKey = fromDate || toDate || "unspecified";
                if (!dateMap[dateKey]) dateMap[dateKey] = {};
                if (!dateMap[dateKey][topicName]) dateMap[dateKey][topicName] = [];
                const completionDate = first?.completion_date ?? s.completion_date ?? null;
                const objectives = first?.objectives ?? s.objectives ?? "";
                const commentsRaw = first?.comments;
                const existingStatusId =
                  first?.status_id ??
                  first?.completion_record_id ??
                  (Array.isArray(commentsRaw) && commentsRaw.length > 0 && commentsRaw[0].id != null
                    ? commentsRaw[0].id
                    : null);
                dateMap[dateKey][topicName].push({
                  name: s.name ?? "—",
                  allocated_from_date: fromDate,
                  allocated_to_date: toDate,
                  completion_date: completionDate,
                  objectives: typeof objectives === "string" ? objectives : (objectives && objectives[0]) ?? "",
                  subtopic_detail_id: first?.id ?? s.id,
                  comments: commentsRaw,
                  status_id: existingStatusId,
                });
              });
            });
            const datewiseList = Object.entries(dateMap)
              .filter(([k]) => k !== "unspecified")
              .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
              .map(([date, topicMap]) => ({
                date,
                topics: Object.entries(topicMap).map(([topicName, subs]) => ({
                  name: topicName,
                  topic_name: topicName,
                  subtopics: subs,
                })),
              }));
            if (dateMap.unspecified && Object.keys(dateMap.unspecified).length > 0) {
              datewiseList.push({
                date: null,
                topics: Object.entries(dateMap.unspecified).map(([topicName, subs]) => ({
                  name: topicName,
                  topic_name: topicName,
                  subtopics: subs,
                })),
              });
            }
            const standardName =
              stdSec.standard_name ?? stdSec.standard?.name ?? this.state.standard_name ?? "—";
            const sectionName =
              stdSec.section__name ?? stdSec.section?.name ?? this.state.section_name ?? "—";
            const subjectName = subj.name ?? subj.subject_name ?? this.state.subject_name ?? "—";
            const forDate =
              datewiseList.length > 0 && datewiseList[0].date
                ? datewiseList[0].date
                : moment().format("YYYY-MM-DD");
            const statusUrl =
              GET_URL.updatelessonplanningstatus?.api || "classes/updatelessonplanningstatus/";
            getRequest(statusUrl, {
              academic_year: year,
              standard_section,
              subject: subjId ?? allocation.subject?.id ?? allocation.subject,
              for_date: forDate,
            }, this.props)
              .then((statusRes) => {
                const statusData = statusRes?.data?.data ?? statusRes?.data ?? {};
                const allTasks = [
                  ...(Array.isArray(statusData.pending_tasks) ? statusData.pending_tasks : []),
                  ...(Array.isArray(statusData.todays_tasks) ? statusData.todays_tasks : []),
                  ...(Array.isArray(statusData.tomorrows_tasks) ? statusData.tomorrows_tasks : []),
                ];
                const byDetailId = {};
                allTasks.forEach((task) => {
                  const detail = task.detail ?? {};
                  const detailId = detail.id ?? task.subtopic_detail_id;
                  if (detailId == null) return;
                  const comments = detail.comments;
                  const statusId =
                    detail.status_id ??
                    detail.completion_record_id ??
                    (Array.isArray(comments) && comments[0]?.id != null ? comments[0].id : null);
                  byDetailId[detailId] = {
                    comments: comments ?? byDetailId[detailId]?.comments,
                    completion_date: detail.completion_date ?? byDetailId[detailId]?.completion_date,
                    status_id: statusId ?? byDetailId[detailId]?.status_id,
                  };
                });
                datewiseList.forEach((dateGroup) => {
                  (dateGroup.topics || []).forEach((topic) => {
                    (topic.subtopics || []).forEach((sub) => {
                      const sid = sub.subtopic_detail_id;
                      if (sid != null && byDetailId[sid]) {
                        const en = byDetailId[sid];
                        if (en.comments != null) sub.comments = en.comments;
                        if (en.completion_date !== undefined) sub.completion_date = en.completion_date;
                        if (en.status_id != null) sub.status_id = en.status_id;
                      }
                    });
                  });
                });
                this.setState({
                  datewiseData: datewiseList,
                  loading: false,
                  heading: {
                    standard_name: standardName,
                    section_name: sectionName,
                    subject_name: subjectName,
                    staff_names: staffNames,
                  },
                });
              })
              .catch(() => {
                this.setState({
                  datewiseData: datewiseList,
                  loading: false,
                  heading: {
                    standard_name: standardName,
                    section_name: sectionName,
                    subject_name: subjectName,
                    staff_names: staffNames,
                  },
                });
              });
          })
          .catch(() => this.setState({ datewiseData: [], loading: false }));
      })
      .catch(() => this.setState({ datewiseData: [], loading: false }));
  };

  getCommentsDisplay = (sub) => {
    const comments = sub.comments;
    if (comments == null) return "";
    if (Array.isArray(comments)) {
      return comments
        .map((c) => {
          if (typeof c === "string") return c;
          const msg = c?.message ?? c?.text ?? c?.comment;
          return msg != null ? String(msg) : "";
        })
        .filter(Boolean)
        .join(" ");
    }
    return typeof comments === "string" ? comments : "";
  };

  handleCommentChange = (subtopicDetailId, value) => {
    this.setState((prev) => ({
      rowEdits: {
        ...prev.rowEdits,
        [subtopicDetailId]: { ...prev.rowEdits[subtopicDetailId], comments: value },
      },
    }));
  };

  handleCompleteChange = (subtopicDetailId, checked) => {
    if (checked) {
      this.setState((prev) => ({
        rowEdits: {
          ...prev.rowEdits,
          [subtopicDetailId]: { ...prev.rowEdits[subtopicDetailId], is_completed: true },
        },
      }));
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
        this.setState((prev) => ({
          rowEdits: {
            ...prev.rowEdits,
            [subtopicDetailId]: {
              ...prev.rowEdits[subtopicDetailId],
              is_completed: false,
              completion_date: null,
            },
          },
        }));
      }
    });
  };

  handleSubmit = () => {
    this.setState({ saveLoading: true });
    const { datewiseData, rowEdits, standard_section, subject_id, year } = this.state;
    const flatRows = (datewiseData || []).flatMap((dateGroup) =>
      (dateGroup.topics || []).flatMap((topic) =>
        (topic.subtopics || []).map((sub) => ({
          date: dateGroup.date,
          subtopic_detail_id: sub.subtopic_detail_id,
          status_id: sub.status_id,
          comments: sub.comments,
          completion_date: sub.completion_date,
        }))
      )
    );
    const byId = new Map();
    flatRows.forEach((row) => {
      if (row.subtopic_detail_id == null) return;
      const edit = rowEdits[row.subtopic_detail_id] || {};
      const comment =
        edit.comments !== undefined
          ? String(edit.comments || "").trim()
          : this.getCommentsDisplay({ comments: row.comments });
      const isCompleted = edit.is_completed !== undefined ? edit.is_completed : !!row.completion_date;
      const rowDate = row.date || null;
      const completedDateStr = rowDate ? dateFormat(rowDate, "YYYY-MM-DD") : null;
      byId.set(row.subtopic_detail_id, {
        subtopic_detail_id: Number(row.subtopic_detail_id),
        comment: comment || "",
        completed_date: isCompleted ? completedDateStr : null,
        ...(row.status_id != null && { id: Number(row.status_id) }),
      });
    });
    const subtasks = Array.from(byId.values());
    const payload = {
      standard_section: Number(standard_section),
      subject: Number(subject_id),
      academic_year: Number(year),
      subtasks,
    };
    postRequest(
      POST_URL.updatelessonplanningstatus?.api || "classes/updatelessonplanningstatus/",
      payload,
      this.props
    )
      .then((res) => {
        this.setState({ saveLoading: false });
        if (res && res.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: "Status saved successfully",
            showConfirmButton: false,
            timer: 1500,
          });
          this.fetchAllocationAndTopics();
        }
      })
      .catch(() => this.setState({ saveLoading: false }));
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
        is_subject_wise: "1",
        ...(this.state.subject_id && {
          subject_id: this.state.subject_id,
          subject_name: this.state.subject_name,
        }),
        ...(this.state.standard_name && { standard_name: this.state.standard_name }),
        ...(this.state.section_name && { section_name: this.state.section_name }),
      }).toString();
    this.props.history.push({
      pathname: Actions.lesson_plan_status?.view?.url,
      search: searchParam,
    });
  };

  render() {
    const { loading, datewiseData, dateFilter, heading, rowEdits, saveLoading } = this.state;
    if (loading) return <LoadingGif />;

    const flatRows = (datewiseData || []).flatMap((dateGroup) =>
      (dateGroup.topics || []).flatMap((topic) =>
        (topic.subtopics || []).map((sub) => {
          const sid = sub.subtopic_detail_id;
          const edit = rowEdits[sid] || {};
          const commentsDisplay =
            edit.comments !== undefined ? edit.comments : this.getCommentsDisplay(sub);
          const isCompleted =
            edit.is_completed !== undefined ? edit.is_completed : !!sub.completion_date;
          const completionDate =
            (edit.completion_date !== undefined ? edit.completion_date : sub.completion_date) ||
            (isCompleted ? dateGroup.date : null);
          return {
            date: dateGroup.date,
            topicName: topic.name ?? topic.topic_name ?? "—",
            subtopicName: sub.name ?? "—",
            objectives: sub.objectives ?? "—",
            allocated_from_date: sub.allocated_from_date,
            allocated_to_date: sub.allocated_to_date,
            completion_date: sub.completion_date,
            completionDateDisplay: completionDate,
            subtopic_detail_id: sub.subtopic_detail_id,
            commentsDisplay,
            isCompleted,
          };
        })
      )
    );

    const filterLower = (dateFilter || "").trim().toLowerCase();
    const filteredRows = filterLower
      ? flatRows.filter((row) => {
          const dateStr = row.date ? dateFormat(row.date, "DD-MM-YYYY") : "";
          const topicStr = String(row.topicName || "").toLowerCase();
          const subtopicStr = String(row.subtopicName || "").toLowerCase();
          return (
            dateStr.toLowerCase().includes(filterLower) ||
            topicStr.includes(filterLower) ||
            subtopicStr.includes(filterLower)
          );
        })
      : flatRows;
    const tableData = filteredRows.map((row) => ({
      date: row.date,
      topicName: row.topicName,
      subtopicName: row.subtopicName,
      objectives: row.objectives,
      allocated_from_date: row.allocated_from_date,
      allocated_to_date: row.allocated_to_date,
      commentsDisplay: row.commentsDisplay,
      isCompleted: row.isCompleted,
      __meta: row,
    }));

    const columns = [
      {
        name: "date",
        label: "Date",
        options: {
          customBodyRender: (value) => (value ? dateFormat(value, "DD-MM-YYYY") : "—"),
        },
      },
      { name: "topicName", label: "Topic" },
      { name: "subtopicName", label: "Subtopic" },
      {
        name: "objectives",
        label: "Objectives",
        options: {
          customBodyRender: (value) => value || "—",
        },
      },
      {
        name: "allocated_from_date",
        label: "Allocated From",
        options: {
          customBodyRender: (value) => (value ? dateFormat(value, "DD-MM-YYYY") : "—"),
        },
      },
      {
        name: "allocated_to_date",
        label: "Allocated To",
        options: {
          customBodyRender: (value) => (value ? dateFormat(value, "DD-MM-YYYY") : "—"),
        },
      },
      {
        name: "commentsDisplay",
        label: "Comments",
        options: {
          sort: false,
          customBodyRender: (value, tableMeta) => {
            const meta = tableMeta?.rowData?.[8];
            if (!meta || meta.subtopic_detail_id == null) return "—";
            return (
              <TextField
                multiline
                minRows={1}
                maxRows={3}
                size="small"
                variant="outlined"
                placeholder="e.g. DD-MM-YYYY - comment"
                value={value || ""}
                onChange={(e) => this.handleCommentChange(meta.subtopic_detail_id, e.target.value)}
                fullWidth
              />
            );
          },
        },
      },
      {
        name: "isCompleted",
        label: "Completed",
        options: {
          sort: false,
          customBodyRender: (value, tableMeta) => {
            const meta = tableMeta?.rowData?.[8];
            if (!meta || meta.subtopic_detail_id == null) return "—";
            return (
              <>
                {value && meta.completionDateDisplay ? (
                  <Box component="span" display="block" style={{ fontSize: "0.8rem" }} color="textSecondary">
                    {dateFormat(meta.completionDateDisplay, "DD-MM-YYYY")}
                  </Box>
                ) : null}
                <Switch
                  checked={!!value}
                  onChange={(e) => this.handleCompleteChange(meta.subtopic_detail_id, e.target.checked)}
                  color="primary"
                  size="small"
                />
              </>
            );
          },
        },
      },
      {
        name: "__meta",
        label: "meta",
        options: { display: false, viewColumns: false, filter: false, sort: false, download: false },
      },
    ];

    const options = {
      filter: false,
      search: false,
      download: false,
      print: false,
      viewColumns: false,
      selectableRows: "none",
      responsive: "standard",
      rowsPerPage: 10,
      rowsPerPageOptions: [5, 10, 25, 50],
      textLabels: {
        body: {
          noMatch: "No topics and subtopics found.",
        },
      },
    };

    return (
      <Paper className="paper-background" style={{ borderRadius: 12, overflow: "hidden" }}>
        <Grid container>
          <Grid item md={8} xs={12} className="header-align">
            <Box className="heading" display="flex" alignItems="center" style={{ gap: 8 }}>
              <EventNoteOutlinedIcon />
              <Typography variant="h6" style={{ fontWeight: 700 }}>
                Teaching Plan Date-wise View
              </Typography>
            </Box>
            <Box display="flex" flexWrap="wrap" alignItems="center" style={{ gap: 10, marginTop: 10 }}>
              <Chip
                icon={<ClassOutlinedIcon />}
                label={`${alias_names["standard"] || "Standard"}: ${heading.standard_name}`}
                variant="outlined"
                style={{ fontSize: 15, fontWeight: 700, height: 36 }}
              />
              <Chip
                icon={<ClassOutlinedIcon />}
                label={`${alias_names["section"] || "Section"}: ${heading.section_name}`}
                variant="outlined"
                style={{ fontSize: 15, fontWeight: 700, height: 36 }}
              />
              <Chip
                icon={<MenuBookOutlinedIcon />}
                label={`Subject: ${heading.subject_name}`}
                variant="outlined"
                style={{ fontSize: 15, fontWeight: 700, height: 36 }}
              />
              <Chip
                icon={<PersonOutlineOutlinedIcon />}
                label={`Staff: ${heading.staff_names}`}
                variant="outlined"
                size="small"
              />
            </Box>
          </Grid>
          <Grid item md={4} xs={12}>
            <Box className="header-align end-flex-prop">
              <Button
                variant="contained"
                color="primary"
                className="editbutton-view"
                onClick={this.handleBack}
              >
                <VisibilityOutlinedIcon className="visibility-icon" />
                Back to Update Today&apos;s Status
              </Button>
            </Box>
          </Grid>
        </Grid>
        <Divider style={{ margin: "14px 0 8px" }} />

        <Box mt={2} mb={2} display="flex" alignItems="center" style={{ gap: 12 }}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search by date / topic / subtopic"
            value={dateFilter}
            onChange={(e) => this.setState({ dateFilter: e.target.value })}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
            }}
          />
          <Chip
            icon={<List />}
            label={`Rows: ${filteredRows.length}`}
            color="default"
            variant="outlined"
            size="small"
          />
        </Box>

        <Paper variant="outlined" style={{ borderRadius: 10, overflow: "hidden" }}>
          <AllMUIDataTable data={tableData} columns={columns} options={options} />
        </Paper>

        <Box display="flex" justifyContent="flex-end" flexWrap="wrap" style={{ gap: 12 }} mt={2} pt={2}>
          <Button
            variant="contained"
            color="primary"
            size="small"
            disabled={saveLoading}
            onClick={this.handleSubmit}
          >
            {saveLoading ? <CircularProgress size={20} color="inherit" /> : "Submit"}
          </Button>
        </Box>
      </Paper>
    );
  }
}

export default withRouter(TopicsSubtopicsDatewise);
