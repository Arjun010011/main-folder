// import React, { useEffect, useMemo, useState, useCallback } from "react";
// import Swal from "sweetalert2";
// import { Link, withRouter } from "react-router-dom";
// import {
//     Paper,
//     Box,
//     Grid,
//     Button,
//     TextField,
//     Snackbar,
//     Divider,
// } from "@material-ui/core";
// import classNames from "classnames";
// import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
// import { DropDownWithSearch } from "Components/DropDownWithSearch";
// import { getRequest, postRequest } from "Includes/api/apicall";
// import { GET_URL, POST_URL } from "Includes/urls";
// import { Alert, isUserHasPermission } from "Includes/functions";
// import { Actions } from "Constants/permissions";
// import { Dropdown } from 'Components/DropDown';
// import { AddCircleOutline, DeleteOutline } from "@material-ui/icons";


// const AddSubjectDetails = (props) => {
//     const [loading, setLoading] = useState(false);
//     const [submitDisable, setSubmitDisable] = useState(false);
//     const [openError, setOpenError] = useState(false);
//     const [alertData, setAlertData] = useState("");
//     const [fieldErrors, setFieldErrors] = useState({});
//     const [subjectList, setSubjectList] = useState([]);

//     const [form, setForm] = useState({
//         subject_code: "",
//         subject: "",
//         teaching_pedagogy: "",
//         credit: "",
//     });

//     useEffect(() => {
//         getSubjectList();
//     }, []);


//     const getSubjectList = async (academicYearId) => {
//         const url = GET_URL.getstaffsubject.api;
//         // const params = { academic_year: academicYearId };
//         const response = await getRequest(url, {}, props);
//         if (response && response.status === 200) {
//             const raw = response.data?.data || [];
//             const allAssigned = raw.flatMap((row) => row.assigned_subjects || []);
//             const subjectdata = allAssigned.map((data) => ({ id: data.subject_id, name: data.subject }));
//             setSubjectList(subjectdata);
//         } else {
//             setSubjectList([]);
//         }
//     };


//     const handleChange = (e) => {
//         let name = e.target.name;
//         let value = e.target.value;
//         setFieldErrors((prev) => ({ ...prev, [name]: "" }));
//         if (name === "credit") {
//             setForm((prev) => ({ ...prev, credit: value }));
//         } else {
//             setForm((prev) => ({ ...prev, [name]: value }));
//         }
//     };

//     const handleSubjectChange = (newValue) => {
//         setForm((prev) => ({ ...prev, subject: newValue }));
//         setFieldErrors((prev) => ({ ...prev, subject: "" }));
//     };

//     const handleSave = async () => {
//         const subject_id =
//             (typeof form.subject === "object" && (form.subject.id ?? form.subject.value)) ||
//             (typeof form.subject === "number" ? form.subject : undefined);

//         const payload = {
//             subject_id,
//             subject_code: form.subject_code.trim(),
//             credit: parseInt(form.credit, 10) || 0,
//             teaching_pedagogy: form.teaching_pedagogy.trim(),
//         };

//         setSubmitDisable(true);
//         const res = await postRequest(POST_URL.staffsubjectcoursedesign.api, payload, props);

//         if (res && res.status === 200) {
//             Swal.fire({
//                 position: "top-end",
//                 type: "success",
//                 title: res.data?.Reason || "Course saved",
//                 showConfirmButton: false,
//                 timer: 1500,
//             });
//             props.history.push(Actions.course_design.view.url);
//         } else {
//             setOpenError(true);
//             setAlertData("Save failed.");
//         }
//         setOpenError(true);
//         setAlertData("Failed to save. Please try again.");
//         setSubmitDisable(false);
//     };

//     const handleClose = () => setOpenError(false);

//     if (loading) {
//         return (
//             <Box display="flex" style={{ padding: 20 }}>
//                 Loading...
//             </Box>
//         );
//     }

//     return (
//         <div style={{ padding: 16, maxWidth: 1080, margin: "0 auto" }}>
//             <Paper className={classNames("paper-background")}>
//                 <Grid container alignItems="center" style={{ marginBottom: 12 }}>
//                     <Grid item xs={12} md={8}>
//                         <Box className="heading">
//                             Add Subject Details
//                         </Box>
//                     </Grid>
//                     <Grid md={4}>
// <Box className={classNames("header-align", "end-flex-prop")}>
//                             {isUserHasPermission("subejct_details", "create") && (

