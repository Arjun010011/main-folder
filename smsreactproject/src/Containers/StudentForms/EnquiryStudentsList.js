import React, { Component, Fragment } from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  TextField,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Typography,
  Tooltip,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import classNames from "classnames";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";
import SendIcon from "@material-ui/icons/Send";
import Swal from "sweetalert2";
import _ from "lodash";
import { debounceSearchRender } from "mui-datatables";
// import QRCode from "qrcode";

import { DateRange } from "Components/DateRange";
import { Dropdown } from "Components/DropDown";
import StudentGridCard from "Components/ProfileGridCard";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest, deleteRequest, postRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, DEL_URL, POST_URL, PUT_URL } from "Includes/urls";
import StudentListActions from "Includes/StudentListActions";
import { Actions } from "Constants/permissions";
import {
  isUserHasPermission,
  dateFormat,
  getIsGridOrListView,
  setIsGridOrListView,
  getAcademicYear,
  SetAcademicYear,
  getPaginationProps,
  getKeyValueMap,
  getFullName,
  getFormatMessage,
  updatePermissions,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { multiOptions, DEFAULT_PAGINATION_PROPS_ID_LIST } from "Constants";
import messages from "./messages";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import StudentProfileCard from "Components/StudentProfileCard";
import Chart from "react-apexcharts";
import { withStyles } from "@material-ui/core/styles";

const StyledTabs = withStyles({
  indicator: {
    backgroundColor: "#1976d2",
    height: 4,
  },
})(Tabs);

const StyledTab = withStyles({
  root: {
    textTransform: "none",
    fontWeight: 600,
    fontSize: 14,
    minWidth: 120,
    "&.Mui-selected": {
      color: "#1976d2",
      border : "1px solid #1976d2",
      borderRadius: "6px 6px 0 0",
    },
  },
})(Tab);

class EnquiryStudentsList extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("enquiry_student", ["view"]);
    this.state = {
      studentList: [],
      AllStudentList: [],
      dataReady: false,
      GridEnabled: false,
      ListEnabled: true,
      loading: true,
      activeTab: 0,
      tableUpdating: false,
      showProgress: false,
      enabledActions: [],
      filterList: [],
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      followupList: { student_list: [], count: 0 },
      followupPagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      searchStudent: "",
      dateRangeValue: {},
      dateRangeValueDefault: {},
      current_standard: null,
      loadingText: "loading..............................................",
      error: {},
      year: "",
      addFollowupDialogOpen: false,
      addFollowupEnquiryId: null,
      addFollowupForm: {
        current_followup_date: "",
        next_followup_date: "",
        status: 1,
        remarks: "",
      },
      addFollowupErrors: {},
      viewFollowupsDialogOpen: false,
      viewFollowupsList: [],
      viewFollowupsLoading: false,
      assignStaffDialogOpen: false,
      assignStaffSelectedIds: [],
      assignStaffGroups: [],
      assignStaffStaffList: [],
      assignStaffSelectedGroup: "",
      assignStaffSelectedStaff: "",
      assignStaffLoading: false,
      assignStaffSubmitting: false,
      assignStaffSearch: "",
      employeeReportData: { data_list: [], count: 0 },
      employeeReportLoading: false,
      dashboardData: null,
      dashboardLoading: false,
      columns: [
        {
          name: "full_name",
          label: <FormattedMessage {...commonMessages.studentName} />,
          options: {
            filter: false,
            sort: true,
            search: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              let student_details = tableMeta?.tableData[tableMeta.rowIndex];
              student_details["number"] = student_details["enquiry_num"];
              return (
                <StudentProfileCard
                  student_name={student_details.full_name}
                  details={student_details}
                  isApiCall={false}
                />
              );
            },
          },
        },
        {
          name: "current_standard_name",
          label: <FormattedMessage {...commonMessages.standard} />,
          options: {
            filter: false,
            sort: true,
            display: true,
          },
        },
        {
          name: "mobile_num",
          label: <FormattedMessage {...commonMessages.mobileNo} />,
          options: {
            filter: false,
            sort: true,
            display: true,
          },
        },
        {
          name: "enquiry_date",
          label: <FormattedMessage {...messages.enquiryDate} />,
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return dateFormat(value, "DD-MM-YYYY");
            },
          },
        },
        {
          name: "id",
          label: <FormattedMessage {...messages.enquiryNo} />,
          options: {
            filter: false,
            sort: true,
            display: true,
            download: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <Box className="text-transform-none">
                  {tableMeta.rowData[5]}
                </Box>
              );
            },
          },
        },
        {
          name: "enquiry_num",
          label: "Enquiry No.",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
            download: true,
          },
        },
        {
          name: "Action",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            display: this.permission.length > 0,
            filter: false,
            sort: false,
            viewColumns: false,
            download: false,
            customBodyRender: (value, tableMeta) => {
        
              const row = tableMeta.tableData[tableMeta.rowIndex];
              const enquiryId = this.getEnquiryId(tableMeta.rowData[4]);
              const followupExists = row.followup_exists;
        
              const print_id = enquiryId
                ? `${enquiryId}/?enquiry_form_download=true`
                : null;
        
              return (
                <Box display="flex" style={{ gap: 8 }}>
        
                  <StudentListActions
                    id={enquiryId}
                    index={tableMeta.rowIndex}
                    deleteStudent={this.deleteStudent}
                    url={GET_URL.getenquiry.api}
                    printId={print_id}
                    print_label="Print Form"
                    editURL={Actions.enquiry_student_list.update.url}
                    viewURL={Actions.enquiry_student.view.url}
                    enabledActions={this.permission}
                    // onGenerateQR={this.generateQRCode}
                  />
        
                  {!followupExists && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={() => this.createFollowup(enquiryId)}
                    >
                      Add Followup
                    </Button>
                  )}
        
                </Box>
              );
            },
          },
        }
      ],
      followupColumns: [
        {
          name: "full_name",
          label: <FormattedMessage {...commonMessages.studentName} />,
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta) => {
              const row = tableMeta.tableData[tableMeta.rowIndex];
              return row?.full_name || value;
            },
          },
        },
        {
          name: "current_standard_name",
          label: <FormattedMessage {...commonMessages.standard} />,
          options: { filter: false, sort: true },
        },
        {
          name: "mobile_num",
          label: <FormattedMessage {...commonMessages.mobileNo} />,
          options: { filter: false, sort: true },
        },
        {
          name: "enquiry_date",
          label: <FormattedMessage {...messages.enquiryDate} />,
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value) => dateFormat(value, "DD-MM-YYYY"),
          },
        },
        {
          name: "enquiry_num",
          label: "Enquiry No.",
          options: { filter: false, sort: true },
        },
        {
          name: "status",
          label: "Status",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value) => {
              if (!value) return "—";
        
              if (value === "Not Interested") {
                return <Box color="white" bgcolor="red" p={1} borderRadius={20} textAlign={1}>Not Interested</Box>;
              }
        
              if (value === "Following") {
                return <Box color="white" bgcolor="blue" p={1} borderRadius={20} textAlign={1}>Following</Box>;
              }
        
              if (value === "Admitted") {
                return <Box color="white" bgcolor="green" p={1} borderRadius={20} textAlign={1}>Admitted</Box>;
              }
        
              return <Box>{value}</Box>;
            },
          },
        },
        {
          name: "last_followup",
          label: "Last Followup",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value) =>
              value ? dateFormat(value, "DD-MM-YYYY HH:mm") : "—",
          },
        },
        {
          name: "next_followup",
          label: "Next Followup",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value) =>
              value ? dateFormat(value, "DD-MM-YYYY HH:mm") : "—",
          },
        },
        {
          name: "enquiry_student",
          label: 'Enquiry Student',
          options: { filter: false, sort: true ,display : false},
        },
        {
          name: "remarks",
          label: 'Remarks',
          options: { filter: false, sort: true },
        },
        {
          name: "no_of_followup",
          label: 'Total Followups',
          options: { filter: false, sort: true },
        },
        {
          name: "staff_name",
          label: 'Staff',
          options: { filter: true, sort: true },
        },
        {
          name: "status",
          label: "Status",
          options: { filter: false, sort: true ,display: false},
        },
        {
          name: "Action",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta) => {
              const row = tableMeta.tableData[tableMeta.rowIndex];
              const rowData = tableMeta.rowData || [];
              console.log(rowData,'dgfyushfsjgfjs')
            
              const statusValue = rowData[5]; // status column
            
              const enquiryStudentId =
                row?.enquiry_student ?? rowData[8] ?? (row?.id ? this.getEnquiryId(row.id) : null);
            
              const nextFollowupRaw = row?.next_followup ?? rowData[7] ?? null;
              const nextFollowupStr = nextFollowupRaw ? String(nextFollowupRaw) : "";
              const nextFollowupYmd = nextFollowupStr
                ? (nextFollowupStr.split(" ")[0] || nextFollowupStr).split("T")[0]
                : null;
            
              return (
                <Box display="flex" style={{ gap: 8 }} flexWrap="wrap">
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    onClick={() => this.handleViewFollowups(enquiryStudentId)}
                    title="Follow ups information"
                  >
                    View Follow ups
                  </Button>
            
                  {statusValue == 'Following'  && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={() =>
                        this.handleAddFollowupClick(
                          enquiryStudentId,
                          nextFollowupYmd || undefined
                        )
                      }
                      title="Add new follow up information"
                    >
                      Add Follow up
                    </Button>
                  )}
                </Box>
              );
            }
          },
        },
      ],
      employeeReportColumns: [
        {
          name: "staff_name",
          label: "Staff",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value) => value || "Unassigned",
          },
        },
        {
          name: "count",
          label: "Count",
          options: {
            filter: true,
            sort: true,
          }
        },
      ],
    };
    this.dateRange = React.createRef();
    this.setTime = null;
  }

  getEnquiryId = (data) => {
    const id = data.split("###");
    return id[0];
  };

  createFollowup = (enquiryId) => {

    const payload = {
      enquiry_student: enquiryId,
      academic_year: this.state.year,
      followup_date: new Date().toISOString().split("T")[0],
      status: 1,
      remarks: "Initial Followup"
    };
  
    const url = POST_URL.enquiryfollowup.api;
  
    postRequest(url, payload, this.props).then((response) => {
  
      if (response && response.status === 200) {
  
        Swal.fire({
          icon: "success",
          title: "Followup Created",
          timer: 1500,
          showConfirmButton: false
        });
  
        this.getStudentList();
  
      }
    });
  };

  // generateQRCode = (id) => {
  //   const { year, yearList } = this.state;
  //   let start_date, end_date, year_name;
    
  //   yearList.map((data) => {
  //     if (data.id == year) {
  //       start_date = data.start_date;
  //       end_date = data.end_date;
  //       year_name = data.name;
  //     }
  //   });
    
  //   const enquiryInfo = {
  //     year,
  //     year_name,
  //     start_date,
  //     end_date,
  //   };
    
  //   // Replace the URL path with public-enquiry/add
  //   const baseUrl = window.location.origin;
  //   const publicEnquiryUrl = `${baseUrl}/public-enquiry/?${new URLSearchParams(enquiryInfo).toString()}`;
    
  //   QRCode.toDataURL(publicEnquiryUrl, { width: 300 }, (err, url) => {
  //     if (err) {
  //       Swal.fire({
  //         icon: 'error',
  //         title: 'Error',
  //         text: 'Failed to generate QR code',
  //       });
  //       return;
  //     }
  //     // Create a temporary link to download the QR code
  //     const link = document.createElement('a');
  //     link.href = url;
  //     link.download = `enquiry-form-qr-${id}.png`;
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
      
  //     Swal.fire({
  //       position: "top-end",
  //       icon: "success",
  //       title: "QR Code downloaded successfully",
  //       showConfirmButton: false,
  //       timer: 1500,
  //     });
  //   });
  // };

  geFilterOptions = () => {
    let {
      current_standard,
      dateRangeValueDefault,
      academicYearFromDate,
      academicYearToDate,
      standardList,
    } = this.state;
    return (
      <Fragment>
        <Box className="margin-top-20">
          <Dropdown
            data={standardList}
            name={current_standard}
            value={current_standard}
            onChange={(e) => this.handleStandardChange(e)}
            label={<FormattedMessage {...commonMessages.standard} />}
            hideSelect={true}
          />
        </Box>
        <DateRange
          handleChange={this.handleChangeDateRange}
          minDate={academicYearFromDate}
          maxDate={academicYearToDate}
          startDate={dateRangeValueDefault.start}
          endDate={dateRangeValueDefault.end}
          ref={this.dateRange}
          label={<FormattedMessage {...commonMessages.dateRange} />}
          hideClearIcon={true}
        />
      </Fragment>
    );
  };

  handleStandardChange = (e) => {
    let { value } = e.target;
    const { pagination } = this.state;
    this.setState(
      {
        current_standard: value,
      },
      () => {
        this.getStudentList(pagination);
      }
    );
  };

  getEnquiryFollowupData = (paginationProps) => {
    const { followupPagination, year } = this.state;
    this.currentFollowupPagination = followupPagination;
    if (paginationProps) {
      this.currentFollowupPagination = { ...paginationProps };
    }
    const pagination_params = getPaginationProps(this.currentFollowupPagination);
    const params = {
      ...pagination_params,
      entry_academic_year: year,
    };
    
    if (paginationProps?.status) {
      params.status = paginationProps.status;
    }
    this.setState({ tableUpdating: true });
    const url = GET_URL.getenquiryfollowup.api;
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        // API: { data: { count, next, previous, data_list } }
        const res = response.data?.data || response.data;
        const dataList = res?.data_list || [];
        const count = res?.count ?? 0;
        const mappedList = dataList.map((item) => {
          const ed = item.enquiry_details || {};
          const sd = ed.student_details || {};
          const cf = ed.custom_form_data || {};
          const fullName =
            item.enquiry_student_name ||
            getFullName(ed.first_name || "", ed.middle_name || "", ed.last_name || "");
          const staff = ed.staff;
          const allocatedStaff =
            staff && (staff.name || staff.full_name || staff.staff_name)
              ? (staff.name || staff.full_name || staff.staff_name)
              : typeof staff === "string"
                ? staff
                : "—";
          const whatLooking =
            cf.interested_in || cf.looking_for || cf.course_interested || cf.remarks ||
            ed.interested_in || ed.looking_for || ed.remarks ||
            ed.about_school || sd.remarks ||
            "—";
          const whatVal = typeof whatLooking === "object" ? (whatLooking?.name || "—") : (whatLooking || "—");
          const enquiryStudentId = ed.id || item.enquiry_student;
          return {
            id: `${enquiryStudentId}###${ed.enquiry_num || ""}`,
            enquiry_student: enquiryStudentId,
            full_name: fullName,
            current_standard_name: ed.current_standard_name || "—",
            mobile_num: ed.mobile_num || "—",
            enquiry_date: ed.enquiry_date || "—",
            enquiry_num: ed.enquiry_num || "—",
            status: item.status_name ?? String(item.status ?? "—"),
            remarks:item.remarks || "—",
            no_of_followup : item.no_of_followup,
            staff_name: item.staff_name || "—",
            last_followup: item.followup_date || null,
            next_followup: item.next_followup_date || null,
            custom_form_data: cf,
            allocated_staff_name: allocatedStaff,
            what_looking_for: whatVal,
          };
        });
        this.setState({
          followupList: { student_list: mappedList, count },
          followupPagination: this.currentFollowupPagination,
          tableUpdating: false,
        });
      } else {
        this.setState({ tableUpdating: false });
      }
    });
  };

  onFollowupTableChange = (tableState) => {

    const statusMap = {
      "Following": 1,
      "Not Interested": 2,
      "Admitted": 3
    };
  
    let statusId = null;
  
    if (tableState.filterList && tableState.filterList[5]?.length) {
      const statusText = tableState.filterList[5][0];
      statusId = statusMap[statusText];
    }
  
    const params = {
      ...tableState,
      status: statusId
    };
  
    this.getEnquiryFollowupData(params);
  };

  componentDidMount() {
    let { GridEnabled, ListEnabled } = this.state;
    this.getAcademicYearList();
    this.permission = [
      ...this.permission,
      "print",
      ...updatePermissions("enquiry_student_list", ["update", "delete"]),
    ];
    if (getIsGridOrListView()) {
      let isGridView = getIsGridOrListView() === "true";
      if (isGridView) {
        // GridEnabled = true
        // ListEnabled = false
      }
    }
    this.setState({
      GridEnabled,
      ListEnabled,
    });
  }

  handleChangeDateRange = (value) => {
    let { pagination } = this.state;
    this.setState(
      {
        dateRangeValue: value,
        dateRangeValueDefault: value,
      },
      () => {
        this.getStudentList(pagination);
      }
    );
  };

  onFilterChangeHandler = (type) => {
    if (type === "reset") {
      this.setState(
        {
          tableUpdating: true,
          current_standard: null,
          dateRangeValue: {},
          dateRangeValueDefault: {},
        },
        () => {
          this.getStudentList();
          this.dateRange.current.handleClear();
        }
      );
    }
  };

  getAcademicYearList = async () => {
    let { year } = this.state;
    const url = GET_URL.getacademicyear.api;
    const param = { is_active: true , is_finance_page: true};
    await getRequest(url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        let fromYear = "";
        let ToYear = "";
        response.data.data.map((data) => {
          fromYear = data.start_date.split("-");
          ToYear = data.end_date.split("-");
          // data.name = fromYear[0] + "-" + ToYear[0];
        });
        this.setState(
          {
            yearList: response.data.data,
          },
          () => {
            if (getAcademicYear()) {
              year = getAcademicYear();
              this.setState(
                {
                  year,
                },
                () => {
                  this.getStandardList();
                }
              );
            } else {
              this.setState({
                loading: false,
              });
            }
          }
        );
      }
    });
  };

  onChange = async (e) => {
    let { value } = e.target;
  
    if (value !== 0) {
      SetAcademicYear(value);
  
      this.setState(
        {
          year: value,
          tableUpdating: true,
          academicYearFromDate: "",
          academicYearToDate: "",
          current_standard: null,
          dateRangeValue: {},
          error: {},
        },
        () => {
          // reload all tables
          this.getStandardList();
          this.getStudentList();
          this.getEnquiryFollowupData();
          this.getEmployeeReportData();
          this.getDashboardData();
        }
      );
    }
  };

  getStandardList = () => {
    let { year, yearList, academicYearFromDate, academicYearToDate } =
      this.state;
    yearList.map((data) => {
      if (data.id == year) {
        academicYearFromDate = data.start_date;
        academicYearToDate = data.end_date;
      }
    });
    const url = GET_URL.getstandard.api;
    const param = { is_active: true, academic_year: year , is_finance_page: true};
    getRequest(url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            standardList: response.data.data,
            academicYearFromDate,
            academicYearToDate,
          },
          () => {
            this.getStudentList();
          }
        );
      }
    });
  };

  getStudentList = (paginationProps) => {
    let { pagination, year, current_standard, dateRangeValue } = this.state;
    this.setState({ dateRangeValue: dateRangeValue });
    this.currentPagination = pagination;
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    let params = {
      ...pagination_params,
      entry_academic_year: year,
      is_active: true,
    };
    if (current_standard && !_.isEmpty(dateRangeValue)) {
      params = {
        ...pagination_params,
        entry_academic_year: year,
        is_active: true,
        current_standard: current_standard,
        from_date: dateRangeValue.start,
        to_date: dateRangeValue.end,
      };
    }
    if (current_standard && _.isEmpty(dateRangeValue)) {
      params = {
        ...pagination_params,
        entry_academic_year: year,
        is_active: true,
        current_standard: current_standard,
      };
    }
    if (!_.isEmpty(dateRangeValue) && current_standard) {
      params = {
        ...pagination_params,
        entry_academic_year: year,
        is_active: true,
        current_standard: current_standard,
        from_date: dateRangeValue.start,
        to_date: dateRangeValue.end,
      };
    }
    if (!_.isEmpty(dateRangeValue) && !current_standard) {
      params = {
        ...pagination_params,
        entry_academic_year: year,
        is_active: true,
        from_date: dateRangeValue.start,
        to_date: dateRangeValue.end,
      };
    }
    let prop = { ...this.props };
    if ( paginationProps === 'download' ){
      params['download_excel'] = 1;
      prop.responseType = "blob";
    }
    const url = GET_URL.getenquiry.api;
    getRequest(url, params, prop).then((response) => {
      if (response && response.status === 200) {
        if (paginationProps === "download") {
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `Enquiry_Student_List.xlsx`);
          document.body.appendChild(link);
          console.log(link , 'pooja')
          link.click();
          this.setState({
            tableUpdating: false,
            loading: false,
          });
          return;
        }
        const studentList = response.data;
        studentList.data.student_list.map((data) => {
          data["full_name"] = getFullName(
            data["first_name"],
            data["middle_name"],
            data["last_name"]
          );
        
          data["id"] = `${data["id"]}###${data["enquiry_num"]}`;
        
          data["followup_exists"] = data["followup_exists"];  // important
        });
        this.setState({
          studentList: studentList.data,
          AllStudentList: studentList.data,
          dataReady: true,
          loading: false,
          tableUpdating: false,
          pagination: this.currentPagination,
          dateRangeValue: dateRangeValue,
          showProgress: false,
        });
      }
    });
    return false
  };

  multiDelete = (deleteData) => {
    this.setState({ tableUpdating: true });
    let { studentList, columns } = this.state;
    let id = [];
    let idTemp = "";
    deleteData.map((data) => {
      idTemp = "";
      idTemp = studentList.student_list[data.dataIndex].id;
      idTemp = idTemp.split("###");
      idTemp = idTemp[0];
      id.push(idTemp);
    });
    const del_url = DEL_URL.enquiry.api;
    const data = { data: id };
    const url = del_url + 1 + "/";
    deleteRequest(url, data, this.props).then((response) => {
      if (response && response.status === 200) {
        this.getStudentList();
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
      }
    });
    this.setState({ tableUpdating: false });
  };

  deleteStudent = async (id, index) => {
    this.setState({ tableUpdating: true });
    let { studentList, columns } = this.state;
    const del_url = DEL_URL.enquiry.api;
    const data = { data: [id] };
    const url = del_url + id + "/";
    deleteRequest(url, data, this.props).then((response) => {
      if (response && response.status === 200) {
        studentList.student_list.splice(index, 1);
        this.setState({
          studentList: { ...studentList },
          columns: [...columns],
        });
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
      }
    });
    this.setState({ tableUpdating: false });
  };

  onChangeHandleView = (name) => {
    let { AllStudentList, studentList, filterList } = this.state;
    let GridEnabled = false;
    let ListEnabled = false;
    let setValue = false;
    if (name === "GridEnabled") {
      setValue = true;
      GridEnabled = true;
      if (filterList.length !== 0) studentList = [...filterList];
    } else {
      studentList = [...AllStudentList];
      ListEnabled = true;
    }
    setIsGridOrListView(setValue);
    this.setState({
      GridEnabled,
      ListEnabled,
      studentList,
    });
  };

  handleFilter = (e) => {
    let { name, value, filterList } = e.target;
    let { studentList, AllStudentList } = this.state;
    if (value !== "") {
      let lowerCasedFilter = value.toLowerCase();
      filterList = AllStudentList.filter((item) => {
        return Object.keys(item).some(
          (key) =>
            typeof item[key] === "string" &&
            item[key].toLowerCase().includes(lowerCasedFilter)
        );
      });
      studentList = filterList;
    } else {
      studentList = [...AllStudentList];
      filterList = [];
    }
    this.setState({
      [name]: value,
      studentList,
      filterList,
    });
  };

  handleFilterClose = () => {
    // this.setState({
    // dateRangeValueDefault: {}
    // })
  };

  handleSendAds = (enquiryId, rowIndex) => {
    if (!enquiryId) return;
    Swal.fire({
      icon: "info",
      title: "Send Ads",
      text: `Send ads for enquiry #${enquiryId} (feature to be implemented)`,
    });
  };

  handleViewFollowups = (enquiryStudentId) => {
    if (!enquiryStudentId) return;
    const id = parseInt(enquiryStudentId, 10) || Number(enquiryStudentId);
    this.setState({ viewFollowupsDialogOpen: true, viewFollowupsLoading: true, viewFollowupsList: [] });
    const url = `${GET_URL.getenquiryfollowup.api}${id}/`;
    const params = { enquiry_student: id };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const res = response.data;
        const list = Array.isArray(res)
          ? res
          : res?.data_list || res?.data || [];
        this.setState({ viewFollowupsList: list, viewFollowupsLoading: false });
      } else {
        this.setState({ viewFollowupsLoading: false });
      }
    }).catch(() => {
      this.setState({ viewFollowupsLoading: false });
    });
  };

  getFollowupStatusLabel = (status) => {
    const s = this.FOLLOWUP_STATUS.find((x) => x.value === status);
    return s ? s.label : (status ?? "—");
  };

  handleViewFollowupsClose = () => {
    this.setState({ viewFollowupsDialogOpen: false, viewFollowupsList: [] });
  };

  handleSetDefaultStaff = () => {
    Swal.fire({
      icon: "info",
      title: "Set Default Staff",
      text: "Set default staff (feature to be implemented)",
    });
  };

  handleAssignStaff = () => {
    this.setState({
      assignStaffDialogOpen: true,
      assignStaffSelectedIds: [],
      assignStaffSelectedStaff: "",
      assignStaffSelectedGroup: "",
      assignStaffLoading: true,
    });
    Promise.all([
      getRequest(GET_URL.groups.api, {}, this.props),
      getRequest(GET_URL.staff.api, { is_active: true }, this.props),
    ]).then(([groupsRes, staffRes]) => {
      const groups = (groupsRes?.data?.data || groupsRes?.data || []).map((g) => ({
        id: g.id,
        name: g.name || g.group_name || g.id,
      }));
      const staffList = (staffRes?.data?.data || staffRes?.data || []).map((s) => ({
        id: s.id,
        name: getFullName(s.first_name, s.middle_name, s.last_name) || s.name || s.id,
        group: Array.isArray(s.group_name) ? s.group_name[0] : (s.group_name?.name ?? s.group_name),
      }));
      this.setState({
        assignStaffGroups: groups,
        assignStaffStaffList: staffList,
        assignStaffLoading: false,
      });
      this.getEnquiryFollowupData()
    }).catch(() => {
      this.setState({ assignStaffLoading: false });
    });
  };

  handleAssignStaffClose = () => {
    this.setState({
      assignStaffDialogOpen: false,
      assignStaffSelectedIds: [],
      assignStaffSelectedStaff: "",
      assignStaffSelectedGroup: "",
    });
  };

  handleAssignStaffToggleEnquiry = (enquiryStudentId) => {
    const id = parseInt(enquiryStudentId, 10) || Number(enquiryStudentId);
    this.setState((prev) => {
      const set = new Set(prev.assignStaffSelectedIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { assignStaffSelectedIds: Array.from(set) };
    });
  };

  handleAssignStaffSelectAll = (checked) => {
    const list = this.state.followupList.student_list || [];
    const ids = list.map((row) => parseInt(row.enquiry_student ?? this.getEnquiryId(row.id), 10)).filter(Boolean);
    this.setState({ assignStaffSelectedIds: checked ? ids : [] });
  };

  handleAssignStaffSubmit = () => {
    const { assignStaffSelectedIds, assignStaffSelectedStaff, year } = this.state;
    if (!assignStaffSelectedStaff || assignStaffSelectedIds.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Required",
        text: "Please select at least one enquiry and a staff.",
      });
      return;
    }
    this.setState({ assignStaffSubmitting: true });
    const baseUrl = `${PUT_URL.enquiry.api}`;
    const staffId = parseInt(assignStaffSelectedStaff, 10);
    const promises = assignStaffSelectedIds.map((enquiryId) =>
      putRequest(`${baseUrl}${enquiryId}/?staff=${assignStaffSelectedStaff}`, { staff: staffId, entry_academic_year: year }, this.props)
    );
    Promise.all(promises).then((responses) => {
      const allOk = responses.every((r) => r && r.status === 200);
      this.setState({ assignStaffSubmitting: false });
      this.handleAssignStaffClose();
      this.getEnquiryFollowupData();
      Swal.fire({
        icon: allOk ? "success" : "warning",
        title: allOk ? "Success" : "Completed",
        text: allOk ? "Staff assigned successfully." : "Some updates may have failed.",
        showConfirmButton: false,
        timer: 1500,
      });
    }).catch(() => {
      this.setState({ assignStaffSubmitting: false });
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to assign staff.",
      });
    });
  };

  FOLLOWUP_STATUS = [
    { value: 1, label: "Following" },
    { value: 2, label: "Not Interested" },
    { value: 3, label: "Admitted" },
  ];

  handleAddFollowupClick = (enquiryId, nextFollowupDate) => {
    const today = new Date().toISOString().split("T")[0];
    const currentDate = nextFollowupDate || today;
    const selectedYear = this.state.year;
    this.setState({
      addFollowupDialogOpen: true,
      addFollowupEnquiryId: enquiryId,
      addFollowupForm: {
        current_followup_date: currentDate,
        next_followup_date: "",
        status: 1,
        academic_year: selectedYear,
        remarks: "",
      },
      addFollowupErrors: {},
    });
  };

  handleAddFollowupClose = () => {
    this.setState({
      addFollowupDialogOpen: false,
      addFollowupEnquiryId: null,
      addFollowupForm: {
        current_followup_date: "",
        next_followup_date: "",
        status: 1,
        remarks: "",
      },
      addFollowupErrors: {},
    });
  };

  handleAddFollowupFormChange = (e) => {
    const { name, value } = e.target;
    const parsed = name === "status" ? Number(value) : value;
    this.setState((prev) => ({
      addFollowupForm: { ...prev.addFollowupForm, [name]: parsed },
      addFollowupErrors: { ...prev.addFollowupErrors, [name]: "" },
    }));
  };

  handleAddFollowupSubmit = () => {
    const { addFollowupForm, addFollowupEnquiryId, year } = this.state;
    const { status, next_followup_date } = addFollowupForm;
    const errors = {};

    if (status === 1 && !next_followup_date) {
      errors.next_followup_date = "Next follow up date is mandatory for this status";
    }

    if (Object.keys(errors).length > 0) {
      this.setState({ addFollowupErrors: errors });
      return;
    }

    const url = POST_URL.enquiryfollowup?.api || GET_URL.getenquiryfollowup.api;
    const enquiryStudentId = parseInt(addFollowupEnquiryId, 10) || Number(addFollowupEnquiryId);
    const payload = {
      enquiry_student: enquiryStudentId,
      followup_date: addFollowupForm.current_followup_date,
      next_followup_date: addFollowupForm.next_followup_date || null,
      status: Number(addFollowupForm.status),
      remarks: addFollowupForm.remarks || "",
      academic_year: parseInt(year, 10),
    };

    postRequest(url, payload, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: response.data?.Reason || "Follow up added successfully",
          showConfirmButton: false,
          timer: 1500,
        });
        this.handleAddFollowupClose();
        this.getEnquiryFollowupData();
      }
    });
  };

  getEmployeeReportData = () => {
    const { year } = this.state;
    if (!year) return;
    this.setState({ employeeReportLoading: true });
    const url = GET_URL.enquiryemployeereport?.api || "/forms/enquiryemployeereport/";
    const params = { entry_academic_year: year };
    getRequest(url, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const res = response.data?.data || response.data;
          const dataList = Array.isArray(res) ? res : (res?.data_list || []);
          const count = res?.count ?? dataList.length;
          const mappedList = dataList.map((item) => ({
            id: item.id,
            full_name: getFullName(
              item.first_name || "",
              item.middle_name || "",
              item.last_name || ""
            ),
            current_standard_name: item.current_standard_name || "—",
            enquiry_num: item.enquiry_num || "—",
            enquiry_date: item.enquiry_date || "—",
            mobile_num: item.mobile_num || "—",
            staff_name: item.staff_name != null && item.staff_name !== " " ? item.staff_name : "Unassigned",
            count: item.count || 0,
          }));
          this.setState({
            employeeReportData: { data_list: mappedList, count },
            employeeReportLoading: false,
          });
        } else {
          this.setState({ employeeReportLoading: false });
        }
      })
      .catch(() => this.setState({ employeeReportLoading: false }));
  };

  getDashboardData = () => {
    const { year } = this.state;
    if (!year) return;
    this.setState({ dashboardLoading: true });
    const url = GET_URL.enquirydashboard?.api || "/forms/enquirydashboard/";
    const params = { entry_academic_year: year };
    getRequest(url, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const data = response.data?.data || response.data;
          this.setState({
            dashboardData: data || null,
            dashboardLoading: false,
          });
        } else {
          this.setState({ dashboardLoading: false });
        }
      })
      .catch(() => this.setState({ dashboardLoading: false }));
  };

  handleStaffSearch = (e) => {
    const value = e.target.value;
  
    this.setState({ assignStaffSearch: value });
  
    const params = {
      is_active: true,
      search: value,
    };
  
    getRequest(GET_URL.staff.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const staffList = (response?.data?.data || response?.data || []).map((s) => ({
          id: s.id,
          name:
            getFullName(s.first_name, s.middle_name, s.last_name) ||
            s.name ||
            s.id,
          group: Array.isArray(s.group_name) ? s.group_name[0] : (s.group_name?.name ?? s.group_name),
        }));

        this.setState({
          assignStaffStaffList: staffList,
        });
      }
    });
  };

  handleAddEnquiryButton = () => {
    let { year, error, alertData, yearList } = this.state;
    if (year !== "") {
      let start_date, end_date, year_name;
      yearList.map((data) => {
        if (data.id == year) {
          start_date = data.start_date;
          end_date = data.end_date;
          year_name = data.name;
        }
      });
      let yearInformation = {
        year,
        year_name,
        start_date,
        end_date,
      };
      let searchParam = "?" + new URLSearchParams(yearInformation).toString();
      this.props.history.push({
        pathname: Actions.enquiry_student_list.create.url,
        search: searchParam,
      });
    } else {
      alertData = <FormattedMessage {...commonMessages.selectAcademicYear} />;
      error.year = alertData;
      this.setState({
        open: true,
        alertData,
        error,
      });
    }
  };

  render() {
    let {
      ListEnabled,
      GridEnabled,
      yearList,
      year,
      studentList,
      tableUpdating,
      loading,
      enabledActions,
      searchStudent,
      pagination,
      alertData,
      open,
      error,
      showProgress,
    } = this.state;
    const options = {
      selectableRows: isUserHasPermission("enquiry_student_list", "delete")
        ? "multiple"
        : "none",
      filterType: "dropdown",
      responsive: "simple",
      filter: true,
      download: true,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [5, 10, 25, 50, 100],
      // customSearchRender: debounceSearchRender(200),
      textLabels: {
        body: {
          noMatch: tableUpdating
            ? this.state.loadingText
            : "Sorry, there is no matching data to display",
        },
      },
      customFilterDialogFooter: () => {
        return this.geFilterOptions();
      },
      onFilterChange: (onFilterChange, filterList, type) => {
        this.onFilterChangeHandler(type, onFilterChange);
      },
      onRowsDelete: (rowsDeleted) => {
        this.multiDelete(rowsDeleted.data);
        return false;
      },
      onDownload: () => {
        return this.getStudentList("download");
      },
    };

    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <Fragment>
        <Paper className={classNames("paper-background")}>
            <Grid container>
              <Grid item md={6} xs={12} className={classNames("header-align")}>
                <Box className="heading">
                  <FormattedMessage {...messages.enquiryFormLabel} />
                </Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className={classNames("header-align", "end-flex-prop")}>
                  {isUserHasPermission("enquiry_student_list", "create") && (
                    <Box display="flex" alignItems="center" style={{ gap: 4 }}>
                      <Button
                        variant="contained"
                        onClick={this.handleAddEnquiryButton}
                        className="editbutton-view"
                      >
                        <AddCircleOutlineIcon className="visibility-icon" />{" "}
                        {Actions.enquiry_student_list.create.label}
                      </Button>
                    </Box>
                  )}
                  {isUserHasPermission("enquiry_student_list", "create")  && (
                    <Box display="flex" alignItems="center" style={{ gap: 4 }}>
                      <Button
                        variant="contained"
                        onClick={() => this.generateQRCode('all')}
                        className="editbutton-view ml-10"
                      >
                        <AddCircleOutlineIcon className="visibility-icon" />{" "}
                        Generate Public Enquiry QR Code
                      </Button>
                    </Box>
                  )}
                  {this.state.activeTab === 1 && (<Box display="flex" alignItems="center" style={{ gap: 4 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      className="editbutton-view ml-10"
                      onClick={() => this.handleAssignStaff()}
                    >
                      Assign Staff
                    </Button>
                  </Box>)}
                </Box>
              </Grid>
            </Grid>
          <Grid container className="m-bt-15px">
            <Grid item md={6} xs={12}>
              <Box className="header-align">
                <Dropdown
                  data={yearList}
                  name="year"
                  value={year}
                  onChange={this.onChange}
                  label={<FormattedMessage {...commonMessages.academicYear} />}
                  error={error.year}
                  hideSelect={true}
                />
              </Box>
            </Grid>
            {GridEnabled && (
              <Grid item md={6} xs={12} className="end-flex-prop header-align">
                <TextField
                  id="outlined-name"
                  value={searchStudent}
                  placeholder=""
                  label="Search Student"
                  name="searchStudent"
                  onChange={(e) => {
                    this.handleFilter(e);
                  }}
                />
              </Grid>
            )}
          </Grid>
          {year && (
            <>
              <Box className="m-bt-15px">
              <StyledTabs
                value={this.state.activeTab}
                onChange={(e, v) => {
                  this.setState({ activeTab: v }, () => {
                    if (v === 1 && this.state.year) this.getEnquiryFollowupData();
                    if (v === 2 && this.state.year) this.getEmployeeReportData();
                    if (v === 3 && this.state.year) this.getDashboardData();
                  });
                }}
              >
                <StyledTab label={<Box display="flex" alignItems="center" style={{ gap: 4 }}>
                  <span>Enquiry</span>
                </Box>} />
                <StyledTab label={<Box display="flex" alignItems="center" style={{ gap: 4 }}>
                  <span>Followup</span>
                  <Tooltip title="Assign staff to enquiries, track the number of follow-ups for each enquiry, and maintain a complete follow-up history." enterDelay={400} arrow>
                    <InfoOutlinedIcon fontSize="inherit" style={{ fontSize: 14, cursor: "help" }} />
                  </Tooltip>
                </Box>} />
                <StyledTab label={<Box display="flex" alignItems="center" style={{ gap: 4 }}>
                  <span>Employee Report</span>
                  <Tooltip title="Assigned followups for staff (count)" enterDelay={400} arrow>
                    <InfoOutlinedIcon fontSize="inherit" style={{ fontSize: 14, cursor: "help" }} />
                  </Tooltip>
                </Box>} />
                <StyledTab label={<Box display="flex" alignItems="center" style={{ gap: 4 }}>
                  <span>Dashboard</span>
                </Box>} />
              </StyledTabs>
              </Box>
              <Grid
                container
                className={classNames("flex-justify-center", "header-align")}
              >
                <Grid item md={12} xs={12}>
                  {this.state.activeTab === 0 && (
                    <>
                      {this.state.GridEnabled === true && (
                        <StudentGridCard
                          list={studentList.student_list}
                          deleteStudent={this.deleteStudent}
                          enabledActions={enabledActions}
                          name="Enquiry"
                          editURL={Actions.enquiry_student_list.update.url}
                          viewURL={Actions.enquiry_student.view.url}
                        />
                      )}
                      <Paper className="position-relative">
                        <AllMUIDataTable
                          data={studentList.student_list }
                          key={this.state.studentList || this.state.year}
                          title={""}
                          columns={this.state.columns}
                          options={options}
                          onTableChange={this.getStudentList}
                          serverSide={true}
                          pagination={pagination}
                          count={studentList.count}
                        />
                      </Paper>
                    </>
                  )}
                  {this.state.activeTab === 1 && (
                    <>
                      
                      <Paper className="position-relative">
                      <AllMUIDataTable
                        data={this.state.followupList.student_list || []}
                        key={this.state.followupList || this.state.year}
                        title=""
                        columns={this.state.followupColumns}
                        options={{
                          filterType: "dropdown",
                          responsive: "simple",
                          filter: true,
                          download: true,
                          print: false,
                          viewColumns: true,
                          selectableRows: "none",
                          rowsPerPageOptions: [5, 10, 25, 50, 100],
                          textLabels: {
                            body: {
                              noMatch: tableUpdating
                                ? this.state.loadingText
                                : "Sorry, there is no matching data to display",
                            },
                          },
                        }}
                        serverSide={true}
                        onTableChange={this.onFollowupTableChange}
                        pagination={this.state.followupPagination}
                        count={this.state.followupList.count}
                      />
                      </Paper>
                    </>
                  )}
                  {this.state.activeTab === 2 && (
                    <Paper className="position-relative">
                        <AllMUIDataTable
                          data={this.state.employeeReportData.data_list || []}
                          key={`employee-${this.state.employeeReportData.data_list?.length || 0} || ${this.state.year}`}
                          title="Employee Report – Enquiries by Staff"
                          columns={this.state.employeeReportColumns}
                          options={{
                            filterType: "dropdown",
                            responsive: "simple",
                            filter: true,
                            download: true,
                            print: false,
                            viewColumns: true,
                            selectableRows: "none",
                            pagination: true,
                            rowsPerPageOptions: [5, 10, 25, 50],
                            textLabels: {
                              body: {
                                noMatch: "No data to display",
                              },
                            },
                          }}
                          serverSide={false}
                          count={this.state.employeeReportData.count}
                        />
                    </Paper>
                  )}
                  {this.state.activeTab === 3 && (
                    <Box p={3}>
                      {this.state.dashboardLoading ? (
                        <></>
                      ) : (() => {
                        const d = this.state.dashboardData || {};
                        const statusBreakdown = d.status_breakdown || {};
                        const staffBreakdown = d.staff_breakdown || [];
                        const totalEnquiries = d.total_enquiries ?? 0;
                        const enquiriesThisMonth = d.enquiries_this_month ?? 0;
                        const following = statusBreakdown.following ?? 0;
                        const notInterested = statusBreakdown.not_interested ?? 0;
                        const admitted = statusBreakdown.admitted ?? 0;
                        const conversionRate = totalEnquiries > 0
                          ? Math.round((admitted / totalEnquiries) * 100)
                          : 0;
                        const monthlyTrend = d.enquiries_by_month || d.monthly_trend || [];
                        const pieData = [
                          { name: "Following", value: following },
                          { name: "Not Interested", value: notInterested },
                          { name: "Admitted", value: admitted },
                        ].filter((x) => x.value > 0);
                        const pieOptions = {
                          chart: { type: "donut", height: 320 },
                          labels: pieData.map((x) => x.name),
                          legend: { position: "bottom" },
                          colors: ["#1976d2", "#f57c00", "#2e7d32"],
                          dataLabels: { enabled: true },
                          plotOptions: { pie: { donut: { size: "65%" } } },
                        };
                        const pieSeries = pieData.map((x) => x.value);
                        const staffCategories = staffBreakdown.map((s) => s.staff_name || "Unassigned");
                        const staffCounts = staffBreakdown.map((s) => s.count || 0);
                        const barOptions = {
                          chart: { type: "bar", height: 300 },
                          plotOptions: {
                            bar: {
                              distributed: true,
                              borderRadius: 6,
                              columnWidth: "60%",
                            },
                          },
                          xaxis: { categories: staffCategories },
                          yaxis: { title: { text: "Enquiries" } },
                          colors: ["#1976d2", "#2e7d32", "#0288d1", "#9c27b0", "#ff9800", "#795548"],
                          legend: { show: false },
                          dataLabels: { enabled: true },
                        };
                        const statusBarCategories = ["Following", "Not Interested", "Admitted"];
                        const statusBarData = [following, notInterested, admitted];
                        const statusBarOptions = {
                          chart: { type: "bar", height: 260 },
                          plotOptions: {
                            bar: {
                              horizontal: true,
                              borderRadius: 4,
                              barHeight: "70%",
                            },
                          },
                          colors: ["#1976d2", "#f57c00", "#2e7d32"],
                          xaxis: { categories: statusBarCategories },
                          dataLabels: { enabled: true },
                          legend: { show: false },
                        };
                        const radialOptions = {
                          chart: { type: "radialBar", height: 280 },
                          plotOptions: {
                            radialBar: {
                              hollow: { size: "55%" },
                              dataLabels: {
                                name: { fontSize: "14px" },
                                value: { fontSize: "22px", formatter: (v) => v + "%" },
                              },
                            },
                          },
                          labels: ["Conversion (Admitted / Total)"],
                          colors: ["#2e7d32"],
                        };
                        const summaryRows = [
                          ["Total Enquiries", totalEnquiries],
                          ["Enquiries This Month", enquiriesThisMonth],
                          ["Following", following],
                          ["Not Interested", notInterested],
                          ["Admitted", admitted],
                        ];
                        const kpiCards = [
                          { label: "Total Enquiries", value: totalEnquiries, color: "#1976d2" },
                          { label: "This Month", value: enquiriesThisMonth, color: "#0288d1" },
                          { label: "Following", value: following, color: "#1976d2" },
                          { label: "Admitted", value: admitted, color: "#2e7d32" },
                          { label: "Not Interested", value: notInterested, color: "#f57c00" },
                        ];
                        return (
                          <Box>
                            <Typography variant="h5" style={{ fontWeight: 600, marginBottom: 24, color: "#1a237e" }}>
                              Enquiry Dashboard
                            </Typography>
                            <Grid container spacing={2} style={{ marginBottom: 24 }}>
                              {kpiCards.map((card) => (
                                <Grid item xs={6} sm={4} md={2} key={card.label}>
                                  <Paper
                                    elevation={2}
                                    style={{
                                      padding: "16px 12px",
                                      borderRadius: 12,
                                      borderLeft: `4px solid ${card.color}`,
                                      background: "linear-gradient(135deg, #fff 0%, #f8f9fa 100%)",
                                    }}
                                  >
                                    <Typography variant="body2" style={{ color: "#666", fontWeight: 500 }}>
                                      {card.label}
                                    </Typography>
                                    <Typography variant="h4" style={{ fontWeight: 700, color: card.color, marginTop: 4 }}>
                                      {card.value}
                                    </Typography>
                                  </Paper>
                                </Grid>
                              ))}
                            </Grid>
                            <Grid container spacing={3}>
                              <Grid item xs={12} md={4}>
                                <Paper
                                  elevation={2}
                                  style={{
                                    padding: 20,
                                    borderRadius: 12,
                                    height: "100%",
                                    minHeight: 380,
                                  }}
                                >
                                  <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 16, color: "#333" }}>
                                    Status Distribution
                                  </Typography>
                                  {pieSeries.length > 0 ? (
                                    <Chart
                                      options={pieOptions}
                                      series={pieSeries}
                                      type="donut"
                                      height={320}
                                    />
                                  ) : (
                                    <Box py={4} textAlign="center" style={{ color: "#666" }}>
                                      No data to display
                                    </Box>
                                  )}
                                </Paper>
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <Paper
                                  elevation={2}
                                  style={{
                                    padding: 20,
                                    borderRadius: 12,
                                    height: "100%",
                                    minHeight: 380,
                                  }}
                                >
                                  <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 16, color: "#333" }}>
                                    Conversion Rate
                                  </Typography>
                                  <Chart
                                    options={radialOptions}
                                    series={[conversionRate]}
                                    type="radialBar"
                                    height={280}
                                  />
                                </Paper>
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <Paper
                                  elevation={2}
                                  style={{
                                    padding: 20,
                                    borderRadius: 12,
                                    height: "100%",
                                    minHeight: 380,
                                  }}
                                >
                                  <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 16, color: "#333" }}>
                                    Status Comparison
                                  </Typography>
                                  {statusBarData.some((v) => v > 0) ? (
                                    <Chart
                                      options={statusBarOptions}
                                      series={[{ name: "Count", data: statusBarData }]}
                                      type="bar"
                                      height={260}
                                    />
                                  ) : (
                                    <Box py={4} textAlign="center" style={{ color: "#666" }}>
                                      No data to display
                                    </Box>
                                  )}
                                </Paper>
                              </Grid>
                              <Grid item xs={12} lg={6}>
                                <Paper
                                  elevation={2}
                                  style={{ padding: 20, borderRadius: 12, minHeight: 360 }}
                                >
                                  <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 16, color: "#333" }}>
                                    Enquiries by Staff
                                  </Typography>
                                  {staffCounts.some((v) => v > 0) ? (
                                    <Chart
                                      options={barOptions}
                                      series={[{ name: "Enquiries", data: staffCounts }]}
                                      type="bar"
                                      height={300}
                                    />
                                  ) : (
                                    <Box py={4} textAlign="center" style={{ color: "#666" }}>
                                      No data to display
                                    </Box>
                                  )}
                                </Paper>
                              </Grid>
                              {Array.isArray(monthlyTrend) && monthlyTrend.length > 0 && (
                                <Grid item xs={12} lg={6}>
                                  <Paper
                                    elevation={2}
                                    style={{ padding: 20, borderRadius: 12, minHeight: 360 }}
                                  >
                                    <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 16, color: "#333" }}>
                                      Enquiries Trend (Monthly)
                                    </Typography>
                                    <Chart
                                      options={{
                                        chart: { type: "area", height: 300 },
                                        xaxis: {
                                          categories: monthlyTrend.map((m) => m.month || m.label || m.name || "—"),
                                        },
                                        colors: ["#1976d2"],
                                        fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.2 } },
                                        dataLabels: { enabled: false },
                                      }}
                                      series={[{ name: "Enquiries", data: monthlyTrend.map((m) => m.count ?? m.value ?? 0) }]}
                                      type="area"
                                      height={300}
                                    />
                                  </Paper>
                                </Grid>
                              )}
                              <Grid item xs={12} md={6}>
                                <Paper
                                  elevation={2}
                                  style={{ padding: 20, borderRadius: 12 }}
                                >
                                  <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 16, color: "#333" }}>
                                    Enquiry Summary
                                  </Typography>
                                  <TableContainer>
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                                          <TableCell><strong>Metric</strong></TableCell>
                                          <TableCell align="right"><strong>Count</strong></TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {summaryRows.map(([label, value]) => (
                                          <TableRow key={label}>
                                            <TableCell>{label}</TableCell>
                                            <TableCell align="right">{value}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                </Paper>
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <Paper
                                  elevation={2}
                                  style={{ padding: 20, borderRadius: 12 }}
                                >
                                  <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 16, color: "#333" }}>
                                    Staff Breakdown
                                  </Typography>
                                  <TableContainer>
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                                          <TableCell><strong>Staff</strong></TableCell>
                                          <TableCell align="right"><strong>Count</strong></TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {staffBreakdown.map((row, idx) => (
                                          <TableRow key={row.staff_id != null ? row.staff_id : `unassigned-${idx}`}>
                                            <TableCell>{row.staff_name || "Unassigned"}</TableCell>
                                            <TableCell align="right">{row.count ?? 0}</TableCell>
                                          </TableRow>
                                        ))}
                                        {staffBreakdown.length === 0 && (
                                          <TableRow>
                                            <TableCell colSpan={2} align="center">
                                              No staff data
                                            </TableCell>
                                          </TableRow>
                                        )}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                </Paper>
                              </Grid>
                            </Grid>
                          </Box>
                        );
                      })()}
                    </Box>
                  )}
                </Grid>
              </Grid>
            </>
          )}
        </Paper>
        <Dialog
          open={this.state.addFollowupDialogOpen}
          onClose={this.handleAddFollowupClose}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Add Follow up</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" style={{ gap: 16 }} pt={1}>
              <TextField
                label="Current Follow up Date"
                type="date"
                name="current_followup_date"
                value={this.state.addFollowupForm.current_followup_date}
                onChange={this.handleAddFollowupFormChange}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Next Follow up Date"
                type="date"
                name="next_followup_date"
                value={this.state.addFollowupForm.next_followup_date}
                onChange={this.handleAddFollowupFormChange}
                InputLabelProps={{ shrink: true }}
                fullWidth
                error={!!this.state.addFollowupErrors.next_followup_date}
                helperText={this.state.addFollowupErrors.next_followup_date}
              />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={this.state.addFollowupForm.status}
                  onChange={this.handleAddFollowupFormChange}
                >
                  {this.FOLLOWUP_STATUS.map((s) => (
                    <MenuItem key={s.value} value={s.value}>
                      {s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Remarks"
                name="remarks"
                value={this.state.addFollowupForm.remarks}
                onChange={this.handleAddFollowupFormChange}
                fullWidth
                multiline
                rows={3}
                variant="outlined"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleAddFollowupClose}>Cancel</Button>
            <Button onClick={this.handleAddFollowupSubmit} color="primary" variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={this.state.viewFollowupsDialogOpen}
          onClose={this.handleViewFollowupsClose}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>View Follow ups</DialogTitle>
          <DialogContent>
            {this.state.viewFollowupsLoading ? (
              <Box py={4} textAlign="center">
                Loading...
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell><strong>Date</strong></TableCell>
                      <TableCell><strong>Next Followup</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Remarks</strong></TableCell>
                      <TableCell><strong>Staff</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {this.state.viewFollowupsList && this.state.viewFollowupsList.length > 0 && (this.state.viewFollowupsList || []).map((item, idx) => (
                      <TableRow key={item.id || idx}>
                        <TableCell>{item.followup_date ? dateFormat(item.followup_date, "DD-MM-YYYY") : "—"}</TableCell>
                        <TableCell>{item.next_followup_date ? dateFormat(item.next_followup_date, "DD-MM-YYYY") : "—"}</TableCell>
                        <TableCell>{this.getFollowupStatusLabel(item.status)}</TableCell>
                        <TableCell>{item.remarks || "—"}</TableCell>
                        <TableCell>{item.staff_name || "—"}</TableCell>
                      </TableRow>
                    ))}
                    {!this.state.viewFollowupsList && this.state.viewFollowupsList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No follow ups found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {!this.state.viewFollowupsLoading && (!this.state.viewFollowupsList || this.state.viewFollowupsList.length === 0) && (
              <Box py={4} textAlign="center" style={{ color: "#666" }}>
                No follow ups found
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleViewFollowupsClose}>Close</Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={this.state.assignStaffDialogOpen}
          onClose={this.handleAssignStaffClose}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Assign Staff</DialogTitle>
          <DialogContent>
            {this.state.assignStaffLoading ? (
              <Box py={4} textAlign="center">
                Loading...
              </Box>
            ) : (
              <Box display="flex" flexDirection="column" style={{ gap: 16 }} pt={1}>
                <Box fontWeight="bold" display="flex" alignItems="center" style={{ gap: 6 }}>
                  Select Enquiries
                  <Tooltip title="Select enquiries to assign a staff member" enterDelay={400} arrow>
                    <InfoOutlinedIcon fontSize="small" color="action" style={{ cursor: "help" }} />
                  </Tooltip>
                </Box>
                <TableContainer style={{ maxHeight: 280 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            indeterminate={
                              this.state.assignStaffSelectedIds.length > 0 &&
                              this.state.assignStaffSelectedIds.length < (this.state.followupList.student_list || []).length
                            }
                            checked={
                              (this.state.followupList.student_list || []).length > 0 &&
                              this.state.assignStaffSelectedIds.length === (this.state.followupList.student_list || []).length
                            }
                            onChange={(e) => this.handleAssignStaffSelectAll(e.target.checked)}
                          />
                        </TableCell>
                        <TableCell><strong>Name</strong></TableCell>
                        <TableCell><strong>Enquiry No.</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(this.state.followupList.student_list || []).map((row) => {
                        const eid = row?.enquiry_student ?? (row?.id ? parseInt(this.getEnquiryId(row.id), 10) : null);
                        if (!eid) return null;
                        const checked = this.state.assignStaffSelectedIds.indexOf(eid) !== -1;
                        return (
                          <TableRow key={eid}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={checked}
                                onChange={() => this.handleAssignStaffToggleEnquiry(eid)}
                              />
                            </TableCell>
                            <TableCell>{row.full_name || "—"}</TableCell>
                            <TableCell>{row.enquiry_num || "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box display="flex" flexDirection="column" style={{ gap: 6 }}>
                  <Box display="flex" alignItems="center" style={{ gap: 6 }}>
                    <TextField
                      label="Search Staff"
                      value={this.state.assignStaffSearch}
                      onChange={this.handleStaffSearch}
                      fullWidth
                      variant="outlined"
                    />
                    <Tooltip title="Search and select a staff member to assign to selected enquiries" enterDelay={400} arrow>
                      <InfoOutlinedIcon fontSize="small" color="action" style={{ cursor: "help", flexShrink: 0 }} />
                    </Tooltip>
                  </Box>
                  {this.state.assignStaffSelectedStaff && (
                    <Box
                      py={1}
                      px={1.5}
                      style={{
                        backgroundColor: "#e3f2fd",
                        borderRadius: 4,
                        border: "1px solid #90caf9",
                      }}
                    >
                      <Typography variant="body2" color="primary">
                        <strong>Selected staff:</strong>{" "}
                        {(this.state.assignStaffStaffList || []).find(
                          (s) => String(s.id) === String(this.state.assignStaffSelectedStaff)
                        )?.name || "—"}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <TableContainer style={{ maxHeight: 200, marginTop: 4 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                        <TableCell><strong>Name</strong></TableCell>
                        <TableCell><strong>Group</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(this.state.assignStaffStaffList || []).map((staff) => {
                        const isSelected = String(staff.id) === String(this.state.assignStaffSelectedStaff);
                        return (
                          <TableRow
                            key={staff.id}
                            hover
                            style={{
                              cursor: "pointer",
                              backgroundColor: isSelected ? "#e3f2fd" : "inherit",
                            }}
                            onClick={() =>
                              this.setState({ assignStaffSelectedStaff: staff.id })
                            }
                          >
                            <TableCell>{staff.name}</TableCell>
                            <TableCell>{staff.group != null ? staff.group : "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleAssignStaffClose}>Cancel</Button>
            <Button
              onClick={this.handleAssignStaffSubmit}
              color="primary"
              variant="contained"
              disabled={this.state.assignStaffSubmitting}
            >
              {this.state.assignStaffSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogActions>
        </Dialog>
      </Fragment>
    );
    }
  }
}
export default withRouter(EnquiryStudentsList);