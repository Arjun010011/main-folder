import React, { Component } from "react";
import {
  Paper,
  Box,
  Grid,
  Typography,
  Button,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
} from "@material-ui/core";
import Swal from "sweetalert2";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import EditIcon from "@material-ui/icons/Edit";
import InfoIcon from "@material-ui/icons/Info";
import moment from "moment";
import classNames from "classnames";
import { withRouter } from "react-router-dom";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
  KeyboardTimePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import _ from "lodash";

// import HrAttendanceReport from 'Containers/HrManagement/components/HrAttendanceReport';
import ActionColumn from "Components/ActionColumnNew";
import AllMUIDataTable from "Components/AllMUIDataTable";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import loadingBar from "images/loading.gif";
import { getRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL } from "Includes/urls";
import { nameAndNumberRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import {
  getFinancialYear,
  SetFinancialYear,
  dateFormat,
  isUserHasPermission,
  timeFormat,
  validateDate,
  getUrlParam,
} from "Includes/functions";
import { multiOptions, minDate } from "Constants";
import { Dropdown } from "Components/DropDown";
import BulkAttendanceEditDialog from "./components/BulkAttendanceEditDialog";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

const fieldDetailsGlobal = [
  {
    label: "Is Absent",
    regex: null,
    name: "isAbsent",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: false,
    rows: null,
    type: "switch",
    emptyRemainingValues: true,
  },
  {
    label: "In Time",
    regex: null,
    name: "in_time",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "date_time",
    isDisableWhenPresent: "isAbsent",
    isDependentIndex: 0,
  },
  {
    label: "Out Time",
    regex: null,
    name: "out_time",
    md: 12,
    className: "width-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "date_time",
    isDisableWhenPresent: "isAbsent",
    isDependentIndex: 0,
    parentMinDate: "in_time",
  },
  // {
  //   label: "Duration",
  //   regex: null,
  //   name: "duration",
  //   md: 12,
  //   className: "width-100",
  //   required: true,
  //   id: "outlined-textarea",
  //   default: "",
  //   rows: null,
  //   type: "text",
  // },
];

class HrStaffAttendanceView extends Component {
  constructor() {
    super();
    this.state = {
      attendanceList: [],
        loading: false,
        selectedToDelete: [],
        closeMenu: true,
        tableUpdating: false,
        selectedRows: [], // For bulk edit - attendance IDs
        selectedStaffAttendancePairs: [], // For bulk edit - staff_id + for_date pairs
        selectedDataIndices: [], // Store dataIndex for UI purposes
        statusList: {}, // Status list from backend
        selectedStatus: "", // Selected status for bulk update
        bulkEditDialogOpen: false, // Dialog for bulk time editing
        bulkEditInTime: null, // Bulk edit check-in time
        bulkEditOutTime: null, // Bulk edit check-out time
      errorContent: "",
      yearList: [],
      pageLoading: false,
      isBlankPage: true,
      year: "",
      errors: { selected_date: "" },
      selected_date: new Date(),
      fieldDetails: [],
      enabledActions: [],
      columns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
          },
        },
        {
          name: "Serial Number",
          label: "Sl NO",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return tableMeta.rowIndex + 1;
            },
          },
        },
        {
          name: "staff_name",
          label: "Staff Name",
          options: {
            filter: true,
            sort: true,
            display: true,
          },
        },
        {
          name: "in_time",
          label: "In Time",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <Box>{value && dateFormat(value, "DD-MM-YYYY hh:mm A")}</Box>
              );
            },
          },
        },
        {
          name: "out_time",
          label: "Out Time",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <Box>{value && dateFormat(value, "DD-MM-YYYY hh:mm A")}</Box>
              );
            },
          },
        },
        {
          name: "status",
          label: "Status",
          options: {
            filter: true,
            sort: true,
            display: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <Box>
                  {value === "present" && (
                    <Box
                      style={{
                        textTransform: "capitalize",
                        color: "#007EFF",
                        fontSize: "18px",
                      }}
                    >
                      {value}
                    </Box>
                  )}
                  {value === "absent" && (
                    <Box
                      style={{
                        textTransform: "capitalize",
                        color: "#e92020",
                        fontSize: "18px",
                      }}
                    >
                      {value}
                    </Box>
                  )}
                  {(value === "halfday" ||
                    value === "late" ||
                    value === "lateandhalfday" ||
                    value === "halfdaylate") && (
                      <Box
                        style={{
                          textTransform: "capitalize",
                          color: "#c93db2",
                          fontSize: "18px",
                        }}
                      >
                        {value}
                      </Box>
                    )}
                  {value === "unmarked" && (
                    <Box
                      style={{
                        textTransform: "capitalize",
                        color: "#a5a122",
                        fontSize: "18px",
                      }}
                    >
                      {value}
                    </Box>
                  )}
                </Box>
              );
            },
          },
        },
        {
          name: "Actions",
          label: "Actions",
          options: {
            display: this.updatePermissions("display"),
            filter: false,
            sort: false,
            viewColumns: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  <ActionColumn
                    id={tableMeta.rowData[0]}
                    fieldValues={this.fieldValues(
                      tableMeta.rowData[3],
                      tableMeta.rowData[4]
                    )}
                    label="Update Attendance Details"
                    fieldDetails={this.state.fieldDetails}
                    updateUrl={PUT_URL.staffattendance.api}
                    updatePostFormat={this.updatePostFormat}
                    updateType={this.updateType}
                    baseClassName="action-basic-detail-width"
                    enabledActions={this.state.enabledActions}
                  />
                </div>
              );
            },
          },
        },
      ],
      activeSummaryFilter: "all",
      summary: {
        number_of_marked_checkin: 0,
        number_of_staff_marked: 0,
        number_of_staff_unmarked: 0,
        number_of_late_comes: 0
      },
      // Bulk edit state
      selectedRows: [],
      showBulkEditDialog: false,
    };
    // Use a ref to store the current filtered list without causing re-renders
    this.currentFilteredListRef = { current: [] };
  }

  updateFieldDetails() {
    const { selected_date } = this.state;
    let minDate = moment(selected_date).subtract(1, "days");
    let maxDate = moment(selected_date).add(1, "days");
    fieldDetailsGlobal.map((data) => {
      if (data.name === "in_time") {
        data["minDate"] = minDate;
        data["maxDate"] = maxDate;
      } else if (data.name === "out_time") {
        data["minDate"] = minDate;
        data["maxDate"] = maxDate;
      }
    });
    this.setState({
      fieldDetails: fieldDetailsGlobal,
    });
  }

  fieldValues(in_time, out_time) {
    let fieldValues = [];
    if (in_time) {
      fieldValues.push(false);
    } else {
      fieldValues.push(true);
    }
    fieldValues.push(in_time);
    fieldValues.push(out_time);
    return fieldValues;
  }

  renderManuallyEditedBy = (value, tableMeta) => {
    const { attendanceList, activeSummaryFilter } = this.state;
    let currentFilteredList = this.currentFilteredListRef.current;
    
    if (!currentFilteredList || currentFilteredList.length === 0) {
      currentFilteredList = attendanceList;
      if (activeSummaryFilter === "marked") {
        currentFilteredList = attendanceList.filter((row) => row.status !== "unmarked");
      } else if (activeSummaryFilter === "unmarked") {
        currentFilteredList = attendanceList.filter((row) => row.status === "unmarked");
      } else if (activeSummaryFilter === "checkin") {
        currentFilteredList = attendanceList.filter((row) => row.in_time !== null);
      } else if (activeSummaryFilter === "late") {
        currentFilteredList = attendanceList.filter((row) => row.status === "late");
      }
    }
    
    const attendanceData = currentFilteredList && currentFilteredList[tableMeta.rowIndex] 
      ? currentFilteredList[tableMeta.rowIndex] 
      : null;
    
    if (!attendanceData || !attendanceData.is_status_manually_set) {
      return <Box style={{ color: "#999", fontStyle: "italic" }}>-</Box>;
    }
    
    const changedByName = attendanceData.status_changed_by_name || "Unknown";
    const changedAt = attendanceData.status_changed_at;
    
    return (
      <Box>
        <Box style={{ fontSize: "14px", fontWeight: 500 }}>
          {changedByName}
        </Box>
        {changedAt && (
          <Box style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
            {dateFormat(changedAt, "DD-MM-YYYY hh:mm A")}
          </Box>
        )}
      </Box>
    );
  };

  renderStatusWithIcon = (value, tableMeta) => {
    const { attendanceList, activeSummaryFilter } = this.state;
    let currentFilteredList = this.currentFilteredListRef.current;
    
    if (!currentFilteredList || currentFilteredList.length === 0) {
      currentFilteredList = attendanceList;
      if (activeSummaryFilter === "marked") {
        currentFilteredList = attendanceList.filter((row) => row.status !== "unmarked");
      } else if (activeSummaryFilter === "unmarked") {
        currentFilteredList = attendanceList.filter((row) => row.status === "unmarked");
      } else if (activeSummaryFilter === "checkin") {
        currentFilteredList = attendanceList.filter((row) => row.in_time !== null);
      } else if (activeSummaryFilter === "late") {
        currentFilteredList = attendanceList.filter((row) => row.status === "late");
      }
    }
    
    const attendanceData = currentFilteredList && currentFilteredList[tableMeta.rowIndex] 
      ? currentFilteredList[tableMeta.rowIndex] 
      : null;
    
    const isManuallySet = attendanceData && attendanceData.is_status_manually_set;
    const changedByName = attendanceData?.status_changed_by_name || null;
    const changedAt = attendanceData?.status_changed_at || null;
    
    const getStatusColor = (status) => {
      if (status === "present") return "#007EFF";
      if (status === "absent") return "#e92020";
      if (["halfday", "late", "lateandhalfday", "halfdaylate"].includes(status)) return "#c93db2";
      if (status === "unmarked") return "#a5a122";
      return "#000";
    };
    
    const statusBox = (
      <Box
        style={{
          textTransform: "capitalize",
          color: getStatusColor(value),
          fontSize: "18px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {value}
        {isManuallySet && (
          <InfoIcon 
            style={{ 
              fontSize: "16px", 
              color: "#666",
              cursor: "help"
            }} 
          />
        )}
      </Box>
    );
    
    if (isManuallySet && (changedByName || changedAt)) {
      const tooltipContent = (
        <Box style={{ padding: "4px" }}>
          <Box style={{ fontWeight: 500, marginBottom: "4px" }}>Manually Edited</Box>
          {changedByName && (
            <Box style={{ fontSize: "12px" }}>By: {changedByName}</Box>
          )}
          {changedAt && (
            <Box style={{ fontSize: "12px", marginTop: "4px" }}>
              On: {dateFormat(changedAt, "DD-MM-YYYY hh:mm A")}
            </Box>
          )}
        </Box>
      );
      
      return (
        <Tooltip
          title={tooltipContent}
          enterDelay={300}
          enterNextDelay={300}
          placement="top-start"
          classes={{ tooltip: "tooltip-show-data" }}
        >
          {statusBox}
        </Tooltip>
      );
    }
    
    return statusBox;
  };

  updatePostFormat = (newData) => {
    let payload = {};
    if (newData["isAbsent"]) {
      payload = {
        status: "absent",
      };
    } else {
      let validate = true;
      if (!newData.in_time) {
        validate = false;
        payload["error"] = "Enter In Time";
      }
      // let error_check_out = ''
      // error_check_out = validateDate(newData.out_time?newData.out_time:new Date(), newData.in_time,new Date(),'time')
      // if (error_check_out !== '') {
      //     payload['error'] = `Minimum time ${dateFormat(newData.in_time, 'DD-MM-YYYY hh:mm A')}`
      //     validate = false
      // }
      if (newData.in_time && newData.out_time && validate) {
        let DutyDayStartTime = moment(newData.in_time, "YYYY-MM-DD HH:mm");
        let DutyDayEndTime = moment(newData.out_time, "YYYY-MM-DD HH:mm");
        let diffTime = DutyDayEndTime.diff(DutyDayStartTime, "minutes");
        if (diffTime < 5) {
          validate = false;
          payload["error"] =
            "Difference between In time and Out time should be minimum 5 minutes";
        } else if (diffTime > 720) {
          validate = false;
          payload["error"] =
            "Difference between In time and Out time should not exceed 12 hours";
        }
      }
      if (validate) {
        payload = {
          status: newData.status,
          in_time: dateFormat(newData.in_time, "YYYY-MM-DD HH:mm:ss"),
          out_time: newData.out_time
            ? dateFormat(newData.out_time, "YYYY-MM-DD HH:mm:ss")
            : null,
        };
      }
    }
    return payload;
  };

  updatePermissions = (name) => {
    let test = true;
    const hasEditPermission = isUserHasPermission(
      "manage_staff_attendance",
      "update"
    );
    let enabledActions = [];
    if (hasEditPermission) {
      enabledActions.push("edit");
    }
    if (enabledActions.length === 0) {
      test = false;
    }
    if (name === "display") {
      return test;
    } else {
      this.setState({
        enabledActions: enabledActions,
        columns: this.state.columns,
      });
    }
  };

  componentDidMount = () => {
    let { selected_date } = this.state
    console.log(selected_date, 'selecte date')
    if (selected_date) {
      this.setState(
        {
          selected_date: selected_date,
          tableUpdating: true,
        },
        () => {
          this.updateFieldDetails();
          this.getAttendanceList();
        }
      );
    }

    this.updatePermissions("actions");
    let options = _.cloneDeep(multiOptions);
    // Enable row selection for bulk edit (only if user has update permission)
    if (isUserHasPermission("manage_staff_attendance", "update")) {
      options["selectableRows"] = "multiple";
      options["onRowSelectionChange"] = this.handleRowSelectionChange;
    } else {
      options["selectableRows"] = "none";
    }
    options["filter"] = true;
    options["onRowsSelect"] = this.handleRowSelect;

    this.setState({
      options: _.cloneDeep(options),
    });
  };

  // Handle row selection for bulk edit
  handleRowSelectionChange = (currentRowsSelected, allRowsSelected, rowsSelected) => {
    const { attendanceList, selected_date } = this.state;
    const selectedRecords = rowsSelected.map((index) => {
      const row = attendanceList[index];
      return {
        id: row.id,
        staff_id: row.staff,
        for_date: dateFormat(selected_date, "YYYY-MM-DD"),
        staff_name: row.staff_name,
      };
    });
    this.setState({ selectedRows: selectedRecords });
  };

  // Open bulk edit dialog
  handleOpenBulkEdit = () => {
    const { selectedRows } = this.state;
    if (selectedRows.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Records Selected",
        text: "Please select at least one attendance record to edit",
      });
      return;
    }
    this.setState({ showBulkEditDialog: true });
  };

  // Close bulk edit dialog
  handleCloseBulkEdit = () => {
    this.setState({ showBulkEditDialog: false });
  };

  // Handle successful bulk edit
  handleBulkEditSuccess = () => {
    this.setState({ selectedRows: [], tableUpdating: true });
    this.getAttendanceList();
  };

  getAttendanceList = () => {
    let { columns, selected_date } = this.state;
    const url = GET_URL.staffattendance.api;
    selected_date = dateFormat(selected_date, "YYYY-MM-DD");
    const param = { from_date: selected_date, to_date: selected_date };
    getRequest(url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          tableUpdating: false,
          attendanceList: response.data.data,
          summary: response.data.summary,
          columns: [...columns],
          pageLoading: false,
          isBlankPage: false,
        });
      }
    });
  };

  updateType = () => {
    const { year } = this.state;
    this.setState({ tableUpdating: true });
    this.getAttendanceList();
    return true;
  };

  handleRowSelect = (currentRowsSelected, allRowsSelected) => {
    // Use the ref to get the current filtered list that matches what's displayed in the table
    const { attendanceList, activeSummaryFilter } = this.state;
    let currentFilteredList = this.currentFilteredListRef.current;
    
    // If ref isn't set, calculate filtered list on the fly (fallback)
    if (!currentFilteredList || currentFilteredList.length === 0) {
      currentFilteredList = attendanceList;
      if (activeSummaryFilter === "marked") {
        currentFilteredList = attendanceList.filter((row) => row.status !== "unmarked");
      } else if (activeSummaryFilter === "unmarked") {
        currentFilteredList = attendanceList.filter((row) => row.status === "unmarked");
      } else if (activeSummaryFilter === "checkin") {
        currentFilteredList = attendanceList.filter((row) => row.in_time !== null);
      } else if (activeSummaryFilter === "late") {
        currentFilteredList = attendanceList.filter((row) => row.status === "late");
      }
    }
    
    // Extract actual attendance IDs from the selected rows using dataIndex
    const selectedAttendanceIds = [];
    const staffAttendancePairs = [];

    allRowsSelected.forEach((row) => {
      const dataIndex = row.dataIndex;
      if (dataIndex !== undefined && dataIndex !== null &&
          !isNaN(dataIndex) &&
          dataIndex >= 0 && dataIndex < currentFilteredList.length) {
        const rowData = currentFilteredList[dataIndex];
        if (rowData) {
          if (rowData.id !== undefined && rowData.id !== null) {
            selectedAttendanceIds.push(rowData.id);
          } else if (rowData.staff && rowData.for_date) {
            staffAttendancePairs.push({
              staff_id: rowData.staff,
              for_date: rowData.for_date
            });
          }
        }
      }
    });

    const selectedDataIndices = allRowsSelected.map((row) => row.dataIndex);
    const hasSelection = selectedAttendanceIds.length > 0 || staffAttendancePairs.length > 0;
    
    // Update columns to hide/show Actions column based on selection
    let { columns } = this.state;
    columns = columns.map((col) => {
      if (col.name === "Actions") {
        return {
          ...col,
          options: {
            ...col.options,
            display: hasSelection ? false : this.updatePermissions("display"),
          },
        };
      }
      return col;
    });
    
    this.setState({
      selectedRows: selectedAttendanceIds,
      selectedStaffAttendancePairs: staffAttendancePairs,
      selectedDataIndices: selectedDataIndices,
      columns: columns,
    });
  };

  handleBulkStatusUpdate = () => {
    const { selectedRows, selectedStaffAttendancePairs, selected_date, selectedStatus, statusList } = this.state;
    
    if (!selectedStatus) {
      Swal.fire({
        position: "top-end",
        type: "warning",
        title: "Please select a status",
        showConfirmButton: false,
        timer: 2000,
      });
      return;
    }
    
    const attendanceIds = Array.isArray(selectedRows) ? selectedRows.filter((id) => id !== null && id !== undefined) : [];
    const staffAttendancePairs = Array.isArray(selectedStaffAttendancePairs) ? selectedStaffAttendancePairs : [];
    
    if (attendanceIds.length === 0 && staffAttendancePairs.length === 0) {
      Swal.fire({
        position: "top-end",
        type: "error",
        title: "No valid attendance records selected",
        showConfirmButton: false,
        timer: 2000,
      });
      return;
    }
    
    const totalRecords = attendanceIds.length + staffAttendancePairs.length;
    const statusLabel = statusList && statusList[selectedStatus] ? statusList[selectedStatus].description : selectedStatus;
    Swal.fire({
      title: `Mark selected as ${statusLabel}?`,
      text: `This will update ${totalRecords} attendance record(s)`,
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, update it!",
    }).then((result) => {
      if (result.value) {
        this.setState({ tableUpdating: true });
        const url = PUT_URL.staffattendancebulkupdate
          ? PUT_URL.staffattendancebulkupdate.api
          : "hr/staffattendancebulk/bulk_update/";
        
        const postData = {
          status: selectedStatus,
          for_date: dateFormat(selected_date, "YYYY-MM-DD"),
        };
        
        if (attendanceIds.length > 0) {
          postData.attendance_ids = attendanceIds;
        }
        
        if (staffAttendancePairs.length > 0) {
          postData.staff_attendance_pairs = staffAttendancePairs;
        }

        putRequest(url, postData, this.props).then((response) => {
          if (response && response.status === 200) {
            Swal.fire({
              position: "top-end",
              type: "success",
              title: `Successfully marked ${totalRecords} record(s) as ${statusLabel}`,
              showConfirmButton: false,
              timer: 2000,
            });
            this.setState({
              selectedRows: [],
              selectedDataIndices: [],
              selectedStaffAttendancePairs: [],
              selectedStatus: "",
              tableUpdating: false,
            });
            this.getAttendanceList();
          } else {
            this.setState({ tableUpdating: false });
            const errorMessage = response?.data?.detail || response?.data?.Reason || response?.data?.message || "Failed to update attendance";
            Swal.fire({
              position: "top-end",
              type: "error",
              title: errorMessage,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        }).catch((error) => {
          this.setState({ tableUpdating: false });
          console.error("Error updating attendance:", error);
          const errorMessage = error?.response?.data?.detail || 
                              error?.response?.data?.Reason || 
                              error?.response?.data?.message ||
                              error?.message || 
                              "Failed to update attendance";
          Swal.fire({
            position: "top-end",
            type: "error",
            title: errorMessage,
            showConfirmButton: false,
            timer: 3000,
          });
        });
      }
    });
  };

  handleBulkEditTimes = () => {
    this.setState({ 
      bulkEditDialogOpen: true,
      bulkEditInTime: null,
      bulkEditOutTime: null,
    });
  };

  handleBulkEditSubmit = () => {
    const { 
      selectedRows, 
      selectedStaffAttendancePairs, 
      selected_date, 
      bulkEditInTime, 
      bulkEditOutTime 
    } = this.state;
    
    const attendanceIds = Array.isArray(selectedRows) ? selectedRows.filter((id) => id !== null && id !== undefined) : [];
    const staffAttendancePairs = Array.isArray(selectedStaffAttendancePairs) ? selectedStaffAttendancePairs : [];
    
    if (attendanceIds.length === 0 && staffAttendancePairs.length === 0) {
      Swal.fire({
        position: "top-end",
        type: "error",
        title: "No valid attendance records selected",
        showConfirmButton: false,
        timer: 2000,
      });
      return;
    }
    
    if (!bulkEditInTime && !bulkEditOutTime) {
      Swal.fire({
        position: "top-end",
        type: "warning",
        title: "Please select at least one time (check-in or check-out)",
        showConfirmButton: false,
        timer: 2000,
      });
      return;
    }
    
    const totalRecords = attendanceIds.length + staffAttendancePairs.length;
    Swal.fire({
      title: `Update times for ${totalRecords} record(s)?`,
      text: "This will update the check-in/check-out times for selected records",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, update it!",
    }).then((result) => {
      if (result.value) {
        this.setState({ tableUpdating: true });
        const url = PUT_URL.staffattendancebulkupdate
          ? PUT_URL.staffattendancebulkupdate.api
          : "hr/staffattendancebulk/bulk_update/";
        
        const postData = {
          for_date: dateFormat(selected_date, "YYYY-MM-DD"),
        };
        
        if (attendanceIds.length > 0) {
          postData.attendance_ids = attendanceIds;
        }
        
        if (staffAttendancePairs.length > 0) {
          postData.staff_attendance_pairs = staffAttendancePairs;
        }
        
        if (bulkEditInTime) {
          // Format time as HH:mm:ss
          const timeStr = moment(bulkEditInTime).format("HH:mm:ss");
          postData.in_time = timeStr;
        }
        
        if (bulkEditOutTime) {
          // Format time as HH:mm:ss
          const timeStr = moment(bulkEditOutTime).format("HH:mm:ss");
          postData.out_time = timeStr;
        }

        putRequest(url, postData, this.props).then((response) => {
          if (response && response.status === 200) {
            Swal.fire({
              position: "top-end",
              type: "success",
              title: `Successfully updated ${totalRecords} record(s)`,
              showConfirmButton: false,
              timer: 2000,
            });
            this.setState({
              selectedRows: [],
              selectedDataIndices: [],
              selectedStaffAttendancePairs: [],
              bulkEditDialogOpen: false,
              bulkEditInTime: null,
              bulkEditOutTime: null,
              tableUpdating: false,
            });
            this.getAttendanceList();
          } else {
            this.setState({ tableUpdating: false });
            const errorMessage = response?.data?.detail || response?.data?.Reason || response?.data?.message || "Failed to update attendance";
            Swal.fire({
              position: "top-end",
              type: "error",
              title: errorMessage,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        }).catch((error) => {
          this.setState({ tableUpdating: false });
          console.error("Error updating attendance:", error);
          const errorMessage = error?.response?.data?.detail || 
                              error?.response?.data?.Reason || 
                              error?.response?.data?.message ||
                              error?.message || 
                              "Failed to update attendance";
          Swal.fire({
            position: "top-end",
            type: "error",
            title: errorMessage,
            showConfirmButton: false,
            timer: 3000,
          });
        });
      }
    });
  };

  onChangeSelectedDate = (e, fromDate, toDate) => {
    const { errors } = this.state;
    this.setState(
      {
        selected_date: e,
      },
      () => {
        let error = "";
        if (e === null) {
          this.setState({
            isBlankPage: true,
          });
          error = `Select Date`;
        } else {
          error = validateDate(e, fromDate, toDate);
        }
        if (error !== "" && error !== "Invalid Date") {
          errors["selected_date"] = error;
        } else {
          errors["selected_date"] = "";
          if (error !== "Invalid Date") {
            this.setState({
              tableUpdating: true,
            });
            this.updateFieldDetails();
            this.getAttendanceList();
          }
        }
        this.setState({ errors });
      }
    );
  };

  handleAddAttendanceButton = () => {
    let { errors, alertData, selected_date } = this.state;
    if (Boolean(selected_date)) {
      let dateInformation = {
        selected_date: selected_date,
      };
      let searchParam = "?" + new URLSearchParams(dateInformation).toString();
      this.props.history.push({
        pathname: Actions.manage_staff_attendance.create.url,
        search: searchParam,
      });
    } else {
      alertData = "Select Date";
      errors.selected_date = alertData;
      this.setState({
        open: true,
        alertData,
        errors,
      });
    }
  };

  render() {
    const {
      loading,
      open,
      alertData,
      attendanceList,
      columns,
      options,
      tableUpdating,
      pageLoading,
      isBlankPage,
      errors,
      selected_date,
      fromDate,
      toDate,
      summary,
      activeSummaryFilter,
      statusList,
      selectedStatus,
      selectedRows,
      selectedStaffAttendancePairs,
      bulkEditDialogOpen,
      bulkEditInTime,
      bulkEditOutTime,
    } = this.state;
  
    
    let filteredList = attendanceList;

    if (activeSummaryFilter === "marked") {
      filteredList = attendanceList.filter((row) => row.status !== "unmarked");
    }

    if (activeSummaryFilter === "unmarked") {
      filteredList = attendanceList.filter((row) => row.status === "unmarked");
    }

    if (activeSummaryFilter === "checkin") {
      filteredList = attendanceList.filter((row) => row.in_time !== null);
    }
  
    if (activeSummaryFilter === "late") {
      filteredList = attendanceList.filter((row) => 
        row.status === "late" || 
        row.status === "lateandhalfday" || 
        row.status === "halfdaylate"
      );
    }
  
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Box>
          <Paper className={classNames("paper-background")}>
            <Grid container>
              <Grid item md={8} xs={12} className={classNames("header-align")}>
                <Box className="heading">Staff Attendance</Box>
                <Box className="sub-heading">
                  {`The Attendance schedule of the ${alias_names["school"]
                    } is defined here over a period time.`}
                </Box>
              </Grid>
              <Grid item md={4} xs={12}>
                <Box className={classNames("header-align", "end-flex-prop")}>
                  {isUserHasPermission("manage_staff_attendance", "update") && (
                    <Button
                      variant="outlined"
                      onClick={this.handleOpenBulkEdit}
                      className="mr-10"
                      disabled={this.state.selectedRows.length === 0}
                    >
                      <EditIcon className="visibility-icon" />{" "}
                      Bulk Edit ({this.state.selectedRows.length})
                    </Button>
                  )}
                  {isUserHasPermission("manage_staff_attendance", "create") && (
                    <Button
                      variant="contained"
                      onClick={this.handleAddAttendanceButton}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.manage_staff_attendance.create.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>

            {/* DATE PICKER */}
            <Grid container className="header-align" spacing={2}>
              <Grid item md={3} xs={12}>
                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                  <KeyboardDatePicker
                    autoOk
                    variant="inline"
                    inputVariant="outlined"
                    label="Select Date"
                    fullWidth
                    name="selected_date"
                    minDate={fromDate}
                    maxDate={new Date()}
                    format="dd-MM-yyyy"
                    value={selected_date}
                    onChange={(e) =>
                      this.onChangeSelectedDate(e, minDate, new Date())
                    }
                    KeyboardButtonProps={{
                      "aria-label": "change date",
                    }}
                    helperText={
                      !errors.selected_date
                        ? "Valid Format DD-MM-YYYY"
                        : errors.selected_date
                    }
                    error={
                      errors.selected_date &&
                      (errors.selected_date ? true : false)
                    }
                  />
                </MuiPickersUtilsProvider>
              </Grid>
            </Grid>

            <Grid container className="flex-justify-center header-align">
              {isBlankPage && !pageLoading && (
                <Grid item md={12}>
                  <BlankPagewithIcon data="select date and expect the result" />
                </Grid>
              )}

              {pageLoading && (
                <Box className="loading">
                  <CircularProgress />
                </Box>
              )}

              {!pageLoading && !isBlankPage && (
                <>
                  
                  <Grid item md={12} xs={12} style={{ marginBottom: "20px" }}>
                    <Grid container spacing={3}>

                      {/* Reset Filter Card */}
                      <Grid item xs={12} md={2}>
                        <Paper
                          onClick={() => this.setState({ activeSummaryFilter: "all", selectedRows: [], selectedDataIndices: [], selectedStaffAttendancePairs: [], selectedStatus: "" })}
                          style={{
                            padding: "20px",
                            cursor: "pointer",
                            borderRadius: "10px",
                            border:
                              activeSummaryFilter === "all"
                                ? "3px solid #555"
                                : "1px solid #e0e0e0",
                            transition: "0.3s",
                            boxShadow:
                              activeSummaryFilter === "all"
                                ? "0px 4px 15px rgba(0,0,0,0.2)"
                                : "none",
                          }}
                        >
                          <Typography variant="h6" style={{ color: "#333", fontWeight: 600 }}>
                            Show All
                          </Typography>
                          <Typography variant="h5">{attendanceList.length}</Typography>
                        </Paper>
                      </Grid>

                      {/* Check-in Marked Card */}
                      <Grid item xs={12} md={2}>
                        <Paper
                          onClick={() => this.setState({ activeSummaryFilter: "checkin", selectedRows: [], selectedDataIndices: [], selectedStaffAttendancePairs: [], selectedStatus: "" })}
                          style={{
                            padding: "20px",
                            cursor: "pointer",
                            borderRadius: "10px",
                            border:
                              activeSummaryFilter === "checkin"
                                ? "3px solid #007EFF"
                                : "1px solid #e0e0e0",
                            transition: "0.3s",
                            boxShadow:
                              activeSummaryFilter === "checkin"
                                ? "0px 4px 15px rgba(0,0,0,0.2)"
                                : "none",
                          }}
                        >
                          <Typography variant="h6" style={{ color: "#007EFF", fontWeight: 600 }}>
                            Only Check-in Marked
                          </Typography>
                          <Typography variant="h5">
                            {summary.only_check_in_marked}
                          </Typography>
                        </Paper>
                      </Grid>

                      {/* Staff Marked */}
                      <Grid item xs={12} md={2}>
                        <Paper
                          onClick={() => this.setState({ activeSummaryFilter: "marked", selectedRows: [], selectedDataIndices: [], selectedStaffAttendancePairs: [], selectedStatus: "" })}
                          style={{
                            padding: "20px",
                            cursor: "pointer",
                            borderRadius: "10px",
                            border:
                              activeSummaryFilter === "marked"
                                ? "3px solid #008b3e"
                                : "1px solid #e0e0e0",
                            transition: "0.3s",
                            boxShadow:
                              activeSummaryFilter === "marked"
                                ? "0px 4px 15px rgba(0,0,0,0.2)"
                                : "none",
                          }}
                        >
                          <Typography variant="h6" style={{ color: "#008b3e", fontWeight: 600 }}>
                            Staff Marked
                          </Typography>
                          <Typography variant="h5">
                            {summary.number_of_staff_marked}
                          </Typography>
                        </Paper>
                      </Grid>

                      {/* Staff Unmarked */}
                      <Grid item xs={12} md={2}>
                        <Paper
                          onClick={() => this.setState({ activeSummaryFilter: "unmarked", selectedRows: [], selectedDataIndices: [], selectedStaffAttendancePairs: [], selectedStatus: "" })}
                          style={{
                            padding: "20px",
                            cursor: "pointer",
                            borderRadius: "10px",
                            border:
                              activeSummaryFilter === "unmarked"
                                ? "3px solid #e92020"
                                : "1px solid #e0e0e0",
                            transition: "0.3s",
                            boxShadow:
                              activeSummaryFilter === "unmarked"
                                ? "0px 4px 15px rgba(0,0,0,0.2)"
                                : "none",
                          }}
                        >
                          <Typography variant="h6" style={{ color: "#e92020", fontWeight: 600 }}>
                            Staff Unmarked
                          </Typography>
                          <Typography variant="h5">
                            {summary.number_of_staff_unmarked}
                          </Typography>
                        </Paper>
                      </Grid>

                      {/* Late Comers */}
                      <Grid item xs={12} md={2}>
                        <Paper
                          onClick={() => this.setState({ activeSummaryFilter: "late", selectedRows: [], selectedDataIndices: [], selectedStaffAttendancePairs: [], selectedStatus: "" })}
                          style={{
                            padding: "20px",
                            cursor: "pointer",
                            borderRadius: "10px",
                            border:
                              activeSummaryFilter === "late"
                                ? "3px solid #FF9800"
                                : "1px solid #e0e0e0",
                            transition: "0.3s",
                            boxShadow:
                              activeSummaryFilter === "late"
                                ? "0px 4px 15px rgba(0,0,0,0.2)"
                                : "none",
                          }}
                        >
                          <Typography variant="h6" style={{ color: "#FF9800", fontWeight: 600 }}>
                            Late Comers
                          </Typography>
                          <Typography variant="h5">
                            {summary.number_of_late_comers || 0}
                          </Typography>
                        </Paper>
                      </Grid>

                      {/* BULK UPDATE STATUS CONTROLS */}
                      {isUserHasPermission(Actions.manage_staff_attendance.update) && (
                        <Grid item xs={12} md={12}>
                          <Paper style={{ padding: "15px", backgroundColor: "#f5f5f5" }}>
                            {(() => {
                              const selectedRowsCount = (selectedRows && selectedRows.length) || 0;
                              const selectedPairsCount = (selectedStaffAttendancePairs && selectedStaffAttendancePairs.length) || 0;
                              const totalSelected = selectedRowsCount + selectedPairsCount;
                              const hasSelection = totalSelected > 0;
                              
                              return (
                                <Box>
                                  <Typography variant="body2" style={{ fontWeight: 600, marginBottom: "10px", fontSize: "14px" }}>
                                    {hasSelection 
                                      ? `${totalSelected} record(s) selected`
                                      : "No records selected"}
                                  </Typography>
                                  <Grid container spacing={2} alignItems="center">
                                    <Grid item xs={12} sm={4} md={3}>
                                      <FormControl variant="outlined" size="small" fullWidth>
                                        <InputLabel>Select Status</InputLabel>
                                        <Select
                                          value={selectedStatus}
                                          onChange={(e) => {
                                            this.setState({ selectedStatus: e.target.value });
                                          }}
                                          label="Select Status"
                                          disabled={tableUpdating || !hasSelection}
                                        >
                                          {Object.keys(statusList).map((statusKey) => (
                                            <MenuItem key={statusKey} value={statusKey}>
                                              {statusList[statusKey].description}
                                            </MenuItem>
                                          ))}
                                        </Select>
                                      </FormControl>
                                    </Grid>
                                    <Grid item xs={12} sm={4} md={2}>
                                      <Button
                                        variant="contained"
                                        color="primary"
                                        size="small"
                                        fullWidth
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          this.handleBulkStatusUpdate();
                                        }}
                                        disabled={tableUpdating || !selectedStatus || !hasSelection}
                                      >
                                        Update Status
                                      </Button>
                                    </Grid>
                                    <Grid item xs={12} sm={4} md={2}>
                                      <Button
                                        variant="outlined"
                                        color="secondary"
                                        size="small"
                                        fullWidth
                                        startIcon={<EditIcon />}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          this.handleBulkEditTimes();
                                        }}
                                        disabled={tableUpdating || !hasSelection}
                                      >
                                        Edit Times
                                      </Button>
                                    </Grid>
                                  </Grid>
                                </Box>
                              );
                            })()}
                          </Paper>
                        </Grid>
                      )}
  
                      {/* Late Comes Card */}
                      <Grid item xs={12} md={2}>
                        <Paper
                          onClick={() => this.setState({ activeSummaryFilter: "late" })}
                          style={{
                            padding: "20px",
                            cursor: "pointer",
                            borderRadius: "10px",
                            border:
                              activeSummaryFilter === "late"
                                ? "3px solid #c93db2"
                                : "1px solid #e0e0e0",
                            transition: "0.3s",
                            boxShadow:
                              activeSummaryFilter === "late"
                                ? "0px 4px 15px rgba(0,0,0,0.2)"
                                : "none",
                          }}
                        >
                          <Typography variant="h6" style={{ color: "#c93db2", fontWeight: 600 }}>
                            Late
                          </Typography>
                          <Typography variant="h5">
                            {summary.number_of_late_comes}
                          </Typography>
                        </Paper>
                      </Grid>
  
                    </Grid>
                  </Grid>
  
                 
                  <Grid item md={12} xs={12}>
                    <Paper>
                      <AllMUIDataTable
                        key={filteredList}
                        title={
                          tableUpdating ? (
                            <CircularProgress className="white-text" />
                          ) : (
                            ""
                          )
                        }
                        data={filteredList}
                        columns={columns}
                        options={options}
                      />
                    </Paper>
                  </Grid>
                </>
              )}
            </Grid>
          </Paper>

          {/* Bulk Edit Dialog */}
          {this.state.showBulkEditDialog && (
            <BulkAttendanceEditDialog
              open={this.state.showBulkEditDialog}
              onClose={this.handleCloseBulkEdit}
              selectedRecords={this.state.selectedRows}
              onSuccess={this.handleBulkEditSuccess}
              history={this.props.history}
            />
          )}
        </Box>
      );
    }
  }

}
export default withRouter(HrStaffAttendanceView);