//                             <Button
//                                 variant="contained"
//                                 component={Link}
//                                 to={Actions.subejct_details.view.url}
//                                 className="editbutton-view"
//                             >
//                                 <VisibilityOutlinedIcon className="visibility-icon" />
//                                 {Actions.subejct_details.view.label}
//                             </Button>
//                              )}
//                         </Box>
//                     </Grid>
//                 </Grid>
//                 <Grid container spacing={3} alignItems="flex-start">
//                     <Grid item md={6} xs={12}>
//                         <DropDownWithSearch
//                             options={subjectList}
//                             label="Select Subject"
//                             name="subject"
//                             value={form.subject}
//                             onChange={(e, newValue) => handleSubjectChange(newValue)}
//                             hideClearIcon
//                             size="small"
//                             style={{ width: "100%" }}
//                         />
//                         {fieldErrors.subject_id && (
//                             <div style={{ marginTop: 6, color: "#e11d48", fontSize: 12 }}>{fieldErrors.subject_id}</div>
//                         )}
//                     </Grid>

//                     <Grid item md={6} xs={12}>
//                         <TextField
//                             id="outlined-subject-code"
//                             label="Subject Code"
//                             name="subject_code"
//                             fullWidth
//                             value={form.subject_code}
//                             onChange={handleChange}
//                             variant="outlined"
//                             autoComplete="off"
//                             helperText={fieldErrors.subject_code || ""}
//                             error={Boolean(fieldErrors.subject_code)}
//                             inputProps={{ maxLength: 50 }}
//                             size="small"
//                         />
//                     </Grid>

//                     <Grid item md={6} xs={12}>
//                         <TextField
//                             label="Teaching Pedagogy"
//                             name="teaching_pedagogy"
//                             variant="outlined"
//                             value={form.teaching_pedagogy}
//                             onChange={handleChange}
//                             error={Boolean(fieldErrors.teaching_pedagogy)}
//                             helperText={fieldErrors.teaching_pedagogy || ""}
//                             fullWidth
//                             size="small"
//                         />
//                     </Grid>

//                     <Grid item md={6} xs={12}>
//                         <TextField
//                             label="Credit"
//                             name="credit"
//                             value={form.credit}
//                             onChange={handleChange}
//                             variant="outlined"
//                             inputMode="numeric"
//                             error={Boolean(fieldErrors.credit)}
//                             helperText={fieldErrors.credit || ""}
//                             fullWidth
//                             size="small"
//                         />
//                     </Grid>
//                 </Grid>
//                 <Grid item md={12} xs={12}>
//                     <Box mt={3} mb={3}>
//                         <Divider />
//                     </Box>
//                 </Grid>

//                 <Grid item xs={12} style={{ mt: 6, display: "flex", justifyContent: "flex-end", gap: 12 }}>
//                     <Button
//                         className="submit assign-subject-button"
//                         variant="contained"
//                         onClick={() => handleSave()} >
//                         Submit
//                     </Button>
//                 </Grid>
//             </Paper>
//             <Snackbar
//                 anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
//                 open={openError}
//                 autoHideDuration={2000}
//                 onClose={handleClose}
//             >
//                 <Alert onClose={handleClose} severity="error">
//                     {alertData}
//                 </Alert>
//             </Snackbar>
//         </div>
//     );

// };

// export default withRouter(AddSubjectDetails);
import React, { useEffect, useState } from "react";
import { withRouter, Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
    Paper,
    Box,
    Grid,
    Button,
    TextField,
    Snackbar,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
} from "@material-ui/core";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import classNames from "classnames";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { Alert, isUserHasPermission } from "Includes/functions";
import { Actions } from "Constants/permissions";

