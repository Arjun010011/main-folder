// ViewCoPoMatricPage.jsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import {
  Box,
  CircularProgress,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@material-ui/core";
import { Dropdown } from "Components/DropDown";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";

const band = { background: "#d9d9d9", fontWeight: 700, textAlign: "center" };
const leftBand = { background: "#d9d9d9", fontWeight: 700, textAlign: "left" };
const head = { background: "#d9d9d9", fontWeight: 700, textAlign: "center" };
const dash = { color: "#666" };

function uniqueBy(arr, keyFn) {
  const map = new Map();
  for (const x of arr) map.set(keyFn(x), x);
  return [...map.values()];
}

function normalize(payload) {
  const coPo = payload?.co_po_mapping || [];
  const coPso = payload?.co_pso_mapping || [];

  const COs = uniqueBy([...coPo, ...coPso], r => r.course_outcome)
    .map(r => ({ id: r.course_outcome, label: r.course_outcome_name || `CO${r.course_outcome}` }))
    .sort((a, b) => a.id - b.id);

  const POs = uniqueBy(coPo, r => r.program_outcome)
    .map(r => ({ id: r.program_outcome, label: r.program_outcome_name || `PO${r.program_outcome}` }))
    .sort((a, b) => a.id - b.id);

  const PSOs = uniqueBy(coPso, r => r.program_specific_outcome)
    .map(r => ({ id: r.program_specific_outcome, label: r.program_specific_outcome_name || `PSO${r.program_specific_outcome}` }))
    .sort((a, b) => a.id - b.id);

  const lookup = new Map();
  for (const r of coPo) {
    if (!lookup.has(r.course_outcome)) lookup.set(r.course_outcome, new Map());
    lookup.get(r.course_outcome).set(`PO_${r.program_outcome}`, Number(r.value));
  }
  for (const r of coPso) {
    if (!lookup.has(r.course_outcome)) lookup.set(r.course_outcome, new Map());
    lookup.get(r.course_outcome).set(`PSO_${r.program_specific_outcome}`, Number(r.value));
  }

  return {
    subjectName: payload?.subject_name || "",
    COs, POs, PSOs, lookup,
  };
}

const ViewCoPoMatricPage = (props) => {
  const [subjectDetails, setSubjectDetails] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [matrixRaw, setMatrixRaw] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const url = GET_URL.staffsubjectcoursedesign.api;
        const params = { is_active: 1 };
        const res = await getRequest(url, params, props);
        const raw = res?.data || [];
        const subjectdata = raw.map(d => ({ id: d.subject_id, name: d.subject_name }));
        setSubjectDetails(subjectdata);
        if (subjectdata.length) setSelectedSubject(subjectdata[0].id);
      } catch {
        setSubjectDetails([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    (async () => {
      const url =
        GET_URL.subjectcopopsomappingmatrix.api;
      const res = await getRequest(url, { subject_id: selectedSubject }, props);
      setMatrixRaw(res?.data);

    })();
  }, [selectedSubject]);

  const model = useMemo(() => (matrixRaw ? normalize(matrixRaw) : null), [matrixRaw]);

  const onChangeSubject = (e) => {
    setSelectedSubject(e?.target?.value ?? e?.value ?? "");
  };

  return (
    <Box p={2}>
      <Grid container className={classNames("header-align")} spacing={2}>
        <Grid item md={10} xs={12}>
          <Dropdown
            data={subjectDetails}
            name="selectedSubject"
            style="width-100"
            value={selectedSubject}
            onChange={onChangeSubject}
            label="Subject"
            hideSelect={true}
            size="small"
          />
        </Grid>
      </Grid>

      <Box mt={2}>
        {loading ? (
          <Box display="flex" alignItems="center" justifyContent="center" minHeight={220}>
            <CircularProgress />
          </Box>
        ) : !model ? (
          <Typography color="textSecondary">No data</Typography>
        ) : (
          <Paper>
            <Box p={2} pb={0}>
              <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                {model.subjectName}
              </Typography>
            </Box>

            <TableContainer>
              <Table size="small" aria-label="CO-PO-PSO matrix">
                <TableHead>
                  <TableRow>
                    <TableCell rowSpan={2} style={leftBand}>COs</TableCell>
                    {model.POs.length > 0 && (
                      <TableCell colSpan={model.POs.length} style={band}>POs</TableCell>
                    )}
                    {model.PSOs.length > 0 && (
                      <TableCell colSpan={model.PSOs.length} style={band}>PSOs</TableCell>
                    )}
                  </TableRow>
                  <TableRow>
                    {model.POs.map(po => (
                      <TableCell key={`PO-${po.id}`} style={head}>{po.label}</TableCell>
                    ))}
                    {model.PSOs.map(pso => (
                      <TableCell key={`PSO-${pso.id}`} style={head}>{pso.label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {model.COs.map(co => {
                    const row = model.lookup.get(co.id) || new Map();
                    return (
                      <TableRow key={`CO-${co.id}`}>
                        <TableCell style={{ fontWeight: 700 }}>{co.label}</TableCell>

                        {model.POs.map(po => {
                          const v = row.get(`PO_${po.id}`);
                          return (
                            <TableCell key={`cell-${co.id}-PO-${po.id}`} align="center">
                              {Number.isFinite(v) ? v : <span style={dash}>-</span>}
                            </TableCell>
                          );
                        })}

                        {model.PSOs.map(pso => {
                          const v = row.get(`PSO_${pso.id}`);
                          return (
                            <TableCell key={`cell-${co.id}-PSO-${pso.id}`} align="center">
                              {Number.isFinite(v) ? v : <span style={dash}>-</span>}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default ViewCoPoMatricPage;
