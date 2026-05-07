import React, { useEffect, useState } from "react";
import { withRouter } from "react-router-dom";
import Swal from "sweetalert2";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import classNames from "classnames";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";

import loadingBar from "images/loading.gif";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import {
  Paper,
  Box,
  Grid,
  Button,
  Tooltip,
  Table,
  TableCell,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TextField,
} from "@material-ui/core";
import { Actions } from "Constants/permissions";
import { isUserHasPermission } from "Includes/functions";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import { Dropdown } from "Components/DropDown";
import { compose } from "redux";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const naturalSort = (a, b) =>
  a.name?.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }) ?? 0;

const ManageSubjectCourseOutcomeProgramOutcomeMapping = (props) => {
  const [subjectDetails, setSubjectDetails] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [error, setError] = useState({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitDisable, setSubmitDisable] = useState(true);

  const [periodWise, setPeriodWise] = useState({
    columns: [],
    new_data: [],
    old_data: {
      course_outcomes: [],
      program_outcomes: [],
      matrixByCO: {},
      idMaps: { co: {}, po: {}, pso: {} ,peo:{}},
    },
    data: [],
  });

  const handleClose = () => setOpen(false);

  const onChangeSubject = (e) => {
    const { name, value } = e.target;
    setSelectedSubject(value);
    setError((prev) => ({ ...prev, [name]: "" }));
  };

  const cellValue = (rowIdx, colId, kind) => {
    const edited = periodWise?.data?.[rowIdx]?.values?.[`${colId}-${kind}`]?.value;
    if (typeof edited !== "undefined") return edited;

    const coId = periodWise?.new_data?.[rowIdx]?.course_outcome;
    return periodWise?.old_data?.matrixByCO?.[coId]?.[colId]?.value ?? "";
  };

  const courseContribution = () => {
  const contrib = {};
  (periodWise.columns || []).forEach((col) => {
    let max = null;
    (periodWise.new_data || []).forEach((_, r) => {
      const v = cellValue(r, col.id, col.kind);
      const n = Number(v);
      if (!Number.isNaN(n)) max = max === null ? n : Math.max(max, n);
    });
    contrib[`${col.id}-${col.kind}`] = max === null ? "" : String(max);
  });
  return contrib;
};


  const getSubjectList = async () => {
    try {
      const url = GET_URL.staffsubjectcoursedesign.api;
      const params = { is_active: 1 };
      const response = await getRequest(url, params, props);
      if (response && response.status === 200) {
        const raw = response?.data || [];
        const subjectdata = raw.map(d => ({ id: d.subject_id, name: d.subject_name }));
        setSubjectDetails(subjectdata);
      } else {
        setSubjectDetails([]);
      }
    } catch {
      setSubjectDetails([]);
    }
  };

  const getSubjectCourseOutcomeMappingList = async (subjectId) => {
    if (!subjectId) {
      setPeriodWise((prev) => ({
        ...prev,
        new_data: [],
        old_data: {
          course_outcomes: [],
          program_outcomes: [],
          matrixByCO: {},
          idMaps: { co: {}, po: {}, pso: {} ,peo:{}},
        },
        data: [],
      }));
      return;
    }

    const url = GET_URL.subjectcopopsomappingmatrix.api;
    const params = { is_active: true, subject_id: subjectId };

    try {
      const response = await getRequest(url, params, props);
      if (!(response && response.status === 200)) throw new Error("Bad response");
      const body = response.data || {};

      const coPoRows = Array.isArray(body?.co_po_mapping) ? body.co_po_mapping : [];
      const coPsoRows = Array.isArray(body?.co_pso_mapping) ? body.co_pso_mapping : [];
      const coPeoRows = Array.isArray(body?.co_peo_mapping) ? body.co_peo_mapping : [];

      const coMap = new Map();
      const matrixByCO = {};
      const idMaps = { co: {}, po: {}, pso: {} ,peo:{}};
      console.log(coPoRows,'kiran')

      coPoRows.forEach((r) => {
        const coId = r.course_outcome ?? r.co;
        const poId = r.program_outcome ?? r.po;

        if (coId != null) {
          coMap.set(coId, r.course_outcome_name || `CO${coId}`);
          if (!matrixByCO[coId]) matrixByCO[coId] = {};
          if (r.subject_course_outcome) idMaps.co[coId] = r.subject_course_outcome;
        }
        if (poId != null) {
          if (r.subject_program_outcome) idMaps.po[poId] = r.subject_program_outcome;
          if (coId != null) {
            matrixByCO[coId][`PO-${poId}`] = {
              ...r,
              kind: "PO",
              value: r.value ?? r.weight ?? r.level ?? "",
            };
          }
        }
      });
      console.log(matrixByCO,'mtrizzz')

      const psoSet = new Map();
      coPsoRows.forEach((r) => {
        const coId = r.course_outcome ?? r.co;
        const psoId = r.program_specific_outcome ?? r.pso;

        if (coId != null) {
          coMap.set(coId, r.course_outcome_name || `CO${coId}`);
          if (!matrixByCO[coId]) matrixByCO[coId] = {};
          if (r.subject_course_outcome) idMaps.co[coId] = r.subject_course_outcome;
        }
        if (psoId != null) {
          psoSet.set(psoId, r.program_specific_outcome_name || `PSO${psoId}`);
          if (r.subject_program_specific_outcome) idMaps.pso[psoId] = r.subject_program_specific_outcome;
          if (coId != null) {
            matrixByCO[coId][`PSO-${psoId}`] = {
              ...r,
              kind: "PSO",
              value: r.value ?? r.weight ?? r.level ?? "",
            };
          }
        }
      });

      const peoSet = new Map();
      coPeoRows.forEach((r) => {
        const coId = r.course_outcome ?? r.co;
        const peoId = r.program_educational_objectives ?? r.peo;

        if (coId != null) {
          coMap.set(coId, r.course_outcome_name || `CO${coId}`);
          if (!matrixByCO[coId]) matrixByCO[coId] = {};
          if (r.subject_course_outcome) idMaps.co[coId] = r.subject_course_outcome;
        }
        if (peoId != null) {
          peoSet.set(peoId, r.program_educational_objectives_name || `PEO${peoId}`);
          if (r.subject_program_educational_objectives)
            idMaps.peo[peoId] = r.subject_program_educational_objectives;
        
          if (coId != null) {
            matrixByCO[coId][`PEO-${peoId}`] = {
              ...r,
              kind: "PEO",
              value: r.value ?? r.weight ?? r.level ?? "",
            };
          }
        }
      });

      const course_outcomes = Array.from(coMap, ([id, name]) => ({ id, name }))
        .sort(naturalSort);

      const new_data = course_outcomes.map(({ id, name }) => ({
        course_outcome: id,
        course_outcome_name: name,
        subject: subjectId,
        subject_course_outcome: idMaps.co[id] || null,
      }));

      const poCols = Array.from(
        new Map(
          coPoRows.map((r) => [
            r.program_outcome ?? r.po,
            {
              id:`PO-${r.program_outcome ?? r.po}`,
              name: r.program_outcome_name || `PO${r.program_outcome}`,
              kind: "PO",
            },
          ])
        ).values()
      ).sort(naturalSort);

      const psoCols = Array.from(psoSet, ([id, name]) => ({ id:`PSO-${id}`, name, kind: "PSO" }))
        .sort(naturalSort);

      const peoCols = Array.from(peoSet, ([id, name]) => ({ id: `PEO-${id}`, name, kind: "PEO" }))
        .sort(naturalSort);
      

      const columns = [...poCols, ...psoCols, ...peoCols];

      setPeriodWise((prev) => ({
        ...prev,
        columns,
        new_data,
        old_data: {
          course_outcomes,
          program_outcomes: columns,
          matrixByCO,
          idMaps,
        },
        data: [],
      }));
    } catch {
      setPeriodWise((prev) => ({
        ...prev,
        new_data: [],
        old_data: {
          course_outcomes: [],
          program_outcomes: prev.columns,
          matrixByCO: {},
          idMaps: { co: {}, po: {}, pso: {} ,peo:{}},
        },
        data: [],
      }));
    }
  };

  const handleCellChange = (e, rowIndex, colIndex, colId, kind) => {
    const raw = e?.target?.value ?? "";
    const value = raw === "" ? "" : Number(raw);
  
    setPeriodWise(prev => {
      const idMaps = prev.old_data?.idMaps ?? { co: {}, po: {}, pso: {}, peo: {} };
  
      // deep-copy rows so we don't mutate prev
      const nextData = Array.isArray(prev.data)
        ? prev.data.map(r => ({ ...r, values: { ...(r?.values || {}) } }))
        : [];
  
      const rowBase = prev.new_data?.[rowIndex] || {};
      const colBase = prev.columns?.[colIndex] || {};
  
      // extract numeric id from colId like "PO-1", "PSO-2", "PEO-3"
      const numericId =
        colId != null
          ? parseInt(String(colId).replace(/^\D+|-|_/g, ""), 10) // strips leading non-digits and dashes/underscores
          : null;
  
      const resolvedKind =
        kind ||
        colBase.kind ||
        (/^PSO/i.test(colBase?.name)
          ? "PSO"
          : /^PEO/i.test(colBase?.name)
          ? "PEO"
          : /^PO/i.test(colBase?.name)
          ? "PO"
          : "UNKNOWN");
  
      const cellPayload = {
        value,
        kind: resolvedKind,
        subject_course_outcome:
          rowBase.subject_course_outcome || idMaps.co[rowBase.course_outcome] || null,
        // use numericId to lookup the idMaps
        subject_program_outcome:
          resolvedKind === "PO" ? idMaps.po[numericId] ?? null : undefined,
        subject_program_specific_outcome:
          resolvedKind === "PSO" ? idMaps.pso[numericId] ?? null : undefined,
        subject_program_educational_objectives:
          resolvedKind === "PEO" ? idMaps.peo[numericId] ?? null : undefined,
      };
  
      if (!nextData[rowIndex]) nextData[rowIndex] = {};
      const rowObj = { ...(nextData[rowIndex] || {}) };
      const values = { ...(rowObj.values || {}) };
      const cellKey = `${colId}-${resolvedKind}`;
      values[cellKey] = cellPayload;
      nextData[rowIndex] = { ...rowObj, values };
  
      return { ...prev, data: nextData };
    });
  
    setSubmitDisable(false);
  };

  const buildPayload = () => {
    const rows = Array.isArray(periodWise.data) ? periodWise.data : [];
    const result = { co_po_mapping: [], co_pso_mapping: [], co_peo_mapping: [] };
  
    rows.forEach((rowObj) => {
      if (!rowObj?.values) return;
      Object.values(rowObj.values).forEach((cell) => {
        if (!cell) return;
  
        // skip empty values (explicit) and non-numeric values
        if (cell.value === "" || cell.value === null || typeof cell.value === "undefined") return;
        const value = Number(cell.value);
        if (Number.isNaN(value)) return;
        if (!cell.subject_course_outcome) return;
  
        if (cell.kind === "PO") {
          if (!cell.subject_program_outcome) return;
          result.co_po_mapping.push({
            subject_course_outcome: cell.subject_course_outcome,
            subject_program_outcome: cell.subject_program_outcome,
            value: value,
          });
        } else if (cell.kind === "PSO") {
          if (!cell.subject_program_specific_outcome) return;
          result.co_pso_mapping.push({
            subject_course_outcome: cell.subject_course_outcome,
            subject_program_specific_outcome: cell.subject_program_specific_outcome,
            value: value,
          });
        } else if (cell.kind === "PEO") {
          if (!cell.subject_program_educational_objectives) return;
          result.co_peo_mapping.push({
            subject_course_outcome: cell.subject_course_outcome,
            subject_program_educational_objectives: cell.subject_program_educational_objectives,
            value: value,
          });
        }
      });
    });
  
    return result;
  };

  const submitCoPo = async () => {
    const payload = buildPayload();
    if ((!payload.co_po_mapping || !payload.co_po_mapping.length) &&
      (!payload.co_pso_mapping || !payload.co_pso_mapping.length) &&
      (!payload.co_peo_mapping || !payload.co_peo_mapping.length)) {
      setOpen(true);
      return;
    }

    setSubmitDisable(true);
    try {
      const url = POST_URL.subjectcopopsomappingmatrix.api;
      const response = await postRequest(url, payload, props);

      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: "Your data has been saved",
          showConfirmButton: false,
          timer: 1500,
        });
        this.props.history.push(Actions.subjectcourseoutcomemappingdata.view.url);
        await getSubjectCourseOutcomeMappingList(selectedSubject);
        setPeriodWise((prev) => ({ ...prev, data: [] }));
      } else {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    } finally {
      setSubmitDisable(false);
    }
  };

  const handleStateViewButton = () => {
    props.history.push(Actions.subjectcourseoutcomemappingdata.view.url);
  };

  useEffect(() => {
    (async () => {
      await getSubjectList();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      getSubjectCourseOutcomeMappingList(selectedSubject);
      setPeriodWise((prev) => ({ ...prev, data: [] }));
      setSubmitDisable(true);
    } else {
      setPeriodWise((prev) => ({
        ...prev,
        new_data: [],
        old_data: {
          course_outcomes: [],
          program_outcomes: prev.columns,
          matrixByCO: {},
          idMaps: { co: {}, po: {}, pso: {} },
        },
        data: [],
      }));
      setSubmitDisable(true);
    }
  }, [selectedSubject]);

  if (loading) {
    return (
      <Box display="flex">
        <img src={loadingBar} className="loading" alt="loading" />
      </Box>
    );
  }

  const contribution = courseContribution();

  return (
    <Box>
      <Paper className={classNames("paper-background")}>
        <Grid container>
          <Grid item md={6} xs={12} className={classNames("header-align")}>
            <Box className="heading">Subject Course Outcome Mapping</Box>
          </Grid>
          <Grid item md={6} xs={12}>
            <Box className={classNames("header-align", "end-flex-prop")}>
              {isUserHasPermission("subject_course_outcome_mapping", "view") && (
                <Button
                  variant="contained"
                  onClick={handleStateViewButton}
                  className="editbutton-view"
                >
                  <VisibilityOutlinedIcon className="visibility-icon" />
                  {Actions.subjectcourseoutcomemappingdata.view.label}
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>

        <Grid container className={classNames("header-align")}>
          <Grid item md={10} xs={12}>
            <Dropdown
              data={subjectDetails}
              name="selectedSubject"
              style="width-100"
              value={selectedSubject}
              onChange={onChangeSubject}
              label="Subject"
              error={error.selectedSubject}
              hideSelect={true}
              size="small"
            />
            <Box className="submt-button-float-bottom" mt={3}>
              <Button
                variant="contained"
                color="primary"
                className="submit"
                disabled={submitDisable}
                onClick={submitCoPo}
              >
                <FormattedMessage {...commonMessages.submit} />
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={open}
          autoHideDuration={2000}
          onClose={handleClose}
        >
          <Alert onClose={handleClose} severity="error">
            <FormattedMessage {...commonMessages.clearAllErrors} />
          </Alert>
        </Snackbar>

        <TableContainer className="header-align p-t-20px">
          <Table size="small" aria-label="co-po table" className="w-auto" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell
                  rowSpan={2}
                  style={{ fontWeight: 700, color: "#c00", minWidth: 140 }}
                >
                  CO
                </TableCell>

                {periodWise.columns.map((col) => (
                  <TableCell
                    key={`col-name-${col.id}-${col.kind}`}
                    style={{ fontWeight: 700, color: "#0a9570", textAlign: "center", minWidth: 80 }}
                  >
                    {col.name}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {periodWise.new_data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={periodWise.columns.length + 2} style={{ textAlign: "center", padding: 24 }}>
                    {selectedSubject ? "No COs/mappings yet for this subject." : "Select a subject to view mappings."}
                  </TableCell>
                </TableRow>
              ) : (
                periodWise.new_data.map((co, rowIdx) => (
                  <TableRow key={`co-row-${co.course_outcome || rowIdx}`}>
                    <TableCell style={{ color: "#c00", fontWeight: 700, minWidth: 140 }}>
                      {co.course_outcome_name}
                    </TableCell>

                    {periodWise.columns.map((col, colIdx) => {
                      const value = cellValue(rowIdx, col.id, col.kind);
                      return (
                        <Tooltip
                          key={`cell-${co.course_outcome}-${col.id}-${col.kind}`}
                          title=""
                          enterDelay={400}
                          enterNextDelay={400}
                          placement="top-start"
                        >
                          <TableCell style={{ textAlign: "center" }}>
                            <TextField
                              value={value ?? ""}
                              onChange={(e) => handleCellChange(e, rowIdx, colIdx, col.id, col.kind)}
                              variant="outlined"
                              size="small"
                              type="number"
                              inputProps={{
                                inputMode: "numeric",
                                style: { textAlign: "center", width: 64 },
                              }}
                            />
                          </TableCell>
                        </Tooltip>
                      );
                    })}
                  </TableRow>
                ))
              )}

              {periodWise.new_data.length > 0 && (
                <TableRow>
                  <TableCell style={{ color: "#c00", fontWeight: 700 }}>
                    Course<br />Contribution
                  </TableCell>
                  {periodWise.columns.map((col) => (
                    <TableCell
                      key={`cc-${col.id}-${col.kind}`}
                      style={{ fontWeight: 900, textAlign: "center" }}
                    >
                       {contribution[`${col.id}-${col.kind}`] || ""}
                    </TableCell>
                  ))}
                </TableRow>

              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box className="submt-button-float-bottom" mt={3}>
          <Button
            className={submitDisable ? "opacity-0-5 submit" : "submit"}
            variant="contained"
            style={{ float: "right" }}
            disabled={submitDisable}
            onClick={submitCoPo}
          >
            Submit
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default withRouter(ManageSubjectCourseOutcomeProgramOutcomeMapping);