const AddSubjectDetails = (props) => {
    const [loading, setLoading] = useState(false);
    const [submitDisable, setSubmitDisable] = useState(false);
    const [openError, setOpenError] = useState(false);
    const [alertData, setAlertData] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [subjectList, setSubjectList] = useState([]);

    const [form, setForm] = useState({
        subject: null,
        credit: "",
        subject_teaching_details: {
            theory_hour: "",
            tutorial_hour: "",
            practical_hour: "",
        },
        exam_marks_details: {
            exam_conduction_hour: "",
            cie_marks: "",
            see_marks: "",
            total_marks: "",
        },
        subject_type: "none",
    });

    useEffect(() => {
        getSubjectList();
    }, []);

    const getSubjectList = async () => {
        setLoading(true);
        const url = GET_URL.getstaffsubject.api;
        const res = await getRequest(url, {}, props);
        if (res && res.status === 200) {
            const raw = res.data?.data || [];
            const allAssigned = raw.flatMap((row) => row.assigned_subjects || []);
            const list = allAssigned.map((s) => ({ id: s.subject_id, name: s.subject }));
            setSubjectList(list);
        } else {
            setSubjectList([]);
        }
        setLoading(false);
    };

    const toInt = (v) => (isNaN(parseInt(v, 10)) ? 0 : parseInt(v, 10));
    const asText = (v) => (v === "" || v === null || v === undefined ? "" : String(v));

    const handleSubjectChange = (newValue) => {
        setForm((p) => ({ ...p, subject: newValue }));
        setFieldErrors((e) => ({ ...e, subject: "" }));
    };

    const handleCreditChange = (e) => {
        const { value } = e.target;
        if (value === "" .test(value)) {
            setForm((p) => ({ ...p, credit: value }));
            setFieldErrors((e) => ({ ...e, credit: "" }));
        }
    };

    const handleTeachChange = (name) => (e) => {
        const { value } = e.target;
        if (value === "" || /^[0-9]{0,3}$/.test(value)) {
            setForm((p) => ({
                ...p,
                subject_teaching_details: { ...p.subject_teaching_details, [name]: value },
            }));
            setFieldErrors((e) => ({ ...e, [`std.${name}`]: "" }));
        }
    };

    const handleExamChange = (name) => (e) => {
        const { value } = e.target;
        if (value === "" || /^[0-9]{0,3}$/.test(value)) {
            setForm((prev) => {
                const next = { ...prev.exam_marks_details, [name]: value };
                if (name === "cie_marks" || name === "see_marks") {
                    const newCie = toInt(name === "cie_marks" ? value : next.cie_marks);
                    const newSee = toInt(name === "see_marks" ? value : next.see_marks);
                    const prevSum =
                        toInt(prev.exam_marks_details.cie_marks) +
                        toInt(prev.exam_marks_details.see_marks);
                    const totalEmpty = next.total_marks === "";
                    const totalWasPrevSum = toInt(next.total_marks) === prevSum;
                    if (totalEmpty || totalWasPrevSum) next.total_marks = String(newCie + newSee);
                }

                return { ...prev, exam_marks_details: next };
            });
            setFieldErrors((e) => ({ ...e, [`exam.${name}`]: "" }));
        }
    };

    const handleTypeChange = (e) => {
        setForm((p) => ({ ...p, subject_type: e.target.value }));
        setFieldErrors((er) => ({ ...er, subject_type: "" }));
    };

    const validate = () => {
        const next = {};
        const subject_id =
            (form.subject && (form.subject.id ?? form.subject.value)) ||
            (typeof form.subject === "number" ? form.subject : undefined);

        if (!subject_id) next.subject = "Select subject";
        if (form.credit === "" || toInt(form.credit) <= 0) next.credit = "Enter credit";

        const { theory_hour, tutorial_hour, practical_hour } = form.subject_teaching_details;
        if (theory_hour === "") next["std.theory_hour"] = "Required";
        if (tutorial_hour === "") next["std.tutorial_hour"] = "Required";
        if (practical_hour === "") next["std.practical_hour"] = "Required";

        const { exam_conduction_hour, cie_marks, see_marks, total_marks } = form.exam_marks_details;
        if (exam_conduction_hour === "") next["exam.exam_conduction_hour"] = "Required";
        if (cie_marks === "") next["exam.cie_marks"] = "Required";
        if (see_marks === "") next["exam.see_marks"] = "Required";
        if (total_marks === "") next["exam.total_marks"] = "Required";
        if (
            total_marks !== "" &&
            toInt(cie_marks) + toInt(see_marks) !== toInt(total_marks)
        ) {
            next["exam.total_marks"] = "Total should equal CIE + SEE";
        }

        if (!form.subject_type) next.subject_type = "Select subject type";

        setFieldErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            setOpenError(true);
            setAlertData("Please fix the errors and try again.");
            return;
        }

        const subject_id =
            (form.subject && (form.subject.id ?? form.subject.value)) ||
            (typeof form.subject === "number" ? form.subject : undefined);

        // Map dropdown -> booleans
        let is_lab = false;
        let is_elective = false;
        if (form.subject_type === "lab") is_lab = true;
        if (form.subject_type === "elective") is_elective = true;
        if (form.subject_type === "lab_elective") {
            is_lab = true;
            is_elective = true;
        }

        const payload = {
            subject_id,
            credit: toInt(form.credit),
            subject_teaching_details: {
                theory_hour: toInt(form.subject_teaching_details.theory_hour),
                tutorial_hour: toInt(form.subject_teaching_details.tutorial_hour),
                practical_hour: toInt(form.subject_teaching_details.practical_hour),
            },
            exam_marks_details: {
                exam_conduction_hour: toInt(form.exam_marks_details.exam_conduction_hour),
                cie_marks: toInt(form.exam_marks_details.cie_marks),
                see_marks: toInt(form.exam_marks_details.see_marks),
                total_marks: toInt(form.exam_marks_details.total_marks),
            },
            subject_type_details: { is_lab, is_elective },
        };

        setSubmitDisable(true);
        const res = await postRequest(POST_URL.subject_details.api, payload, props);
        if (res && res.status === 200) {
            Swal.fire({
                position: "top-end",
                type: "success",
                title: res.data?.Reason || "Subject details saved",
                showConfirmButton: false,
                timer: 1500,
            });
            // props.history.push(Actions.subject_details.view.url);
        } else {
            setOpenError(true);
            setAlertData(res?.data?.Reason || "Failed to save.");
        }
        setSubmitDisable(false);
    };

    const handleClose = () => setOpenError(false);

    if (loading) {
        return (
            <Box display="flex" style={{ padding: 20 }}>
                Loading...
            </Box>
        );
    }

    return (
        <>
            <Paper className={classNames("paper-background")}>
                <Grid container alignItems="center" style={{ marginBottom: 12 }}>
                    <Grid item xs={12} md={8}>
                        <Box className="heading">Add Subject Details</Box>
                    </Grid>
                    <Grid item md={4}>
                        <Box className={classNames("header-align", "end-flex-prop")}>
                            {isUserHasPermission("subject_details", "view") && (
                                <Button
                                    variant="contained"
                                    component={Link}
                                    //   to={Actions.subject_details.view.url}
                                    className="editbutton-view"
                                >
                                    <VisibilityOutlinedIcon className="visibility-icon" />
                                    {/* {Actions.subject_details.view.label} */}
                                </Button>
                            )}
                        </Box>
                    </Grid>
                </Grid>

                {/* Top row — Subject & Credit (keeps your classes and spacing) */}
                <Grid container spacing={3} alignItems="flex-start">
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
                        {fieldErrors.subject && (
                            <div style={{ marginTop: 6, color: "#e11d48", fontSize: 12 }}>
                                {fieldErrors.subject}
                            </div>
                        )}
                    </Grid>

                    <Grid item md={6} xs={12}>
                        <TextField
                            label="Credit"
                            name="credit"
                            value={asText(form.credit)}
                            onChange={handleCreditChange}
                            variant="outlined"
                            inputMode="numeric"
                            error={Boolean(fieldErrors.credit)}
                            helperText={fieldErrors.credit || ""}
                            fullWidth
                            size="small"
                            inputProps={{ maxLength: 3 }}
                        />
                    </Grid>
                </Grid>

                {/* Divider (keeps same look) */}
                <Grid item md={12} xs={12}>
                    <Box mt={3} mb={3}>
                        <Divider />
                    </Box>
                </Grid>

                {/* Teaching Hours (same class-driven layout) */}
                <Grid container spacing={3} alignItems="flex-start">
                    <Grid item md={12} xs={12}>
                        <Typography variant="subtitle1" style={{ fontWeight: 700 }}>
                            Teaching Hours
                        </Typography>
                    </Grid>
                    <Grid item md={4} xs={12}>
                        <TextField
                            label="Theory Hour"
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={asText(form.subject_teaching_details.theory_hour)}
                            onChange={handleTeachChange("theory_hour")}
                            inputMode="numeric"
                            error={Boolean(fieldErrors["std.theory_hour"])}
                            helperText={fieldErrors["std.theory_hour"] || ""}
                        />
                    </Grid>
                    <Grid item md={4} xs={12}>
                        <TextField
                            label="Tutorial Hour"
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={asText(form.subject_teaching_details.tutorial_hour)}
                            onChange={handleTeachChange("tutorial_hour")}
                            inputMode="numeric"
                            error={Boolean(fieldErrors["std.tutorial_hour"])}
                            helperText={fieldErrors["std.tutorial_hour"] || ""}
                        />
                    </Grid>
                    <Grid item md={4} xs={12}>
                        <TextField
                            label="Practical Hour"
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={asText(form.subject_teaching_details.practical_hour)}
                            onChange={handleTeachChange("practical_hour")}
                            inputMode="numeric"
                            error={Boolean(fieldErrors["std.practical_hour"])}
                            helperText={fieldErrors["std.practical_hour"] || ""}
                        />
                    </Grid>
                </Grid>

                {/* Divider */}
                <Grid item md={12} xs={12}>
                    <Box mt={3} mb={3}>
                        <Divider />
                    </Box>
                </Grid>

                {/* Exam & Marks (same class-driven layout) */}
                <Grid container spacing={3} alignItems="flex-start">
                    <Grid item md={12} xs={12}>
                        <Typography variant="subtitle1" style={{ fontWeight: 700 }}>
                            Exam & Marks
                        </Typography>
                    </Grid>
                    <Grid item md={3} xs={12}>
                        <TextField
                            label="Exam Conduction Hour"
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={asText(form.exam_marks_details.exam_conduction_hour)}
                            onChange={handleExamChange("exam_conduction_hour")}
                            inputMode="numeric"
                            error={Boolean(fieldErrors["exam.exam_conduction_hour"])}
                            helperText={fieldErrors["exam.exam_conduction_hour"] || ""}
                        />
                    </Grid>
                    <Grid item md={3} xs={12}>
                        <TextField
                            label="CIE Marks"
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={asText(form.exam_marks_details.cie_marks)}
                            onChange={handleExamChange("cie_marks")}
                            inputMode="numeric"
                            error={Boolean(fieldErrors["exam.cie_marks"])}
                            helperText={fieldErrors["exam.cie_marks"] || ""}
                        />
                    </Grid>
                    <Grid item md={3} xs={12}>
                        <TextField
                            label="SEE Marks"
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={asText(form.exam_marks_details.see_marks)}
                            onChange={handleExamChange("see_marks")}
                            inputMode="numeric"
                            error={Boolean(fieldErrors["exam.see_marks"])}
                            helperText={fieldErrors["exam.see_marks"] || ""}
                        />
                    </Grid>
                    <Grid item md={3} xs={12}>
                        <TextField
                            label="Total Marks"
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={asText(form.exam_marks_details.total_marks)}
                            onChange={handleExamChange("total_marks")}
                            inputMode="numeric"
                            error={Boolean(fieldErrors["exam.total_marks"])}
                            helperText={fieldErrors["exam.total_marks"] || ""}
                        />
                    </Grid>
                </Grid>

                {/* Divider */}
                <Grid item md={12} xs={12}>
                    <Box mt={3} mb={3}>
                        <Divider />
                    </Box>
                </Grid>

                {/* Subject Type DROPDOWN (same classes look) */}
                <Grid container spacing={3} alignItems="flex-start">
                    <Grid item md={6} xs={12}>
                        <FormControl variant="outlined" fullWidth size="small">
                            <InputLabel id="subject-type-label">Subject Type</InputLabel>
                            <Select
                                labelId="subject-type-label"
                                label="Subject Type"
                                value={form.subject_type}
                                onChange={handleTypeChange}
                            >
                                <MenuItem value="none">Regular (Not Lab / Not Elective)</MenuItem>
                                <MenuItem value="lab">Lab</MenuItem>
                                <MenuItem value="elective">Elective</MenuItem>
                                <MenuItem value="lab_elective">Lab + Elective</MenuItem>
                            </Select>
                        </FormControl>
                        {fieldErrors.subject_type && (
                            <div style={{ marginTop: 6, color: "#e11d48", fontSize: 12 }}>
                                {fieldErrors.subject_type}
                            </div>
                        )}
                    </Grid>
                </Grid>

                {/* Submit row — keeps your button styling classes */}
                <Grid item xs={12} style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 12 }}>
                    <Button
                        className="submit assign-subject-button"
                        variant="contained"
                        disabled={submitDisable}
                        onClick={handleSave}
                    >
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
        </>
    );
};

export default withRouter(AddSubjectDetails);
