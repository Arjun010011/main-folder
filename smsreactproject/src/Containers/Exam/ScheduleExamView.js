import React, { Component } from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableCell,
  CircularProgress,
  TableRow,
  TableBody,
  Tooltip,
  TextField,
  FormControlLabel,
  Checkbox,
  TablePagination,
  TableSortLabel,
  IconButton,
  Menu,
  MenuItem,
  Tabs,
  Tab,
  Chip,
} from "@material-ui/core";
import {
  DialogTitle,
  FormControl,
  TextareaAutosize,
  DialogActions,
  DialogContentText,
  DialogContent,
  Dialog,
  FormHelperText,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import ExpandMoreOutlinedIcon from "@material-ui/icons/ExpandMoreOutlined";
import ExpandLessOutlinedIcon from "@material-ui/icons/ExpandLessOutlined";
import EventIcon from "@material-ui/icons/Event";
import FileCopyOutlinedIcon from "@material-ui/icons/FileCopyOutlined";
import Snackbar from "@material-ui/core/Snackbar";
import WarningIcon from "@material-ui/icons/Warning";
import Swal from "sweetalert2";
import Skeleton from "@material-ui/lab/Skeleton";
import InfoIcon from "@material-ui/icons/Info";
import CloseIcon from "@material-ui/icons/Close";
import MoreVertIcon from "@material-ui/icons/MoreVert";

import loadingBar from "images/loading.gif";
import _ from "lodash";
import ModalOptionalSubjects from "Containers/Exam/components/ModalOptionalSubjects";
import { APPROVAL_STATUS, alphabet } from "Constants";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import { Actions } from "Constants/permissions";
import {
  isUserHasPermission,
  dateFormat,
  timeFormat,
  Alert,
  getAcademicYear,
  SetAcademicYear,
  getStoredExamScheduleTerm,
  setStoredExamScheduleTerm,
  getKeyValueMap,
  getUrlParam,
  getSettingValue,
} from "Includes/functions";
import { getRequest, deleteRequest, putRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, DEL_URL, PUT_URL, POST_URL } from "Includes/urls";
import { Dropdown } from "Components/DropDown";
import ScheduleDashboardMetricsPanel from "./components/ScheduleDashboardMetricsPanel";
import ScheduleCopyDialog from "./components/ScheduleCopyDialog";

const number_of_language =
  parseInt(getSettingValue("number_of_language")) > 1 ? true : false;
const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};
const exam_config = JSON.parse(localStorage.getItem("exam_configurations"))
  ? JSON.parse(localStorage.getItem("exam_configurations"))
  : {};
const is_grade_plan = exam_config["grade_plan"] == 1 ? true : false;
const is_cumulative = exam_config["cumulative_type"] == 1 ? true : false;
const is_merge_subject =
  exam_config["merge_subject_for_hallticket"] == 1 ? true : false;

const DASHBOARD_ROWS_PER_PAGE = 5;
const EXAM_RANK_REPORT_API = "exams/reports-rank-wise/";

