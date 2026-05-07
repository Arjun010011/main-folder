import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import {
  Paper,
  Box,
  Button,
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  List,
  ListItem,
  ListItemText,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ExpansionPanel,
  ExpansionPanelSummary,
  ExpansionPanelDetails,
} from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import MuiAlert from "@material-ui/lab/Alert";
import { FormattedMessage } from "react-intl";
import PropTypes from "prop-types";
import Swal from "sweetalert2";

import { DEFAULT_PAGINATION_PROPS_ID_LIST } from "Constants";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import AllMUIDataTable from "Components/AllMUIDataTable";
import LoadingGif from "Components/LoadingGif";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import {
  SetAcademicYear,
  checkLocalAcademicYear,
  getKeyValueInArray,
  getPaginationProps,
  getFullName,
  getFormatMessage,
} from "Includes/functions";
import commonMessages from "Constants/messages";
import messages from "./messages";
import "./styles.scss";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

/** Same-year standard move audit (GET). Add to Includes/urls.js as standardchangelog when writable. */
const STANDARD_CHANGE_LOG_API = "classes/standardchangelog/";

const AFFECTED_LABELS = {
  fee_plans: "Fee plans & approvals",
  fee_collections: "Fee collections / receipts",
  exam_marks: "Exam marks (approved or pending)",
  enrollment: "Section enrollment (class roll)",
  diary: "Diary entries",
  homework: "Homework",
  transport: "Transport assignment",
  hostel: "Hostel allocation",
  library: "Library issues",
};

