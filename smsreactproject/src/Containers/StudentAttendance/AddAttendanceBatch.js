import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import Swal from "sweetalert2";
import {
  SetAcademicYear,
  checkLocalAcademicYear,
  getKeyValueInArray,
} from "Includes/functions";
import loadingBar from "images/loading.gif";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import { Dropdown } from "Components/DropDown";
import InfoIcon from "@material-ui/icons/Info";
import { IconButton } from "@material-ui/core";
import InfoDrawer from "Components/Drawer/InfoDrawer";
import TablePagination from "@material-ui/core/TablePagination";
import { useLocation } from "react-router-dom";
import { withRouter } from "react-router-dom";

const AddAttendanceBatch = (props) => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const id = queryParams.get("id");
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    academicYear: null,
    sections: [],
    subjects: [],
    students: [],
  });

  const [academicYears, setAcademicYears] = useState([]);
  const [yearName, setYearName] = useState("");
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [batchType, setBatchType] = useState("standard_section");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalStudents, setTotalStudents] = useState(0);
  const [searchSelected, setSearchSelected] = useState("");
  const [searchAvailable, setSearchAvailable] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]); // full student objects
  const [removedStudents, setRemovedStudents] = useState([]);
  const [isEdit, setIsEdit] = useState(false);
  const [batchId, setBatchId] = useState(null)
  const [lockedSections, setLockedSections] = useState([]); //lock on edit
  const [lockedSubjects, setLockedSubjects] = useState([]);

  // Step 1: Fetch academic years
  const getAcademicYear = () => {
    getRequest(GET_URL.getacademicyear.api).then((response) => {
      if (response && response.status === 200) {
        const yearList = response.data.data;
        const selectedYear = checkLocalAcademicYear(yearList);
        const name = getKeyValueInArray(yearList, "id", selectedYear, "name");

        setAcademicYears(yearList);
        setFormData((prev) => ({ ...prev, academicYear: selectedYear }));
        setYearName(name);

        if (selectedYear) {
          getSections(selectedYear);
        }
      } else {
        setLoading(false);
      }
    });
  };

  // Step 2: Fetch sections
  const getSections = (academicYear) => {
    const params = { academic_year: academicYear, is_active: true };
    getRequest(GET_URL.getstandardandsection.api, params).then((response) => {
      if (response && response.status === 200) {
        const data = response.data.data;
        let secList = [];

        data.forEach((std) => {
          std.sections.forEach((sec) => {
            secList.push({
              id: sec.standard_section,
              name: `${std.name} - ${sec.name}`,
            });
          });
        });

        setSections(secList);
      }
      setLoading(false);
    });
  };

  // Step 3: Fetch subjects for selected sections
  const getSubjects = (academicYear, sectionIds) => {
    if (!sectionIds || sectionIds.length === 0) {
      setSubjects([]);
      return;
    }
    const params = {
      academic_year: academicYear,
      standard_section: sectionIds.join(","),
    };

    getRequest(GET_URL.getAssignSubject.api, params).then((response) => {
      if (response && response.status === 200) {
        const assigned = response.data.data.assigned || [];
    
        // flatten all assigned_subjects across sections
        const subjectList = assigned.flatMap((sec) =>
          sec.assigned_subjects.map((subj) => ({
            id: subj.id,                 // mapping id (805, 806…)
            subjectId: subj.subject_id,  // actual subject id (49, 41…)
            name: subj.subject_name,
          }))
        );
    
        setSubjects(subjectList);
      }
    });
    
  };

  const getStudents = (
    academicYear,
    sectionIds,
    subjectIds,
    batchType,
    page = 0,
    limit = 10,
    search = ""
  ) => {
    if (batchType === "standard_section") {
      if (!sectionIds?.length) {
        setStudents([]);
        return;
      }

      const params = {
        academic_year: academicYear,
        standard_section: sectionIds.join(","),
        pageno: page + 1, // backend usually expects 1-based page
        limit: limit,
        search: search,
      };

      getRequest(GET_URL.student.api, params).then((response) => {
        if (response && response.status === 200) {
          setStudents(response.data.data.student_list);
          // if backend sends total count, save it
          if (response.data.data.count) {
            setTotalStudents(response.data.data.count);
          }
        }
      });
    } else {
      if (!sectionIds?.length || !subjectIds?.length) {
        setStudents([]);
        return;
      }

      const params = {
        academic_year: academicYear,
        standard_section: sectionIds.join(","),
        subject_ids: subjectIds.join(","),
        page: page + 1,
        limit: limit,
        search: search,
      };

      getRequest(GET_URL.student.api, params).then((response) => {
        if (response && response.status === 200) {
          setStudents(response.data.data.student_list);
          // if backend sends total count, save it
          if (response.data.data.count) {
            setTotalStudents(response.data.data.count);
          }
        }
      });
    }
  };

  const getBatchDetails = (batchId) => {
    getRequest(`${GET_URL.attendancebatch.api}${batchId}/`).then((response) => {
      if (response && response.status === 200) {
        const data = response.data.data;
  
        // Map backend response to your form structure
        const batchData = {
          id: data.id,
          academic_year: data.academic_year,
          batch_type: data.batch_type,
          name: data.name,
          code: data.code,
          standard_section_ids: data.standard_sections.map((s) => ({
            id: s.id,
            name: `${s.standard_name} - ${s.section_name}`,
          })),
          subject_ids: (data.subjects || []).map((s) => ({
            id: s.mapping_id, // or s.id depending on your backend
            subjectId: s.subject_id,
            name: s.subject_name,
          })),
          students: data.students.map((s) => ({
            id: s.id,
            name: s.name,
            admission_no: s.admission_no,
            mobile_no: s.mobile_no,
            current_standard_name: s.standard_name,
            current_standard_section_name: s.section_name,
          })),
        };
  
        setBatchId(batchData.id);
        setBatchType(batchData.batch_type);
        setFormData({
          academicYear: batchData.academic_year,
          name: batchData.name,
          code: batchData.code,
          sections: batchData.standard_section_ids,
          subjects: batchData.subject_ids,
          students: batchData.students.map((s) => s.id),
        });
        setSelectedStudents(batchData.students);
  
        setLockedSections(batchData.standard_section_ids.map((s) => s.id));
        setLockedSubjects(batchData.subject_ids.map((s) => s.id));
  
        const secIds = batchData.standard_section_ids.map((s) => s.id);
        if (batchData.batch_type === "subject") {
          const subIds = batchData.subject_ids.map((s) => s.id);
          getSubjects(batchData.academic_year, secIds);
          getStudents(batchData.academic_year, secIds, subIds, "subject", 0, rowsPerPage);
        } else {
          getStudents(batchData.academic_year, secIds, [], "standard_section", 0, rowsPerPage);
        }
      }
    });
  };

  useEffect(() => {
    getAcademicYear();
    if (id) {
      // Edit mode
      setIsEdit(true);
      getBatchDetails(id);
  
      // const mockData = {
      //   id: 101,
      //   academic_year: 5,
      //   batch_type: "subject",
      //   name: "Batch for Physics & Chemistry",
      //   code: "BATCH_SUB_STD9_PHY_CHEM",
      //   standard_section_ids: [
      //     { id: 86, name: "Std 9 - A" },
      //     { id: 81, name: "Std 9 - B" }
      //   ],
      //   subject_ids: [
      //     { id: 805, subjectId: 49, name: "Physics" },
      //     { id: 806, subjectId: 50, name: "Chemistry" }
      //   ],
      //   students: [
      //     { id: 2566, name: "Bhuvan Poojga", admission_no: "S901", mobile_no: "9876543210", current_standard_name: "Std 9", current_standard_section_name: "A" },
      //     { id: 2559, name: "Chinmayi S", admission_no: "S902", mobile_no: "9876543211", current_standard_name: "Std 9", current_standard_section_name: "B" }
      //   ]
      // };
  
    //   setBatchId(mockData.id);
    //   setBatchType(mockData.batch_type);
    //   setFormData({
    //     academicYear: mockData.academic_year,
    //     name: mockData.name,
    //     code: mockData.code,
    //     sections: mockData.standard_section_ids,
    //     subjects: mockData.subject_ids,
    //     students: mockData.students.map((s) => s.id),
    //   });
    //   setSelectedStudents(mockData.students);
  
    //   if (mockData.batch_type === "standard_section") {
    //     const secIds = mockData.standard_section_ids.map(s => s.id);
    //     getStudents(mockData.academic_year, secIds, [], "standard_section", 0, rowsPerPage);
    //   }
    //   if (mockData.batch_type === "subject") {
    //     const secIds = mockData.standard_section_ids.map(s => s.id);
    //     const subIds = mockData.subject_ids.map(s => s.id);
    //     getSubjects(mockData.academic_year, secIds);
    //     getStudents(mockData.academic_year, secIds, subIds, "subject", 0, rowsPerPage);
    //   }
    //   setLockedSections(mockData.standard_section_ids.map((s) => s.id));
    //   setLockedSubjects(mockData.subject_ids.map((s) => s.id));
  }},[]);

  const handleSubmit = () => {
    if (!formData.sections.length) {
      Swal.fire("Error", "Please select at least one section", "error");
      return;
    }
  
    if (formData.students.length === 0) {
      Swal.fire("Error", "Please select at least one student", "error");
      return;
    }
  
    const batchPayload = [{
      academic_year: formData.academicYear,
      batch_type: batchType,
      code: formData.code,
      name: formData.name,  
      standard_section_ids: formData.sections.map((s) => s.id),
      student_ids: formData.students,
      removed_student_ids: removedStudents,
    }];
  
    if (batchType === "subject") {
      batchPayload.subject_ids = formData.subjects.map((s) => s.id);
    }
  
    postRequest(POST_URL.attendancebatch.api, batchPayload).then((res) => {
      if (res && res.status === 200) {
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Batch created successfully",
          showConfirmButton: false,
          timer: 1500,
        });
        props.history.push({
          pathname: '/attendancebatch/view',
        });
      }
    });
  };
  

  const generateBatchCode = (name, sections) => {
    if (!name) return "";
    const secIds = sections.map((s) => s.id).join("_");
    return `${name.replace(/\s+/g, "_")}_${secIds}`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <img src={loadingBar} alt="loading" className="loading" />
      </Box>
    );
  }

  const suggestBatchCode = (sections, subjects, batchType) => {
    if (batchType === "standard_section" && sections.length > 0) {
      // Example: BATCH_STD_9_10
      const stds = sections.map((s) => s.name.split(" - ")[0]);
      const uniqueStds = [...new Set(stds)];
      return `BATCH_STD_${uniqueStds
        .join("_")
        .replace(/\s+/g, "")
        .toUpperCase()}`;
    }

    if (batchType === "subject" && sections.length > 0 && subjects.length > 0) {
      // Example: BATCH_SUB_STD9_PHYSICS
      const std = sections[0].name.split(" - ")[0];
      const sub = subjects.map((s) => s.name).join("_");
      return `BATCH_SUB_${std.replace(/\s+/g, "").toUpperCase()}_${sub
        .replace(/\s+/g, "")
        .toUpperCase()}`;
    }

    return "";
  };

  return (
    <Paper>
      <Box className="paper-background" mb={5}>
        <Grid item xs={12} md={6}>
          <Box mt={3}>
            <Box className="heading">
                Add / Edit Batch Attendance
            </Box>
            <Box className="sub-heading">
            </Box>
          </Box>
          <Box className="d-flex" mb={4}>
            <Dropdown
              data={[
                { id: "subject", name: "Subject Wise" },
                { id: "standard_section", name: "Standard Section Wise" },
              ]}
              value={batchType}
              label="Batch Type"
              disabled={isEdit}
              onChange={(e) => {
                const type = e.target.value;
                setBatchType(type);

                // Reset form fields when switching
                setFormData({
                  ...formData,
                  sections: [],
                  subjects: [],
                  students: [],
                  code: ""
                });
                setSubjects([]);
                setStudents([]);
                setSelectedStudents([]);
              }}
            />
            <IconButton
              size="small"
              onClick={() => setDrawerOpen(true)}
              style={{ marginLeft: 8 }}
            >
              <InfoIcon color="primary" />
            </IconButton>
          </Box>
        </Grid>

        <Grid container spacing={2}>
          {/* Batch Info */}
          {/* Academic Year */}
          <Grid item xs={12} md={6}>
            <Box mb={1}>
              <Dropdown
                data={academicYears}
                value={formData.academicYear}
                label="Academic Year"
                disabled={isEdit}
                onChange={(e) => {
                  const yearId = e.target.value;
                  setFormData({
                    ...formData,
                    academicYear: yearId,
                    sections: [],
                    subjects: [],
                    students: [],
                    code: ""
                  });
                  setSections([]);
                  setSubjects([]);
                  setStudents([]);
                  getSections(yearId);
                }}
              />
            </Box>
          </Grid>

          {/* Sections */}
          <Grid item xs={12} md={6}>
            <Box mb={1}>
              <MultipleSelectDropdown
                data_list={
                  batchType === "standard_section"
                    ? [{ id: "all", name: "Select All" }, ...sections]
                    : sections // no Select All for subject-wise
                }
                selected_list={formData.sections}
                label="Standards / Sections"
                disabled_items={isEdit ? lockedSections : []}
                onChange={(values) => {
                  let selected;

                  selected = values;
                  if (values.some((v) => v.id === "all")) {
                    selected = sections;
                  }

                  setFormData({
                    ...formData,
                    sections: selected,
                    subjects: [],
                    students: [],
                    code: generateBatchCode(formData.name, selected),
                  });

                  setSubjects([]);
                  setStudents([]);
                }}
                onClose={() => {
                  if (batchType === "subject" && formData.sections.length > 0) {
                    const ids = formData.sections.map((s) => s.id);
                    getSubjects(formData.academicYear, ids);
                  }
                  if (
                    batchType === "standard_section" &&
                    formData.sections.length > 0
                  ) {
                    const ids = formData.sections.map((s) => s.id);
                    getStudents(
                      formData.academicYear,
                      ids,
                      [],
                      "standard_section",
                      0,
                      rowsPerPage
                    );
                  }
                }}
              />
            </Box>
          </Grid>

          {/* Subjects */}
          {batchType === "subject" && (
            <Grid item xs={12} md={6}>
              <Box mb={1}>
                <MultipleSelectDropdown
                  data_list={[{ id: "all", name: "Select All" }, ...subjects]}
                  selected_list={formData.subjects}
                  label="Subjects"
                  disabled_items={isEdit ? lockedSubjects : []}
                  onChange={(values) => {
                    let selected = values;

                    if (values.some((v) => v.id === "all")) {
                      selected = subjects; // all subject objects
                    }

                    setFormData({
                      ...formData,
                      subjects: selected,
                      students: [],
                      code: suggestBatchCode(
                        formData.sections,
                        formData.subjects,
                        batchType
                      ),
                    });

                    setStudents([]);
                  }}
                  onClose={() => {
                    if (formData.subjects.length > 0) {
                      const secIds = formData.sections.map((s) => s.id);
                      const subIds = formData.subjects.map((s) => s.id);
                      getStudents(
                        formData.academicYear,
                        secIds,
                        subIds,
                        "subject",
                        0,
                        rowsPerPage
                      );
                    }
                  }}
                />
              </Box>
            </Grid>
          )}
          <Grid item xs={12} md={6}>
            <Box mb={1}>
              <TextField
                label="Batch Name"
                fullWidth
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData({
                    ...formData,
                    name,
                    code: generateBatchCode(name, formData.sections),
                  });
                }}
                variant="outlined"
              />
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box mb={1}>
              <TextField
                label="Batch Code"
                fullWidth
                value={formData.code}
                variant="outlined"
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
              />
            </Box>
          </Grid>
        </Grid>

        {/* Student Selection Section */}
        <Box mt={4}>
          <Typography variant="h6" gutterBottom>
            Manage Students
          </Typography>

          <Grid container spacing={2}>
            {/* LEFT: Selected Students */}
            <Grid item xs={12} md={6}>
              <Paper style={{ padding: "16px", height: "100%", display: "flex", flexDirection: "column" }}>
                <Typography variant="subtitle1" gutterBottom>
                  Selected Students ({formData.students.length})
                </Typography>

                {/* Search for selected students */}
                <TextField
                  size="small"
                  variant="outlined"
                  placeholder="Search selected students..."
                  value={searchSelected}
                  onChange={(e) => setSearchSelected(e.target.value)}
                  fullWidth
                  style={{ marginBottom: "10px" }}
                />

                {selectedStudents.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    No students selected
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead style={{ backgroundColor: "#4caf50" }}>
                      <TableRow>
                        <TableCell style={{ color: "white" }}>Name</TableCell>
                        <TableCell style={{ color: "white" }}>Standard Section</TableCell>
                        <TableCell style={{ color: "white" }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedStudents
                        .filter(
                          (s) =>
                            s.name.toLowerCase().includes(searchSelected.toLowerCase()) ||
                            s.admission_no?.toLowerCase().includes(searchSelected.toLowerCase()) ||
                            s.mobile_no?.toString().includes(searchSelected)
                        )
                        .map((s) => (
                          <TableRow key={s.id}>
                            <TableCell>{s.name}</TableCell>
                            <TableCell>{s.current_standard_name} {s.current_standard_section_name}</TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variant="outlined"
                                color="secondary"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    students: formData.students.filter((id) => id !== s.id),
                                  });
                                  setSelectedStudents(
                                    selectedStudents.filter((obj) => obj.id !== s.id)
                                  );
                                  setRemovedStudents((prev) => [...prev, s.id]);
                                }}
                              >
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}

              </Paper>
            </Grid>


            {/* RIGHT: Available Students with Pagination */}
            <Grid item xs={12} md={6}>
              <Paper
                style={{
                  padding: "16px",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
                  {students.length > 0 &&
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={
                            formData.students.length > 0 &&
                            formData.students.length === students.length
                          }
                          indeterminate={
                            formData.students.length > 0 &&
                            formData.students.length < students.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              const ids = students.map((s) => s.id);
                              const newSelectedObjs = [
                                ...selectedStudents,
                                ...students.filter((s) => !formData.students.includes(s.id)),
                              ];
                            
                              setFormData({ ...formData, students: [...formData.students, ...ids] });
                              setSelectedStudents(newSelectedObjs);
                            } else {
                              const remainingObjs = selectedStudents.filter(
                                (s) => !students.some((st) => st.id === s.id)
                              );
                              const remainingIds = remainingObjs.map((s) => s.id);
                            
                              setFormData({ ...formData, students: remainingIds });
                              setSelectedStudents(remainingObjs);
                            }
                          }}
                        />
                      }
                      label="Select All"
                    />
                  }

                  {/* Backend search */}
                  <TextField
                    size="small"
                    variant="outlined"
                    placeholder="Search students..."
                    value={searchAvailable}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchAvailable(val);
                      setPage(0);
                      getStudents(
                        formData.academicYear,
                        formData.sections.map((s) => s.id),
                        formData.subjects.map((s) => s.id),
                        batchType,
                        0,
                        rowsPerPage,
                        val
                      );
                    }}
                  />
                </Box>

                <TableContainer style={{ flex: 1 }}>
                  <Table size="small">
                    <TableHead style={{ backgroundColor: "#1976d2" }}>
                      <TableRow>
                        <TableCell padding="checkbox" style={{ color: "white" }}></TableCell>
                        <TableCell style={{ color: "white" }}>Name</TableCell>
                        <TableCell style={{ color: "white" }}>Standard Section</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {students.map((s, index) => (
                        <TableRow
                          key={s.id}
                          hover
                          selected={formData.students.includes(s.id)}
                          style={{
                            backgroundColor: index % 2 === 0 ? "#f9f9f9" : "#ffffff",
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={formData.students.includes(s.id)}
                              onChange={(e) => {
                                let selectedIds = [...formData.students];
                                let selectedObjs = [...selectedStudents];

                                if (e.target.checked) {
                                  if (!selectedIds.includes(s.id)) {
                                    selectedIds.push(s.id);
                                    selectedObjs.push(s);
                                  }
                                } else {
                                  selectedIds = selectedIds.filter((id) => id !== s.id);
                                  selectedObjs = selectedObjs.filter((obj) => obj.id !== s.id);
                                }

                                setFormData({ ...formData, students: selectedIds });
                                setSelectedStudents(selectedObjs);
                              }}
                            />
                          </TableCell>
                          <TableCell>{s.name}</TableCell>
                          <TableCell>{s.current_standard_name} {s.current_standard_section_name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Backend Pagination */}
                <TablePagination
                  component="div"
                  count={totalStudents}
                  page={page}
                  onPageChange={(e, newPage) => {
                    setPage(newPage);
                    getStudents(
                      formData.academicYear,
                      formData.sections.map((s) => s.id),
                      formData.subjects.map((s) => s.id),
                      batchType,
                      newPage,
                      rowsPerPage,
                      searchAvailable
                    );
                  }}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    const newLimit = parseInt(e.target.value, 10);
                    setRowsPerPage(newLimit);
                    setPage(0);
                    getStudents(
                      formData.academicYear,
                      formData.sections.map((s) => s.id),
                      formData.subjects.map((s) => s.id),
                      batchType,
                      0,
                      newLimit,
                      searchAvailable
                    );
                  }}
                  rowsPerPageOptions={[5, 10, 20, 50, 75, 100]}
                />
              </Paper>
            </Grid>

          </Grid>
        </Box>

        <Box className="submt-button-float-bottom" mt={3}>
          <Button
            className="submit"
            variant="contained"
            style={{ float: "right" }}
            onClick={handleSubmit}
            // disabled={submitDisable}
          >
            Save Batch
          </Button>
        </Box>

        <InfoDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="Batch Type Information"
          description="Choose how you want to group students into batches."
          examples={[
            {
              icon: "📘",
              title: "Standard Section Wise (School)",
              text: "Merge students from different standards/sections into a single batch. Example: Combine Std 9 - A and Std 10 - B.",
              bgColor: "#E3F2FD", // light blue
              textColor: "#0D47A1", // dark blue
            },
            // {
            //   icon: "📗",
            //   title: "Standard Section Wise (College)",
            //   text: "Group students across different semesters or branches into one batch. Example: Combine CSE Sem 3 and EEE Sem 4.",
            // },
            {
              icon: "📘",
              title: "Subject Wise (School)",
              text: "Create batches for a specific subject within a standard/section. Example: Only Std 9 - A students for Physics.",
              bgColor: "#E8F5E9", // light green
              textColor: "#1B5E20", // dark green
            },
            // {
            //   icon: "📗",
            //   title: "Subject Wise (College)",
            //   text: "Split students based on individual subjects in a semester. Example: Only CSE Sem 3 students for Data Structures.",
            // },
          ]}
        />
      </Box>
    </Paper>
  );
};

export default withRouter(AddAttendanceBatch);