class ScheduleExamView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      yearList: [],
      examList: [],
      selectedYear: "",
      selectedExam: "",
      error: {},
      open: false,
      alertData: "",
      blank: true,
      loadingExam: false,
      isExpand: false,
      isExpanded: false,
      standardList: {},
      blankData: "Select academic year, term, exam and expect the result",
      approvalStatus: {},
      reasonOpen: false,
      reason: "",
      examTermList: [],
      selectedTerm: "",
      alias_names: {},
      is_standard_section: false,
      standard_list: [],
      selectedStandard: "",
      showAllStandardsInViewPopup: false,
      loading: true,
      requestApprovalError: "",
      openModalOptionalSubjects: false,
      optionalSubjects: false,
      errorFound: true,
      standardList_standard_wise: [],
      loadingExamGet: false,
      part_type: {},
      fieldError: { reason: "" },
      copyDialogOpen: false,
      copySourceExamId: "",
      copyTargetStartDate: "",
      copyReplaceExisting: true,
      copyRespectCalendars: true,
      copySourceExamList: [],
      copyFromTerm: "",
      copyTargetTerm: "",
      copyLoading: false,
      copyCreateNewExam: false,
      copyNewTerm: "",
      copyNewExamType: "",
      copyNewFromDate: "",
      copyNewToDate: "",
      copyNewDescription: "",
      copyExamTypeList: [],
      copySourceAcademicYear: "",
      copyTargetAcademicYear: "",
      copyTargetExamId: "",
      copyTargetExamList: [],
      copyInlineTargetMode: false,
      copyInlineTargetExamName: "",
      copyInlineTargetHasSchedule: false,
      copyMismatchDetail: null,
      scheduleDashboardRows: [],
      scheduleDashboardSummary: null,
      scheduleDashboardLoading: false,
      scheduleTableSearch: "",
      /** Exam schedule tab: filter list by timetable approval — all | approved | unapproved */
      scheduleListApprovalFilter: "all",
      dashboardPage: 0,
      /** 'desc' = latest exam window first (from_date / to_date) */
      dashboardDateSortDir: "desc",
      /** 'dashboard' = metrics only; 'schedule' = search + exam list (opens Exam schedule dialog) */
      scheduleMainTab: "schedule",
      scheduleViewDialogOpen: false,
      examReportOpen: false,
      examReportLoading: false,
      examReportError: "",
      examReportExam: null,
      examReportRows: [],
      examReportRankOpen: false,
      examReportRankTitle: "",
      examReportRankRows: [],
      /** Dashboard row exam id while clearexamschedule request is in flight */
      deletingScheduleExamId: null,
      /** Lazy timetable: flat standard-wise view — key `flat-${index}` -> expanded */
      scheduleExpandStandardWise: {},
      /** Lazy timetable: section-wise view — key `${standardId}_${sectionIndex}` -> expanded */
      scheduleExpandSections: {},
      /** Exam schedule table: expand/collapse long standards text by exam id */
      expandedStandardsByExamId: {},
      /** Schedule action: ask standard before navigating to add page (section-wise exams). */
      scheduleStandardPickerOpen: false,
      scheduleStandardOptions: [],
      scheduleStandardValue: "",
      scheduleStandardExamId: "",
      rowActionMenuAnchorEl: null,
      rowActionMenuRow: null,
    };
  }

  closeScheduleDialog = () => {
    this.setState({
      scheduleViewDialogOpen: false,
      scheduleExpandStandardWise: {},
      scheduleExpandSections: {},
    });
  };

  closeExamReportDialog = () => {
    this.setState({
      examReportOpen: false,
      examReportLoading: false,
      examReportError: "",
      examReportExam: null,
      examReportRows: [],
      examReportRankOpen: false,
      examReportRankTitle: "",
      examReportRankRows: [],
    });
  };

  openExamReportRankDialog = (title, rows, e) => {
    if (e) e.stopPropagation();
    this.setState({
      examReportRankOpen: true,
      examReportRankTitle: title || "Rank list",
      examReportRankRows: rows || [],
    });
  };

  closeExamReportRankDialog = () => {
    this.setState({
      examReportRankOpen: false,
      examReportRankTitle: "",
      examReportRankRows: [],
    });
  };

  openExamReportDialog = (row, e) => {
    if (e) e.stopPropagation();
    this.setState(
      {
        examReportOpen: true,
        examReportLoading: true,
        examReportError: "",
        examReportExam: row,
        examReportRows: [],
      },
      () => this.loadExamReportData(row)
    );
  };

  loadExamReportData = async (row) => {
    const { selectedYear, selectedTerm } = this.state;
    if (!row || !row.id || !selectedYear || !selectedTerm) {
      this.setState({
        examReportLoading: false,
        examReportError: "Select academic year and term first.",
      });
      return;
    }
    try {
      const stdRes = await getRequest(
        GET_URL.standardsectiondataforexam.api,
        {
          academic_year: selectedYear,
          term: selectedTerm,
          exam_ids: row.id,
          is_active: true,
        },
        { ...this.props, return_error: true }
      );
      const standards = Array.isArray(stdRes?.data) ? stdRes.data : [];
      const reportRows = [];
      for (const std of standards) {
        const standardId = String(std.standard || std.standard_id || std.id || "");
        const standardName = std.standard_name || std.name || `Standard ${standardId || "-"}`;
        let sectionList = [];
        if (standardId) {
          const secRes = await getRequest(
            GET_URL.announceresult.api,
            { is_active: true, exam: row.id, standard: standardId },
            { ...this.props, return_error: true }
          );
          const secData = Array.isArray(secRes?.data?.data) ? secRes.data.data : [];
          const matchedStandard =
            secData.find((s) => String(s.standard || s.id || "") === standardId) || secData[0];
          sectionList = Array.isArray(matchedStandard?.section_list) ? matchedStandard.section_list : [];
        }
        const sectionLabel = (sec) =>
          `${std.standard_name || standardName} - ${sec.section_name || "Section"}`;
        const entered = sectionList.filter((sec) => Number(sec?.result_data?.total || 0) > 0);
        const notEntered = sectionList.filter((sec) => Number(sec?.result_data?.total || 0) <= 0);
        const announced = sectionList.filter(
          (sec) => sec?.is_announced === true || Number(sec?.result_data?.is_announced || 0) === 1
        );
        const notAnnounced = sectionList.filter(
          (sec) => !(sec?.is_announced === true || Number(sec?.result_data?.is_announced || 0) === 1)
        );
        const rankSections = [];
        const rankRowsAll = [];
        for (const sec of sectionList) {
          const sectionId = sec.standard_section || sec.id;
          if (!sectionId) continue;
          const rankRes = await getRequest(
            EXAM_RANK_REPORT_API,
            { exam: row.id, standard_section: sectionId },
            { ...this.props, return_error: true }
          );
          const table = Array.isArray(rankRes?.data?.table) ? rankRes.data.table : [];
          table.forEach((x) => {
            rankRowsAll.push({
              ...x,
              section_name: sec.section_name || "Section",
              class_section: sectionLabel(sec),
            });
          });
          rankSections.push({
            section_name: sectionLabel(sec),
            topRanks: table.slice(0, 3),
          });
        }
        rankRowsAll.sort((a, b) => Number(a.rank || 0) - Number(b.rank || 0));
        const topRanksOverall = [...rankRowsAll]
          .sort((a, b) => Number(b.total_marks || 0) - Number(a.total_marks || 0))
          .slice(0, 3);
        const passedStudents = sectionList.reduce(
          (acc, sec) => acc + Number(sec?.result_data?.pass || 0),
          0
        );
        const failedStudents = sectionList.reduce(
          (acc, sec) => acc + Number(sec?.result_data?.fail || 0),
          0
        );
        const totalStudents = sectionList.reduce(
          (acc, sec) => acc + Number(sec?.result_data?.total || 0),
          0
        );
        reportRows.push({
          standardId,
          standardName,
          enteredSections: entered.map((sec) => sectionLabel(sec)),
          notEnteredSections: notEntered.map((sec) => sectionLabel(sec)),
          announcedSections: announced.map((sec) => sectionLabel(sec)),
          notAnnouncedSections: notAnnounced.map((sec) => sectionLabel(sec)),
          passedStudents,
          failedStudents,
          totalStudents,
          marksEnteredCount: entered.length,
          marksNotEnteredCount: notEntered.length,
          topRanksOverall,
          rankRowsAll,
          rankSections,
        });
      }
      this.setState({
        examReportRows: reportRows,
        examReportLoading: false,
        examReportError: "",
      });
    } catch (error) {
      this.setState({
        examReportLoading: false,
        examReportError: (error && error.message) || "Could not load exam report.",
      });
    }
  };

  /** Slot counts for one subject_list (same rules as getExamStandardList optional/partial). */
  countSubjectSlots = (subjectList) => {
    if (!Array.isArray(subjectList) || subjectList.length === 0) {
      return { total: 0, complete: 0, partial: 0, empty: 0 };
    }
    let complete = 0;
    let partial = 0;
    let empty = 0;
    subjectList.forEach((subject) => {
      const hasAny = Boolean(
        subject.fordate || subject.start_time || subject.end_time || subject.max_marks
      );
      const isComplete = Boolean(
        subject.fordate && subject.start_time && subject.end_time && subject.max_marks
      );
      if (isComplete) complete += 1;
      else if (!hasAny) empty += 1;
      else partial += 1;
    });
    return { total: subjectList.length, complete, partial, empty };
  };

  flatScheduleExpandKey = (stIndex) => `flat-${stIndex}`;

  sectionScheduleExpandKey = (standardId, stIndex) => `${standardId}_${stIndex}`;

  toggleScheduleFlatExpand = (stIndex) => {
    const key = this.flatScheduleExpandKey(stIndex);
    this.setState((prev) => ({
      scheduleExpandStandardWise: {
        ...prev.scheduleExpandStandardWise,
        [key]: !prev.scheduleExpandStandardWise[key],
      },
    }));
  };

  toggleScheduleSectionExpand = (standardId, stIndex) => {
    const key = this.sectionScheduleExpandKey(standardId, stIndex);
    this.setState((prev) => ({
      scheduleExpandSections: {
        ...prev.scheduleExpandSections,
        [key]: !prev.scheduleExpandSections[key],
      },
    }));
  };

  isFlatScheduleExpanded = (stIndex) =>
    Boolean(this.state.scheduleExpandStandardWise[this.flatScheduleExpandKey(stIndex)]);

  isSectionScheduleExpanded = (standardId, stIndex) =>
    Boolean(this.state.scheduleExpandSections[this.sectionScheduleExpandKey(standardId, stIndex)]);

  toggleStandardsPreview = (examId, e) => {
    if (e) e.stopPropagation();
    this.setState((prev) => ({
      expandedStandardsByExamId: {
        ...prev.expandedStandardsByExamId,
        [examId]: !prev.expandedStandardsByExamId[examId],
      },
    }));
  };

  getStandardIdFromOption = (opt) => {
    if (opt == null) return "";
    if (typeof opt === "object") {
      return String(opt.standard ?? opt.standard_id ?? opt.id ?? "");
    }
    return String(opt);
  };

  getStandardNameFromOption = (opt) => {
    if (opt == null || typeof opt !== "object") return "";
    return String(opt.standard_name || opt.name || "");
  };

  confirmScheduleStandardAndNavigate = () => {
    const { scheduleStandardExamId, scheduleStandardOptions, scheduleStandardValue } = this.state;
    const selectedOpt = (scheduleStandardOptions || []).find(
      (s) => this.getStandardIdFromOption(s) === String(scheduleStandardValue)
    );
    const selectedStandard = selectedOpt
      ? this.getStandardIdFromOption(selectedOpt)
      : String(scheduleStandardValue || "");
    const standardName = selectedOpt ? this.getStandardNameFromOption(selectedOpt) : "";
    this.setState(
      {
        selectedExam: String(scheduleStandardExamId || ""),
        selectedStandard: selectedStandard || "",
        standardName: standardName || "",
        scheduleStandardPickerOpen: false,
        scheduleStandardOptions: [],
        scheduleStandardValue: "",
        scheduleStandardExamId: "",
      },
      () => this.handleAddExamButton()
    );
  };

  /** Compact strip + chips so large schedules stay navigable without mounting every table. */
  renderScheduleOverviewStrip = () => {
    const {
      is_standard_section,
      standardList,
      selectedStandard,
      standardList_standard_wise,
      blank,
      loadingExam,
    } = this.state;
    if (loadingExam || blank) return null;

    if (is_standard_section && selectedStandard && standardList[selectedStandard]) {
      const sections = standardList[selectedStandard].section_list || [];
      if (!sections.length) return null;
      let tot = 0;
      let done = 0;
      let partial = 0;
      let empty = 0;
      sections.forEach((sec) => {
        const c = this.countSubjectSlots(sec.subject_list);
        tot += c.total;
        done += c.complete;
        partial += c.partial;
        empty += c.empty;
      });
      const label = (sec, idx) => {
        const c = this.countSubjectSlots(sec.subject_list);
        const name =
          sec.standard_name && sec.section_name
            ? `${sec.standard_name} · ${sec.section_name}`
            : sec.section_name || sec.standard_name || `Section ${idx + 1}`;
        return `${name}: ${c.complete}/${c.total} slots`;
      };
      return (
        <Box
          mb={2}
          p={1.5}
          style={{
            border: "1px solid #bae6fd",
            borderRadius: 8,
            background: "#f0f9ff",
          }}
        >
          <Typography variant="subtitle2" style={{ fontWeight: 700, color: "#0369a1", marginBottom: 8 }}>
            Timetable coverage ({alias_names["standard"] || "Standard"} view)
          </Typography>
          <Typography variant="body2" color="textSecondary" style={{ marginBottom: 8 }}>
            Fully scheduled slots: <strong>{done}</strong> / {tot}
            {partial > 0 ? ` · Partial: ${partial}` : ""}
            {empty > 0 ? ` · Not set: ${empty}` : ""}
            . Use the standard filter above to switch quickly.
          </Typography>
          <Box display="flex" flexWrap="wrap" style={{ gap: 6 }}>
            {sections.map((sec, idx) => {
              const c = this.countSubjectSlots(sec.subject_list);
              const chipColor =
                c.total > 0 && c.complete === c.total ? "primary" : "default";
              return (
                <Chip
                  key={this.sectionScheduleExpandKey(selectedStandard, idx)}
                  size="small"
                  label={label(sec, idx)}
                  color={chipColor}
                  variant={this.isSectionScheduleExpanded(selectedStandard, idx) ? "default" : "outlined"}
                  onClick={() => this.toggleScheduleSectionExpand(selectedStandard, idx)}
                  style={{ cursor: "pointer" }}
                />
              );
            })}
          </Box>
        </Box>
      );
    }

    if (!is_standard_section && standardList_standard_wise && standardList_standard_wise.length > 0) {
      let tot = 0;
      let done = 0;
      standardList_standard_wise.forEach((std) => {
        const c = this.countSubjectSlots(std.subject_list);
        tot += c.total;
        done += c.complete;
      });
      return (
        <Box
          mb={2}
          p={1.5}
          style={{
            border: "1px solid #c7d2fe",
            borderRadius: 8,
            background: "#eef2ff",
          }}
        >
          <Typography variant="subtitle2" style={{ fontWeight: 700, color: "#3730a3", marginBottom: 8 }}>
            Timetable coverage (all standards)
          </Typography>
          <Typography variant="body2" color="textSecondary" style={{ marginBottom: 8 }}>
            Fully scheduled slots: <strong>{done}</strong> / {tot}. Select a standard chip to focus that view.
          </Typography>
          <Box display="flex" flexWrap="wrap" style={{ gap: 6 }}>
            {standardList_standard_wise.map((std, idx) => {
              const c = this.countSubjectSlots(std.subject_list);
              const title = std.standard_name || `Standard ${idx + 1}`;
              const chipColor =
                c.total > 0 && c.complete === c.total ? "primary" : "default";
              return (
                <Chip
                  key={this.flatScheduleExpandKey(idx)}
                  size="small"
                  label={`${title}: ${c.complete}/${c.total}`}
                  color={chipColor}
                  variant={this.isFlatScheduleExpanded(idx) ? "default" : "outlined"}
                  onClick={() => this.toggleScheduleFlatExpand(idx)}
                  style={{ cursor: "pointer" }}
                />
              );
            })}
          </Box>
        </Box>
      );
    }

    return null;
  };

  componentDidUpdate() {
    const maxPage = Math.max(
      0,
      Math.ceil(this.getFilteredDashboardRowsFromState(this.state).length / DASHBOARD_ROWS_PER_PAGE) - 1
    );
    const p = this.state.dashboardPage || 0;
    if (p > maxPage) {
      this.setState({ dashboardPage: maxPage });
    }
  }

  async componentDidMount() {
    this.getYearList();
    if (getAcademicYear()) {
      let year = getAcademicYear();
      if (year !== 0) {
        this.setState({
          selectedYear: year,
          blankData: "Select term, exam and expect the result",
        });
      }
    } else {
      this.setState({
        pageLoading: false,
      });
    }
    this.scroll();
  }

  getPartTypeList = () => {
    const url = GET_URL.subjectparttype.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
      }
    });
  };

  scroll = () => {
    window.scrollTo(0, 0);
  };

  getYearList = async () => {
    let { loading } = this.state;
    const url = GET_URL.getacademicyear.api;
    const param = { is_active: true };
    await getRequest(url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        let fromYear = "";
        let ToYear = "";
        response.data.data.map((data) => {
          fromYear = data.start_date.split("-");
          ToYear = data.end_date.split("-");
          // data.name = fromYear[0] + "-" + ToYear[0];
        });
        let { selectedExam, selectedTerm } = getUrlParam();
        if (selectedExam && selectedTerm) {
          loading = true;
        }
        this.setState({
          yearList: response.data.data,
          loading,
        });
        this.getTermList();
      } else {
        this.setState({ loading: false });
      }
    });
  };

  pickTermFromList = (termList, preferredIdStr) => {
    if (!termList || !termList.length) return "";
    if (preferredIdStr !== "" && preferredIdStr != null) {
      const found = termList.find((t) => String(t.id) === String(preferredIdStr));
      if (found) return String(found.id);
    }
    return String(termList[0].id);
  };

  getTermList = async () => {
    const url = GET_URL.examterms.api;
    const params = { is_active: true };
    await getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const termList = response.data.data || [];
        this.setState({ examTermList: termList }, () => {
          const y = this.state.selectedYear;
          let { selectedExam, selectedTerm, standard } = getUrlParam();
          if (selectedExam && selectedTerm && y) {
            setStoredExamScheduleTerm(selectedTerm);
            this.setState(
              {
                selectedExam,
                selectedTerm,
                loading: false,
                loadingExam: true,
                selectedStandard: standard,
                loadingExamGet: true,
                scheduleListApprovalFilter: "all",
              },
              () => {
                this.getExamList(selectedTerm, selectedExam, standard);
              }
            );
          } else if (y && termList.length) {
            const termId = this.pickTermFromList(termList, getStoredExamScheduleTerm());
            setStoredExamScheduleTerm(termId);
            this.setState(
              {
                selectedTerm: termId,
                loading: false,
                loadingExamGet: true,
                scheduleDashboardRows: [],
                scheduleDashboardSummary: null,
                scheduleDashboardLoading: false,
                scheduleListApprovalFilter: "all",
                scheduleMainTab: "schedule",
              },
              () => this.getExamList(termId)
            );
          } else {
            this.setState({ loading: false });
          }
        });
      } else {
        this.setState({ loading: false });
      }
    });
    return true;
  };

  handleAddExamButton = () => {
    let {
      selectedYear,
      error,
      alertData,
      selectedExam,
      examList,
      yearList,
      examTermList,
      selectedTerm,
      standard_list,
      is_standard_section,
      selectedStandard,
      standardName: selectedStandardNameState,
    } = this.state;
    if (selectedYear && selectedExam) {
      let yearName = getKeyValueMap(yearList, "id", "name");
      yearName = yearName[selectedYear];

      let termName = getKeyValueMap(examTermList, "id", "name");
      termName = termName[selectedTerm];

      let examName, start_date, end_date;
      examList.map((temp) => {
        if (temp.id == selectedExam) {
          examName = temp.exam_type_name;
          start_date = temp.from_date;
          end_date = temp.to_date;
        }
      });
      let currentExamInformation = {
        selectedYear: selectedYear,
        yearName: yearName,
        start_date: start_date,
        end_date: end_date,
        examName: examName,
        selectedExam: selectedExam,
        selectedTerm: selectedTerm,
        termName: termName,
      };
      if (is_standard_section) {
        let standardName = getKeyValueMap(
          standard_list,
          "standard",
          "standard_name"
        );
        standardName = standardName[selectedStandard];
        if (!standardName) {
          standardName = selectedStandardNameState || "";
        }
        currentExamInformation["standardName"] = standardName;
        currentExamInformation["selectedStandard"] = selectedStandard;
      }

      let searchParam =
        "?" + new URLSearchParams(currentExamInformation).toString();
      this.props.history.push({
        pathname: Actions.schedule_exam.create.url,
        search: searchParam,
      });
    } else {
      if (!selectedYear) {
        alertData = "Select Academic Year";
        error.selectedYear = alertData;
      } else {
        alertData = "Select Exam";
        error.selectedExam = alertData;
      }
      this.setState({
        open: true,
        alertData,
        error,
      });
    }
  };

  /** Navigate to schedule editor for a specific exam (from dashboard row). */
  handleScheduleForDashboardRow = (examId, e) => {
    if (e) e.stopPropagation();
    const { selectedYear, selectedTerm, examList } = this.state;
    if (!selectedYear || !selectedTerm) {
      this.setState({
        open: true,
        alertData: "Select academic year and term first.",
      });
      return;
    }
    const ex = (examList || []).find((x) => Number(x.id) === Number(examId));
    if (!ex) {
      this.setState({
        open: true,
        alertData: "Exam list is still loading or this exam is missing; try again in a moment.",
      });
      return;
    }
    const standardList = Array.isArray(ex.standard_names) ? ex.standard_names : [];
    const firstStd = standardList.length ? standardList[0] : null;
    const firstStandard = this.getStandardIdFromOption(firstStd);
    const firstStandardName = this.getStandardNameFromOption(firstStd);
    if (Boolean(ex.is_standard_section) && standardList.length > 1) {
      const pickerOptions = standardList.map((s) => ({
        id: this.getStandardIdFromOption(s),
        name: this.getStandardNameFromOption(s) || `Standard ${this.getStandardIdFromOption(s)}`,
      }));
      this.setState({
        selectedExam: String(examId),
        is_standard_section: true,
        standard_list: standardList,
        scheduleStandardPickerOpen: true,
        scheduleStandardOptions: pickerOptions,
        scheduleStandardValue: firstStandard || "",
        scheduleStandardExamId: String(examId),
      });
      return;
    }
    this.setState(
      {
        selectedExam: String(examId),
        is_standard_section: Boolean(ex.is_standard_section),
        standard_list: standardList,
        selectedStandard: Boolean(ex.is_standard_section) ? firstStandard : "",
        standardName: Boolean(ex.is_standard_section) ? firstStandardName : "",
      },
      () => this.handleAddExamButton()
    );
  };

  onChange = (e) => {
    let { name, value } = e.target;
    let {
      error,
      blank,
      loadingExam,
      selectedTerm,
      examList,
      is_standard_section,
      standard_list,
      selectedExam,
      standardList_standard_wise,
      blankData,
      standardList,
      selectedStandard,
    } = this.state;
    if (value !== 0) {
      delete error[name];
      this.setState(
        {
          [name]: value,
          error,
        },
        () => {
          if (name === "selectedYear") {
            SetAcademicYear(value);
            const termList = this.state.examTermList || [];
            const nextTerm = this.pickTermFromList(termList, getStoredExamScheduleTerm());
            if (nextTerm) {
              setStoredExamScheduleTerm(nextTerm);
            }
            this.setState(
              {
                selectedStandard: "",
                selectedTerm: nextTerm || "",
                selectedExam: "",
                standard_list: [],
                standardList_standard_wise: [],
                examList: [],
                blank: true,
                blankData: "Select term, exam and expect a result",
                scheduleViewDialogOpen: false,
                scheduleDashboardRows: [],
                scheduleDashboardSummary: null,
                scheduleDashboardLoading: false,
                scheduleTableSearch: "",
                scheduleListApprovalFilter: "all",
                scheduleMainTab: "schedule",
              },
              () => {
                if (nextTerm) {
                  this.getExamList(nextTerm);
                }
              }
            );
          } else if (name === "selectedTerm") {
            setStoredExamScheduleTerm(value);
            this.setState(
              {
                loadingExamGet: true,
                scheduleDashboardRows: [],
                scheduleDashboardSummary: null,
                scheduleDashboardLoading: false,
                scheduleListApprovalFilter: "all",
                scheduleMainTab: "schedule",
              },
              () => {
                this.getExamList(value);
              }
            );
          } else if (name === "selectedExam") {
            examList.map((data) => {
              if (data.id == value) {
                standard_list = data.standard_names;
              }
            });
            this.setState(
              {
                loadingExam: true,
                scheduleViewDialogOpen: true,
                blankData: `Select ${alias_names["standard"]} and expect a result`,
                standardList: {},
                standard_list,
                standardList_standard_wise: [],
                selectedStandard: "",
                showAllStandardsInViewPopup: true,
                blank: true,
              },
              () => {
                this.getExamStandardList(value);
              }
            );
          } else if (name === "selectedStandard") {
            this.setState({
              blank: false,
              showAllStandardsInViewPopup: !(value && String(value).trim()),
            });
          }
        }
      );
    }
  };

  getExamList = (term, exam, standard, openDialog = false) => {
    let {
      selectedYear,
      standardList,
      selectedExam,
      blank,
      blankData,
      selectedStandard,
      is_standard_section,
      standard_list,
      standardList_standard_wise,
    } = this.state;
    const url = GET_URL.exam.api;
    const params = { academic_year: selectedYear, term: term, is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.map((data) => {
          data.name = data.exam_type_name;
        });
        if (exam === undefined) {
          standardList = {};
          standardList_standard_wise = [];
          selectedExam = "";
          blank = true;
          selectedStandard = "";
          is_standard_section = false;
          blankData = "Select exam and expect the result";
        } else {
          response.data.data.map((data) => {
            if (data.id == exam) {
              is_standard_section = data.is_standard_section;
              standard_list = data.standard_names;
            }
          });
          selectedExam = exam;
          blank = false;
          if (standard) {
            this.getExamStandardList(selectedExam, standard);
          } else {
            this.getExamStandardList(selectedExam);
          }
        }
        const examSelected = exam !== undefined && exam !== null && exam !== "";
        this.setState(
          {
            examList: response.data.data,
            loading: false,
            /** Keep true until getExamStandardList finishes when opening an exam (avoids loader flicker). */
            loadingExam: examSelected ? true : false,
            selectedExam,
            standardList,
            blank,
            selectedStandard,
            showAllStandardsInViewPopup: examSelected ? !(selectedStandard && String(selectedStandard).trim()) : false,
            is_standard_section,
            blankData,
            standard_list,
            loadingExamGet: false,
            scheduleViewDialogOpen: Boolean(openDialog && examSelected),
          },
          () => {
            const { selectedYear, selectedTerm, scheduleMainTab } = this.state;
            // Do not call exam-schedule-dashboard when opening a single exam (dialog); only refresh list/metrics.
            if (
              selectedYear &&
              selectedTerm &&
              !examSelected &&
              (scheduleMainTab === "dashboard" || scheduleMainTab === "schedule")
            ) {
              this.fetchScheduleDashboard(selectedYear, selectedTerm);
            }
          }
        );
      } else {
        this.setState({ loading: false, loadingExamGet: false });
      }
    });
  };

  handleScheduleMainTabChange = (_event, newValue) => {
    this.setState({ scheduleMainTab: newValue }, () => {
      if (newValue === "dashboard" || newValue === "schedule") {
        const { selectedYear, selectedTerm } = this.state;
        if (selectedYear && selectedTerm) {
          this.fetchScheduleDashboard();
        }
      }
    });
  };

  goToOldScheduleUi = () => {
    const { selectedYear, selectedTerm, selectedExam, selectedStandard } = this.state;
    const q = {};
    if (selectedYear) q.selectedYear = selectedYear;
    if (selectedTerm) q.selectedTerm = selectedTerm;
    if (selectedExam) q.selectedExam = selectedExam;
    if (selectedStandard) q.standard = selectedStandard;
    const search = `?${new URLSearchParams(q).toString()}`;
    this.props.history.push({
      pathname: Actions.schedule_exam_old?.view?.url || "/exam/schedule/old-view",
      search,
    });
  };

  openCreateExamFromSchedule = () => {
    const { selectedYear, yearList } = this.state;
    if (!selectedYear) {
      this.setState({ open: true, alertData: "Select academic year first." });
      return;
    }
    const yearName =
      (yearList || []).find((y) => String(y.id) === String(selectedYear))?.name || "";
    const search = `?${new URLSearchParams({
      selectedYear: String(selectedYear),
      ...(yearName ? { yearName } : {}),
      returnToSchedule: "1",
    }).toString()}`;
    this.props.history.push({
      pathname: Actions.exams.create.url,
      search,
    });
  };


  renderScheduleDashboardMetrics = () => {
    const { scheduleDashboardSummary, scheduleDashboardLoading, scheduleDashboardRows, loadingExamGet } =
      this.state;
    return (
      <ScheduleDashboardMetricsPanel
        scheduleDashboardSummary={scheduleDashboardSummary}
        scheduleDashboardLoading={scheduleDashboardLoading}
        scheduleDashboardRows={scheduleDashboardRows}
        loadingExamGet={loadingExamGet}
        openExamFromDashboard={this.openExamFromDashboard}
      />
    );
  };

  getDashboardRowScheduleCount = (row) => {
    if (!row) return null;
    if (!Object.prototype.hasOwnProperty.call(row, "schedule_count")) return null;
    if (row.schedule_count === null || row.schedule_count === undefined) return null;
    const n = Number(row.schedule_count);
    return Number.isFinite(n) ? n : null;
  };

  openRowActionMenu = (row, e) => {
    if (e?.stopPropagation) e.stopPropagation();
    this.setState({
      rowActionMenuAnchorEl: e?.currentTarget || null,
      rowActionMenuRow: row || null,
    });
  };

  closeRowActionMenu = () => {
    this.setState({
      rowActionMenuAnchorEl: null,
      rowActionMenuRow: null,
    });
  };

  dashboardRowCanClearScheduleByApproval = (row) => {
    const ap = String(row?.approval_status ?? "");
    return ap !== APPROVAL_STATUS.approved && ap !== APPROVAL_STATUS.pending;
  };

  getFilteredDashboardRowsFromState = (state) => {
    let rows = state.scheduleDashboardRows || [];
    const apFilter = state.scheduleListApprovalFilter || "all";
    if (apFilter === "approved") {
      rows = rows.filter((r) => String(r.approval_status) === APPROVAL_STATUS.approved);
    } else if (apFilter === "unapproved") {
      rows = rows.filter((r) => String(r.approval_status) !== APPROVAL_STATUS.approved);
    }
    const q = (state.scheduleTableSearch || "").trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = String(r.exam_type_name || "").toLowerCase();
      const desc = String(r.description || "").toLowerCase();
      const stds = String(r.standards_display || "").toLowerCase();
      return name.includes(q) || desc.includes(q) || stds.includes(q);
    });
  };

  getFilteredDashboardRows = () => {
    return this.getFilteredDashboardRowsFromState(this.state);
  };

  parseExamDateForSort = (v) => {
    if (v == null || v === "") return null;
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? null : t;
  };

  /**
   * Sort by exam window: primary from_date, then to_date; rows with no dates last.
   * dir 'desc' = most recent (latest) dates first.
   */
  sortDashboardRowsByExamDate = (rows, dir) => {
    const desc = dir === "desc";
    return [...(rows || [])].sort((a, b) => {
      const fa = this.parseExamDateForSort(a.from_date);
      const fb = this.parseExamDateForSort(b.from_date);
      const ta = this.parseExamDateForSort(a.to_date);
      const tb = this.parseExamDateForSort(b.to_date);
      const primary = (from, to) => (from != null ? from : to);
      const ra = primary(fa, ta);
      const rb = primary(fb, tb);
      if (ra == null && rb == null) {
        return Number(b.id) - Number(a.id);
      }
      if (ra == null) return 1;
      if (rb == null) return -1;
      if (ra !== rb) {
        return desc ? rb - ra : ra - rb;
      }
      if (fa != null && fb != null && fa !== fb) {
        return desc ? fb - fa : fa - fb;
      }
      if (ta != null && tb != null && ta !== tb) {
        return desc ? tb - ta : ta - tb;
      }
      return Number(b.id) - Number(a.id);
    });
  };

  toggleDashboardDateSort = () => {
    this.setState((prev) => ({
      dashboardDateSortDir: prev.dashboardDateSortDir === "desc" ? "asc" : "desc",
    }));
  };

  fetchScheduleDashboard = (yearOpt, termOpt) => {
    const y =
      yearOpt !== undefined && yearOpt !== null && yearOpt !== ""
        ? yearOpt
        : this.state.selectedYear;
    const t =
      termOpt !== undefined && termOpt !== null && termOpt !== ""
        ? termOpt
        : this.state.selectedTerm;
    if (!y || !t) {
      this.setState({
        scheduleDashboardRows: [],
        scheduleDashboardSummary: null,
        scheduleDashboardLoading: false,
      });
      return;
    }
    this.setState({ scheduleDashboardLoading: true });
    getRequest(
      GET_URL.examscheduledashboard.api,
      { academic_year: y, term: t },
      { ...this.props, return_error: true }
    ).then((res) => {
      if (res && res.status === 200) {
        this.setState({
          scheduleDashboardRows: res.data?.data || [],
          scheduleDashboardSummary: res.data?.summary ?? null,
          scheduleDashboardLoading: false,
          dashboardPage: 0,
        });
        return;
      }
      this.setState({ scheduleDashboardLoading: false, scheduleDashboardSummary: null });
    });
  };

  openExamFromDashboard = (examId) => {
    const { selectedTerm } = this.state;
    this.setState(
      {
        loadingExamGet: true,
        blank: false,
        scheduleViewDialogOpen: true,
      },
      () => this.getExamList(selectedTerm, examId, undefined, true)
    );
  };

  handleClearScheduleForExam = (examId, e) => {
    if (e) e.stopPropagation();
    const idn = Number(examId);
    if (Number.isNaN(idn)) return;
    Swal.fire({
      title: "Clear this exam's timetable?",
      text: "Timetable rows for this exam are removed only if the server allows it.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Clear",
      cancelButtonText: "Cancel",
      focusCancel: true,
    }).then((result) => {
      if (!result || result.dismiss) return;
      if (!(result.value === true || result.isConfirmed === true)) return;
      this.setState({ deletingScheduleExamId: idn });
      postRequest(
        POST_URL.clearexamschedule.api,
        { exam_id: idn },
        this.props
      )
        .then((res) => {
          if (res && res.status === 200) {
            Swal.fire("Success", res.data?.message || "Schedule cleared.", "success");
            this.setState((prev) => ({
              scheduleDashboardRows: (prev.scheduleDashboardRows || []).filter(
                (r) => Number(r.id) !== idn
              ),
              dashboardPage: 0,
            }));
            if (
              this.state.scheduleMainTab === "dashboard" ||
              this.state.scheduleMainTab === "schedule"
            ) {
              this.fetchScheduleDashboard();
            }
            const { selectedExam, selectedStandard } = this.state;
            if (selectedExam && Number(selectedExam) === idn) {
              this.getExamStandardList(selectedExam, selectedStandard);
            }
            return;
          }
          Swal.fire(
            "Failed",
            (res && res.data && res.data.message) ||
              "Unable to clear this exam timetable. Please try again.",
            "error"
          );
        })
        .catch((error) => {
          const message =
            (error &&
              error.response &&
              error.response.data &&
              error.response.data.message) ||
            "Unable to clear this exam timetable. Please try again.";
          Swal.fire("Failed", message, "error");
        })
        .finally(() => this.setState({ deletingScheduleExamId: null }));
    });
  };

  openCopyDialog = (targetRow = null, e = null) => {
    if (e?.stopPropagation) e.stopPropagation();
    const { selectedTerm, selectedExam, examTermList, examList, selectedYear } = this.state;
    const inlineTargetMode = Boolean(targetRow && targetRow.id);
    const targetExamId = inlineTargetMode ? targetRow.id : selectedExam || "";
    const targetTerm = inlineTargetMode ? targetRow.term || selectedTerm || "" : selectedTerm || "";
    const targetAcademicYear = inlineTargetMode
      ? targetRow.academic_year || selectedYear || ""
      : selectedYear || "";
    const scheduleCount = inlineTargetMode ? this.getDashboardRowScheduleCount(targetRow) : 0;
    let defaultStart = "";
    let copyNewFromDate = "";
    let copyNewToDate = "";
    (examList || []).forEach((e) => {
      if (String(e.id) === String(selectedExam) && e.from_date) {
        defaultStart = e.from_date;
        copyNewFromDate = e.from_date;
        copyNewToDate = e.to_date || e.from_date;
      }
    });
    if (inlineTargetMode && targetRow?.from_date) {
      defaultStart = targetRow.from_date;
      copyNewFromDate = targetRow.from_date;
      copyNewToDate = targetRow.to_date || targetRow.from_date;
    }
    getRequest(GET_URL.examtypes.api, { is_active: true }, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({ copyExamTypeList: response.data.data || [] });
      }
    });
    this.setState(
      {
        copyDialogOpen: true,
        copyFromTerm: targetTerm || selectedTerm || "",
        copyTargetTerm: targetTerm || selectedTerm || "",
        copySourceExamId: "",
        copyTargetStartDate: defaultStart,
        copyReplaceExisting: true,
        copyRespectCalendars: true,
        copyCreateNewExam: false,
        copyNewTerm: selectedTerm || "",
        copyNewExamType: "",
        copyNewFromDate,
        copyNewToDate,
        copyNewDescription: "",
        copySourceAcademicYear: selectedYear || targetAcademicYear || "",
        copyTargetAcademicYear: targetAcademicYear,
        copyTargetExamId: targetExamId,
        copyTargetExamList: inlineTargetMode && targetExamId ? [targetRow] : [],
        copyInlineTargetMode: inlineTargetMode,
        copyInlineTargetExamName: inlineTargetMode ? targetRow.exam_type_name || "" : "",
        copyInlineTargetHasSchedule: Number(scheduleCount || 0) > 0,
        copyMismatchDetail: null,
      },
      () => {
        this.fetchCopySourceExams(targetTerm || examTermList[0]?.id);
        if (!inlineTargetMode) {
          this.fetchCopyTargetExams(selectedYear || "", selectedTerm || "");
        }
      }
    );
  };

  closeCopyDialog = () => {
    this.setState({
      copyDialogOpen: false,
      copySourceExamId: "",
      copyTargetStartDate: "",
      copySourceExamList: [],
      copyCreateNewExam: false,
      copyNewTerm: "",
      copyTargetTerm: "",
      copyNewExamType: "",
      copyNewFromDate: "",
      copyNewToDate: "",
      copyNewDescription: "",
      copySourceAcademicYear: "",
      copyTargetAcademicYear: "",
      copyTargetExamId: "",
      copyTargetExamList: [],
      copyInlineTargetMode: false,
      copyInlineTargetExamName: "",
      copyInlineTargetHasSchedule: false,
      copyMismatchDetail: null,
    });
  };

  /** When creating a new exam, keep "First exam calendar date" inside the new exam's from/to window. */
  alignCopyTargetStartIfNeeded = () => {
    const { copyCreateNewExam, copyNewFromDate, copyNewToDate, copyTargetStartDate } = this.state;
    if (!copyCreateNewExam || !copyNewFromDate || !copyNewToDate) return;
    if (!copyTargetStartDate) {
      this.setState({ copyTargetStartDate: copyNewFromDate });
      return;
    }
    if (copyTargetStartDate < copyNewFromDate || copyTargetStartDate > copyNewToDate) {
      this.setState({ copyTargetStartDate: copyNewFromDate });
    }
  };

  fetchCopySourceExams = (termId) => {
    const { selectedYear, selectedExam, copyCreateNewExam, copySourceAcademicYear } = this.state;
    const sourceYear = copySourceAcademicYear || selectedYear;
    if (!sourceYear) return;
    if (!copyCreateNewExam && !termId) return;
    // When creating a new exam, load every exam in the academic year so you can copy from another term (e.g. FA-02 in
    // Term 2 while the "From term" filter used to hide it). Otherwise only the chosen term's exams load.
    const params = copyCreateNewExam
      ? { academic_year: sourceYear }
      : { academic_year: sourceYear, term: termId };
    getRequest(GET_URL.exam.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const list = (response.data.data || []).map((e) => {
          const base = e.exam_type_name || e.name;
          const parts = [];
          if (String(sourceYear) !== String(selectedYear) && e.academic_year_value) {
            parts.push(String(e.academic_year_value).trim());
          }
          if (copyCreateNewExam && e.term_name) {
            parts.push(e.term_name);
          }
          parts.push(base);
          const name = parts.join(" · ");
          return { ...e, name };
        });
        // Copying into the *current* exam cannot use the same exam as source. When creating a *new* exam, the target
        // is not the open exam — the current exam may be the only one in the term and is a valid source (same schedule).
        const filtered = copyCreateNewExam
          ? list
          : list.filter((e) => String(e.id) !== String(selectedExam));
        this.setState(
          (prev) => {
            const updates = { copySourceExamList: filtered };
            if (
              copyCreateNewExam &&
              selectedExam &&
              !prev.copySourceExamId &&
              filtered.some((e) => String(e.id) === String(selectedExam))
            ) {
              updates.copySourceExamId = String(selectedExam);
            }
            return updates;
          },
          () => this.alignCopyTargetStartIfNeeded()
        );
      }
    });
  };

  fetchCopyTargetExams = (academicYearId, termId) => {
    if (!academicYearId) return;
    const params = termId ? { academic_year: academicYearId, term: termId } : { academic_year: academicYearId };
    getRequest(GET_URL.exam.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const list = (response.data.data || []).map((e) => {
          const parts = [];
          if (e.term_name) parts.push(e.term_name);
          parts.push(e.exam_type_name || e.name);
          return { ...e, name: parts.join(" · ") };
        });
        this.setState((prev) => {
          const keepSelected = list.some((x) => String(x.id) === String(prev.copyTargetExamId));
          const fallbackId = keepSelected ? prev.copyTargetExamId : String(list[0]?.id || "");
          const fallbackExam = list.find((x) => String(x.id) === String(fallbackId));
          return {
            copyTargetExamList: list,
            copyTargetExamId: fallbackId,
            copyTargetStartDate:
              prev.copyTargetStartDate || fallbackExam?.from_date || prev.copyTargetStartDate,
          };
        });
      }
    });
  };

  getExamSubjectIdSet = (examId) => {
    return new Promise((resolve) => {
      if (!examId) {
        resolve({ ids: new Set(), namesById: {} });
        return;
      }
      getRequest(GET_URL.schedule.api, { is_active: true, exam: examId }, this.props)
        .then((response) => {
          const ids = new Set();
          const namesById = {};
          const schedule = response?.data?.data?.schedule_list;
          if (Array.isArray(schedule)) {
            schedule.forEach((std) => {
              (std?.subject_list || []).forEach((sub) => {
                const sid = String(sub?.subject ?? sub?.subject_id ?? sub?.id ?? "");
                if (sid) {
                  ids.add(sid);
                  namesById[sid] =
                    sub?.subject_name || sub?.name || sub?.subject__name || `Subject ${sid}`;
                }
              });
            });
          } else if (schedule && typeof schedule === "object") {
            Object.keys(schedule).forEach((stdKey) => {
              const sectionList = schedule[stdKey]?.section_list || [];
              sectionList.forEach((section) => {
                (section?.subject_list || []).forEach((sub) => {
                  const sid = String(sub?.subject ?? sub?.subject_id ?? sub?.id ?? "");
                  if (sid) {
                    ids.add(sid);
                    namesById[sid] =
                      sub?.subject_name || sub?.name || sub?.subject__name || `Subject ${sid}`;
                  }
                });
              });
            });
          }
          resolve({ ids, namesById });
        })
        .catch(() => {
          // Do not block copy flow if subject probe fails unexpectedly.
          resolve({ ids: new Set(), namesById: {} });
        });
    });
  };

  validateCopySubjectCompatibility = (sourceExamId, targetExamId) => {
    return Promise.all([
      this.getExamSubjectIdSet(sourceExamId),
      this.getExamSubjectIdSet(targetExamId),
    ]).then(([sourceData, targetData]) => {
      const sourceIds = sourceData?.ids || new Set();
      const targetIds = targetData?.ids || new Set();
      if (!sourceIds.size || !targetIds.size) return true;
      const missingInTarget = [];
      sourceIds.forEach((id) => {
        if (!targetIds.has(id)) missingInTarget.push(id);
      });
      const extraInTarget = [];
      targetIds.forEach((id) => {
        if (!sourceIds.has(id)) extraInTarget.push(id);
      });
      if (!missingInTarget.length && !extraInTarget.length) return true;
      const missingNames = missingInTarget
        .map((id) => sourceData?.namesById?.[id] || `Subject ${id}`)
        .slice(0, 8);
      const extraNames = extraInTarget
        .map((id) => targetData?.namesById?.[id] || `Subject ${id}`)
        .slice(0, 8);
      const missingText = missingNames.length ? missingNames.join(", ") : "-";
      const extraText = extraNames.length ? extraNames.join(", ") : "-";
      // Allow copy when target has extra subjects; copy should proceed for source-configured subjects.
      // Block only when source subjects are missing in target.
      if (!missingInTarget.length && extraInTarget.length) {
        this.setState({
          copyMismatchDetail: {
            sourceCount: sourceIds.size,
            targetCount: targetIds.size,
            missingNames: [],
            extraNames,
            missingText: "-",
            extraText,
          },
        });
        Swal.fire(
          "Subject setup differs",
          "Target exam has extra subjects. Copy will continue for source-configured subjects.",
          "info"
        );
        return true;
      }

      this.setState({
        copyMismatchDetail: {
          sourceCount: sourceIds.size,
          targetCount: targetIds.size,
          missingNames,
          extraNames,
          missingText,
          extraText,
        },
      });
      Swal.fire(
        "Cannot copy schedule",
        "Some source subjects are missing in target exam. Please align subject mapping first.",
        "warning"
      );
      return false;
    });
  };

  openScheduleAddForExam = (examObj, yearIdOverride = "", termIdOverride = "") => {
    const { yearList, examTermList } = this.state;
    if (!examObj?.id) return;

    const selectedYearId = String(yearIdOverride || examObj.academic_year || "");
    const selectedTermId = String(termIdOverride || examObj.term || "");

    const yearNameMap = getKeyValueMap(yearList || [], "id", "name");
    const termNameMap = getKeyValueMap(examTermList || [], "id", "name");

    const search = {
      selectedYear: selectedYearId,
      yearName: yearNameMap?.[selectedYearId] || examObj.academic_year_value || "",
      start_date: examObj.from_date || "",
      end_date: examObj.to_date || "",
      examName: examObj.exam_type_name || examObj.name || "",
      selectedExam: examObj.id,
      selectedTerm: selectedTermId,
      termName: termNameMap?.[selectedTermId] || examObj.term_name || "",
    };

    this.props.history.push({
      pathname: Actions.schedule_exam.create.url,
      search: `?${new URLSearchParams(search).toString()}`,
    });
  };

  redirectToScheduleAddAfterCopy = (targetExamId, yearIdOverride = "", termIdOverride = "") => {
    const { copyTargetExamList, scheduleDashboardRows, examList } = this.state;
    const idStr = String(targetExamId || "");
    if (!idStr) return;

    const localExam =
      (copyTargetExamList || []).find((x) => String(x.id) === idStr) ||
      (scheduleDashboardRows || []).find((x) => String(x.id) === idStr) ||
      (examList || []).find((x) => String(x.id) === idStr);

    if (localExam) {
      this.openScheduleAddForExam(localExam, yearIdOverride, termIdOverride);
      return;
    }

    getRequest(`${GET_URL.exam.api}${idStr}/`, {}, this.props).then((res) => {
      if (res && res.status === 200 && res.data?.data) {
        this.openScheduleAddForExam(res.data.data, yearIdOverride, termIdOverride);
        return;
      }
      // Fallback: keep old behavior if exam details are unavailable.
      this.getExamList(this.state.selectedTerm, targetExamId);
    });
  };

  handleCopySchedule = () => {
    const {
      copySourceExamId,
      copyTargetStartDate,
      copyReplaceExisting,
      copyRespectCalendars,
      selectedExam,
      copyCreateNewExam,
      copyNewTerm,
      copyNewExamType,
      copyNewFromDate,
      copyNewToDate,
      copyNewDescription,
      selectedYear,
      selectedTerm,
      selectedStandard,
      copyTargetExamId,
      copyInlineTargetMode,
      copyInlineTargetHasSchedule,
      copyInlineTargetExamName,
    } = this.state;
    if (!copySourceExamId) {
      Swal.fire("Select source exam", "Choose a source exam to copy schedule from.", "info");
      return;
    }
    this.setState({ copyMismatchDetail: null });
    if (!copyTargetStartDate) {
      Swal.fire("Select start date", "Enter the first exam date for the target schedule.", "info");
      return;
    }
    if (copyCreateNewExam) {
      const templateExamId = selectedExam || copySourceExamId;
      if (!templateExamId) {
        Alert("Select a source exam first.");
        return;
      }
      if (!selectedYear) {
        Alert("Select an academic year.");
        return;
      }
      if (!copyNewTerm || !copyNewExamType || !copyNewFromDate || !copyNewToDate) {
        Alert("Fill term, exam type, from date, and to date for the new exam.");
        return;
      }
      if (copyTargetStartDate < copyNewFromDate || copyTargetStartDate > copyNewToDate) {
        Alert("The first calendar date must fall within the new exam's from and to dates.");
        return;
      }
      this.setState({ copyLoading: true });
      const examUrl = `${GET_URL.exam.api}${templateExamId}/`;
      this.validateCopySubjectCompatibility(copySourceExamId, templateExamId).then((isValid) => {
        if (!isValid) {
          this.setState({ copyLoading: false });
          return;
        }
      getRequest(examUrl, {}, this.props).then((examRes) => {
        if (!examRes || examRes.status !== 200) {
          this.setState({ copyLoading: false });
          return;
        }
        const ex = examRes.data.data;
        const secIds = ex.standard_section_ids;
        if (!secIds || String(secIds).trim() === "") {
          this.setState({ copyLoading: false });
          Alert("Template exam has no standard sections; cannot create a new exam from it.");
          return;
        }
        const payload = {
          source_exam_id: Number(copySourceExamId),
          target_start_date: copyTargetStartDate,
          replace_existing: false,
          respect_calendars: Boolean(copyRespectCalendars),
          create_exam: {
            academic_year: selectedYear,
            term: copyNewTerm,
            exam_type: copyNewExamType,
            from_date: copyNewFromDate,
            to_date: copyNewToDate,
            description: (copyNewDescription || "").trim(),
            is_standard_section: 1,
            standard_section_ids: secIds,
          },
        };
        postRequest(POST_URL.copyschedule.api, payload, this.props)
          .then((response) => {
            if (response && response.status === 200) {
              const newId = response.data?.created_exam_id;
              Swal.fire(
                "Success",
                response.data?.message || "Exam created and schedule copied successfully.",
                "success"
              );
              this.closeCopyDialog();
              if (newId) {
                const newExamMeta = {
                  id: newId,
                  from_date: copyNewFromDate,
                  to_date: copyNewToDate,
                  exam_type_name:
                    (this.state.copyExamTypeList || []).find(
                      (x) => String(x.id) === String(copyNewExamType)
                    )?.name || "",
                  term: copyNewTerm,
                };
                this.openScheduleAddForExam(newExamMeta, selectedYear, copyNewTerm);
              } else {
                this.getExamList(copyNewTerm);
              }
              return;
            }
            Alert("Copy exam schedule failed while creating target exam. Please verify inputs.");
          })
          .catch(() => {
            Alert("Copy exam schedule failed while creating target exam.");
          })
          .finally(() => this.setState({ copyLoading: false }));
      });
      });
      return;
    }
    if (!copyTargetExamId) {
      Swal.fire("Select target exam", "Choose the target exam before copying.", "info");
      return;
    }
    if (String(copySourceExamId) === String(copyTargetExamId)) {
      Swal.fire("Invalid selection", "Source and target exam cannot be the same.", "info");
      return;
    }
    this.setState({ copyLoading: true });
    this.validateCopySubjectCompatibility(copySourceExamId, copyTargetExamId).then((isValid) => {
      if (!isValid) {
        this.setState({ copyLoading: false });
        return;
      }
      const payload = {
        source_exam_id: Number(copySourceExamId),
        target_exam_id: Number(copyTargetExamId),
        target_start_date: copyTargetStartDate,
        replace_existing: copyInlineTargetMode ? true : Boolean(copyReplaceExisting),
        respect_calendars: Boolean(copyRespectCalendars),
      };
      const executeCopy = () =>
        postRequest(POST_URL.copyschedule.api, payload, this.props)
        .then((response) => {
          if (response && response.status === 200) {
            Swal.fire("Success", response.data?.message || "Schedule copied successfully.", "success");
            this.closeCopyDialog();
            this.redirectToScheduleAddAfterCopy(
              copyTargetExamId,
              this.state.copyTargetAcademicYear || selectedYear,
              this.state.copyTargetTerm || selectedTerm
            );
            return;
          }
          Alert("Copy exam schedule failed. Please check source/target setup and try again.");
        })
        .catch(() => {
          Alert("Copy exam schedule failed. Please try again.");
        })
        .finally(() => this.setState({ copyLoading: false }));

      if (copyInlineTargetMode && copyInlineTargetHasSchedule) {
        Swal.fire({
          title: "Replace existing schedule?",
          text: `${
            copyInlineTargetExamName || "Target exam"
          } already has some scheduled subjects. Copying will replace existing schedule rows for this exam.`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes, replace and copy",
          cancelButtonText: "Cancel",
        }).then((result) => {
          if (!result || result.dismiss || !(result.value === true || result.isConfirmed === true)) {
            this.setState({ copyLoading: false });
            return;
          }
          executeCopy();
        });
      } else {
        executeCopy();
      }
    });
  };

  getExamStandardList = (selectedExam, selectedStandard) => {
    let {
      is_standard_section,
      standardList_standard_wise,
      blank,
      optionalSubjects,
    } = this.state;
    this.setState({ loadingExam: true });
    const url = GET_URL.schedule.api;
    let param = { is_active: true, exam: selectedExam };
    let props = { ...this.props };
    props["return_error_message"] = true;
    getRequest(url, param, props).then((response) => {
      if (response && response.status === 200) {
        let part_type = {};
        response.data.data.part_type_list.map((data) => {
          part_type[data["id"]] = {
            list: [],
            id: data["id"],
            name: data["name"],
          };
        });
        if (Array.isArray(response.data.data.schedule_list)) {
          response.data.data.schedule_list.map((standard) => {
            standard.subject_list.map((subject) => {
              if (
                !Boolean(
                  subject.fordate ||
                    subject.start_time ||
                    subject.end_time ||
                    subject.max_marks
                )
              ) {
                subject.isEnabled = false;
                standard.optionalSubjects = true;
                optionalSubjects = true;
              } else if (
                !Boolean(
                  subject.fordate &&
                    subject.start_time &&
                    subject.end_time &&
                    subject.max_marks
                )
              ) {
                subject.partialSubjects = true;
                standard.optionalSubjects = true;
                subject.isEnabled = false;
              }
            });
          });
          is_standard_section = false;
          blank = false;
          standardList_standard_wise = response.data.data.schedule_list;
        } else {
          let last_id = "";
          Object.keys(response.data.data.schedule_list).map((standard) => {
            last_id = "";
            response.data.data.schedule_list[standard].section_list.map(
              (section) => {
                section.selected_merge_ids = [];
                section.subject_list.map((subject, subIndex) => {
                  Object.keys(part_type).map((part_key) => {
                    if (
                      subject.subject_part_type_id == part_key &&
                      !part_type[part_key].list.includes(subject.subject)
                    ) {
                      part_type[part_key].list.push(subject.subject);
                    }
                  });
                  if (
                    !Boolean(
                      subject.fordate ||
                        subject.start_time ||
                        subject.end_time ||
                        subject.max_marks
                    )
                  ) {
                    subject.isEnabled = false;
                    response.data.data.schedule_list[
                      standard
                    ].optionalSubjects = true;
                    optionalSubjects = true;
                  } else if (
                    !Boolean(
                      subject.fordate &&
                        subject.start_time &&
                        subject.end_time &&
                        subject.max_marks
                    )
                  ) {
                    subject.partialSubjects = true;
                    subject.isEnabled = false;
                  }
                  if (subject.next_linking_id) {
                    if (
                      !section.selected_merge_ids.includes(
                        subject?.next_linking_id
                      )
                    ) {
                      section.selected_merge_ids.push(subject?.next_linking_id);
                    }
                    if (!section.selected_merge_ids.includes(subject?.id)) {
                      section.selected_merge_ids.push(subject?.id);
                    }
                  }
                });
              }
            );
          });
          is_standard_section = true;
          if (selectedStandard) {
            blank = false;
          }
        }
        Object.keys(part_type).map((part_key) => {
          if (part_type[part_key].list.length === 0) {
            delete part_type[part_key];
          }
        });
        this.setState(
          {
            standardList: response.data.data.schedule_list,
            approvalStatus: response.data.data.approval_status,
            loadingExam: false,
            loading: is_merge_subject ? true : false,
            selectedStandard: selectedStandard ? selectedStandard : "",
            blank,
            optionalSubjects,
            is_standard_section,
            standardList_standard_wise,
            errorFound: false,
            part_type,
          },
          () => {
            if (is_merge_subject) {
              this.updateSubjectsWithMerge();
            }
          }
        );
      } else {
        this.setState({
          standardList: [],
          loadingExam: false,
          blankData: response,
          selectedStandard: selectedStandard,
          blank: true,
          loading: false,
          errorFound: true,
        });
      }
    });
  };

  updateSubjectsWithMerge = () => {
    let { standardList } = this.state;
    let temp_list = { ...standardList };
    let selected_subject_list = {};
    Object.keys(temp_list).map((data) => {
      selected_subject_list = {};
      temp_list[data].section_list.map((section) => {
        section.subject_list.map((sub) => {
          sub.for_date = sub.fordate
            ? dateFormat(sub.fordate, "DD-MM-YYYY")
            : null;
          delete sub.next_subject_linking_id;
          delete sub.next_linking_id;
          if (section.selected_merge_ids.includes(sub.id)) {
            if (!selected_subject_list[sub.for_date]) {
              selected_subject_list[sub.for_date] = [];
            }
            sub.refId = this.getRefId(selected_subject_list, sub.for_date);
            sub.refBaseId = this.getRefId(
              selected_subject_list,
              sub.for_date,
              true
            );
            selected_subject_list[sub.for_date].push(sub);
          }
        });
        Object.keys(selected_subject_list).map((selected) => {
          selected_subject_list[selected].map((sub_data, sIndex) => {
            if (selected_subject_list[selected].length !== sIndex + 1) {
              sub_data["next_subject_linking_id"] =
                selected_subject_list[selected][sIndex + 1]["subject"];
            }
          });
        });
        section.selected_subject_list = { ...selected_subject_list };
      });
    });
    Object.keys(temp_list).map((std) => {
      temp_list[std].section_list.map((section) => {
        Object.keys(section["selected_subject_list"]).map((selected) => {
          section["selected_subject_list"][selected].map((selSub) => {
            section.subject_list.map((data) => {
              if (
                data.subject === selSub.subject &&
                selSub.next_subject_linking_id
              ) {
                data["next_linking_id"] = selSub.next_linking_id;
                data["next_subject_linking_id"] =
                  selSub.next_subject_linking_id;
              } else if (
                data.subject === selSub.subject &&
                !selSub.next_subject_linking_id
              ) {
                delete data.next_subject_linking_id;
                delete data.next_linking_id;
              }
            });
          });
        });
      });
    });
    this.setState({
      standardList: { ...temp_list },
      loading: false,
    });
  };

  getRefId = (selected_subject_list, for_date, isBase) => {
    let return_data = "";
    if (!for_date) {
      for_date = "null";
    }
    Object.keys(selected_subject_list).map((data, index) => {
      if (!data) {
        data = "null";
      }
      if (isBase) {
        return_data = index + 1;
      } else if (data === for_date) {
        return_data = `${index + 1}${
          alphabet[selected_subject_list[data].length]
        }`;
      }
    });
    return return_data;
  };

  handleClickMore = (index) => {
    this.setState({
      isExpanded: index,
    });
  };

  handleClickLess = () => {
    this.setState({
      isExpanded: "",
    });
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  ApproveExam = () => {
    Swal.fire({
      title: `<strong>Are you sure want to Approve</strong>`,
      text: "You won't be able to update exam!",
      type: "info",
      showCloseButton: true,
      showCancelButton: true,
      focusConfirm: false,
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      confirmButtonColor: "green",
      cancelButtonColor: "orange",
    }).then((result) => {
      if (result.value) {
        this.approveExam();
      }
    });
  };

  CancelRequestApprove = () => {
    Swal.fire({
      title: `<strong>Are you sure want to Cancel Request For Approve</strong>`,
      text: "You won't be able to update exam!",
      type: "info",
      showCloseButton: true,
      showCancelButton: true,
      focusConfirm: false,
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      confirmButtonColor: "green",
      cancelButtonColor: "orange",
    }).then((result) => {
      if (result.value) {
        const { selectedExam, selectedStandard } = this.state;
        let post_data = {
          approval_status: APPROVAL_STATUS.un_approved,
        };
        let url = PUT_URL.examapprove.api + selectedExam + "/";
        putRequest(url, post_data, this.props).then((response) => {
          if (response && response.status === 200) {
            Swal.fire({
              position: "top-end",
              type: "success",
              title: "Your Data has been saved",
              showConfirmButton: false,
              timer: 1500,
            });
            this.getExamStandardList(selectedExam, selectedStandard);
          }
        });
      }
    });
  };

  approveExam = () => {
    const { selectedExam, selectedStandard } = this.state;
    let post_data = {
      approval_status: APPROVAL_STATUS.approved,
    };
    let url = PUT_URL.examapprove.api + selectedExam + "/";
    putRequest(url, post_data, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: "Your Data has been saved",
          showConfirmButton: false,
          timer: 1500,
        });

        this.getExamStandardList(selectedExam, selectedStandard);
      }
    });
  };

  rejectPopup = () => {
    this.setState({
      reasonOpen: true,
    });
  };

  handleCloseReason = () => {
    this.setState({
      reasonOpen: false,
    });
  };

  rejectScheduledExam = () => {
    const { selectedExam, reason, error, selectedStandard } = this.state;
    if (!reason) {
      error["reason"] = "Please Enter Reason";
      this.setState({
        error,
      });
      return;
    }
    let post_data = {
      approval_status: APPROVAL_STATUS.rejected,
      reason: reason,
    };
    let url = PUT_URL.examapprove.api + selectedExam + "/";
    putRequest(url, post_data, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: "Your Data has been saved",
          showConfirmButton: false,
          timer: 1500,
        });
      }
      this.handleCloseReason();
      this.getExamStandardList(selectedExam, selectedStandard);
    });
  };

  onChangeReason = (e) => {
    let { name, value } = e.target;
    let { error } = this.state;
    delete error["reason"];
    this.setState({
      [name]: value,
      error,
    });
  };

  getAliasLanguage = (sequence) => {
    let return_value;
    if (sequence == 1) {
      return_value = alias_names["first_language"];
    } else if (sequence == 2) {
      return_value = alias_names["second_language"];
    } else if (sequence == 3) {
      return_value = alias_names["third_language"];
    }
    return return_value;
  };

  requestForApproveExam = () => {
    const { selectedExam, selectedStandard, openModalOptionalSubjects } =
      this.state;
    let post_data = {
      approval_status: APPROVAL_STATUS.pending,
    };
    let props = { ...this.props };
    if (openModalOptionalSubjects) {
      props["return_error_message"] = true;
    }
    let url = PUT_URL.examapprove.api + selectedExam + "/";
    putRequest(url, post_data, props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: "Your Data has been saved",
          showConfirmButton: false,
          timer: 1500,
        });
        this.setState(
          {
            openModalOptionalSubjects: false,
            optionalSubjects: false,
          },
          () => {
            this.getExamStandardList(selectedExam, selectedStandard);
          }
        );
      } else {
        this.setState({
          requestApprovalError: response,
        });
      }
    });
  };

  handleCloseModal = () => {
    this.setState({
      openModalOptionalSubjects: false,
    });
  };

  handleOpenSnackBar = () => {
    const { optionalSubjects, standardList, selectedStandard } = this.state;
    if (
      (is_grade_plan &&
        standardList[selectedStandard]["section_list"][0]?.["grade_plan_data"]
          ?.grade_plan &&
        standardList[selectedStandard]["section_list"][0]?.[
          "grade_plan_data_for_total"
        ]?.grade_plan_for_total) ||
      !is_grade_plan
    ) {
      if (optionalSubjects) {
        this.setState({
          requestApprovalError: "",
          openModalOptionalSubjects: true,
        });
      } else {
        this.requestForApproveExam();
      }
    } else {
      this.setState({
        alertData: "Select Grade Plan",
        open: true,
        fieldError: {
          reason: "Subject Grade Plan and Total Grade Plan is not selected",
        },
      });
    }
  };

  getCumulativeNames = (data_list) => {
    let return_data = [];
    data_list.map((data) => {
      return_data.push(data?.["alias"] ?? data["name"]);
    });
    return return_data.join(", ");
  };

  getShowContentMarks = (sub_details, marks, name) => {
    return (
      <Box>
        <Box>
          <Box>{`${alias_names["cumulative"]} Type-  ${name} Marks`}</Box>
        </Box>
        {sub_details[marks] && (
          <Box>
            <Box>{`${alias_names["written"]} - ${sub_details[marks]}`}</Box>
          </Box>
        )}
        {sub_details.cumulative_mapping &&
          sub_details.cumulative_mapping.map((cum_data) => {
            return (
              <Box>
                <Box>{`${this.getCumulativeNames(
                  cum_data.cumulative_type_data
                )} - ${cum_data[marks]}`}</Box>
              </Box>
            );
          })}
      </Box>
    );
  };

  getSubjectFormat = (standard, stIndex, part) => {
    const { isExpanded, part_type } = this.state;
    return (
      <>
        {Object.keys(part_type).length > 1 && (
          <TableRow>
            <TableCell
              className="schedule-exam-subject-name-box height-49px text-bold fs-18 "
              component="th"
              scope="row"
            >
              <div className="text-blue">{part_type[part]["name"]}</div>
            </TableCell>
            <TableCell className="" component="th" scope="row"></TableCell>
            <TableCell className="" component="th" scope="row"></TableCell>
            <TableCell className="" component="th" scope="row"></TableCell>
            <TableCell className="" component="th" scope="row"></TableCell>
            <TableCell className="" component="th" scope="row"></TableCell>
          </TableRow>
        )}
        {standard.subject_list.map((subject, subIndex) => {
          return (
            <>
              {part_type[part].list.includes(subject.subject) && (
                <TableRow
                  key={subIndex}
                  className={
                    isExpanded !== stIndex && subIndex > 2
                      ? "display-none"
                      : "schedule-exam-subject-name-box height-49px"
                  }
                >
                  <TableCell className="" component="th" scope="row">
                    {subject.is_language && number_of_language
                      ? subject.refId
                        ? `${subject.subject_name} ${this.getAliasLanguage(
                            subject.sequence
                          )} - (${subject.refId})`
                        : `${subject.subject_name} ${this.getAliasLanguage(
                            subject.sequence
                          )}`
                      : subject.refId
                      ? `${subject.subject_name} - (${subject.refId})`
                      : subject.subject_name}
                  </TableCell>
                  <TableCell
                    className=""
                    component="th"
                    scope="row"
                    align="center"
                  >
                    {subject.is_marks === true ||
                    subject.is_marks === undefined ? (
                      is_cumulative &&
                      subject.total_max_marks &&
                      subject.cumulative_mapping &&
                      subject.cumulative_mapping.length > 0 ? (
                        <Tooltip
                          title={this.getShowContentMarks(
                            subject,
                            "max_marks",
                            "Max"
                          )}
                          enterDelay={400}
                          enterNextDelay={400}
                          placement="top-start"
                          classes={{ tooltip: "tooltip-show-data" }}
                        >
                          <Box className="pointer display-flex flex-justify-center-flex-prop">
                            <Box className="mr-5">
                              {subject.total_max_marks}
                            </Box>
                            <InfoIcon />
                          </Box>
                        </Tooltip>
                      ) : (
                        subject.max_marks
                      )
                    ) : (
                      `Grade Plan - ${subject.grade_plan_name}`
                    )}
                  </TableCell>
                  <TableCell
                    className=""
                    component="th"
                    scope="row"
                    align="center"
                  >
                    {is_cumulative &&
                    subject.total_min_marks &&
                    subject.cumulative_mapping &&
                    subject.cumulative_mapping.length > 0 ? (
                      <Tooltip
                        title={this.getShowContentMarks(
                          subject,
                          "min_marks",
                          "Min"
                        )}
                        enterDelay={400}
                        enterNextDelay={400}
                        placement="top-start"
                        classes={{ tooltip: "tooltip-show-data" }}
                      >
                        <Box className="pointer display-flex flex-justify-center-flex-prop">
                          <Box className="mr-5">{subject.total_min_marks}</Box>
                          <InfoIcon />
                        </Box>
                      </Tooltip>
                    ) : (
                      subject.min_marks
                    )}
                  </TableCell>
                  <TableCell className="" component="th" scope="row">
                    {dateFormat(subject.fordate, "DD-MM-YYYY")}
                  </TableCell>
                  <TableCell className="" component="th" scope="row">
                    {timeFormat(subject.start_time)}
                  </TableCell>
                  <TableCell className="" component="th" scope="row">
                    {timeFormat(subject.end_time)}
                  </TableCell>
                </TableRow>
              )}
            </>
          );
        })}
      </>
    );
  };

  unapproveScheduleForExamId = (examId, afterSuccess) => {
    const idn = Number(examId);
    if (Number.isNaN(idn)) return;
    const post_data = {
      approval_status: APPROVAL_STATUS.un_approved,
    };
    const url = PUT_URL.examapprove.api + idn + "/";
    putRequest(url, post_data, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: "Your Data has been saved",
          showConfirmButton: false,
          timer: 1500,
        });
        if (
          this.state.scheduleMainTab === "dashboard" ||
          this.state.scheduleMainTab === "schedule"
        ) {
          this.fetchScheduleDashboard();
        }
        const { selectedExam, selectedStandard } = this.state;
        if (selectedExam && Number(selectedExam) === idn) {
          if (typeof afterSuccess === "function") {
            afterSuccess();
          } else {
            this.getExamStandardList(selectedExam, selectedStandard);
          }
        }
      }
    });
  };

  requestApproveForExamId = (examId, e) => {
    if (e) e.stopPropagation();
    const idn = Number(examId);
    if (Number.isNaN(idn)) return;
    const post_data = {
      approval_status: APPROVAL_STATUS.pending,
    };
    const url = PUT_URL.examapprove.api + idn + "/";
    putRequest(url, post_data, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: "Your Data has been saved",
          showConfirmButton: false,
          timer: 1500,
        });
        if (
          this.state.scheduleMainTab === "dashboard" ||
          this.state.scheduleMainTab === "schedule"
        ) {
          this.fetchScheduleDashboard();
        }
        const { selectedExam, selectedStandard } = this.state;
        if (selectedExam && Number(selectedExam) === idn) {
          this.getExamStandardList(selectedExam, selectedStandard);
        }
      }
    });
  };


  approveScheduleForExamId = (examId, e) => {
    if (e) e.stopPropagation();
    const idn = Number(examId);
    if (Number.isNaN(idn)) return;
    const post_data = {
      approval_status: APPROVAL_STATUS.approved,
    };
    const url = PUT_URL.examapprove.api + idn + "/";
    putRequest(url, post_data, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data?.message || "Exam schedule approved",
          showConfirmButton: false,
          timer: 1500,
        });
        if (
          this.state.scheduleMainTab === "dashboard" ||
          this.state.scheduleMainTab === "schedule"
        ) {
          this.fetchScheduleDashboard();
        }
        const { selectedExam, selectedStandard } = this.state;
        if (selectedExam && Number(selectedExam) === idn) {
          this.getExamStandardList(selectedExam, selectedStandard);
        }
      }
    });
  };

  rejectScheduleForExamId = (examId, e) => {
    if (e) e.stopPropagation();
    const idn = Number(examId);
    if (Number.isNaN(idn)) return;

    Swal.fire({
      title: "Reject exam schedule",
      text: "Provide rejection reason.",
      input: "textarea",
      inputPlaceholder: "Enter reason",
      showCancelButton: true,
      confirmButtonText: "Reject",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      inputValidator: (value) => (!String(value || "").trim() ? "Please enter reason" : null),
    }).then((result) => {
      if (!result || result.dismiss) return;
      if (!(result.value || "").trim()) return;

      const post_data = {
        approval_status: APPROVAL_STATUS.rejected,
        reason: String(result.value).trim(),
      };
      const url = PUT_URL.examapprove.api + idn + "/";
      putRequest(url, post_data, this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: response.data?.message || "Exam schedule rejected",
            showConfirmButton: false,
            timer: 1500,
          });
          if (
            this.state.scheduleMainTab === "dashboard" ||
            this.state.scheduleMainTab === "schedule"
          ) {
            this.fetchScheduleDashboard();
          }
          const { selectedExam, selectedStandard } = this.state;
          if (selectedExam && Number(selectedExam) === idn) {
            this.getExamStandardList(selectedExam, selectedStandard);
          }
        }
      });
    });
  };
  

  render() {
    let {
      yearList,
      selectedYear,
      open,
      alertData,
      error,
      blank,
      loadingExam,
      examList,
      selectedExam,
      standardList,
      isExpanded,
      loading,
      blankData,
      approvalStatus,
      reasonOpen,
      reason,
      examTermList,
      selectedTerm,
      is_standard_section,
      standard_list,
      loadingExamGet,
      scheduleViewDialogOpen,
      requestApprovalError,
      selectedStandard,
      openModalOptionalSubjects,
      standardList_standard_wise,
      errorFound,
      part_type,
      fieldError,
      copyDialogOpen,
      copySourceExamId,
      copyTargetStartDate,
      copyReplaceExisting,
      copyRespectCalendars,
      copySourceExamList,
      copyFromTerm,
      copyLoading,
      copyCreateNewExam,
      copyNewTerm,
      copyNewExamType,
      copyNewFromDate,
      copyNewToDate,
      copyNewDescription,
      copyExamTypeList,
      copySourceAcademicYear,
      deletingScheduleExamId,
      scheduleDashboardRows,
      scheduleDashboardLoading,
      scheduleTableSearch,
      scheduleListApprovalFilter,
      dashboardDateSortDir,
      scheduleMainTab,
      expandedStandardsByExamId,
      scheduleStandardPickerOpen,
      scheduleStandardOptions,
      scheduleStandardValue,
      rowActionMenuAnchorEl,
      rowActionMenuRow,
      examReportOpen,
      examReportLoading,
      examReportError,
      examReportExam,
      examReportRows,
      examReportRankOpen,
      examReportRankTitle,
      examReportRankRows,
    } = this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      const filteredDashboardRows = this.getFilteredDashboardRows();
      const sortedDashboardRows = this.sortDashboardRowsByExamDate(
        filteredDashboardRows,
        dashboardDateSortDir
      );
      const rawDashPage = this.state.dashboardPage || 0;
      const maxDashPage = Math.max(
        0,
        Math.ceil(sortedDashboardRows.length / DASHBOARD_ROWS_PER_PAGE) - 1
      );
      const dashboardPage = Math.min(rawDashPage, maxDashPage);
      const pagedDashboardRows = sortedDashboardRows.slice(
        dashboardPage * DASHBOARD_ROWS_PER_PAGE,
        dashboardPage * DASHBOARD_ROWS_PER_PAGE + DASHBOARD_ROWS_PER_PAGE
      );
      const selectedExamMeta =
        (examList || []).find((e) => String(e.id) === String(selectedExam)) ||
        (scheduleDashboardRows || []).find((e) => String(e.id) === String(selectedExam)) ||
        null;
      const dashboardColSpan = 5;
      const rowActionApproval = String(rowActionMenuRow?.approval_status ?? "");
      const rowActionHasScheduleToClear = this.getDashboardRowScheduleCount(rowActionMenuRow) === null
        ? true
        : this.getDashboardRowScheduleCount(rowActionMenuRow) > 0;
      const toolbarBtn = {
        textTransform: "none",
        fontSize: "0.8125rem",
        padding: "5px 12px",
        minHeight: 33,
        lineHeight: 1.2,
        borderRadius: 9,
        fontWeight: 700,
      };
      const iconSm = { fontSize: 16, marginRight: 4, verticalAlign: "middle" };
      const scheduleSurface = {
        border: "1px solid #dbeafe",
        borderRadius: 14,
        background: "linear-gradient(180deg, #f8fbff 0%, #f1f5ff 100%)",
        boxShadow: "0 12px 28px rgba(59, 130, 246, 0.14)",
        padding: 12,
      };
      const statusPill = (row) => {
        const approved = String(row.approval_status) === APPROVAL_STATUS.approved;
        return (
          <Chip
            size="small"
            label={row.approval_status_value || String(row.approval_status ?? "")}
            style={{
              borderRadius: 999,
              fontWeight: 700,
              color: approved ? "#166534" : "#92400e",
              background: approved ? "rgba(16, 185, 129, 0.14)" : "rgba(245, 158, 11, 0.16)",
              border: approved ? "1px solid #6ee7b7" : "1px solid #fcd34d",
            }}
          />
        );
      };

      return (
        <Paper className="paper-background" style={{ padding: "16px 20px 24px" }}>
          
            <Box
              display="flex"
              flexWrap="wrap"
              alignItems="center"
              justifyContent="space-between"
              style={{
                gap: 12,
                marginBottom: 8,
              }}
            >
              <Box  className="heading">
                Exam schedule
              </Box>
              <Button
                size="small"
                variant="outlined"
                onClick={this.goToOldScheduleUi}
                style={{
                  textTransform: "none",
                  borderColor: "#94a3b8",
                  color: "#334155",
                  backgroundColor: "#fff",
                  fontWeight: 700,
                }}
              >
                Switch to old UI
              </Button>
          </Box>

          {isUserHasPermission("schedule_exam", "view") && (
              <Box
                className="mt-12"
                mb={2}
                p={2}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  background: "#fff",
                }}
              >
                <Typography
                  variant="caption"
                  color="textSecondary"
                  component="p"
                  style={{
                    margin: "0 0 10px 0",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                  }}
                >
                  Academic year & term
                </Typography>
                <Grid container spacing={2} alignItems="flex-end" style={{ marginBottom: 8 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Dropdown
                      data={yearList}
                      name="selectedYear"
                      style="width-100"
                      value={selectedYear}
                      onChange={this.onChange}
                      label="Academic year"
                      error={error.selectedYear}
                      hideSelect={true}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Dropdown
                      data={examTermList}
                      name="selectedTerm"
                      style="width-100"
                      value={selectedTerm}
                      onChange={this.onChange}
                      label="Term"
                      error={error.selectedTerm}
                      disabled={selectedYear ? false : true}
                      helperText={
                        !selectedYear ? "Select academic year first" : error.selectedTerm
                      }
                      hideSelect={true}
                      size="small"
                    />
                  </Grid>
                </Grid>

                <Tabs
                  value={scheduleMainTab}
                  onChange={this.handleScheduleMainTabChange}
                  indicatorColor="primary"
                  textColor="primary"
                  variant="fullWidth"
                  style={{
                    marginBottom: 16,
                    minHeight: 48,
                    background: "linear-gradient(180deg, #f8fafc 0%, #fff 100%)",
                    borderRadius: 12,
                    border: "1px solid #e8ecf4",
                    boxShadow: "0 1px 8px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <Tab
                    label="Exam schedule"
                    value="schedule"
                    style={{ textTransform: "none", fontWeight: 700, fontSize: "0.95rem" }}
                  />
                  <Tab
                    label="Exam dashboard"
                    value="dashboard"
                    style={{ textTransform: "none", fontWeight: 700, fontSize: "0.95rem" }}
                  />
                </Tabs>

                {!selectedYear || !selectedTerm ? (
                  <Typography variant="body2" color="textSecondary">
                    Select academic year and term first.
                  </Typography>
                ) : scheduleMainTab === "dashboard" ? (
                  <>{this.renderScheduleDashboardMetrics()}</>
                ) : (
                  <>
                <Box style={scheduleSurface}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.25}>
                  <Typography variant="subtitle2" style={{ fontWeight: 800, color: "#0f172a" }}>
                    Schedule list
                  </Typography>
                  <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                    {isUserHasPermission("exam", "create") && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={this.openCreateExamFromSchedule}
                        style={{
                          ...toolbarBtn,
                          borderColor: "#93c5fd",
                          color: "#1d4ed8",
                          background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
                        }}
                      >
                        Create exam
                      </Button>
                    )}
                    
                  </Box>
                </Box>
                <Grid container spacing={2} alignItems="flex-end" style={{ marginBottom: 14 }}>
                  <Grid item xs={12} md={7} style={{ minWidth: 0 }}>
                    <TextField
                      fullWidth
                      size="small"
                      variant="outlined"
                      label="Search exams"
                      placeholder="Name, standards, or description"
                      value={scheduleTableSearch}
                      onChange={(e) =>
                        this.setState({
                          scheduleTableSearch: e.target.value,
                          dashboardPage: 0,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <Box
                      display="flex"
                      flexWrap="wrap"
                      alignItems="center"
                      justifyContent="flex-end"
                      style={{ gap: 6 }}
                    >
                      {[
                        { value: "all", label: "All" },
                        { value: "approved", label: "Approved" },
                        { value: "unapproved", label: "Pending" },
                      ].map((opt) => {
                        const active = scheduleListApprovalFilter === opt.value;
                        return (
                          <Button
                            key={opt.value}
                            size="small"
                            disableElevation
                            variant={active ? "contained" : "outlined"}
                            color="primary"
                            onClick={() =>
                              this.setState({ scheduleListApprovalFilter: opt.value, dashboardPage: 0 })
                            }
                            style={{
                              minWidth: 0,
                              padding: "4px 12px",
                              borderRadius: 999,
                              textTransform: "none",
                              fontSize: 12,
                              fontWeight: 700,
                              lineHeight: 1.35,
                              borderWidth: active ? 0 : 1,
                              borderColor: active ? undefined : "#c4b5fd",
                              color: active ? "#fff" : "#312e81",
                              background: active
                                ? "linear-gradient(90deg, #2563eb 0%, #7c3aed 100%)"
                                : "#fff",
                              boxShadow: active ? "0 6px 12px rgba(79, 70, 229, 0.36)" : "none",
                            }}
                          >
                            {opt.label}
                          </Button>
                        );
                      })}
                    </Box>
                  </Grid>
                </Grid>
               
                <Box
                  display="flex"
                  flexWrap="wrap"
                  alignItems="center"
                  justifyContent="space-between"
                  mb={1.5}
                  style={{ gap: 8 }}
                >
                 
                  <Box
                    display="flex"
                    flexWrap="wrap"
                    alignItems="center"
                    justifyContent="flex-end"
                    style={{ gap: 8, rowGap: 8 }}
                  >
                  </Box>
                </Box>
                {scheduleDashboardLoading ? (
                  <Box display="flex" justifyContent="center" py={2}>
                    <CircularProgress size={28} />
                  </Box>
                ) : (
                  <TableContainer
                    style={{
                      width: "100%",
                      maxWidth: "100%",
                      overflowX: "auto",
                      overflowY: "hidden",
                      border: "1px solid #dbeafe",
                      borderRadius: 12,
                      backgroundColor: "#fff",
                    }}
                  >
                    <Table size="small" style={{ minWidth: 980 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell
                            style={{
                              background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
                              fontWeight: 700,
                              color: "#1e3a8a",
                            }}
                          >
                            Exam name
                          </TableCell>
                          <TableCell
                            style={{
                              background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
                              fontWeight: 700,
                              color: "#1e3a8a",
                            }}
                          >
                            Standards
                          </TableCell>
                          <TableCell
                            style={{
                              background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
                              fontWeight: 700,
                              color: "#1e3a8a",
                            }}
                          >
                            Approval status
                          </TableCell>
                          <TableCell
                            style={{
                              background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
                              fontWeight: 700,
                              color: "#1e3a8a",
                            }}
                            sortDirection={dashboardDateSortDir}
                          >
                            <TableSortLabel
                              active
                              direction={dashboardDateSortDir}
                              onClick={(e) => {
                                e.stopPropagation();
                                this.toggleDashboardDateSort();
                              }}
                            >
                              Exam dates
                            </TableSortLabel>
                          </TableCell>
                          <TableCell
                            align="right"
                            style={{
                              background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
                              fontWeight: 700,
                              color: "#1e3a8a",
                            }}
                          >
                            &nbsp;
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {!scheduleDashboardRows.length ? (
                          <TableRow>
                            <TableCell colSpan={dashboardColSpan}>
                              <Typography variant="body2" color="textSecondary">
                                No exams found for this academic year and term.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : !filteredDashboardRows.length ? (
                          <TableRow>
                            <TableCell colSpan={dashboardColSpan}>
                              <Typography variant="body2" color="textSecondary">
                                No exams match your search. Clear the search box to see all exams.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          pagedDashboardRows.map((row) => {
                            const scheduleCount = this.getDashboardRowScheduleCount(row);
                            const hasScheduleToClear = scheduleCount === null ? true : scheduleCount > 0;
                            const isCurrent =
                              selectedExam && Number(selectedExam) === Number(row.id);
                            const announcedCount = Number(row.result_config_announced || 0);
                            const announcedTotal = Number(row.result_config_total || 0);
                            const standardsText = String(row.standards_display || "—");
                            const standardsParts = standardsText
                              .split(";")
                              .map((s) => s.trim())
                              .filter(Boolean);
                            const standardsLimit = 3;
                            const standardsExpanded = Boolean(expandedStandardsByExamId[row.id]);
                            const standardsPreview = standardsExpanded
                              ? standardsParts
                              : standardsParts.slice(0, standardsLimit);
                            const hiddenCount = Math.max(0, standardsParts.length - standardsPreview.length);
                            return (
                              <TableRow
                                key={row.id}
                                hover
                                onClick={(e) => {
                                  const t = e.target;
                                  if (
                                    t.closest &&
                                    (t.closest("input") ||
                                      t.closest("button") ||
                                      t.closest(".MuiCheckbox-root") ||
                                      t.closest(".MuiIconButton-root"))
                                  ) {
                                    return;
                                  }
                                  if (!loadingExamGet) {
                                    this.openExamFromDashboard(row.id);
                                  }
                                }}
                                style={{
                                  cursor: loadingExamGet ? "default" : "pointer",
                                  borderBottom: "1px solid #f1f5f9",
                                  ...(isCurrent
                                    ? { backgroundColor: "rgba(99, 102, 241, 0.1)" }
                                    : {}),
                                }}
                              >
                                <TableCell>
                                  <Typography variant="body2" style={{ fontWeight: 700, color: "#0f172a" }}>
                                    {row.exam_type_name || "—"}
                                  </Typography>
                                  {row.description ? (
                                    <Typography
                                      variant="caption"
                                      color="textSecondary"
                                      display="block"
                                    >
                                      {row.description}
                                    </Typography>
                                  ) : null}
                                </TableCell>
                                <TableCell style={{ maxWidth: 280 }}>
                                  <Typography variant="body2" style={{ whiteSpace: "normal" }}>
                                    {standardsPreview.length ? standardsPreview.join("; ") : "—"}
                                  </Typography>
                                  {standardsParts.length > standardsLimit && (
                                    <Button
                                      size="small"
                                      onClick={(e) => this.toggleStandardsPreview(row.id, e)}
                                      style={{
                                        marginTop: 2,
                                        padding: 0,
                                        minWidth: 0,
                                        textTransform: "none",
                                        fontWeight: 700,
                                        color: "#4f46e5",
                                      }}
                                    >
                                      {standardsExpanded ? "Show less" : `+${hiddenCount} more`}
                                    </Button>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {statusPill(row)}
                                  <Typography
                                    variant="caption"
                                    display="block"
                                    style={{ marginTop: 4, color: "#64748b", fontWeight: 600 }}
                                  >
                                    Announced:{" "}
                                    {announcedTotal > 0
                                      ? `${announcedCount}/${announcedTotal}`
                                      : "0"}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" component="span">
                                    {row.from_date
                                      ? dateFormat(row.from_date, "DD-MM-YYYY")
                                      : "—"}
                                    {" → "}
                                    {row.to_date
                                      ? dateFormat(row.to_date, "DD-MM-YYYY")
                                      : "—"}
                                  </Typography>
                                </TableCell>
                                <TableCell
                                  align="right"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <IconButton
                                    size="small"
                                    onClick={(e) => this.openRowActionMenu(row, e)}
                                    aria-label="More actions"
                                  >
                                    <MoreVertIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                {!scheduleDashboardLoading &&
                  selectedYear &&
                  selectedTerm &&
                  !!sortedDashboardRows.length && (
                    <TablePagination
                      component="div"
                      count={sortedDashboardRows.length}
                      page={dashboardPage}
                      onChangePage={(e, newPage) =>
                        this.setState({ dashboardPage: newPage })
                      }
                      rowsPerPage={DASHBOARD_ROWS_PER_PAGE}
                      rowsPerPageOptions={[DASHBOARD_ROWS_PER_PAGE]}
                      onChangeRowsPerPage={() => {}}
                      style={{ marginTop: 6 }}
                    />
                  )}
                <Menu
                  anchorEl={rowActionMenuAnchorEl}
                  open={Boolean(rowActionMenuAnchorEl && rowActionMenuRow)}
                  onClose={this.closeRowActionMenu}
                  keepMounted
                >
                  {rowActionMenuRow && (
                    <MenuItem
                      onClick={(e) => {
                        this.closeRowActionMenu();
                        this.openExamReportDialog(rowActionMenuRow, e);
                      }}
                    >
                      Report
                    </MenuItem>
                  )}
                  {rowActionMenuRow && (
                    <MenuItem
                      onClick={() => {
                        const examId = rowActionMenuRow.id;
                        this.closeRowActionMenu();
                        this.openExamFromDashboard(examId);
                      }}
                    >
                      View
                    </MenuItem>
                  )}
                  {rowActionMenuRow && isUserHasPermission("schedule_exam", "create") && (
                    <MenuItem
                      onClick={(e) => {
                        this.closeRowActionMenu();
                        this.openCopyDialog(rowActionMenuRow, e);
                      }}
                    >
                      Copy schedule
                    </MenuItem>
                  )}
                  {rowActionMenuRow &&
                    rowActionApproval === String(APPROVAL_STATUS.pending) &&
                    isUserHasPermission("schedule_exam_approve", "create") && (
                      <MenuItem
                        onClick={(e) => {
                          const examId = rowActionMenuRow.id;
                          this.closeRowActionMenu();
                          this.approveScheduleForExamId(examId, e);
                        }}
                      >
                        Approve
                      </MenuItem>
                    )}
                  {rowActionMenuRow &&
                    rowActionApproval === String(APPROVAL_STATUS.pending) &&
                    isUserHasPermission("schedule_exam_approve", "create") && (
                      <MenuItem
                        onClick={(e) => {
                          const examId = rowActionMenuRow.id;
                          this.closeRowActionMenu();
                          this.rejectScheduleForExamId(examId, e);
                        }}
                      >
                        Reject
                      </MenuItem>
                    )}
                  {rowActionMenuRow &&
                    rowActionApproval === String(APPROVAL_STATUS.approved) &&
                    isUserHasPermission("schedule_exam_approve", "create") && (
                      <MenuItem
                        onClick={() => {
                          const examId = rowActionMenuRow.id;
                          this.closeRowActionMenu();
                          this.unapproveScheduleForExamId(examId);
                        }}
                      >
                        Unapprove
                      </MenuItem>
                    )}
                  {rowActionMenuRow &&
                    rowActionApproval !== String(APPROVAL_STATUS.approved) &&
                    rowActionApproval !== String(APPROVAL_STATUS.pending) &&
                    isUserHasPermission("schedule_exam", "create") && (
                      <MenuItem
                        onClick={(e) => {
                          const examId = rowActionMenuRow.id;
                          this.closeRowActionMenu();
                          this.requestApproveForExamId(examId, e);
                        }}
                      >
                        Request Approval
                      </MenuItem>
                    )}
                  {rowActionMenuRow &&
                    rowActionApproval !== String(APPROVAL_STATUS.approved) &&
                    rowActionApproval !== String(APPROVAL_STATUS.pending) &&
                    isUserHasPermission("schedule_exam", "create") && (
                      <MenuItem
                        onClick={(e) => {
                          const examId = rowActionMenuRow.id;
                          this.closeRowActionMenu();
                          this.handleScheduleForDashboardRow(examId, e);
                        }}
                      >
                        Schedule
                      </MenuItem>
                    )}
                  {rowActionMenuRow && isUserHasPermission("schedule_exam", "create") && (
                    <MenuItem
                      disabled={deletingScheduleExamId === Number(rowActionMenuRow.id)}
                      onClick={(e) => {
                        const examId = rowActionMenuRow.id;
                        this.closeRowActionMenu();
                        if (!rowActionHasScheduleToClear) {
                          Swal.fire(
                            "Nothing to delete",
                            "This exam has no timetable rows to clear.",
                            "info"
                          );
                          return;
                        }
                        this.handleClearScheduleForExam(examId, e);
                      }}
                    >
                      {deletingScheduleExamId === Number(rowActionMenuRow.id) ? "Deleting..." : "Delete"}
                    </MenuItem>
                  )}
                </Menu>
                </Box>
                  </>
                )}
              </Box>
            )}
          {blank &&
            !loadingExam &&
            (!selectedYear || !selectedTerm) &&
            !isUserHasPermission("schedule_exam", "view") && (
            <div className="mt-20">
              <BlankPagewithIcon data={blankData} />
            </div>
          )}
          {blank &&
            !loadingExam &&
            selectedYear &&
            selectedTerm &&
            !selectedExam && (
              <Box mt={2} mb={1} textAlign="center">
                <Typography variant="body2" color="textSecondary">
                  On the <strong>Exam schedule</strong> tab, use <strong>View</strong> in the table to open the Exam
                  schedule dialog.
                </Typography>
              </Box>
            )}
          <Dialog
            open={Boolean(scheduleStandardPickerOpen)}
            onClose={() =>
              this.setState({
                scheduleStandardPickerOpen: false,
                scheduleStandardOptions: [],
                scheduleStandardValue: "",
                scheduleStandardExamId: "",
              })
            }
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>Select standard</DialogTitle>
            <DialogContent>
              <DialogContentText style={{ marginBottom: 12 }}>
                Choose a standard before opening Exam schedule.
              </DialogContentText>
              <Dropdown
                data={scheduleStandardOptions}
                name="scheduleStandardValue"
                value={scheduleStandardValue}
                onChange={(e) => this.setState({ scheduleStandardValue: e.target.value })}
                label="Standard"
                customName="name"
                customId="id"
                hideSelect
                size="small"
              />
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() =>
                  this.setState({
                    scheduleStandardPickerOpen: false,
                    scheduleStandardOptions: [],
                    scheduleStandardValue: "",
                    scheduleStandardExamId: "",
                  })
                }
              >
                Cancel
              </Button>
              <Button
                color="primary"
                variant="contained"
                onClick={this.confirmScheduleStandardAndNavigate}
                disabled={!scheduleStandardValue}
              >
                Continue
              </Button>
            </DialogActions>
          </Dialog>
          <Dialog
            fullScreen
            open={Boolean(scheduleViewDialogOpen && selectedExam)}
            onClose={this.closeScheduleDialog}
          >
            <DialogTitle
              disableTypography
            style={{
              borderBottom: "1px solid #e2e8f0",
              flexShrink: 0,
              background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
            }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                pr={1}
              >
                <Box>
                  <Typography variant="h6" component="span">
                    Exam schedule
                  </Typography>
                  {selectedExamMeta && (
                    <Typography
                      variant="caption"
                      component="div"
                      style={{ color: "#64748b", fontWeight: 600, marginTop: 2 }}
                    >
                      {(selectedExamMeta.exam_type_name || selectedExamMeta.name || "Exam")}
                      {selectedExamMeta.term_name ? ` · ${selectedExamMeta.term_name}` : ""}
                      {selectedExamMeta.from_date
                        ? ` · ${dateFormat(selectedExamMeta.from_date, "DD-MM-YYYY")}`
                        : ""}
                      {selectedExamMeta.to_date
                        ? ` to ${dateFormat(selectedExamMeta.to_date, "DD-MM-YYYY")}`
                        : ""}
                    </Typography>
                  )}
                </Box>
                <IconButton
                  edge="end"
                  color="inherit"
                  onClick={this.closeScheduleDialog}
                  aria-label="Close schedule"
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent
              dividers
            style={{
              padding: 20,
              position: "relative",
              minHeight: "42vh",
              background: "#f8fafc",
            }}
            >
          {(loadingExam || loadingExamGet) && (
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              zIndex={6}
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.94)" }}
            >
              <CircularProgress size={44} />
              <Typography variant="body2" color="textSecondary" style={{ marginTop: 16 }}>
                Loading timetable…
              </Typography>
            </Box>
          )}
          {selectedExam &&
            is_standard_section &&
            !errorFound &&
            standard_list &&
            standard_list.length > 0 && (
              <Box
                mb={2}
                px={2}
                py={1.5}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  background: "#f8fafc",
                }}
              >
                <Box
                  display="flex"
                  flexWrap="wrap"
                  alignItems="flex-end"
                  style={{ gap: 16 }}
                >
                  <Box width="100%" maxWidth={360} style={{ alignSelf: "flex-start" }}>
                    <Typography
                      variant="caption"
                      style={{ color: "#64748b", fontWeight: 600, display: "block", marginBottom: 6 }}
                    >
                      {alias_names["standard"]} (this exam)
                    </Typography>
                    <Dropdown
                      data={[
                        { standard: "", standard_name: "Show all" },
                        ...(standard_list || []),
                      ]}
                      name="selectedStandard"
                      customName="standard_name"
                      customId="standard"
                      value={selectedStandard}
                      onChange={this.onChange}
                      label={`Select ${alias_names["standard"]}`}
                      error={error.selectedStandard}
                      hideSelect
                      size="small"
                      menuListMaxHeight={280}
                    />
                  </Box>
                </Box>
              </Box>
            )}
          {blank &&
            !loadingExam &&
            selectedExam &&
            is_standard_section &&
            !selectedStandard && (
              <Box mt={2} mb={1} textAlign="center">
                <Typography variant="body2" color="textSecondary">
                  {blankData}
                </Typography>
              </Box>
            )}
          {approvalStatus.approval_status == "3" && !blank && (
            <Box display="flex" className="schedule-warning-message mt-10">
              <WarningIcon
                style={{
                  color: "#f6c342",
                  marginRight: "10px",
                  fontSize: "27px",
                }}
              />
              Pending for approve
            </Box>
          )}
          {approvalStatus.approval_status == "2" && !blank && (
            <Box display="flex" className="schedule-reject-message mt-10">
              <WarningIcon
                style={{
                  color: "#cf4343",
                  marginRight: "10px",
                  fontSize: "27px",
                }}
              />
              Rejected with reason
              <Box className="schedule-reject-message-reason">{`: ${approvalStatus.reason}`}</Box>
            </Box>
          )}
          {fieldError["reason"] && (
            <Box display="flex" className="schedule-reject-message mt-10">
              <WarningIcon
                style={{
                  color: "#cf4343",
                  marginRight: "10px",
                  fontSize: "27px",
                }}
              />
              Request is not possible with below reason
              <Box className="schedule-reject-message-reason">{`: ${fieldError["reason"]}`}</Box>
            </Box>
          )}
          {this.renderScheduleOverviewStrip()}
          {selectedExam && !loadingExam && (
            <Box
              mb={2}
              p={1.5}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                background: "#fafafa",
              }}
            >
              <Typography variant="subtitle2" style={{ fontWeight: 700, marginBottom: 8 }}>
                Timetable actions
              </Typography>
              <Box
                display="flex"
                flexWrap="wrap"
                alignItems="center"
                style={{ gap: 8, marginBottom: 10 }}
              >
                {String(approvalStatus.approval_status) === "3" &&
                  isUserHasPermission("schedule_exam_approve", "create") && (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        disableElevation
                        onClick={(e) => this.ApproveExam()}
                        style={{ ...toolbarBtn, backgroundColor: "#15803d", color: "#fff" }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => this.rejectPopup()}
                        style={{ ...toolbarBtn, borderColor: "#94a3b8", color: "#475569" }}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                {selectedStandard &&
                  String(approvalStatus.approval_status) === "3" &&
                  ((is_standard_section && selectedStandard) || !is_standard_section) &&
                  isUserHasPermission("schedule_exam", "create") && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={this.CancelRequestApprove}
                      style={{ ...toolbarBtn, borderColor: "#94a3b8", color: "#475569" }}
                    >
                      Cancel request
                    </Button>
                  )}
              </Box>
            </Box>
          )}
          {((selectedStandard && standardList) ||
            ((!selectedStandard || this.state.showAllStandardsInViewPopup) &&
              standardList &&
              !Array.isArray(standardList))) &&
            !blank &&
            !loadingExam && (
            <Grid container spacing={3} alignItems="stretch">
              {selectedStandard &&
                standardList[selectedStandard]?.["section_list"].map((standard, stIndex) => {
                  const sc = this.countSubjectSlots(standard.subject_list);
                  return (
                    <Grid
                      item
                      lg={12}
                      md={12}
                      xs={12}
                      key={`sec-${selectedStandard}-${stIndex}`}
                    >
                      <Paper
                        className="schedule-add-paper"
                        elevation={0}
                        style={{
                          borderRadius: 12,
                          border: "1px solid #dbe2ea",
                          boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
                          overflow: "visible",
                          height: "100%",
                          background: "#fff",
                        }}
                      >
                        <Box
                          className="schedule-add-standard-outer-box ph-10"
                          display="flex"
                          flexWrap="wrap"
                          alignItems="flex-start"
                          justifyContent="space-between"
                          style={{
                            gap: 12,
                            padding: "12px 14px",
                            background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          <Box style={{ flex: "1 1 220px", minWidth: 0 }}>
                            <Box className="schedule-view-standard-name display-flex justify-content-space-between">
                              {standard.standard_name &&
                                !standard.section_name &&
                                standard.standard_name}
                              {standard.standard_name &&
                                standard.section_name && (
                                  <Box className="text-capitalize">
                                    {" "}
                                    {`${standard.standard_name} - ${standard.section_name}`}{" "}
                                  </Box>
                                )}
                            </Box>
                            {standard?.grade_plan_data?.grade_plan__name && (
                              <Box className="schedule-view-standard-name">
                                Subject Grade Plan -{" "}
                                {standard?.grade_plan_data?.grade_plan__name}
                              </Box>
                            )}
                            {standard?.grade_plan_data_for_total
                              ?.grade_plan_for_total__name && (
                              <Box className="schedule-view-standard-name">
                                Total Grade Plan -{" "}
                                {
                                  standard?.grade_plan_data_for_total
                                    ?.grade_plan_for_total__name
                                }
                              </Box>
                            )}
                          </Box>
                          <Box
                            display="flex"
                            flexDirection="column"
                            alignItems="flex-end"
                            style={{ gap: 6, flexShrink: 0 }}
                          >
                            <Typography variant="caption" color="textSecondary" align="right">
                              <strong>
                                {sc.complete}/{sc.total}
                              </strong>{" "}
                              slots fully set
                              {sc.partial > 0 ? ` · ${sc.partial} partial` : ""}
                              {sc.empty > 0 ? ` · ${sc.empty} not set` : ""}
                            </Typography>
                          </Box>
                        </Box>
                        <TableContainer
                          className="schedule-exam-overflow"
                          style={{
                            background: "#fff",
                            overflowX: "auto",
                            overflowY: "visible",
                            paddingBottom: 8,
                          }}
                        >
                          <Table
                            size="small"
                            aria-label="simple table"
                            className=""
                            style={{ minWidth: 860 }}
                          >
                            <TableHead style={{ background: "#f1f5f9" }}>
                              <TableRow className="">
                                <TableCell className="">Subject</TableCell>
                                <TableCell className="" align="center">
                                  Max Marks
                                </TableCell>
                                <TableCell className="" align="center">
                                  Min Marks
                                </TableCell>
                                <TableCell className="">Exam Date</TableCell>
                                <TableCell className=""> Start Time</TableCell>
                                <TableCell className=""> End Time</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {Object.keys(part_type).map((part_key) => {
                                return (
                                  part_type[part_key].list.length > 0 &&
                                  this.getSubjectFormat(
                                    standard,
                                    stIndex,
                                    part_key
                                  )
                                );
                              })}
                            </TableBody>
                            {isExpanded !== stIndex &&
                              standard.subject_list.length > 3 && (
                                <Tooltip
                                  title="Expand More"
                                  enterDelay={400}
                                  enterNextDelay={400}
                                  placement="top-start"
                                  classes={{ tooltip: "tooltip-show-data" }}
                                >
                                  <Box className="view-exam-expand-icon-box">
                                    <ExpandMoreOutlinedIcon
                                      className="view-exam-expand-icon"
                                      onClick={() =>
                                        this.handleClickMore(stIndex)
                                      }
                                    />
                                  </Box>
                                </Tooltip>
                              )}
                            {isExpanded === stIndex &&
                              standard.subject_list.length > 3 && (
                                <Tooltip
                                  title="Expand Less"
                                  enterDelay={400}
                                  enterNextDelay={400}
                                  placement="top-start"
                                  classes={{ tooltip: "tooltip-show-data" }}
                                >
                                  <Box className="view-exam-expand-icon-box">
                                    <ExpandLessOutlinedIcon
                                      className="view-exam-expand-icon"
                                      onClick={() => this.handleClickLess()}
                                    />
                                  </Box>
                                </Tooltip>
                              )}
                          </Table>
                        </TableContainer>
                      </Paper>
                    </Grid>
                  );
                })}

              {!selectedStandard &&
                this.state.showAllStandardsInViewPopup &&
                Object.keys(standardList).flatMap((stdKey) => {
                  const secList = standardList[stdKey]?.section_list || [];
                  return secList.map((standard, stIndex) => {
                    const sc = this.countSubjectSlots(standard.subject_list);
                    return (
                      <Grid item lg={12} md={12} xs={12} key={`sec-all-${stdKey}-${stIndex}`}>
                        <Paper
                          className="schedule-add-paper"
                          elevation={0}
                          style={{
                            borderRadius: 12,
                            border: "1px solid #dbe2ea",
                            boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
                            overflow: "visible",
                            height: "100%",
                            background: "#fff",
                          }}
                        >
                          <Box
                            className="schedule-add-standard-outer-box ph-10"
                            display="flex"
                            flexWrap="wrap"
                            alignItems="flex-start"
                            justifyContent="space-between"
                            style={{
                              gap: 12,
                              padding: "12px 14px",
                              background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            <Box style={{ flex: "1 1 220px", minWidth: 0 }}>
                              <Box className="schedule-view-standard-name display-flex justify-content-space-between">
                                {standard.standard_name &&
                                  !standard.section_name &&
                                  standard.standard_name}
                                {standard.standard_name && standard.section_name && (
                                  <Box className="text-capitalize">
                                    {" "}
                                    {`${standard.standard_name} - ${standard.section_name}`}{" "}
                                  </Box>
                                )}
                              </Box>
                              {standard?.grade_plan_data?.grade_plan__name && (
                                <Box className="schedule-view-standard-name">
                                  Subject Grade Plan -{" "}
                                  {standard?.grade_plan_data?.grade_plan__name}
                                </Box>
                              )}
                              {standard?.grade_plan_data_for_total
                                ?.grade_plan_for_total__name && (
                                <Box className="schedule-view-standard-name">
                                  Total Grade Plan -{" "}
                                  {
                                    standard?.grade_plan_data_for_total
                                      ?.grade_plan_for_total__name
                                  }
                                </Box>
                              )}
                            </Box>
                            <Box
                              display="flex"
                              flexDirection="column"
                              alignItems="flex-end"
                              style={{ gap: 6, flexShrink: 0 }}
                            >
                              <Typography variant="caption" color="textSecondary" align="right">
                                <strong>
                                  {sc.complete}/{sc.total}
                                </strong>{" "}
                                slots fully set
                                {sc.partial > 0 ? ` · ${sc.partial} partial` : ""}
                                {sc.empty > 0 ? ` · ${sc.empty} not set` : ""}
                              </Typography>
                            </Box>
                          </Box>
                          <TableContainer
                            className="schedule-exam-overflow"
                            style={{
                              background: "#fff",
                              overflowX: "auto",
                              overflowY: "visible",
                              paddingBottom: 8,
                            }}
                          >
                            <Table
                              size="small"
                              aria-label="simple table"
                              className=""
                              style={{ minWidth: 860 }}
                            >
                              <TableHead style={{ background: "#f1f5f9" }}>
                                <TableRow className="">
                                  <TableCell className="">Subject</TableCell>
                                  <TableCell className="" align="center">
                                    Max Marks
                                  </TableCell>
                                  <TableCell className="" align="center">
                                    Min Marks
                                  </TableCell>
                                  <TableCell className="">Exam Date</TableCell>
                                  <TableCell className=""> Start Time</TableCell>
                                  <TableCell className=""> End Time</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {Object.keys(part_type).map((part_key) => {
                                  return (
                                    part_type[part_key].list.length > 0 &&
                                    this.getSubjectFormat(standard, stIndex, part_key)
                                  );
                                })}
                              </TableBody>
                              {isExpanded !== stIndex &&
                                standard.subject_list.length > 3 && (
                                  <Tooltip
                                    title="Expand More"
                                    enterDelay={400}
                                    enterNextDelay={400}
                                    placement="top-start"
                                    classes={{ tooltip: "tooltip-show-data" }}
                                  >
                                    <Box className="view-exam-expand-icon-box">
                                      <ExpandMoreOutlinedIcon
                                        className="view-exam-expand-icon"
                                        onClick={() => this.handleClickMore(stIndex)}
                                      />
                                    </Box>
                                  </Tooltip>
                                )}
                            </Table>
                          </TableContainer>
                        </Paper>
                      </Grid>
                    );
                  });
                })}
            </Grid>
          )}
          {!is_standard_section && !blank && !loadingExam && (
            <Grid container spacing={3} alignItems="stretch">
              {standardList_standard_wise.map((standard, stIndex) => {
                const sc = this.countSubjectSlots(standard.subject_list);
                return (
                  <Grid
                    item
                    lg={12}
                    md={12}
                    xs={12}
                    key={this.flatScheduleExpandKey(stIndex)}
                  >
                    <Paper
                      className="schedule-add-paper"
                      elevation={0}
                      style={{
                        borderRadius: 12,
                        border: "1px solid #dbe2ea",
                        boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
                        overflow: "visible",
                        height: "100%",
                        background: "#fff",
                      }}
                    >
                      <Box
                        className="schedule-add-standard-outer-box"
                        display="flex"
                        flexWrap="wrap"
                        alignItems="center"
                        justifyContent="space-between"
                        style={{
                          gap: 10,
                          padding: "12px 14px",
                          background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        <Box className="schedule-add-standard-name" style={{ flex: "1 1 200px" }}>
                          {standard.standard_name && standard.standard_name}
                          {standard.section_name && standard.section_name}
                        </Box>
                        <Box
                          display="flex"
                          flexDirection="column"
                          alignItems="flex-end"
                          style={{ gap: 6 }}
                        >
                          <Typography variant="caption" color="textSecondary" align="right">
                            <strong>
                              {sc.complete}/{sc.total}
                            </strong>{" "}
                            subjects fully scheduled
                            {sc.partial > 0 ? ` · ${sc.partial} partial` : ""}
                            {sc.empty > 0 ? ` · ${sc.empty} not set` : ""}
                          </Typography>
                        </Box>
                      </Box>
                      <TableContainer
                        className="schedule-exam-overflow"
                        style={{
                          background: "#fff",
                          overflowX: "auto",
                          overflowY: "visible",
                          paddingBottom: 8,
                        }}
                      >
                        <Table
                          size="small"
                          aria-label="simple table"
                          className=""
                          style={{ minWidth: 860 }}
                        >
                          <TableHead style={{ background: "#f1f5f9" }}>
                            <TableRow className="">
                              <TableCell className="">Subject</TableCell>
                              <TableCell className="">Exam Date</TableCell>
                              <TableCell className=""> Start Time</TableCell>
                              <TableCell className=""> End Time</TableCell>
                              <TableCell className="" align="center">
                                {" "}
                                Max Marks
                              </TableCell>
                              <TableCell className="" align="center">
                                {" "}
                                Min Marks
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {standard.subject_list.map((subject, subIndex) => {
                              return (
                                <TableRow
                                  key={subIndex}
                                  className={
                                    isExpanded !== stIndex && subIndex > 2
                                      ? "display-none"
                                      : "schedule-exam-subject-name-box height-49px"
                                  }
                                >
                                  <TableCell
                                    className=""
                                    component="th"
                                    scope="row"
                                  >
                                    {subject.is_language && number_of_language
                                      ? `${
                                          subject.subject_name
                                        } ${this.getAliasLanguage(
                                          subject.sequence
                                        )}`
                                      : subject.subject_name}
                                  </TableCell>
                                  <TableCell
                                    className=""
                                    component="th"
                                    scope="row"
                                  >
                                    {dateFormat(subject.fordate, "DD-MM-YYYY")}
                                  </TableCell>
                                  <TableCell
                                    className=""
                                    component="th"
                                    scope="row"
                                  >
                                    {timeFormat(subject.start_time)}
                                  </TableCell>
                                  <TableCell
                                    className=""
                                    component="th"
                                    scope="row"
                                  >
                                    {timeFormat(subject.end_time)}
                                  </TableCell>
                                  <TableCell
                                    className=""
                                    component="th"
                                    scope="row"
                                    align="center"
                                  >
                                    {subject.max_marks}
                                  </TableCell>
                                  <TableCell
                                    className=""
                                    component="th"
                                    scope="row"
                                    align="center"
                                  >
                                    {subject.min_marks}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                          {isExpanded !== stIndex &&
                            standard.subject_list.length > 3 && (
                              <Tooltip
                                title="Expand More"
                                enterDelay={400}
                                enterNextDelay={400}
                                placement="top-start"
                                classes={{ tooltip: "tooltip-show-data" }}
                              >
                                <Box className="view-exam-expand-icon-box">
                                  <ExpandMoreOutlinedIcon
                                    className="view-exam-expand-icon"
                                    onClick={() =>
                                      this.handleClickMore(stIndex)
                                    }
                                  />
                                </Box>
                              </Tooltip>
                            )}
                          {isExpanded === stIndex &&
                            standard.subject_list.length > 3 && (
                              <Tooltip
                                title="Expand Less"
                                enterDelay={400}
                                enterNextDelay={400}
                                placement="top-start"
                                classes={{ tooltip: "tooltip-show-data" }}
                              >
                                <Box className="view-exam-expand-icon-box">
                                  <ExpandLessOutlinedIcon
                                    className="view-exam-expand-icon"
                                    onClick={() => this.handleClickLess()}
                                  />
                                </Box>
                              </Tooltip>
                            )}
                        </Table>
                      </TableContainer>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
            </DialogContent>
          </Dialog>
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={open}
            autoHideDuration={2000}
            onClose={this.handleClose}
          >
            <Alert onClose={this.handleClose} severity="error">
              {alertData}
            </Alert>
          </Snackbar>
          <Dialog
            className="schedule-reject-popup"
            open={reasonOpen}
            onClose={this.handleCloseReason}
            aria-labelledby="form-dialog-title"
          >
            <DialogTitle id="form-dialog-title"></DialogTitle>
            <DialogContent>
              <DialogContentText>Enter Reject Reason</DialogContentText>
              <FormControl
                fullWidth
                error={error.reason && (error.reason ? true : false)}
              >
                <Box className="leave-pending-staff-label">Reason</Box>
                <TextareaAutosize
                  aria-label="minimum height"
                  className="apply-leave-text-area-auto-size-reason"
                  value={reason}
                  name="reason"
                  onChange={this.onChangeReason}
                  required
                />
                {error.reason && (
                  <FormHelperText>{error.reason}</FormHelperText>
                )}
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Box className="leave-pending-approve-reject">
                <Button
                  className="apply-leave-reset-button"
                  onClick={(e) => this.rejectScheduledExam()}
                >
                  Reject
                </Button>
                <Button
                  className="apply-leave-button "
                  onClick={(e) => this.handleCloseReason()}
                >
                  Close
                </Button>
              </Box>
            </DialogActions>
          </Dialog>
          <ScheduleCopyDialog vm={this} />
          <Dialog
            open={Boolean(examReportOpen)}
            onClose={this.closeExamReportDialog}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle
              style={{
                borderBottom: "1px solid #e2e8f0",
                background: "linear-gradient(90deg, #eff6ff 0%, #f5f3ff 100%)",
              }}
            >
              {`Exam report${examReportExam?.exam_type_name ? ` - ${examReportExam.exam_type_name}` : ""}`}
            </DialogTitle>
            <DialogContent dividers style={{ background: "#f8fafc" }}>
              {examReportLoading ? (
                <Box display="flex" justifyContent="center" py={3}>
                  <CircularProgress size={28} />
                </Box>
              ) : examReportError ? (
                <Typography color="error" variant="body2">
                  {examReportError}
                </Typography>
              ) : !examReportRows.length ? (
                <Typography variant="body2" color="textSecondary">
                  No standard-wise report data found for this exam.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {examReportRows.map((r) => (
                    <Grid item xs={12} key={r.standardId || r.standardName}>
                      <Box
                        p={1.5}
                        style={{
                          border: "1px solid #dbeafe",
                          borderRadius: 12,
                          background: "#fff",
                          boxShadow: "0 2px 12px rgba(15, 23, 42, 0.06)",
                        }}
                      >
                        <Typography variant="subtitle2" style={{ fontWeight: 800, color: "#1e3a8a", marginBottom: 8 }}>
                          {r.standardName}
                        </Typography>
                        <Grid container spacing={1}>
                          <Grid item xs={12} md={4}>
                            <Typography variant="caption" style={{ fontWeight: 800, color: "#2563eb" }}>
                              Students
                            </Typography>
                            <Box display="flex" flexWrap="wrap" style={{ gap: 6, marginTop: 6 }}>
                              <Chip size="small" label={`Total ${r.totalStudents}`} style={{ background: "#eff6ff", color: "#1d4ed8", fontWeight: 700 }} />
                              <Chip size="small" label={`Passed ${r.passedStudents}`} style={{ background: "#ecfdf5", color: "#047857", fontWeight: 700 }} />
                              <Chip size="small" label={`Failed ${r.failedStudents}`} style={{ background: "#fef2f2", color: "#b91c1c", fontWeight: 700 }} />
                            </Box>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="caption" style={{ fontWeight: 800, color: "#0f766e" }}>
                              Marks entered standards ({r.marksEnteredCount})
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {r.enteredSections.length ? r.enteredSections.join(", ") : "None"}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="caption" style={{ fontWeight: 800, color: "#b45309" }}>
                              Marks not entered standards ({r.marksNotEnteredCount})
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {r.notEnteredSections.length ? r.notEnteredSections.join(", ") : "None"}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="caption" style={{ fontWeight: 800, color: "#16a34a" }}>
                              Announced ({r.announcedSections.length})
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {r.announcedSections.length ? r.announcedSections.join(", ") : "None"}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="caption" style={{ fontWeight: 800, color: "#dc2626" }}>
                              Not announced ({r.notAnnouncedSections.length})
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {r.notAnnouncedSections.length ? r.notAnnouncedSections.join(", ") : "None"}
                            </Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="caption" style={{ fontWeight: 800, color: "#4338ca" }}>
                              Top 3 rank students
                            </Typography>
                            {!r.topRanksOverall || !r.topRanksOverall.length ? (
                              <Typography variant="body2" color="textSecondary">
                                No rank data available.
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="textSecondary">
                                {r.topRanksOverall
                                  .map((x) => `#${x.rank} ${x.student} (${x.total_marks})`)
                                  .join(" | ")}
                              </Typography>
                            )}
                            <Box mt={0.75} display="flex" alignItems="center" style={{ gap: 8 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={!r.rankRowsAll || !r.rankRowsAll.length}
                                onClick={(e) =>
                                  this.openExamReportRankDialog(
                                    `${r.standardName} - full rank list`,
                                    r.rankRowsAll || [],
                                    e
                                  )
                                }
                                style={{ textTransform: "none", fontWeight: 700 }}
                              >
                                View full rank list
                              </Button>
                              {(!r.rankRowsAll || !r.rankRowsAll.length) && (
                                <Typography variant="caption" color="error">
                                  Rank data not available for this standard/sections.
                                </Typography>
                              )}
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={this.closeExamReportDialog}>Close</Button>
            </DialogActions>
          </Dialog>
          <Dialog
            open={Boolean(examReportRankOpen)}
            onClose={this.closeExamReportRankDialog}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>{examReportRankTitle || "Rank list"}</DialogTitle>
            <DialogContent dividers>
              {!examReportRankRows.length ? (
                <Typography variant="body2" color="textSecondary">
                  No rank data available.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell style={{ fontWeight: 700 }}>Rank</TableCell>
                        <TableCell style={{ fontWeight: 700 }}>Student</TableCell>
                        <TableCell style={{ fontWeight: 700 }}>Total marks</TableCell>
                        <TableCell style={{ fontWeight: 700 }}>Section</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {examReportRankRows.map((r, idx) => (
                        <TableRow key={`${r.id || r.student || "row"}-${idx}`}>
                          <TableCell>{r.rank ?? "-"}</TableCell>
                          <TableCell>{r.student || "-"}</TableCell>
                          <TableCell>{r.total_marks ?? "-"}</TableCell>
                          <TableCell>{r.class_section || r.section_name || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={this.closeExamReportRankDialog}>Close</Button>
            </DialogActions>
          </Dialog>
          <ModalOptionalSubjects
            open={openModalOptionalSubjects}
            handleClose={this.handleCloseModal}
            standardList={
              is_standard_section ? standardList : standardList_standard_wise
            }
            requestForApprove={this.requestForApproveExam}
            requestApprovalError={requestApprovalError}
            getAliasLanguage={this.getAliasLanguage}
            is_standard_section={is_standard_section}
            selectedStandard={selectedStandard}
          />
        </Paper>
      );
    }
  }
}
export default withRouter(ScheduleExamView);
