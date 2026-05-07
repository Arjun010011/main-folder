import React, { useEffect, useState, useRef } from "react";
import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Paper,
  Card,
  CardContent,
  Chip,
  Divider,
  Tooltip,
  IconButton,
  InputAdornment
} from "@material-ui/core";

import { 
  Edit, 
  Delete, 
  Print, 
  GroupAdd,
  Search,
  ArrowDownward,
  ArrowUpward,
  Sync,
  SwapHoriz,
  PhotoCamera
} from "@material-ui/icons";

import AllMUIDataTable from "Components/AllMUIDataTable";
import { DEL_URL, GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import {
  deleteRequest,
  getRequest,
  postRequest,
  putRequest
} from "Includes/api/apicall";
import Swal from "sweetalert2";


import { Actions } from "Constants/permissions";
import { useHistory } from "react-router-dom/cjs/react-router-dom";

const ViewIdCardList = () => {
  // ---------------- STATE ----------------
  const [tableData, setTableData] = useState([]);
  const [groupData, setGroupData] = useState([]);
  const [updateStatusOpen, setUpdateStatusOpen] = useState(false);
  const [groupExchangeOpen, setGroupExchangeOpen] = useState(false);
  const [fromGroup, setFromGroup] = useState("");
  const [toGroup, setToGroup] = useState("");
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [academicYear, setAcademicYear] = useState([]);
  const [standardList, setStandardList] = useState([]);
  const defaultAcademicYear = JSON.parse(localStorage.getItem('academic-year'))
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useHistory()

  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedStandard, setSelectedStandard] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState([])

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedRowIds, setSelectedRowIds] = useState([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState("");

  const [tabValue, setTabValue] = useState(0);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");

  const academicYearRef = useRef("");
  academicYearRef.current = selectedAcademicYear;

  // 🔥 NEW COLOR PALETTE: Indigo & Emerald Theme
  const COLORS = {
    primary: "#4f46e5",     // Indigo 600
    success: "#10b981",     // Emerald 500
    warning: "#f97316",     // Orange 500
    danger: "#ef4444",      // Red 500
    secondary: "#06b6d4",   // Cyan 500
    bg: "#f3f4f6",          // Cool Gray 100
    surface: "#ffffff",
    textDark: "#111827",    // Gray 900
    textMuted: "#6b7280",   // Gray 500
    border: "#e5e7eb"       // Gray 200
  };

  const STATUS_CHOICES = [
    "Idle",
    "Photos Taken",
    "Sent for Verification",
    "Verification Completed",
    "Verification Failed",
    "Verified",
    "Sent for Printing",
    "Printed Id received",
    "Printed Id Sent",
    "Received"
  ];  

  const uniqueGroups = [...new Set(groupData.map((g) => g.groupName))];

  // ---------------- SEARCH ----------------
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // ---------------- INIT ----------------
  useEffect(() => {
    getAcademicYear();
    getStandard();

    if (defaultAcademicYear) {
      setSelectedAcademicYear(defaultAcademicYear);
    }
  }, []);

 const handleRePrint = async (row) => {
  const academic_year = parseInt(academicYearRef.current, 10);
  const Id = row.id;

  if (!academic_year || Number.isNaN(academic_year)) {
    Swal.fire({
      icon: "warning",
      title: "Missing Academic Year",
      text: "Please select an academic year before printing.",
    });
    return;
  }

  if (!Id) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Missing student id.",
    });
    return;
  }

  // ✅ CONFIRMATION DIALOG
  const confirm = await Swal.fire({
    title: "Reprint ID Card?",
    html: `
      <div style="text-align:left">
        <p><b>Student:</b> ${row.student_display_name || "-"}</p>
        <p>This will trigger a reprint for this student.</p>
      </div>
    `,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, Reprint",
    cancelButtonText: "Cancel",
  });

  if (!confirm.value) return;

  const url = `${GET_URL.studentidcardupdate.api}?reprint=1&id=${Id}`;

  const response = await getRequest(url);

  if (response) {
    Swal.fire({
      icon: "success",
      title: "Success",
      text: response.data.message,
    });
  }

  getIdCardList();
};

  useEffect(() => {
    if (selectedAcademicYear) {
      getIdCardList();
    }
  }, [selectedAcademicYear, selectedStandard, debouncedSearch, page, rowsPerPage, tabValue]);

  const handleGroupExchange = async () => {
    if (!fromGroup || !toGroup) return;
  
    const toGroupObj = groupData.find(g => g.groupName === toGroup);
    const toGroupStatus = toGroupObj?.status || "";
  
    const payload = {
      groups: 1,
      group_exchange: 1,
      from_group: fromGroup,
      to_group: toGroup,
      status: toGroupStatus, 
      academic_year: selectedAcademicYear,
    };
  
    const res = await getRequest(GET_URL.studentidcardupdate.api, payload);
  
    if (res?.status === 200 || res?.status === 201) {
      setGroupExchangeOpen(false);
      setFromGroup("");
      setToGroup("");
      getIdCardList();
      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Group changed successfully!",
        timer: 2000,
        showConfirmButton: false,
      });
    }
  };

  // ---------------- FORMAT GROUP DATA ----------------
  const formatGroupData = (data) => {
    const result = [];
    Object.keys(data || {}).forEach((groupName) => {
      const statuses = data[groupName];
      Object.keys(statuses || {}).forEach((status) => {
        result.push({
          groupName,
          status,
          students: statuses[status] || []
        });
      });
    });
    return result;
  };

  // ---------------- API ----------------
  const getAcademicYear = async () => {
    const res = await getRequest(GET_URL.academicyear.api);
    setAcademicYear(res?.data?.data || []);
  };

  const getStandard = async () => {
    const res = await getRequest(GET_URL.standard.api);
    setStandardList(res?.data?.data || []);
  };

  const getIdCardList = async () => {
    const params = {
      academic_year: selectedAcademicYear,
      limit: rowsPerPage,
      pageno: page + 1,
      search: debouncedSearch,
      standard: selectedStandard,
      ...(tabValue === 1 && { groups: 1 })
    };

    const res = await getRequest(GET_URL.studentidcardupdate.api, params);

    if (tabValue === 1) {
      const formatted = formatGroupData(res?.data?.data || {});
      setGroupData(formatted);
    } else {
      setTableData(res?.data?.data?.data_list || []);
      setTotalCount(res?.data?.data?.count || 0);
    }
  };

  // ---------------- GROUP ----------------
  const handleOpenGroupDialog = () => {
    if (selectedRowIds.length === 0) return;
    setGroupDialogOpen(true);
  };

  const submitCreateGroup = async () => {
    if (!groupName.trim()) return;

    const payload = {
      ids: selectedRowIds,
      group_name: groupName,
      academic_year: selectedAcademicYear,
      group_update : 1
    };

    const res = await putRequest(
      `${PUT_URL.studentidcardupdate.api}${payload.ids[0]}/`,
      payload
    );

    if (res?.status === 200 || res?.status === 201) {
      setGroupDialogOpen(false);
      setGroupName("");
      setSelectedRowIds([]);
      getIdCardList();
      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Group created successfully!",
        timer: 2000,
        showConfirmButton: false,
      });
    }
  };

  const handlechangephoto = (row) => {
      console.log(row)
    navigate.push(`${Actions.idcard.update.url}?student_id=${row.student}&academic_year=${row.academic_year}`)
  }

  // ---------------- ACTIONS ----------------
  const handleEditIdCard = (row) => {
    setEditData({ ...row });
    setEditOpen(true);
  };

  const handleUpdateIdCard = async () => {
    const url = `${PUT_URL.studentidcardupdate.api}${editData.id}/`;
    const res = await putRequest(url, editData);
    if (res?.status === 200) {
      setEditOpen(false);
      getIdCardList();
    }
  };

  const handleDeleteIdCard = async (id) => {
    const res = await deleteRequest(`${DEL_URL.studentidcardupdate.api}${id}/`, null, {
      confirmButtonText: "Yes, delete it!",
    });
    if (res?.status === 200) {
      getIdCardList();
    }
  };

  const handlePrintGroup = (group) => {
    const academic_year = parseInt(academicYearRef.current, 10);
  
    if (!academic_year || Number.isNaN(academic_year)) {
      Swal.fire({
        icon: "warning",
        title: "Missing Academic Year",
        text: "Please select an academic year before printing.",
      });
      return;
    }
  
    const studentIds = group.students.map(
      (s) => s?.student ?? s?.student_id ?? s?.studentId
    ).filter(Boolean);
  
    if (studentIds.length === 0) {
      Swal.fire({
        icon: "error",
        title: "No Students",
        text: "No valid students found in this group.",
      });
      return;
    }
  
    postRequest(
      `${POST_URL.generateidcard.api}?update_print=1`,
      {
        academic_year,
        student_ids: studentIds,
        document_type: "pdf",
        file_name: group.groupName || "group-id-cards",
        group: group.groupName 
      },
      { responseType: "blob", return_error: true }
    ).then((res) => {
      if (!res?.data) {
        Swal.fire({
          icon: "error",
          title: "Print Failed",
          text: "Please try again.",
        });
        return;
      }
  
      const blob = new Blob([res.data], { type: "application/pdf" });
      window.open(URL.createObjectURL(blob));
    });
  };

  const handleDataSync = async (student_to_id) => {
    const academic_year = parseInt(academicYearRef.current, 10);

    if (!academic_year || Number.isNaN(academic_year)) {
      Swal.fire({
        icon: "warning",
        title: "Missing Academic Year",
        text: "Please select an academic year before syncing.",
      });
      return;
    }

    const isBulk = selectedStudentIds.length === 0;

    if (student_to_id === 2) {
      const confirmAll = await Swal.fire({
        title: "Sync All Students?",
        text: "This will take ALL students from Student and update ID Cards. Do you want to continue?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, Continue",
        cancelButtonText: "Cancel",
      });

      if (!confirmAll.value) return;
    }

    const confirm = await Swal.fire({
      title: "Confirm Data Sync",
      html: `
        <div style="text-align:left">
          <p><b>Sync Type:</b> ${
            student_to_id === 1
              ? "Student → ID Card"
              : student_to_id === 0
              ? "ID Card → Student"
              : "All Students Sync"
          }</p>
          <p><b>Mode:</b> ${isBulk ? "Bulk Sync (All Students)" : "Selected Students"}</p>
          ${
            !isBulk
              ? `<p><b>Selected Count:</b> ${selectedStudentIds.length}</p>`
              : ""
          }
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Sync Now",
      cancelButtonText: "Cancel",
    });

    if (!confirm.value) return;

    let payload = {
      academic_year,
      student_to_id,
    };

    if (!isBulk) {
      payload.ids = selectedStudentIds;
      payload.bulk = 0;
    } else {
      payload.bulk = 1;
    }

    try {
      const res = await postRequest(POST_URL.idcarddatasync.api, payload);

      if (res?.status === 200 || res?.status === 201) {
        Swal.fire({
          icon: "success",
          title: "Synced",
          text: "Data synced successfully!",
          timer: 2000,
          showConfirmButton: false,
        });

        getIdCardList();
        setSelectedStudentIds([]);
      } else {
        throw new Error("Sync failed");
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Data sync failed. Please try again.",
      });
    }
  };

  const handlePrint = (row) => {
    const academic_year = parseInt(academicYearRef.current, 10);
    const studentId = row?.student ?? row?.student_id ?? row?.studentId;
    if (!academic_year || Number.isNaN(academic_year)) {
      Swal.fire({
        icon: "warning",
        title: "Missing Academic Year",
        text: "Please select an academic year before printing.",
      });
      return;
    }
    if (!studentId) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Unable to print: missing student id for this row.",
      });
      return;
    }

    postRequest(
      `${POST_URL.generateidcard.api}?update_print=1`,
      {
        academic_year,
        student_ids: [studentId],
        document_type: "pdf",
        file_name: row?.student_display_name || "id-card",
      },
      { responseType: "blob", return_error: true }
    ).then((res) => {
      if (!res?.data) {
        Swal.fire({
          icon: "error",
          title: "Print Failed",
          text: "Please try again.",
        });
        return;
      }
      const blob = new Blob([res.data], { type: "application/pdf" });
      window.open(URL.createObjectURL(blob));
    });
  };

  const handleUpdateGroupStatus = async () => {
    if (!selectedGroupName || !selectedStatus) return;
  
    const payload = {
      groups: 1,
      group_name: selectedGroupName,
      status: selectedStatus,
      academic_year: selectedAcademicYear,
    };
  
    const res = await getRequest(GET_URL.studentidcardupdate.api, payload);
  
    if (res?.status === 200 || res?.status === 201) {
      setUpdateStatusOpen(false);
      setSelectedGroupName("");
      setSelectedStatus("");
      getIdCardList();
      Swal.fire({
        icon: "success",
        title: "Updated",
        text: "Group status updated successfully!",
        timer: 2000,
        showConfirmButton: false,
      });
    }
  };

  // ---------------- TABLE ----------------
  const getColumns = (dataSource) => [
    {
      name: "photo",
      label: "Photo",
      options: {
        sort: false,
        filter: false,
        customBodyRender: (value, tableMeta) => {
          const row = dataSource[tableMeta.rowIndex];
          const imgUrl = row?.processed_image_details?.file;
          console.log(imgUrl,row,dataSource)

          return imgUrl ? (
            <img
              src={imgUrl}
              alt="student"
              onClick={() => {
                setPreviewImage(imgUrl);
                setPreviewOpen(true);
              }}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                objectFit: "cover",
                border: `2px solid ${COLORS.border}`,
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}
            />
          ) : (
            <Box 
              width={44} height={44} 
              borderRadius="50%" 
              bgcolor={COLORS.bg} 
              display="flex" 
              alignItems="center" 
              justifyContent="center"
              border={`2px dashed ${COLORS.border}`}
            >
              <Typography variant="caption" style={{ color: COLORS.textMuted, fontSize: '0.65rem' }}>No Img</Typography>
            </Box>
          );
        }
      }
    },
    { name: "student_display_name", label: "Student Name" },
    { name: "student_class", label: "Class" },
    { name: "admission_no", label: "Admission No" },
    { name: "roll_no", label: "Roll No" },
    { name: "group_name", label: "Group", options: { customBodyRender: (val) => val || <span style={{color: COLORS.textMuted}}>-</span> } },
    { name: "mobile", label: "Mobile" },
    { 
      name: "status", 
      label: "Status",
      options: {
        customBodyRender: (value) => (
          <Chip 
            label={value || "Idle"} 
            size="small" 
            style={{ 
              backgroundColor: value === 'Verified' ? '#d1fae5' : '#f3f4f6',
              color: value === 'Verified' ? '#065f46' : COLORS.textDark,
              fontWeight: 500,
              border: `1px solid ${value === 'Verified' ? '#a7f3d0' : '#e5e7eb'}`
            }} 
          />
        )
      }
    },
    {
      name :'print_count',
      label : 'No of Prints',
    },
    {
      name: "actions", 
      label: "Actions",
      options: {
        sort: false,
        filter: false,
        customBodyRender: (value, tableMeta) => {
          const row = dataSource[tableMeta.rowIndex];
          if (!row) return null;
    
          return (
            <Box display="flex" style={{ gap: '8px', alignItems: "center", flexWrap: "wrap" }}>
              <Tooltip title="Edit Record">
                <IconButton 
                  size="small" 
                  onClick={(e) => { e.stopPropagation(); handleEditIdCard(row); }}
                  style={{ color: COLORS.primary, backgroundColor: '#e0e7ff' }}
                >
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Delete Record">
                <IconButton 
                  size="small" 
                  onClick={(e) => { e.stopPropagation(); handleDeleteIdCard(row.id); }}
                  style={{ color: COLORS.danger, backgroundColor: '#fee2e2' }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Print ID Card">
                <IconButton 
                  size="small" 
                  onClick={(e) => { e.stopPropagation(); handlePrint(row); }}
                  style={{ color: COLORS.success, backgroundColor: '#d1fae5' }}
                >
                  <Print fontSize="small" />
                </IconButton>
              </Tooltip>

              <Button
                size="small"
                variant="contained"
                startIcon={<Print />}
                onClick={(e) => { e.stopPropagation(); handleRePrint(row); }}
                style={{
                  background: COLORS.warning,
                  color: "#fff",
                  textTransform: "none",
                  borderRadius: 6,
                  boxShadow: "none",
                  padding: "4px 12px"
                }}
              >
                Reprint
              </Button>

              <Button
                size="small"
                variant="outlined"
                startIcon={<PhotoCamera />}
                style={{
                  borderColor: COLORS.primary,
                  color: COLORS.primary,
                  textTransform: "none",
                  borderRadius: 6,
                  padding: "4px 12px"
                }}
                onClick={() => handlechangephoto(row)}
              >
                Change Photo
              </Button>
            </Box>
          );
        }
      }
    }
  ];

  const options = {
    serverSide: true,
    count: totalCount,
    print: false,
    download: false,
    search: false,
    page,
    rowsPerPage,
    elevation: 0,
    selectableRows: tabValue === 0 ? "multiple" : "none",
    onRowSelectionChange: (current, all) => {
      const ids = all.map((row) => tableData[row.dataIndex]?.id);
      const studentIds = all.map((row) => tableData[row.dataIndex]?.student);
      setSelectedRowIds(ids);
      setSelectedStudentIds(studentIds)
    },
    onChangePage: setPage,
    onChangeRowsPerPage: (rows) => {
      setRowsPerPage(rows);
      setPage(0);
    }
  };

  return (
    <Box p={2} style={{ backgroundColor: COLORS.bg, minHeight: '100vh' }}>

      {/* HEADER SECTION */}
      <Paper
        elevation={0}
        style={{
          padding: '20px 24px',
          marginBottom: 20,
          borderRadius: 12,
          border: `1px solid ${COLORS.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <Typography variant="h5" style={{ fontWeight: 600, color: COLORS.textDark }} className="heading">
          ID Card Management
        </Typography>

        <Box display="flex" gap={12} flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<ArrowDownward />}
            style={{ background: COLORS.primary, color: "#fff", textTransform: 'none', borderRadius: 8, boxShadow: 'none',margingLeft : '10px !important' }}
            onClick={() => handleDataSync(1)}
          >
            Student → ID
          </Button>

          <Button
            variant="contained"
            startIcon={<ArrowUpward />}
            style={{ background: COLORS.secondary, color: "#fff", textTransform: 'none', borderRadius: 8, boxShadow: 'none',margingLeft : '10px !important' }}
            onClick={() => handleDataSync(0)}
          >
            ID → Student
          </Button>

          <Button
            variant="contained"
            startIcon={<Sync />}
            style={{ background: COLORS.warning, color: "#fff", textTransform: 'none', borderRadius: 8, boxShadow: 'none',margingLeft : '10px !important' }}
            onClick={() => handleDataSync(2)}
          >
            Full Sync
          </Button>

          {tabValue === 0 ? (
            selectedRowIds.length > 0 && (
              <Button
                variant="contained"
                style={{ background: COLORS.success, color: "#fff", textTransform: 'none', borderRadius: 8, boxShadow: 'none',margingLeft : '10px !important' }}
                startIcon={<GroupAdd />}
                onClick={handleOpenGroupDialog}
              >
                Group ({selectedRowIds.length})
              </Button>
            )
          ) : (
            <Button
              variant="outlined"
              startIcon={<SwapHoriz />}
              style={{ borderColor: COLORS.primary, color: COLORS.primary, textTransform: 'none', borderRadius: 8 }}
              onClick={() => setGroupExchangeOpen(true)}
            >
              Change Group
            </Button>
          )}
        </Box>
      </Paper>

      {/* FILTERS & TABS SECTION */}
      <Paper 
        elevation={0} 
        style={{ 
          borderRadius: 12, 
          border: `1px solid ${COLORS.border}`,
          marginBottom: 20,
          overflow: 'hidden'
        }}
      >
        <Box borderBottom={`1px solid ${COLORS.border}`} bgcolor="#fafafa">
          <Tabs
            value={tabValue}
            onChange={(e, val) => {
              setTabValue(val);
              setPage(0);
              setSelectedRowIds([]);
            }}
            indicatorColor="primary"
            textColor="primary"
            style={{ paddingLeft: 16 }}
            TabIndicatorProps={{ style: { backgroundColor: COLORS.primary, height: 3 } }}
          >
            <Tab label="Student List" style={{ textTransform: "none", fontWeight: 500, minWidth: 120, color: tabValue === 0 ? COLORS.primary : COLORS.textMuted }} />
            <Tab label="Groups" style={{ textTransform: "none", fontWeight: 500, minWidth: 120, color: tabValue === 1 ? COLORS.primary : COLORS.textMuted }} />
          </Tabs>
        </Box>

        <Box p={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={2}>
              <TextField
                label="Search Student"
                placeholder="Name, Roll No, etc..."
                fullWidth
                size="small"
                variant="outlined"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search style={{ color: COLORS.textMuted }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small" variant="outlined">
                <InputLabel>Academic Year</InputLabel>
                <Select
                  value={selectedAcademicYear}
                  onChange={(e) => setSelectedAcademicYear(e.target.value)}
                  label="Academic Year"
                >
                  {academicYear.map((y) => (
                    <MenuItem key={y.id} value={y.id}>{y.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small" variant="outlined">
                <InputLabel>Standard</InputLabel>
                <Select
                  value={selectedStandard}
                  onChange={(e) => setSelectedStandard(e.target.value)}
                  label="Standard"
                >
                  <MenuItem value="">All Standards</MenuItem>
                  {standardList.map((s) => (
                    <MenuItem key={s.id} value={s.name}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* TABLE / GROUPS CONTENT */}
      <Paper 
        elevation={0} 
        style={{ 
          borderRadius: 12, 
          border: `1px solid ${COLORS.border}`,
          overflow: 'hidden'
        }}
      >
        {tabValue === 0 ? (
          <AllMUIDataTable
            key={tableData}
            title={<Typography variant="h6" style={{ fontWeight: 600, color: 'white' }}>Student Records</Typography>}
            data={tableData}
            columns={getColumns(tableData)}
            options={options}
          />
        ) : (
          <Box p={3}>
            {groupData.map((group, index) => {
              const totalStudents = group.students.length;
              return (
                <Card 
                  key={index} 
                  elevation={0} 
                  style={{ 
                    marginBottom: 24, 
                    border: `1px solid ${COLORS.border}`, 
                    borderRadius: 12 
                  }}
                >
                  <CardContent style={{ padding: 0 }}>
                    {/* GROUP HEADER */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" p={2.5} bgcolor="#fafafa">
                      <Box>
                        <Box display="flex" alignItems="center" gap={1.5} mb={0.5}>
                          <Typography variant="h6" style={{ fontWeight: 600, color: COLORS.textDark }}>
                            {group.groupName}
                          </Typography>
                          <Chip 
                            label={group.status || 'No Status'} 
                            size="small" 
                            style={{ backgroundColor: '#e0e7ff', color: '#3730a3', fontWeight: 500 }} 
                          />
                        </Box>
                        <Typography variant="body2" style={{ color: COLORS.textMuted }}>
                          Total Students in Group: <b style={{ color: COLORS.textDark }}>{totalStudents}</b>
                        </Typography>
                      </Box>
              
                      <Box display="flex" gap={1.5}>
                        <Button
                          variant="outlined"
                          color="primary"
                          size="small"
                          style={{ textTransform: 'none', borderRadius: 8, padding: '6px 16px', borderColor: COLORS.primary, color: COLORS.primary }}
                          onClick={() => {
                            setSelectedGroupName(group.groupName);
                            setSelectedStatus(group.status);
                            setUpdateStatusOpen(true);
                          }}
                        >
                          Update Status
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={<Print />}
                          style={{ backgroundColor: COLORS.success, color: "#fff", textTransform: 'none', borderRadius: 8, boxShadow: 'none',margingLeft : '10px !important', padding: '6px 16px' }}
                          size="small"
                          onClick={() => handlePrintGroup(group)}
                        >
                          Print All
                        </Button>
                      </Box>
                    </Box>
                    
                    <Divider />
              
                    {/* GROUP TABLE */}
                    <AllMUIDataTable
                      title=""
                      data={group.students}
                      columns={getColumns(group.students)}
                      options={{
                        selectableRows: "none",
                        pagination: false,
                        search: false,
                        filter: false,
                        elevation: 0,
                      }}
                    />
                  </CardContent>
                </Card>
              );
            })}
            {groupData.length === 0 && (
              <Box p={4} textAlign="center">
                <Typography style={{ color: COLORS.textMuted }}>No groups found for the selected filters.</Typography>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* ---------------- DIALOGS ---------------- */}

      {/* CREATE GROUP DIALOG */}
      <Dialog open={groupDialogOpen} onClose={() => setGroupDialogOpen(false)} PaperProps={{ style: { borderRadius: 12 } }}>
        <DialogTitle disableTypography>
          <Typography variant="h6" style={{ fontWeight: 600, color: COLORS.textDark }}>Create New Group</Typography>
        </DialogTitle>
        <Divider />
        <DialogContent style={{ minWidth: 400, paddingTop: 24, paddingBottom: 24 }}>
          <TextField
            fullWidth
            label="Group Name"
            variant="outlined"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </DialogContent>
        <Divider />
        <DialogActions style={{ padding: 16 }}>
          <Button onClick={() => setGroupDialogOpen(false)} style={{ textTransform: 'none', color: COLORS.textMuted }}>Cancel</Button>
          <Button onClick={submitCreateGroup} style={{ backgroundColor: COLORS.primary, color: '#fff', textTransform: 'none', borderRadius: 6, boxShadow: 'none' }} variant="contained">
            Create Group
          </Button>
        </DialogActions>
      </Dialog>

      {/* UPDATE GROUP STATUS DIALOG */}
      <Dialog open={updateStatusOpen} onClose={() => setUpdateStatusOpen(false)} PaperProps={{ style: { borderRadius: 12 } }}>
        <DialogTitle disableTypography>
          <Typography variant="h6" style={{ fontWeight: 600, color: COLORS.textDark }}>Update Group Status</Typography>
        </DialogTitle>
        <Divider />
        <DialogContent style={{ minWidth: 400, paddingTop: 24, paddingBottom: 24 }}>
          <FormControl fullWidth variant="outlined" style={{ marginBottom: 20 }}>
            <InputLabel>Select Group</InputLabel>
            <Select
              value={selectedGroupName}
              onChange={(e) => setSelectedGroupName(e.target.value)}
              label="Select Group"
            >
              {uniqueGroups.map((group) => (
                <MenuItem key={group} value={group}>{group}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth variant="outlined">
            <InputLabel>Status</InputLabel>
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              label="Status"
            >
              {STATUS_CHOICES.map((status) => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <Divider />
        <DialogActions style={{ padding: 16 }}>
          <Button onClick={() => setUpdateStatusOpen(false)} style={{ textTransform: 'none', color: COLORS.textMuted }}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateGroupStatus} style={{ backgroundColor: COLORS.primary, color: '#fff', textTransform: 'none', borderRadius: 6, boxShadow: 'none' }}>
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT RECORD DIALOG */}
      <Dialog
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditData(null); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ style: { borderRadius: 12 } }}
      >
        <DialogTitle disableTypography>
          <Typography variant="h6" style={{ fontWeight: 600, color: COLORS.textDark }}>Edit ID Card Record</Typography>
        </DialogTitle>
        <Divider />
        <DialogContent style={{ minWidth: 400, paddingTop: 24, paddingBottom: 24 }}>
          {editData ? (
            <Grid container spacing={3}>
              {Object.keys(editData)
                .filter((key) => {
                  const excluded = new Set([
                    "id", "status", "student", "student_id", "studentId",
                    "student_display_name", "academic_year", "image",
                    "image_details", "processed_image", "processed_image_details",
                    "is_active", "created", "modified", "group_name",
                  ]);
                  return !excluded.has(key);
                })
                .map((key) => {
                  const rawValue = editData[key];
                  const isObject = rawValue !== null && typeof rawValue === "object" && !Array.isArray(rawValue);
                  const isArray = Array.isArray(rawValue);
                  const value = isObject || isArray ? JSON.stringify(rawValue, null, 2) : (rawValue ?? "");
                  const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

                  return (
                    <Grid item xs={12} sm={6} key={key}>
                      <TextField
                        fullWidth
                        label={label}
                        variant="outlined"
                        size="small"
                        value={value}
                        multiline={isObject || isArray}
                        minRows={isObject || isArray ? 3 : 1}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                      />
                    </Grid>
                  );
                })}
            </Grid>
          ) : null}
        </DialogContent>
        <Divider />
        <DialogActions style={{ padding: 16 }}>
          <Button onClick={() => { setEditOpen(false); setEditData(null); }} style={{ textTransform: 'none', color: COLORS.textMuted }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleUpdateIdCard} disabled={!editData?.id} style={{ backgroundColor: COLORS.primary, color: '#fff', textTransform: 'none', borderRadius: 6, boxShadow: 'none' }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* EXCHANGE/CHANGE GROUP DIALOG */}
      <Dialog open={groupExchangeOpen} onClose={() => setGroupExchangeOpen(false)} PaperProps={{ style: { borderRadius: 12 } }}>
        <DialogTitle disableTypography>
          <Typography variant="h6" style={{ fontWeight: 600, color: COLORS.textDark }}>Change Group Assignments</Typography>
        </DialogTitle>
        <Divider />
        <DialogContent style={{ minWidth: 400, paddingTop: 24, paddingBottom: 24 }}>
          <FormControl fullWidth variant="outlined" style={{ marginBottom: 20 }}>
            <InputLabel>From Group</InputLabel>
            <Select
              value={fromGroup}
              onChange={(e) => setFromGroup(e.target.value)}
              label="From Group"
            >
              {uniqueGroups.map((group) => (
                <MenuItem key={group} value={group}>{group}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth variant="outlined">
            <InputLabel>To Group</InputLabel>
            <Select
              value={toGroup}
              onChange={(e) => setToGroup(e.target.value)}
              label="To Group"
            >
              {uniqueGroups
                .filter((g) => g !== fromGroup) // prevent same selection
                .map((group) => (
                  <MenuItem key={group} value={group}>{group}</MenuItem>
                ))}
            </Select>
          </FormControl>
          
          {toGroup && (
            <Box mt={2} p={1.5} bgcolor={COLORS.bg} borderRadius={8} border={`1px dashed ${COLORS.border}`}>
              <Typography variant="body2" style={{ color: COLORS.textMuted }}>
                Target Group Status: <strong style={{ color: COLORS.textDark }}>{groupData.find(g => g.groupName === toGroup)?.status || "No Status"}</strong>
              </Typography>
            </Box>
          )}
        </DialogContent>
        <Divider />
        <DialogActions style={{ padding: 16 }}>
          <Button onClick={() => setGroupExchangeOpen(false)} style={{ textTransform: 'none', color: COLORS.textMuted }}>Cancel</Button>
          <Button variant="contained" onClick={handleGroupExchange} style={{ backgroundColor: COLORS.primary, color: '#fff', textTransform: 'none', borderRadius: 6, boxShadow: 'none' }}>
            Confirm Shift
          </Button>
        </DialogActions>
      </Dialog>

      {/* IMAGE PREVIEW DIALOG */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="sm" PaperProps={{ style: { borderRadius: 12 } }}>
        <DialogContent style={{ textAlign: "center", padding: 24, backgroundColor: '#111827' }}>
          <img
            src={previewImage}
            alt="Preview"
            style={{
              width: "100%",
              maxHeight: "75vh",
              objectFit: "contain",
              borderRadius: 8
            }}
          />
        </DialogContent>
        <DialogActions style={{ padding: 12, backgroundColor: '#111827' }}>
          <Button onClick={() => setPreviewOpen(false)} style={{ color: "#fff", textTransform: 'none' }}>
            Close Preview
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default ViewIdCardList;