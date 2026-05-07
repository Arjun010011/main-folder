import React, { useEffect, useMemo, useState, useCallback } from "react";
import Swal from "sweetalert2";
import { Link, withRouter } from "react-router-dom";
import {
    Paper,
    Box,
    Grid,
    Button,
    TextField,
    Snackbar,
    Divider,
} from "@material-ui/core";
import classNames from "classnames";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { Alert, isUserHasPermission } from "Includes/functions";
import { Actions } from "Constants/permissions";
import { Dropdown } from 'Components/DropDown';
import { AddCircleOutline, DeleteOutline } from "@material-ui/icons";
import { useLocation } from "react-router-dom";

const AddCourse = (props) => {
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [submitDisable, setSubmitDisable] = useState(false);
    const [openError, setOpenError] = useState(false);
    const [alertData, setAlertData] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [subjectList, setSubjectList] = useState([]);
    const [yearList, setYearList] = useState([]);
    const [outcomesCo, setOutcomesCo] = useState([]);
    const [outcomesPo, setOutcomesPo] = useState([]);
    const [outcomesPSo, setOutcomesPSo] = useState([]);
    const [outcomesPEo, setOutcomesPEo] = useState([]);
    const [deletedCoIds, setDeletedCoIds] = useState([]);
    const [deletedPoIds, setDeletedPoIds] = useState([]);
    const [deletedPSoIds, setDeletedPSoIds] = useState([]);
    const [deletedPEoIds, setDeletedPEoIds] = useState([]);
    const [CoList, setCoList] = useState([]);
    const [PoList, setPoList] = useState([]);
    const [PSoList, setPSoList] = useState([]);
    const [PEoList, setPEoList] = useState([]);

    const [form, setForm] = useState({
        year: "",
        subject_code: "",
        subject: "",
        teaching_pedagogy: "",
        credit: "",
        num_of_co: "",
        num_of_po: "",
        num_of_pso: "",
        num_of_peo: "",
    });


    useEffect(() => {
        getCourseDetails()
        getCourseCoList(form.year);
        getCoursePoList(form.year);
        getCoursePSoList(form.year);
        getCoursePEoList(form.year);
    },[]);


    // const getSubjectList = async (academicYearId) => {
    //     const url = GET_URL.getstaffsubject.api;
    //     const params = { academic_year: academicYearId };
    //     const response = await getRequest(url, params, props);
    //     if (response && response.status === 200) {
    //         const raw = response.data?.data || [];
    //         const allAssigned = raw.flatMap((row) => row.assigned_subjects || []);
    //         const subjectdata = allAssigned.map((data) => ({ id: data.subject_id, name: data.subject }));
    //         setSubjectList(subjectdata);
    //     } else {
    //         setSubjectList([]);
    //     }
    // };

    const getCourseDetails = async () => {
        const queryParams = new URLSearchParams(location.search);
        const subjectId = queryParams.get("subject_id");
        const url = GET_URL.staffsubjectcoursedesign.api;
        const response = await getRequest(url, {'subject_id':subjectId}, props);
        if (response && response.status === 200) {
            const raw = response.data || [];
            setOutcomesCo(raw.co || []);
            setOutcomesPo(raw.po || []);
            setOutcomesPSo(raw.pso || []);
            setOutcomesPEo(raw.peo || []);
        }
    };

    const getCourseCoList = async () => {
        const url = GET_URL.courseoutcome.api;
        const response = await getRequest(url, {}, props);
        if (response && response.status === 200) {
            const raw = response.data?.data || [];
            const CourseData = raw.map((data) => ({
                id: data.id,
                name: data.name
            }));
            setCoList(CourseData)
        }
    }

    const getCoursePoList = async () => {
        const url = GET_URL.programoutcome.api;
        const response = await getRequest(url, {}, props);
        if (response && response.status === 200) {
            const raw = response.data?.data || [];
            const CourseData = raw.map((data) => ({
                id: data.id,
                name: data.name
            }));
            setPoList(CourseData)
        }
    }

     const getCoursePSoList = async () => {
        const url = GET_URL.programspecificoutcome.api;
        const response = await getRequest(url, {}, props);
        if (response && response.status === 200) {
            const raw = response.data?.data || [];
            const CourseData = raw.map((data) => ({
                id: data.id,
                name: data.name
            }));
            setPSoList(CourseData)
        }
    }

    const getCoursePEoList = async () => {
        const url = GET_URL.programeducationalobjectives.api;
        const response = await getRequest(url, {}, props);
        if (response && response.status === 200) {
            const raw = response.data?.data || [];
            const CourseData = raw.map((data) => ({
                id: data.id,
                name: data.name
            }));
            setPEoList(CourseData)
        }
    }

    const handleChange = (e) => {
        let name = e.target.name;
        let value = e.target.value;
        setFieldErrors((prev) => ({ ...prev, [name]: "" }));
        if (name === "credit") {
            setForm((prev) => ({ ...prev, credit: value }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubjectChange = (newValue) => {
        setForm((prev) => ({ ...prev, subject: newValue }));
        setFieldErrors((prev) => ({ ...prev, subject: "" }));
    };

    // const validate = useCallback(() => {
    //     const errs = {};
    //     if (!form.subject_code.trim()) errs.subject_code = "Required";
    //     if (!form.subject) errs.subject = "Please select a subject";
    //     if (!form.teaching.trim()) errs.teaching = "Required";
    //     if (form.credit === "") errs.credit = "Required";
    //     else if (!/^\d+$/.test(form.credit)) errs.credits = "Enter an integer";

    //     setFieldErrors(errs);
    //     if (Object.keys(errs).length) {
    //         setOpenError(true);
    //         setAlertData("Please fix the errors.");
    //         return false;
    //     }
    //     return true;
    // }, [form]);

    const handleAutoGenerateChangeCo = (e) => {
        const val = (e.target.value);
        setForm((data) => ({ ...data, num_of_co: val }));
        setFieldErrors((data) => ({ ...data, num_of_co: "" }));
    };

    const handleAutoGenerateCo = () => {
        const count = parseInt(form.num_of_co, 10) || 0;
        if (count <= 0) {
            // setFieldErrors((data) => ({ ...data, num_of_co: "Enter count > 0" }));
            return;
        }
        setOutcomesCo((prev) =>
            Array.from({ length: count }, (_, i) => ({
                course_outcome_id: prev[i]?.course_outcome_id,
                description: prev[i]?.description,
                target: prev[i]?.target,
                id: prev[i]?.id ?? (i + 1),
            }))
        );
        setFieldErrors((data) => ({ ...data, autogenerate: "" }));
        getCourseCoList();

    };

    const updateOutcomeFieldCo = (idx, key, e) => {
        const value = e;
        setOutcomesCo(prev =>
            prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row))
        );
    };

    const handleAutoGenerateChangePo = (e) => {
        const val = (e.target.value);
        setForm((data) => ({ ...data, num_of_po: val }));
        setFieldErrors((data) => ({ ...data, num_of_po: "" }));
    };

    const handleAutoGeneratePo = () => {
        const count = parseInt(form.num_of_po, 10) || 0;
        if (count <= 0) {
            // setFieldErrors((data) => ({ ...data, num_of_co: "Enter count > 0" }));
            return;
        }
        setOutcomesPo((prev) =>
            Array.from({ length: count }, (_, i) => ({
                program_outcome_id: prev[i]?.program_outcome_id,
                description: prev[i]?.description,
                id: prev[i]?.id ?? (i + 1),
            }))
        );
        setFieldErrors((data) => ({ ...data, autogenerate: "" }));
    };

    const updateOutcomeFieldPo = (idx, key, e) => {
        const value = e;
         setOutcomesPo(prev =>
            prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row))
        );
    };

    const handleAutoGenerateChangePSo = (e) => {
        const val = (e.target.value);
        setForm((data) => ({ ...data, num_of_pso: val }));
        setFieldErrors((data) => ({ ...data, num_of_pso: "" }));
    };

    const handleAutoGenerateChangePEo = (e) => {
        const val = (e.target.value);
        setForm((data) => ({ ...data, num_of_peo: val }));
        setFieldErrors((data) => ({ ...data, num_of_peo: "" }));
    };

    const handleAutoGeneratePSo = () => {
        const count = parseInt(form.num_of_pso, 10) || 0;
        if (count <= 0) {
            // setFieldErrors((data) => ({ ...data, num_of_pso: "Enter count > 0" }));
            return;
        }
        setOutcomesPSo((prev) =>
            Array.from({ length: count }, (_, i) => ({
                program_specific_outcome_id: prev[i]?.program_specific_outcome_id,
                description: prev[i]?.description,
                id: prev[i]?.id ?? (i + 1),
            }))
        );
        setFieldErrors((data) => ({ ...data, autogenerate: "" }));
    };

    const handleAutoGeneratePEo = () => {
        const count = parseInt(form.num_of_peo, 10) || 0;
        if (count <= 0) {
            // setFieldErrors((data) => ({ ...data, num_of_pso: "Enter count > 0" }));
            return;
        }
        setOutcomesPEo((prev) =>
            Array.from({ length: count }, (_, i) => ({
                program_educational_objectives_id: prev[i]?.program_educational_objectives_id,
                description: prev[i]?.description,
                id: prev[i]?.id ?? (i + 1),
            }))
        );
        setFieldErrors((data) => ({ ...data, autogenerate: "" }));
    };

   const updateOutcomeFieldPSo = (idx, key, e) => {
        const value = e;
         setOutcomesPSo(prev =>
            prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row))
        );
    };

    const updateOutcomeFieldPEo = (idx, key, e) => {
        const value = e;
         setOutcomesPEo(prev =>
            prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row))
        );
    };

    const handleSave = async () => {
        const queryParams = new URLSearchParams(location.search);
        const subjectId = queryParams.get("subject_id");

        const payload = {
            subject_id: subjectId,
            delete_list_co: deletedCoIds,
            delete_list_po: deletedPoIds,
            delete_list_pso: deletedPSoIds,
            delete_list_peo: deletedPEoIds,
            co: outcomesCo.map(({ course_outcome_id, description, target, co_id }) => {
              const data = {
                course_outcome_id: Number(
                  course_outcome_id?.id ?? course_outcome_id
                ),
                description: (description ?? "").trim(),
                target: Number(target) || 0,
              };
              if (co_id) data.id = Number(co_id); // ✅ include id only if present
              return data;
            }),
          };
        
          if (outcomesPo?.length) {
            payload["po"] = outcomesPo.map(({ program_outcome_id, description, po_id }) => {
              const data = {
                program_outcome_id: Number(
                  program_outcome_id?.id ?? program_outcome_id
                ),
                description: (description ?? "").trim(),
              };
              if (po_id) data.id = Number(po_id); // ✅ only if present
              return data;
            });
          }
        
          if (outcomesPSo?.length) {
            payload["pso"] = outcomesPSo.map(
              ({ program_specific_outcome_id, description, pso_id }) => {
                const data = {
                  program_specific_outcome_id: Number(
                    program_specific_outcome_id?.id ?? program_specific_outcome_id
                  ),
                  description: (description ?? "").trim(),
                };
                if (pso_id) data.id = Number(pso_id); // ✅ only if present
                return data;
              }
            );
          }

          if (outcomesPEo?.length) {
            payload["peo"] = outcomesPEo.map(
              ({ program_educational_objectives_id, description, peo_id }) => {
                const data = {
                    program_educational_objectives_id: Number(
                    program_educational_objectives_id?.id ?? program_educational_objectives_id
                  ),
                  description: (description ?? "").trim(),
                };
                if (peo_id) data.id = Number(peo_id); // ✅ only if present
                return data;
              }
            );
          }

        setSubmitDisable(true);
        const res = await postRequest(POST_URL.staffsubjectcoursedesign.api, payload, props);

        if (res && res.status === 200) {
            Swal.fire({
                position: "top-end",
                type: "success",
                title: res.data?.Reason || "Course saved",
                showConfirmButton: false,
                timer: 1500,
            });
            props.history.push(Actions.course_design.view.url);
        } else {
            setOpenError(true);
            setAlertData("Save failed.");
        }
        setOpenError(true);
        setAlertData("Failed to save. Please try again.");
        setSubmitDisable(false);
    };

    const handleClose = () => setOpenError(false);

    const handleDeleteCo = (idx) => {
        setOutcomesCo((prev) => {
            const row = prev[idx];
            const next = prev.filter((_, i) => i !== idx);
            if (row && row.id != null) {
                setDeletedCoIds((ids) => [...ids, row.id]);
            }

            return next;
        });
        setForm((f) => ({ ...f, num_of_po: Math.max((parseInt(f.num_of_po, 10) || 1) - 1, 0) }));
    };

    const handleDeletePo = (idx) => {
        setOutcomesPo((prev) => {
            const row = prev[idx];
            const next = prev.filter((_, i) => i !== idx);
            if (row && row.id != null) {
                setDeletedPoIds((ids) => [...ids, row.id]);
            }

            return next;
        });
        setForm((f) => ({ ...f, num_of_po: Math.max((parseInt(f.num_of_po, 10) || 1) - 1, 0) }));
    };

    const handleDeletePSO = (idx) => {
        setOutcomesPSo((prev) => {
            const row = prev[idx];
            const next = prev.filter((_, i) => i !== idx);
            if (row && row.id != null) {
                setDeletedPSoIds((ids) => [...ids, row.id]);
            }

            return next;
        });
        setForm((f) => ({ ...f, num_of_pso: Math.max((parseInt(f.num_of_pso, 10) || 1) - 1, 0) }));
    };

    const handleDeletePEO = (idx) => {
        setOutcomesPEo((prev) => {
            const row = prev[idx];
            const next = prev.filter((_, i) => i !== idx);
            if (row && row.id != null) {
                setDeletedPEoIds((ids) => [...ids, row.id]);
            }

            return next;
        });
        setForm((f) => ({ ...f, num_of_peo: Math.max((parseInt(f.num_of_peo, 10) || 1) - 1, 0) }));
    };

    if (loading) {
        return (
            <Box display="flex" style={{ padding: 20 }}>
                Loading...
            </Box>
        );
    }

    return (
        <div style={{ padding: 16, maxWidth: 1080, margin: "0 auto" }}>
            <Paper className={classNames("paper-background")}>
                <Grid container alignItems="center" style={{ marginBottom: 12 }}>
                    <Grid item xs={12} md={8}>
                        <Box className="heading">
                            Add Course
                        </Box>
                    </Grid>
                    <Grid md={4}>
                        <Box className={classNames("header-align", "end-flex-prop")}>
                            {/* {isUserHasPermission("course_design", "create") && ( */}

                            <Button
                                variant="contained"
                                component={Link}
                                to={Actions.course_design.view.url}
                                className="editbutton-view"
                            >
                                <VisibilityOutlinedIcon className="visibility-icon" />
                                {Actions.course_design.view.label}
                            </Button>
                            {/* )} */}
                        </Box>
                    </Grid>
                </Grid>
                <Grid container spacing={3} alignItems="flex-start">
                    {/* <Grid item md={6} xs={12}>
                        <Dropdown
                            data={yearList}
                            name="year"
                            style="width-100"
                            value={form.year}
                            onChange={handleChange}
                            label="Select Academic Year"
                        />
                        {fieldErrors.year && (
                            <div style={{ marginTop: 6, color: "#e11d48", fontSize: 12 }}>{fieldErrors.year}</div>
                        )}
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <DropDownWithSearch
                            options={subjectList}
                            label="Select Subject"
                            name="subject"
                            value={form.subject}
                            onChange={(e, newValue) => handleSubjectChange(newValue)}
                            hideClearIcon
                            size="small"
                            style={{ width: "100%" }}
                        />
                        {fieldErrors.subject_id && (
                            <div style={{ marginTop: 6, color: "#e11d48", fontSize: 12 }}>{fieldErrors.subject_id}</div>
                        )}
                    </Grid> */}

                    {/* <Grid item md={6} xs={12}>
                        <TextField
                            id="outlined-subject-code"
                            label="Subject Code"
                            name="subject_code"
                            fullWidth
                            value={form.subject_code}
                            onChange={handleChange}
                            variant="outlined"
                            autoComplete="off"
                            helperText={fieldErrors.subject_code || ""}
                            error={Boolean(fieldErrors.subject_code)}
                            inputProps={{ maxLength: 50 }}
                            size="small"
                        />
                    </Grid> */}

                    {/* <Grid item md={6} xs={12}>
                        <TextField
                            label="Teaching Pedagogy"
                            name="teaching_pedagogy"
                            variant="outlined"
                            value={form.teaching_pedagogy}
                            onChange={handleChange}
                            error={Boolean(fieldErrors.teaching_pedagogy)}
                            helperText={fieldErrors.teaching_pedagogy || ""}
                            fullWidth
                            size="small"
                        />
                    </Grid> */}

                    {/* <Grid item md={6} xs={12}>
                        <TextField
                            label="Credit"
                            name="credit"
                            value={form.credit}
                            onChange={handleChange}
                            variant="outlined"
                            inputMode="numeric"
                            error={Boolean(fieldErrors.credit)}
                            helperText={fieldErrors.credit || ""}
                            fullWidth
                            size="small"
                        />
                    </Grid> */}
                </Grid>
                <Grid item md={12} xs={12}>
                    <Box mt={3} mb={3}>
                        <Divider />
                    </Box>
                </Grid>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            autoComplete="off"
                            label="Number Of COs"
                            name="num_of_co"
                            fullWidth
                            value={form.num_of_co}
                            variant="outlined"
                            inputProps={{ maxLength: 8 }}
                            error={Boolean(fieldErrors.num_of_co)}
                            helperText={fieldErrors.num_of_co}
                            onChange={handleAutoGenerateChangeCo}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} md={8} style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Button
                            onClick={handleAutoGenerateCo}
                            variant="contained"
                            color="primary"
                            style={{ textTransform: "none" }}
                        >
                            <AddCircleOutline style={{ marginRight: 6 }} />
                            Add COs
                        </Button>
                    </Grid>
                    {fieldErrors.autogenerate && (
                        <Grid item xs={12}>
                            <div style={{ marginTop: 6, color: "#e11d48", fontSize: 12 }}>{fieldErrors.autogenerate}</div>
                        </Grid>
                    )}
                </Grid>
                <div style={{ marginTop: 16 }}>
                    <div className="sub-heading-books-copy mt-20 text-bold">{`New COs (${outcomesCo.length})`}</div>
                    {outcomesCo.map((row, idx) => (
                        <Grid
                        container
                        spacing={2}
                        key={idx}
                        >
                            {console.log(row, 'pooja')}
                            <Grid item md={3} xs={12}>
                                <DropDownWithSearch
                                    label="CO ID"
                                    value={row.course_outcome_id}
                                    options={CoList}
                                    onChange={(e, option) => updateOutcomeFieldCo(idx, "course_outcome_id", option)}
                                    variant="outlined"
                                    size="small"
                                    optionValue="name"
                                    fullWidth
                                />
                            </Grid>

                            <Grid item md={3} xs={12}>
                                <TextField
                                    label="Description"
                                    value={row.description}
                                    onChange={(e) => updateOutcomeFieldCo(idx, "description", e.target.value)}
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                />
                            </Grid>

                            <Grid item md={3} xs={12}>
                                <TextField
                                    label="Target"
                                    value={row.target}
                                    onChange={(e) => updateOutcomeFieldCo(idx, "target", e.target.value)}
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    inputMode="numeric"
                                />
                            </Grid>
                            <Grid item md={3} xs={12}>
                                <DeleteOutline
                                    onClick={() => handleDeleteCo(idx)}
                                    className="text-red pointer"
                                    style={{ marginLeft: 8 }}
                                />
                            </Grid>
                        </Grid>
                    ))}
                </div>
                <Grid item md={12} xs={12}>
                    <Box mt={3} mb={3}>
                        <Divider />
                    </Box>
                </Grid>

                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            autoComplete="off"
                            label="Number Of POs"
                            name="num_of_po"
                            fullWidth
                            value={form.num_of_po}
                            variant="outlined"
                            inputProps={{ maxLength: 8 }}
                            error={Boolean(fieldErrors.num_of_po)}
                            helperText={fieldErrors.num_of_po || ""}
                            onChange={handleAutoGenerateChangePo}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} md={8} style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Button
                            onClick={handleAutoGeneratePo}
                            variant="contained"
                            color="primary"
                            style={{ textTransform: "none" }}
                        >
                            <AddCircleOutline style={{ marginRight: 6 }} />
                            Add POs
                        </Button>
                    </Grid>
                    {fieldErrors.autogenerate && (
                        <Grid item xs={12}>
                            <div style={{ marginTop: 6, color: "#e11d48", fontSize: 12 }}>{fieldErrors.autogenerate}</div>
                        </Grid>
                    )}
                </Grid>
                <div style={{ marginTop: 16 }}>
                    <div className="sub-heading-books-copy mt-20 text-bold">{`New POs (${outcomesPo.length})`}</div>
                    {outcomesPo.map((row, idx) => (
                        <Grid
                            container
                            spacing={2}
                            key={idx}
                        >
                           <Grid item md={3} xs={12}>
                                <DropDownWithSearch
                                    label="PO ID"
                                    value={row.program_outcome_id}
                                    options={PoList}
                                    onChange={(e, option) => updateOutcomeFieldPo(idx, "program_outcome_id", option)}
                                    variant="outlined"
                                    size="small"
                                    optionValue="name"
                                    fullWidth
                                />
                            </Grid>

                            <Grid item md={3} xs={12}>
                                <TextField
                                    label="Description"
                                    value={row.description}
                                    onChange={(e) => updateOutcomeFieldPo(idx, "description", e.target.value)}
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                />
                            </Grid>

                            {/* <Grid item md={3} xs={12}>
                                <TextField
                                    label="Target"
                                    value={row.target}
                                    onChange={(e) => updateOutcomeFieldPo(idx, "target", e.target.value)}
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    inputMode="numeric"
                                />
                            </Grid> */}
                            <Grid item md={3} xs={12}>
                                <DeleteOutline
                                    onClick={() => handleDeletePo(idx)}
                                    className="text-red pointer"
                                    style={{ marginLeft: 8 }}
                                />
                            </Grid>
                        </Grid>
                    ))}
                </div>
                <Grid item md={12} xs={12}>
                    <Box mt={3} mb={3}>
                        <Divider />
                    </Box>
                </Grid>

                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            autoComplete="off"
                            label="Number Of PSo"
                            name="num_of_pso"
                            fullWidth
                            value={form.num_of_pso}
                            variant="outlined"
                            inputProps={{ maxLength: 8 }}
                            error={Boolean(fieldErrors.num_of_pso)}
                            helperText={fieldErrors.num_of_pso}
                            onChange={handleAutoGenerateChangePSo}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} md={8} style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Button
                            onClick={handleAutoGeneratePSo}
                            variant="contained"
                            color="primary"
                            style={{ textTransform: "none" }}
                        >
                            <AddCircleOutline style={{ marginRight: 6 }} />
                            Add PSo
                        </Button>
                    </Grid>
                    {fieldErrors.autogenerate && (
                        <Grid item xs={12}>
                            <div style={{ marginTop: 6, color: "#e11d48", fontSize: 12 }}>{fieldErrors.autogenerate}</div>
                        </Grid>
                    )}
                </Grid>
                <div style={{ marginTop: 16 }}>
                    <div className="sub-heading-books-copy mt-20 text-bold">{`New PSo (${outcomesPSo.length})`}</div>
                    {outcomesPSo.map((row, idx) => (
                        <Grid
                            container
                            spacing={2}
                            key={idx}
                        >
                            <Grid item md={3} xs={12}>
                                <DropDownWithSearch
                                    label="PSo ID"
                                    value={row.program_specific_outcome_id}
                                    options={PSoList}
                                    onChange={(e, option) => updateOutcomeFieldPSo(idx, "program_specific_outcome_id", option)}
                                    variant="outlined"
                                    size="small"
                                    optionValue="name"
                                    fullWidth
                                />
                            </Grid>

                            <Grid item md={3} xs={12}>
                                <TextField
                                    label="Description"
                                    value={row.description}
                                    onChange={(e) => updateOutcomeFieldPSo(idx, "description", e.target.value)}
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                />
                            </Grid>

                            {/* <Grid item md={3} xs={12}>
                                <TextField
                                    label="Target"
                                    value={row.target}
                                    onChange={(e) => updateOutcomeFieldPSo(idx, "target", e.target.value)}
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    inputMode="numeric"
                                />
                            </Grid> */}
                            <Grid item md={2} xs={12}>
                                <DeleteOutline
                                    onClick={() => handleDeletePSO(idx)}
                                    className="text-red pointer"
                                    style={{ marginLeft: 8 }}
                                />
                            </Grid>
                        </Grid>
                    ))}
                </div>
                <Grid item md={12} xs={12}>
                    <Box mt={3} mb={3}>
                        <Divider />
                    </Box>
                </Grid>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            autoComplete="off"
                            label="Number Of PEo"
                            name="num_of_peo"
                            fullWidth
                            value={form.num_of_peo}
                            variant="outlined"
                            inputProps={{ maxLength: 8 }}
                            error={Boolean(fieldErrors.num_of_peo)}
                            helperText={fieldErrors.num_of_peo}
                            onChange={handleAutoGenerateChangePEo}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} md={8} style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Button
                            onClick={handleAutoGeneratePEo}
                            variant="contained"
                            color="primary"
                            style={{ textTransform: "none" }}
                        >
                            <AddCircleOutline style={{ marginRight: 6 }} />
                            Add PEo
                        </Button>
                    </Grid>
                    {fieldErrors.autogenerate && (
                        <Grid item xs={12}>
                            <div style={{ marginTop: 6, color: "#e11d48", fontSize: 12 }}>{fieldErrors.autogenerate}</div>
                        </Grid>
                    )}
                </Grid>
                <div style={{ marginTop: 16 }}>
                    <div className="sub-heading-books-copy mt-20 text-bold">{`New PEo (${outcomesPEo.length})`}</div>
                    {outcomesPEo.map((row, idx) => (
                        <Grid
                            container
                            spacing={2}
                            key={idx}
                        >
                            <Grid item md={3} xs={12}>
                                <DropDownWithSearch
                                    label="PEo ID"
                                    value={row.program_educational_objectives_id}
                                    options={PEoList}
                                    onChange={(e, option) => updateOutcomeFieldPEo(idx, "program_educational_objectives_id", option)}
                                    variant="outlined"
                                    size="small"
                                    optionValue="name"
                                    fullWidth
                                />
                            </Grid>

                            <Grid item md={3} xs={12}>
                                <TextField
                                    label="Description"
                                    value={row.description}
                                    onChange={(e) => updateOutcomeFieldPEo(idx, "description", e.target.value)}
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                />
                            </Grid>

                            {/* <Grid item md={3} xs={12}>
                                <TextField
                                    label="Target"
                                    value={row.target}
                                    onChange={(e) => updateOutcomeFieldPSo(idx, "target", e.target.value)}
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    inputMode="numeric"
                                />
                            </Grid> */}
                            <Grid item md={2} xs={12}>
                                <DeleteOutline
                                    onClick={() => handleDeletePEO(idx)}
                                    className="text-red pointer"
                                    style={{ marginLeft: 8 }}
                                />
                            </Grid>
                        </Grid>
                    ))}
                </div>
                <Grid item md={12} xs={12}>
                    <Box mt={3} mb={3}>
                        <Divider />
                    </Box>
                </Grid>

                <Grid item xs={12} style={{ mt: 6, display: "flex", justifyContent: "flex-end", gap: 12 }}>
                    <Button
                        className="submit assign-subject-button"
                        variant="contained"
                        onClick={() => handleSave()} >
                        Submit
                    </Button>
                </Grid>
            </Paper>
            <Snackbar
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                open={openError}
                autoHideDuration={2000}
                onClose={handleClose}
            >
                <Alert onClose={handleClose} severity="error">
                    {alertData}
                </Alert>
            </Snackbar>
        </div>
    );

};

export default withRouter(AddCourse);