class BulkChangeStandard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      year: "",
      yearList: [],
      standard: "",
      section: "",
      standardList: [],
      sectionList: [],
      toStandard: "",
      standardSelected: false,
      studentDetails: { student_list: [], count: 0 },
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      tableLoading: false,
      impactOpen: false,
      validationResult: null,
      reason: "",
      selectedRowsSnapshot: [],
      validateLoading: false,
      applyLoading: false,
      feePlanRowOverrides: {},
      standardChangeHistory: [],
      standardChangeHistoryLoading: false,
      feeAdjustmentDialogOpen: false,
      paymentDetailAdjustments: {},
      /** increase_allocation (default) = fee addition adjustments; reduce_receipts = lower amount_paid */
      feeAlignStrategy: "increase_allocation",
    };
  }

  componentDidMount() {
    let pagination = { ...DEFAULT_PAGINATION_PROPS_ID_LIST };
    pagination.sortOrder.name = "name";
    pagination.sortOrder.direction = "asc";
    this.setState({ pagination }, () => this.getAcademicYear());
  }

  getAcademicYear = () => {
    getRequest(GET_URL.getacademicyear.api, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        const yearList = response.data.data;
        const year = checkLocalAcademicYear(yearList);
        if (year) {
          this.setState({ yearList, year, loading: true }, () => this.getStandard());
        } else {
          this.setState({ loading: false, yearList });
        }
      }
    });
  };

  getStandard = () => {
    const params = { academic_year: this.state.year, is_active: true };
    getRequest(GET_URL.getstandardandsection.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            standardList: response.data.data,
            standard: "",
            section: "",
            toStandard: "",
            standardSelected: false,
            studentDetails: { student_list: [], count: 0 },
            loading: false,
          },
          () => this.fetchStandardChangeHistory()
        );
      }
    });
  };

  getStandardSectionsList = () => {
    const { standard, standardList } = this.state;
    if (standard !== 0 && standard !== "") {
      const sectionList = getKeyValueInArray(standardList, "id", standard, "sections");
      this.setState({ sectionList });
    }
  };

  onChange = (e, fieldHint) => {
    const { value, name } = e.target;
    const resolvedName = fieldHint || name;
    if (resolvedName === "toStandard") {
      const v = value === 0 || value === "0" || value == null || value === "" ? "" : value;
      this.setState({ toStandard: v, validationResult: null });
      return;
    }
    if (resolvedName === "section") {
      const sectionVal = value === 0 || value === "0" || value == null || value === "" ? "" : value;
      if (!this.state.standardSelected) {
        return;
      }
      let standard_section;
      if (sectionVal !== "" && sectionVal != null) {
        for (const data of this.state.sectionList) {
          if (String(sectionVal) === String(data.id)) {
            standard_section = data.standard_section;
            break;
          }
        }
      }
      this.setState({ section: sectionVal, standard_section }, () => this.getStudentList());
      return;
    }
    if (value && resolvedName === "year") {
      this.setState({ year: value }, () => {
        SetAcademicYear(value);
        this.setState(
          {
            standard: "",
            section: "",
            sectionList: [],
            toStandard: "",
            standardSelected: false,
            studentDetails: { student_list: [], count: 0 },
          },
          () => this.getStandard()
        );
      });
      return;
    }
    if (value && resolvedName === "standard") {
      this.setState(
        {
          standard: value,
          standardSelected: true,
          section: "",
          standard_section: undefined,
          toStandard: "",
          studentDetails: { student_list: [], count: 0 },
        },
        () => {
          this.getStandardSectionsList();
          this.getStudentList();
          this.fetchStandardChangeHistory();
        }
      );
      return;
    }
  };

  fetchStandardChangeHistory = () => {
    const { year, standard } = this.state;
    if (!year) {
      this.setState({ standardChangeHistory: [], standardChangeHistoryLoading: false });
      return;
    }
    this.setState({ standardChangeHistoryLoading: true });
    const params = { academic_year: year };
    if (standard !== "" && standard != null && standard !== undefined) {
      params.from_standard = standard;
    }
    getRequest(STANDARD_CHANGE_LOG_API, params, this.props)
      .then((response) => {
        let rows = [];
        if (response && response.status === 200 && response.data != null) {
          rows = Array.isArray(response.data) ? response.data : [];
        }
        this.setState({ standardChangeHistory: rows, standardChangeHistoryLoading: false });
      })
      .catch(() => {
        this.setState({ standardChangeHistoryLoading: false });
      });
  };

  getStudentList = (paginationProps, sortData) => {
    let { pagination, year, standard, section } = this.state;
    if (!year || standard === "" || standard == null) {
      this.setState({ tableLoading: false });
      return;
    }
    this.currentPagination = { ...pagination };
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    const pagination_params = getPaginationProps(this.currentPagination);
    const params = {
      ...pagination_params,
      academic_year: year,
      standard,
      pagination: 1,
      limit: pagination_params.limit,
      pageno: pagination_params.pageno,
      include_unenrolled: 1,
    };
    if (section !== "" && section != null && section !== 0 && section !== "0") {
      params.section = section;
    }
    if (sortData) {
      if (this.prevSortManner === "asc") {
        this.prevSortManner = "desc";
        params.ordering = `-${sortData.name}`;
      } else {
        this.prevSortManner = "asc";
        params.ordering = sortData.name;
      }
    }
    this.setState({ tableLoading: true });
    getRequest(GET_URL.getenrolledstudents.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const response_data = response.data.data || {};
        const list = response_data.student_list || [];
        list.forEach((student) => {
          student.full_name = getFullName(
            student.student_first_name,
            student.student_middle_name,
            student.student_last_name
          );
        });
        this.setState({
          studentDetails: { ...response_data, student_list: list, count: response_data.count || list.length },
          tableLoading: false,
          pagination: this.currentPagination || this.state.pagination,
        });
      } else {
        this.setState({ tableLoading: false });
      }
    });
  };

  getBlankPageMessage = () => {
    const { standardSelected, year, standard } = this.state;
    if (!year) {
      return `Select academic year, then ${alias_names["standard"]} (section is optional)`;
    }
    if (!standardSelected || standard === "" || standard == null) {
      return `Select ${alias_names["standard"]} to load students (all sections by default)`;
    }
    return "";
  };

  openImpactReview = (selectedRows) => {
    const { toStandard, studentDetails, standard, year } = this.state;
    if (!toStandard) {
      Swal.fire({
        type: "warning",
        title: getFormatMessage(<FormattedMessage {...messages.changeStandardPickTarget} />),
      });
      return;
    }
    if (String(toStandard) === String(standard)) {
      Swal.fire({
        type: "warning",
        title: getFormatMessage(<FormattedMessage {...messages.changeStandardTargetMustDiffer} />),
      });
      return;
    }
    if (!selectedRows || !selectedRows.data || !selectedRows.data.length) {
      return;
    }
    const indices = selectedRows.data.map((d) => d.dataIndex);
    const list = studentDetails.student_list || [];
    const selected = indices.map((i) => list[i]).filter(Boolean);
    if (!selected.length) {
      return;
    }
    this.setState({
      impactOpen: true,
      selectedRowsSnapshot: selected,
      validationResult: null,
      feePlanRowOverrides: {},
      paymentDetailAdjustments: {},
      feeAdjustmentDialogOpen: false,
      feeAlignStrategy: "increase_allocation",
    }, () => this.runValidate(selected));
  };

  buildValidateBody = (selected) => {
    const { year, standard, toStandard, feePlanRowOverrides, paymentDetailAdjustments } = this.state;
    const student_ids = selected.map((s) => s.student);
    const body = {
      action: "validate",
      student_ids,
      from_standard_id: Number(standard),
      to_standard_id: Number(toStandard),
      academic_year_id: Number(year),
    };
    const fee_plan_row_overrides = Object.entries(feePlanRowOverrides).map(([k, new_fee_plan_id]) => {
      const sep = k.indexOf(":");
      return { row_type: k.slice(0, sep), row_id: Number(k.slice(sep + 1)), new_fee_plan_id };
    });
    if (fee_plan_row_overrides.length > 0) {
      body.fee_plan_row_overrides = fee_plan_row_overrides;
    }
    const adjList = Object.entries(paymentDetailAdjustments)
      .map(([pid, v]) => ({
        payment_detail_id: Number(pid),
        amount_paid: parseFloat(String(v).trim()),
      }))
      .filter((x) => Number.isFinite(x.amount_paid) && x.payment_detail_id);
    if (adjList.length > 0) {
      body.payment_detail_adjustments = adjList;
    }
    body.fee_align_strategy = this.state.feeAlignStrategy || "increase_allocation";
    return body;
  };

  runValidate = (selected) => {
    this.setState({ validateLoading: true });
    postRequest(
      POST_URL.bulkchangestandard.api,
      this.buildValidateBody(selected),
      this.props
    ).then((response) => {
      this.setState({ validateLoading: false });
      if (response && response.status === 200) {
        this.setState({ validationResult: response.data });
      }
    });
  };

  closeImpactDialog = () => {
    this.setState({
      impactOpen: false,
      validationResult: null,
      selectedRowsSnapshot: [],
      validateLoading: false,
      applyLoading: false,
      feePlanRowOverrides: {},
      paymentDetailAdjustments: {},
      feeAdjustmentDialogOpen: false,
      feeAlignStrategy: "increase_allocation",
    });
  };

  handleFeeAlignStrategyChange = (e) => {
    const v = e.target.value;
    this.setState({ feeAlignStrategy: v }, () => {
      const sel = this.state.selectedRowsSnapshot;
      if (this.state.validationResult && sel && sel.length) {
        this.runValidate(sel);
      }
    });
  };

  /**
   * Split each group's excess across receipt lines in proportion to (amount_paid + fine)
   * so totals move toward the payable on the new standard.
   */
  buildSuggestedPaymentAdjustments = (groups) => {
    const next = {};
    (groups || []).forEach((g) => {
      const lines = g.lines || [];
      const excess = Number(g.excess);
      if (!lines.length || !Number.isFinite(excess) || excess <= 0) {
        return;
      }
      const lineMeta = lines.map((ln) => {
        const ap = Number(ln.amount_paid) || 0;
        const fn = Number(ln.fee_fine_amount) || 0;
        return { ln, fn, lineTotal: ap + fn };
      });
      const sumTotals = lineMeta.reduce((s, x) => s + x.lineTotal, 0);
      if (sumTotals <= 0) {
        return;
      }
      lineMeta.forEach(({ ln, fn, lineTotal }) => {
        const id = String(ln.payment_detail_id);
        const share = lineTotal / sumTotals;
        const reduction = excess * share;
        let newAp = lineTotal - reduction - fn;
        if (!Number.isFinite(newAp) || newAp < fn) {
          newAp = fn;
        }
        newAp = Math.round(newAp * 100) / 100;
        next[id] = String(newAp);
      });
    });
    return next;
  };

  openFeeAdjustmentDialog = () => {
    const { validationResult } = this.state;
    const groups = (validationResult && validationResult.fee_overpayment_adjustment_groups) || [];
    const next = this.buildSuggestedPaymentAdjustments(groups);
    this.setState({ feeAdjustmentDialogOpen: true, paymentDetailAdjustments: next });
  };

  closeFeeAdjustmentDialog = () => {
    this.setState({ feeAdjustmentDialogOpen: false });
  };

  handlePaymentAdjChange = (paymentDetailId, value) => {
    const id = String(paymentDetailId);
    this.setState((prev) => ({
      paymentDetailAdjustments: {
        ...prev.paymentDetailAdjustments,
        [id]: value,
      },
    }));
  };

  recheckFromAdjustmentDialog = () => {
    const sel = this.state.selectedRowsSnapshot;
    this.setState({ feeAdjustmentDialogOpen: false }, () => this.runValidate(sel));
  };

  renderFeeAdjustmentDialog = () => {
    const { feeAdjustmentDialogOpen, validationResult, paymentDetailAdjustments, validateLoading } = this.state;
    const groups = (validationResult && validationResult.fee_overpayment_adjustment_groups) || [];

    return (
      <Dialog
        open={feeAdjustmentDialogOpen}
        onClose={this.closeFeeAdjustmentDialog}
        fullWidth
        maxWidth="md"
        ModalProps={{
          disableEnforceFocus: true,
          disableAutoFocus: true,
          style: { zIndex: 2000 },
        }}
      >
        <DialogTitle>
          <FormattedMessage {...messages.changeStandardFeeAdjustmentTitle} />
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" paragraph>
            <FormattedMessage {...messages.changeStandardFeeAdjustmentIntro} />
          </Typography>
          <Typography variant="body2" color="primary" paragraph>
            <FormattedMessage {...messages.changeStandardFeeAdjustmentSuggestedHint} />
          </Typography>
          {groups.map((g) => {
            let newGroupTotal = 0;
            let newTotalOk = true;
            (g.lines || []).forEach((ln) => {
              const pid = String(ln.payment_detail_id);
              const raw = paymentDetailAdjustments[pid];
              const ap = parseFloat(String(raw != null ? raw : "").trim());
              const fn = Number(ln.fee_fine_amount) || 0;
              if (Number.isFinite(ap)) {
                newGroupTotal += ap + fn;
              }
            });
            const payable = Number(g.payable);
            if (Number.isFinite(payable) && Number.isFinite(newGroupTotal)) {
              newTotalOk = newGroupTotal <= payable + 0.05;
            }
            return (
            <Box key={`${g.student_id}-${g.new_fee_plan_id}`} mb={3}>
              <Typography variant="subtitle2" gutterBottom>
                {`${g.student_name || g.student_id} — ${g.new_fee_plan_label || ""}`}
              </Typography>
              <Typography variant="caption" display="block" color="textSecondary" gutterBottom>
                <FormattedMessage {...messages.changeStandardFeeAdjPayable} />
                {`: ${g.payable} · `}
                <FormattedMessage {...messages.changeStandardFeeAdjCollected} />
                {`: ${g.total_collected} · `}
                <FormattedMessage {...messages.changeStandardFeeAdjExcess} />
                {`: ${g.excess}`}
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Receipt</TableCell>
                    <TableCell>Current plan</TableCell>
                    <TableCell align="right">Fine</TableCell>
                    <TableCell align="right">Current paid</TableCell>
                    <TableCell align="right">
                      <FormattedMessage {...messages.changeStandardFeeAdjAmountPaid} />
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(g.lines || []).map((ln) => {
                    const pid = String(ln.payment_detail_id);
                    return (
                    <TableRow key={pid}>
                      <TableCell>{ln.collection_receipt_num || ln.payment_detail_id}</TableCell>
                      <TableCell>{ln.old_fee_plan_label || "—"}</TableCell>
                      <TableCell align="right">{ln.fee_fine_amount != null ? ln.fee_fine_amount : "—"}</TableCell>
                      <TableCell align="right">{ln.amount_paid != null ? ln.amount_paid : "—"}</TableCell>
                      <TableCell align="right" style={{ minWidth: 140 }}>
                        <TextField
                          type="number"
                          margin="dense"
                          variant="outlined"
                          size="small"
                          value={
                            paymentDetailAdjustments[pid] != null
                              ? paymentDetailAdjustments[pid]
                              : ""
                          }
                          inputProps={{
                            min: ln.min_amount_paid != null ? ln.min_amount_paid : 0,
                            step: 0.01,
                          }}
                          onChange={(e) =>
                            this.handlePaymentAdjChange(pid, e.target.value)
                          }
                          helperText={getFormatMessage(
                            <FormattedMessage {...messages.changeStandardFeeAdjMinNote} />
                          )}
                        />
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Typography
                variant="caption"
                display="block"
                style={{ marginTop: 8 }}
                color={newTotalOk ? "textSecondary" : "error"}
              >
                <FormattedMessage {...messages.changeStandardFeeAdjNewTotal} />
                {`: ${Number.isFinite(newGroupTotal) ? newGroupTotal.toFixed(2) : "—"} / ${payable}`}
                {!newTotalOk ? " — still over payable" : ""}
              </Typography>
            </Box>
            );
          })}
        </DialogContent>
        <DialogActions>
          <Button onClick={this.closeFeeAdjustmentDialog} color="default">
            <FormattedMessage {...commonMessages.cancel} />
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={validateLoading}
            onClick={this.recheckFromAdjustmentDialog}
          >
            {validateLoading ? <CircularProgress size={22} color="inherit" /> : (
              <FormattedMessage {...messages.changeStandardFeeAdjustmentRecheck} />
            )}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  feeOverrideKey = (row) => `${row.row_type}:${row.row_id}`;

  getEffectiveFeePlanId = (row) => {
    const { feePlanRowOverrides } = this.state;
    const k = this.feeOverrideKey(row);
    if (feePlanRowOverrides[k] != null) {
      return feePlanRowOverrides[k];
    }
    if (row.default_new_fee_plan && row.default_new_fee_plan.fee_plan_id != null) {
      return row.default_new_fee_plan.fee_plan_id;
    }
    return "";
  };

  handleFeePlanOverride = (row, value) => {
    const key = this.feeOverrideKey(row);
    const defaultId =
      row.default_new_fee_plan && row.default_new_fee_plan.fee_plan_id != null
        ? row.default_new_fee_plan.fee_plan_id
        : null;
    const num =
      value === "" || value === null || value === undefined ? null : Number(value);
    this.setState((prev) => {
      const next = { ...prev.feePlanRowOverrides };
      if (num == null || (defaultId != null && num === defaultId)) {
        delete next[key];
      } else {
        next[key] = num;
      }
      return { feePlanRowOverrides: next };
    });
  };

  getFeeCandidatesForRow = (row, preview) => {
    const ftId = row.old_fee_plan && row.old_fee_plan.fee_type_id;
    if (!ftId || !preview || !preview.candidates_by_fee_type) {
      return [];
    }
    return preview.candidates_by_fee_type[String(ftId)] || [];
  };

  renderFeeTargetSelect = (row, preview) => {
    const candidates = this.getFeeCandidatesForRow(row, preview);
    const effective = this.getEffectiveFeePlanId(row);
    const defaultLabel = row.unmapped
      ? getFormatMessage(<FormattedMessage {...messages.changeStandardFeeUnmapped} />)
      : getFormatMessage(<FormattedMessage {...messages.changeStandardFeeUseDefault} />);
    const options = [
      { id: "", name: defaultLabel },
      ...candidates.map((c) => ({
        id: String(c.fee_plan_id),
        name: `${c.label}${c.rate != null ? ` — ${c.rate}` : ""}`,
      })),
    ];
    const effKey =
      effective === "" || effective === null || effective === undefined ? "" : String(effective);
    const selected = options.find((o) => String(o.id) === effKey) || null;
    return (
      <Autocomplete
        options={options}
        getOptionLabel={(o) => (o ? o.name : "")}
        value={selected}
        isOptionEqualToValue={(a, b) => a != null && b != null && String(a.id) === String(b.id)}
        onChange={(ev, newVal) => {
          this.handleFeePlanOverride(row, newVal ? newVal.id : "");
        }}
        disableClearable
        autoHighlight
        size="small"
        style={{ minWidth: 240 }}
        renderInput={(params) => (
          <TextField {...params} variant="outlined" margin="dense" size="small" fullWidth />
        )}
      />
    );
  };

  renderFeeMigrationPreview = () => {
    const { validationResult } = this.state;
    if (!validationResult || !validationResult.fee_migration_preview) {
      return null;
    }
    const preview = validationResult.fee_migration_preview;
    const { plan_pair_summary: planPairSummary, students } = preview;
    if (
      (!planPairSummary || planPairSummary.length === 0) &&
      (!students || students.length === 0)
    ) {
      return null;
    }

    return (
      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>
          <FormattedMessage {...messages.changeStandardFeeMapTitle} />
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          <FormattedMessage {...messages.changeStandardFeeMapSummary} />
        </Typography>
        {planPairSummary && planPairSummary.length > 0 && (
          <Table size="small" style={{ marginBottom: 16 }}>
            <TableHead>
              <TableRow>
                <TableCell>
                  <FormattedMessage {...messages.changeStandardFeeMapOldPlan} />
                </TableCell>
                <TableCell>
                  <FormattedMessage {...messages.changeStandardFeeMapNewPlan} />
                </TableCell>
                <TableCell>
                  <FormattedMessage {...messages.changeStandardFeeMapMatch} />
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {planPairSummary.map((pair, idx) => (
                <TableRow key={`ps-${pair.old_fee_plan && pair.old_fee_plan.fee_plan_id}-${idx}`}>
                  <TableCell>{pair.old_fee_plan ? pair.old_fee_plan.label : "—"}</TableCell>
                  <TableCell>
                    {pair.default_new_fee_plan ? pair.default_new_fee_plan.label : (
                      <Typography color="error" variant="body2">
                        <FormattedMessage {...messages.changeStandardFeeUnmapped} />
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{pair.match_reason_help || pair.match_reason || ""}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {students && students.length > 0 && (
          <>
            <Typography variant="subtitle2" gutterBottom>
              <FormattedMessage {...messages.changeStandardFeePerStudent} />
            </Typography>
            {students.map((stu) => (
              <ExpansionPanel key={stu.student_id} defaultExpanded={students.length <= 3}>
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>
                    {`${stu.student_name || stu.student_id} — `}
                    {(stu.feature_mappings && stu.feature_mappings.length) || 0} feature
                    {(stu.feature_mappings && stu.feature_mappings.length) === 1 ? "" : "s"},{" "}
                    {(stu.payment_details && stu.payment_details.length) || 0} paid line
                    {(stu.payment_details && stu.payment_details.length) === 1 ? "" : "s"}
                  </Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails style={{ display: "block", width: "100%" }}>
                  {stu.feature_mappings && stu.feature_mappings.length > 0 && (
                    <Box mb={2}>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        <FormattedMessage {...messages.changeStandardFeeFeatureRows} />
                      </Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Current plan</TableCell>
                            <TableCell>
                              <FormattedMessage {...messages.changeStandardFeeTargetSelect} />
                            </TableCell>
                            <TableCell>Match</TableCell>
                            <TableCell align="right">Feature amt</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {stu.feature_mappings.map((r) => (
                            <TableRow key={`f-${r.row_id}`}>
                              <TableCell>{r.old_fee_plan ? r.old_fee_plan.label : "—"}</TableCell>
                              <TableCell style={{ minWidth: 280 }}>
                                {this.renderFeeTargetSelect(r, preview)}
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" display="block">
                                  {r.match_reason_help || r.match_reason || ""}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">{r.feature_amount != null ? r.feature_amount : "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  )}
                  {stu.payment_details && stu.payment_details.length > 0 && (
                    <Box>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        <FormattedMessage {...messages.changeStandardFeePaymentRows} />
                      </Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Current plan</TableCell>
                            <TableCell>
                              <FormattedMessage {...messages.changeStandardFeeTargetSelect} />
                            </TableCell>
                            <TableCell>Receipt / date</TableCell>
                            <TableCell align="right">Paid</TableCell>
                            <TableCell align="right">Fine</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {stu.payment_details.map((r) => (
                            <TableRow key={`p-${r.row_id}`}>
                              <TableCell>{r.old_fee_plan ? r.old_fee_plan.label : "—"}</TableCell>
                              <TableCell style={{ minWidth: 280 }}>
                                {this.renderFeeTargetSelect(r, preview)}
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" display="block">
                                  {r.collection_receipt_num || r.line_receipt_num || "—"}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" display="block">
                                  {r.collection_transaction_date || ""}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">{r.amount_paid != null ? r.amount_paid : "—"}</TableCell>
                              <TableCell align="right">{r.fee_fine_amount != null ? r.fee_fine_amount : "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  )}
                </ExpansionPanelDetails>
              </ExpansionPanel>
            ))}
          </>
        )}
      </Box>
    );
  };

  runApply = () => {
    const { validationResult, year, standard, toStandard, reason, selectedRowsSnapshot } = this.state;
    if (!validationResult || !validationResult.can_change) {
      return;
    }
    const student_ids = selectedRowsSnapshot.map((s) => s.student);
    Swal.fire({
      title: getFormatMessage(<FormattedMessage {...messages.changeStandardConfirmTitle} />),
      text: getFormatMessage(<FormattedMessage {...messages.changeStandardConfirmText} />),
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes",
      cancelButtonText: getFormatMessage(<FormattedMessage {...commonMessages.cancel} />),
    }).then((result) => {
      if (!result.value) {
        return;
      }
      this.setState({ applyLoading: true });
      const { feePlanRowOverrides } = this.state;
      const fee_plan_row_overrides = Object.entries(feePlanRowOverrides).map(([k, new_fee_plan_id]) => {
        const sep = k.indexOf(":");
        const row_type = k.slice(0, sep);
        const row_id = Number(k.slice(sep + 1));
        return { row_type, row_id, new_fee_plan_id };
      });
      const applyBody = {
        student_ids,
        from_standard_id: Number(standard),
        to_standard_id: Number(toStandard),
        academic_year_id: Number(year),
        reason: (reason || "").trim(),
      };
      if (fee_plan_row_overrides.length > 0) {
        applyBody.fee_plan_row_overrides = fee_plan_row_overrides;
      }
      const { paymentDetailAdjustments } = this.state;
      const payment_detail_adjustments = Object.entries(paymentDetailAdjustments)
        .map(([pid, v]) => ({
          payment_detail_id: Number(pid),
          amount_paid: parseFloat(String(v).trim()),
        }))
        .filter((x) => Number.isFinite(x.amount_paid) && x.payment_detail_id);
      if (payment_detail_adjustments.length > 0) {
        applyBody.payment_detail_adjustments = payment_detail_adjustments;
      }
      applyBody.fee_align_strategy = this.state.feeAlignStrategy || "increase_allocation";
      postRequest(POST_URL.bulkchangestandard.api, applyBody, this.props).then((response) => {
        this.setState({ applyLoading: false });
        if (response && response.status === 200) {
          Swal.fire({
            type: "success",
            title: response.data.Reason || "Done",
            timer: 2000,
            showConfirmButton: false,
          });
          this.closeImpactDialog();
          this.getStudentList();
          this.fetchStandardChangeHistory();
        }
      });
    });
  };

  renderImpactDialog = () => {
    const {
      impactOpen,
      validationResult,
      validateLoading,
      applyLoading,
      reason,
      toStandard,
      standardList,
      standard,
      feeAlignStrategy,
    } = this.state;
    const toName =
      (standardList || []).find((s) => String(s.id) === String(toStandard))?.name || toStandard;
    const fromName =
      (standardList || []).find((s) => String(s.id) === String(standard))?.name || standard;

    const feeAdjGroups =
      validationResult && validationResult.fee_overpayment_adjustment_groups
        ? validationResult.fee_overpayment_adjustment_groups
        : [];

    return (
      <>
      <Dialog open={impactOpen} onClose={this.closeImpactDialog} fullWidth maxWidth="lg">
        <DialogTitle>
          <FormattedMessage {...messages.changeStandardImpactTitle} />
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            <FormattedMessage
              {...messages.changeStandardMoveSummary}
              values={{ fromName, toName }}
            />
          </Typography>
          {!validateLoading && (
            <Box mt={1} mb={2}>
              <FormControl component="fieldset">
                <FormLabel component="legend">
                  <FormattedMessage {...messages.changeStandardFeeAlignLabel} />
                </FormLabel>
                <RadioGroup
                  row
                  name="feeAlignStrategy"
                  value={feeAlignStrategy}
                  onChange={this.handleFeeAlignStrategyChange}
                >
                  <FormControlLabel
                    value="increase_allocation"
                    control={<Radio color="primary" />}
                    label={getFormatMessage(<FormattedMessage {...messages.changeStandardFeeAlignIncrease} />)}
                  />
                  <FormControlLabel
                    value="reduce_receipts"
                    control={<Radio color="primary" />}
                    label={getFormatMessage(<FormattedMessage {...messages.changeStandardFeeAlignReduce} />)}
                  />
                </RadioGroup>
              </FormControl>
            </Box>
          )}
          {validateLoading && (
            <Box display="flex" justifyContent="center" my={2}>
              <CircularProgress size={32} />
            </Box>
          )}
          {!validateLoading && validationResult && (
            <>
              {validationResult.validation_errors && validationResult.validation_errors.length > 0 && (
                <Box mt={2}>
                  <Typography color="error" variant="subtitle1" gutterBottom>
                    <FormattedMessage {...messages.changeStandardErrors} />
                  </Typography>
                  <List dense>
                    {validationResult.validation_errors.map((err, idx) => (
                      <ListItem key={idx}>
                        <ListItemText
                          primary={
                            err.student_name
                              ? `${err.student_name}: ${err.error_message}`
                              : err.error_message
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              {feeAdjGroups.length > 0 && (
                <Box mt={2}>
                  <MuiAlert severity="warning">
                    <Typography variant="body2" gutterBottom>
                      <FormattedMessage {...messages.changeStandardFeeAdjustmentIntro} />
                    </Typography>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      style={{ marginTop: 8 }}
                      onClick={this.openFeeAdjustmentDialog}
                    >
                      <FormattedMessage {...messages.changeStandardFeeAdjustmentOpen} />
                    </Button>
                  </MuiAlert>
                </Box>
              )}
              {validationResult.warnings && validationResult.warnings.length > 0 && (
                <Box mt={2}>
                  <Typography style={{ color: "#ed6c02" }} variant="subtitle1" gutterBottom>
                    <FormattedMessage {...messages.changeStandardWarnings} />
                  </Typography>
                  <List dense>
                    {validationResult.warnings.map((w, idx) => (
                      <ListItem key={idx}>
                        <ListItemText
                          primary={`${w.student_name ? `${w.student_name}: ` : ""}${w.warning_message}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              {this.renderFeeMigrationPreview()}
              <Box mt={2}>
                <Typography variant="subtitle1" gutterBottom>
                  <FormattedMessage {...messages.changeStandardAffectedAreas} />
                </Typography>
                <Box display="flex" flexWrap="wrap" style={{ gap: 8 }}>
                  {validationResult.affected_modules &&
                    Object.keys(validationResult.affected_modules)
                      .filter((k) => validationResult.affected_modules[k])
                      .map((k) => (
                        <Chip key={k} size="small" color="primary" label={AFFECTED_LABELS[k] || k} />
                      ))}
                  {validationResult.affected_modules &&
                    !Object.values(validationResult.affected_modules).some(Boolean) && (
                      <Typography variant="body2" color="textSecondary">
                        <FormattedMessage {...messages.changeStandardNoOtherImpact} />
                      </Typography>
                    )}
                </Box>
              </Box>
              <Box mt={2}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  variant="outlined"
                  label={getFormatMessage(<FormattedMessage {...messages.changeStandardReason} />)}
                  value={reason}
                  onChange={(e) => this.setState({ reason: e.target.value })}
                />
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={this.closeImpactDialog} color="default">
            <FormattedMessage {...commonMessages.cancel} />
          </Button>
          <Button
            onClick={() => this.runValidate(this.state.selectedRowsSnapshot)}
            disabled={
              validateLoading ||
              !this.state.selectedRowsSnapshot ||
              !this.state.selectedRowsSnapshot.length
            }
            color="default"
          >
            <FormattedMessage {...messages.changeStandardRecheckImpact} />
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={
              applyLoading ||
              validateLoading ||
              !validationResult ||
              !validationResult.can_change
            }
            onClick={this.runApply}
          >
            {applyLoading ? <CircularProgress size={22} color="inherit" /> : (
              <FormattedMessage {...messages.changeStandardApply} />
            )}
          </Button>
        </DialogActions>
      </Dialog>
      {this.renderFeeAdjustmentDialog()}
      </>
    );
  };

  render() {
    const {
      loading,
      year,
      yearList,
      standardList,
      standard,
      section,
      sectionList,
      toStandard,
      standardSelected,
      studentDetails,
      tableLoading,
      pagination,
      standardChangeHistory,
      standardChangeHistoryLoading,
    } = this.state;

    const blankPageMessage = this.getBlankPageMessage();
    const targetOptions = (standardList || []).filter((s) => String(s.id) !== String(standard));
    const allSectionsLabel = getFormatMessage(<FormattedMessage {...messages.changeStandardAllSections} />);
    const sectionOptions =
      standardSelected && standard !== "" && standard != null
        ? [{ id: "", name: allSectionsLabel }, ...(sectionList || [])]
        : [];
    const showStudentTable = Boolean(year && standard && standardSelected);

    const options = {
      filterType: "multiselect",
      responsive: "standard",
      filter: false,
      download: true,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [10, 25, 50, 100],
      selectableRows: "multiple",
      customToolbarSelect: (selectedRows) => (
        <ImpactToolbar openImpactReview={this.openImpactReview} selectedRows={selectedRows} />
      ),
      onDownload: (buildHead, buildBody, columns, data) => {
        const bodyColumn = columns.map((column_name) => {
          column_name.label = getFormatMessage(column_name.label);
          return column_name;
        });
        return "\uFEFF" + buildHead(bodyColumn) + buildBody(data);
      },
      downloadOptions: {
        filename: "students_change_standard.csv",
        filterOptions: { useDisplayedColumnsOnly: true, useDisplayedRowsOnly: true },
      },
    };

    const columns = [
      {
        name: "full_name",
        label: <FormattedMessage {...commonMessages.studentName} />,
        options: { filter: false, sort: false },
      },
      {
        name: "current_reg_num",
        label: <FormattedMessage {...commonMessages.regNum} />,
        options: { filter: false, sort: false },
      },
      {
        name: "section_name",
        label: <FormattedMessage {...commonMessages.section} />,
        options: { filter: false, sort: false },
      },
      {
        name: "student",
        label: "student",
        options: {
          filter: false,
          sort: false,
          display: false,
          viewColumns: false,
          download: false,
        },
      },
    ];

    if (loading) {
      return <LoadingGif />;
    }

    return (
      <Paper>
        <Box className="paper-background-modified">
          <Grid container>
            <Grid item md={12} xs={12} className="header-align">
              <Box className="heading">
                <FormattedMessage {...messages.changeStandardTitle} />
              </Box>
            </Grid>
          </Grid>
          <Box px={2} pb={2}>
            <MuiAlert severity="info" variant="outlined">
              <FormattedMessage {...messages.changeStandardInfoBanner} />
            </MuiAlert>
          </Box>
          <Grid container>
            <Box className="margin dropdownpaddingright">
              <SearchableSelect
                label={<FormattedMessage {...commonMessages.academicYear} />}
                name="year"
                value={year}
                options={yearList || []}
                onChange={(e) => this.onChange(e)}
                disableClearable
              />
            </Box>
            <Box className="margin dropdownpaddingright">
              <SearchableSelect
                label={<FormattedMessage {...commonMessages.standard} />}
                name="standard"
                value={standard}
                options={standardList || []}
                onChange={(e) => this.onChange(e, "standard")}
                disableClearable
              />
            </Box>
            <Box className="margin dropdownpaddingright">
              <SearchableSelect
                label={<FormattedMessage {...commonMessages.section} />}
                name="section"
                value={section}
                options={sectionOptions}
                onChange={(e) => this.onChange(e, "section")}
                disableClearable
                disabled={!standardSelected || !standard}
              />
            </Box>
            <Box className="margin dropdownpaddingright">
              <SearchableSelect
                label={<FormattedMessage {...messages.changeStandardTargetLabel} />}
                name="toStandard"
                value={toStandard}
                options={targetOptions}
                onChange={(e) => this.onChange(e, "toStandard")}
                disableClearable={false}
                disabled={!standard}
              />
            </Box>
          </Grid>
          <Grid container spacing={3} className=" margin-top-30">
            {showStudentTable && (
              <Grid item md={12} xs={12}>
                <Paper>
                  <AllMUIDataTable
                    data={studentDetails.student_list || []}
                    title={
                      tableLoading ? <CircularProgress className="white-text" /> : ""
                    }
                    columns={columns}
                    options={options}
                    onTableChange={this.getStudentList}
                    serverSide={true}
                    pagination={pagination}
                    count={studentDetails.count || 0}
                  />
                </Paper>
              </Grid>
            )}
            {year && (
              <Grid item md={12} xs={12}>
                <ExpansionPanel defaultExpanded={false}>
                  <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">
                      <FormattedMessage {...messages.changeStandardHistoryTitle} />
                    </Typography>
                  </ExpansionPanelSummary>
                  <ExpansionPanelDetails style={{ display: "block", width: "100%" }}>
                    <Typography variant="body2" color="textSecondary" paragraph>
                      <FormattedMessage {...messages.changeStandardHistoryHint} />
                    </Typography>
                    {standardChangeHistoryLoading ? (
                      <Box display="flex" justifyContent="center" py={2}>
                        <CircularProgress size={28} />
                      </Box>
                    ) : !standardChangeHistory || standardChangeHistory.length === 0 ? (
                      <Typography variant="body2" color="textSecondary">
                        <FormattedMessage {...messages.changeStandardHistoryEmpty} />
                      </Typography>
                    ) : (
                      <Box style={{ overflowX: "auto" }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>When</TableCell>
                              <TableCell>
                                <FormattedMessage {...commonMessages.studentName} />
                              </TableCell>
                              <TableCell>
                                <FormattedMessage {...commonMessages.regNum} />
                              </TableCell>
                              <TableCell>From</TableCell>
                              <TableCell>To</TableCell>
                              <TableCell>
                                <FormattedMessage {...messages.changeStandardReason} />
                              </TableCell>
                              <TableCell>By</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {standardChangeHistory.map((row) => (
                              <TableRow key={row.id}>
                                <TableCell>{formatStdChangeDt(row.created)}</TableCell>
                                <TableCell>{row.student_name || "—"}</TableCell>
                                <TableCell>{row.student_reg_num || "—"}</TableCell>
                                <TableCell>{row.from_standard_name || "—"}</TableCell>
                                <TableCell>{row.to_standard_name || "—"}</TableCell>
                                <TableCell>{truncateStdChangeReason(row.reason)}</TableCell>
                                <TableCell>{row.performed_by_name || "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    )}
                  </ExpansionPanelDetails>
                </ExpansionPanel>
              </Grid>
            )}
          </Grid>
          {!showStudentTable && <BlankPagewithIcon data={blankPageMessage} />}
        </Box>
        {this.renderImpactDialog()}
      </Paper>
    );
  }
}

export default withRouter(BulkChangeStandard);

function formatStdChangeDt(iso) {
  if (!iso) {
    return "—";
  }
  try {
    return new Date(iso).toLocaleString();
  } catch (e) {
    return String(iso);
  }
}

function truncateStdChangeReason(text, max) {
  const n = max == null ? 120 : max;
  if (text == null || text === "") {
    return "—";
  }
  const s = String(text).trim();
  if (s.length <= n) {
    return s;
  }
  return `${s.slice(0, n)}…`;
}

function SearchableSelect({ label, name, value, options, onChange, disabled, disableClearable }) {
  const empty =
    value === "" ||
    value === null ||
    value === undefined ||
    (name === "toStandard" && (value === 0 || value === "0"));
  const selected =
    empty || !options.length ? null : options.find((o) => String(o.id) === String(value)) || null;
  return (
    <Autocomplete
      options={options}
      getOptionLabel={(o) => (o && o.name != null ? String(o.name) : "")}
      value={selected}
      isOptionEqualToValue={(a, b) =>
        a != null && b != null && String(a.id) === String(b.id)
      }
      onChange={(event, newVal) => {
        const v = newVal == null ? "" : newVal.id;
        onChange({ target: { name, value: v } });
      }}
      disabled={disabled}
      disableClearable={disableClearable}
      autoHighlight
      selectOnFocus
      clearOnEscape
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          variant="outlined"
          margin="dense"
          InputLabelProps={{ ...params.InputLabelProps, shrink: true }}
        />
      )}
      style={{ minWidth: 220, maxWidth: 320, marginTop: 10 }}
    />
  );
}

SearchableSelect.propTypes = {
  label: PropTypes.oneOfType([PropTypes.node, PropTypes.string]).isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  options: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  disableClearable: PropTypes.bool,
};

SearchableSelect.defaultProps = {
  disabled: false,
  disableClearable: true,
};

function ImpactToolbar({ selectedRows, openImpactReview }) {
  return (
    <div className="toolbar-select">
      <Button
        variant="contained"
        color="primary"
        className="mr-20 submit"
        onClick={() => openImpactReview(selectedRows)}
      >
        <FormattedMessage {...messages.changeStandardReviewImpact} />
      </Button>
    </div>
  );
}

ImpactToolbar.propTypes = {
  selectedRows: PropTypes.object.isRequired,
  openImpactReview: PropTypes.func.isRequired,
};
