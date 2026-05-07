import React, { Component, Fragment } from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  Icon,
  CircularProgress,
  TextField,
} from "@material-ui/core";
import { Link } from "react-router-dom";
import classNames from "classnames";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import Swal from "sweetalert2";
import _, { cloneDeep } from "lodash";

import { Dropdown } from "Components/DropDown";
import { DateRange } from "Components/DateRange";
import StudentGridCard from "Components/ProfileGridCard";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest, deleteRequest } from "Includes/api/apicall";
import { GET_URL, DEL_URL } from "Includes/urls";
import StudentListActions from "Includes/StudentListActions";
import { Actions } from "Constants/permissions";
import { Tabs, Tab } from "@material-ui/core";
import jsPDF from "jspdf";

import {
  getFullName,
  dateFormat,
  getIsGridOrListView,
  setIsGridOrListView,
  getPaginationProps,
  getSettingValue,
  updatePermissions,
  getFormatMessage,
  isUserHasPermission,
  getAcademicYear,
  SetAcademicYear,
  getAdmissionHistory,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { GENDER_LIST, DEFAULT_PAGINATION_PROPS_ID_LIST } from "Constants";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import StudentCustomReport from "./Components/StudentCustomReport";
import StudentProfileCard from "Components/StudentProfileCard";
import Skeleton from "@material-ui/lab/Skeleton";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";

let user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";

const isResidential = parseInt(getSettingValue("is_residential"));
class StudentList extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("general_student", ["view"]);
    this.state = {
      studentList: [],
      downloadStandardList: [],
      standardList: [],
      AllStudentList: [],
      dataReady: false,
      GridEnabled: false,
      ListEnabled: true,
      loading: true,
      tableUpdating: false,
      isOpenDialogReport: false,
      sectionLoading: false,
      selected_group: "",
      selected_gender: "",
      groupList: [],
      sectionList: [],
      yearList: [],
      selectedYear: "",
      blankData: "",
      activeTab: 0, // 0 = Student List, 1 = Student Summary, 2 = Section Summary
      studentSummary: [],
      studentSectionSummary: [],
      studentTypeList: [
        { name: "All", id: "All" },
        { name: "Day Scholar", id: "Day Scholar" },
        { name: "Residential", id: "Residential" },
      ],
      student_type: "All",
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      filterList: [],
      selectedStandard: [],
      columns: [
        {
          name: "full_name",
          label: <FormattedMessage {...commonMessages.studentName} />,
          options: {
            filter: false,
            sort: true,
            search: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <StudentProfileCard
                  student_name={
                    tableMeta.tableData[tableMeta.rowIndex]["full_name"]
                  }
                  id={tableMeta.tableData[tableMeta.rowIndex]["id"]}
                  isApiCall={true}
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
          },
        },
        {
          name: "current_standard_section_name",
          label: <FormattedMessage {...commonMessages.sectionName} />,
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "mobile_num",
          label: <FormattedMessage {...commonMessages.mobileNo} />,
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "id",
          label: "ID",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
          },
        },
        {
          name: "admission_num",
          label: "Admission No.",
          options: {
            filter: false,
            sort: true,
            display: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>{getAdmissionHistory(value, tableMeta.rowData[7])}</div>
              );
            },
          },
        },
        {
          name: "student_type",
          label: <FormattedMessage {...commonMessages.studentType} />,
          options: {
            filter: false,
            sort: true,
            display: !!isResidential,
            download: !!isResidential,
          },
        },
        {
          name: "admission_history",
          label: "ID",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
          },
        },
        {
          name: "Actions",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            display: this.permission.length > 0,
            filter: false,
            sort: false,
            download: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  <StudentListActions
                    id={tableMeta.rowData[4]}
                    index={tableMeta.rowIndex}
                    deleteStudent={this.deleteStudent}
                    editURL={Actions.general_student_list.update.url}
                    viewURL={Actions.general_student.view.url}
                    enabledActions={this.permission}
                    viewExtraParams={{ studentId: tableMeta.rowData[4] }}
                  />
                </div>
              );
            },
          },
        },
      ],
    };
  }

  getStudentSummary = () => {
    const { selectedYear } = this.state;
    const url = GET_URL.studentstandardwisereport.api; // Create a new URL in GET_URL or reuse student API with summary param
    let params = {
      academic_year: selectedYear,
      is_active: true,
    };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          studentSummary: response.data.data, // should be in the format mentioned above
        });
      }
    });
  };

  getStudentSectionSummary = () => {
    const { selectedYear } = this.state;
    const url = GET_URL.studentstandardwisereport.api; // add this in your GET_URL constants
    let params = { academic_year: selectedYear, is_active: true, standard_section_wise_report: true };
  
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({ studentSectionSummary: response.data.data });
      }
    });
  };

  handleTabChange = (event, newValue) => {
    this.setState({ activeTab: newValue }, () => {
      if (newValue === 1 && this.state.studentSummary.length === 0) {
        this.getStudentSummary();
      }
      if (newValue === 2 && this.state.studentSectionSummary.length === 0) {
        this.getStudentSectionSummary(); // You'll implement this next
      }
    });
  };
  

  async componentDidMount() {
    let { GridEnabled, ListEnabled, year } = this.state;
    this.getYearList();
    if (getAcademicYear()) {
      let year = getAcademicYear();
      if (year !== 0) {
        this.getStandardList(year);
      }
    } else {
      this.setState({
        blankData: "Select Academic Year",
        loading: false,
      });
    }
    this.permission = [
      ...this.permission,
      ...updatePermissions("general_student_list", ["update", "delete"]),
    ];
    if (getIsGridOrListView()) {
      let isGridView = getIsGridOrListView() === "true";
      if (isGridView) {
        // GridEnabled = true
        // ListEnabled = false
      }
    }
    // this.setState(
    //   {
    //     GridEnabled,
    //     ListEnabled,
    //     year,
    //   },
    //   () => {
    //     this.getStudentList();
    //   }
    // );
  }

  getYearList = () => {
    const url = GET_URL.getacademicyear.api;
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          yearList: response.data.data,
        });
      }
    });
  };

  getGroupList = () => {
    const params = { is_active: true };
    getRequest(GET_URL.getstudentgroups.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          this.setState({
            groupList: response.data.data,
          });
        }
      }
    );
  };

  onChange = (e) => {
    let { value, name } = e.target;
    this.setState(
      {
        [name]: value,
      },
      () => {
        this.getStudentList();
        if(name==="selectedYear"){
          this.getStandardList(value)
          SetAcademicYear(value)
          this.getStudentSummary();
        }
      }
    );
  };

  getSectionList = (id) => {
    const { selectedYear } = this.state;
    const url = GET_URL.getsection.api;
    const standard_ids = this.getIdsStandard()
    const params = {
      academic_year: selectedYear,
      is_active: true,
      standard_ids: standard_ids
    };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let sectionList = response.data.data;
        let uniqueSectionMap = {};
        sectionList.forEach((data) => {
          if (!uniqueSectionMap[data.id]) {
            uniqueSectionMap[data.id] = data;
          }
        });

        // Convert back to array
        let uniqueSectionList = Object.values(uniqueSectionMap);

        // Optionally add "All" at the beginning
        uniqueSectionList.unshift({ standard_section: "all", id: "all", name: "All" });
        this.setState({
          sectionLoading: false,
          selectedSection: "all",
          sectionList: uniqueSectionList,
        });
      }
    });
  };

  getStudentList = (paginationProps) => {
    this.setState({ tableUpdating: true });
    let {
      pagination,
      selectedStandard,
      student_type,
      selectedSection,
      selected_group,
      selected_gender,
      selectedYear,
    } = this.state;
    this.currentPagination = pagination;
    if (paginationProps && paginationProps !== "download") {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    const url = GET_URL.student.api;
    let params = { ...pagination_params, is_active: true };
    if (selectedStandard && selectedStandard.length > 0) {
      params["current_standard"] = this.getIdsStandard();
    }
    let prop = { ...this.props };
    if (paginationProps === "download") {
      params["download_excel"] = 1;
      prop.responseType = "blob";
    }
    if (student_type !== "All") {
      let temp = {};
      temp["student_type"] = student_type === "Day Scholar" ? "D" : "R";
      params = { ...params, ...temp };
    }
    if (selected_group) {
      params["student_group"] = selected_group;
    }
    if (selected_gender) {
      params["gender"] = selected_gender;
    }
    if (selectedYear) {
      params["student_academic_year"] = selectedYear;
    }
    params["admission_history"] = true;
    if (selectedSection && selectedSection != "all"){
      params['section'] = selectedSection;
    }
    getRequest(url, params, prop).then((response) => {
      if (response && response.status === 200) {
        if (paginationProps === "download") {
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `Student_List.xlsx`);
          document.body.appendChild(link);
          link.click();
          this.setState({
            tableUpdating: false,
            loading: false,
          });
          return;
        }
        this.callApi = true;
        const studentList = response.data;
        studentList.data.student_list.map((data) => {
          data["full_name"] = getFullName(
            data["first_name"],
            data["middle_name"],
            data["last_name"]
          );
        });
        this.setState({
          studentList: studentList.data,
          AllStudentList: [],
          dataReady: true,
          loading: false,
          tableUpdating: false,
          pagination: this.currentPagination
            ? this.currentPagination
            : this.state.pagination,
        });
      }
    });
    return false;
  };

  getIdsStandard = () => {
    let { selectedStandard } = this.state;
    let return_value = [];
    selectedStandard.map((data) => {
      return_value.push(data["id"]);
    });
    return return_value.join(",");
  };

  getStandardList = async (year) => {
    const f_url = GET_URL.getstandard.api;
    const param = { is_active: true, academic_year: year };
    await getRequest(f_url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        let standardList = [...response.data.data];
        let downloadStandardList = [...response.data.data];
        standardList.forEach((field) => {
          field.optionValue = `${field.id}${field.type}`;
        });
        standardList.unshift({
          optionValue: "Select All",
          name: "Select All",
          optionValue: "all",
          id: "all",
        });
        downloadStandardList.forEach((field) => {
          field.optionValue = `${field.id}${field.type}`;
        });
        downloadStandardList.unshift({
          optionValue: "Select All",
          name: "Select All",
          optionValue: "all",
          id: "all",
        });
        this.setState(
          {
            standardList,
            downloadStandardList,
            loading: false,
            selectedYear: year,
          },
          () => {
            this.getStudentList();
          }
        );
      }
    });
    this.getSectionList()
  };


  multiDelete = (deleteData) => {
    this.setState({ tableUpdating: true });
    let { studentList } = this.state;
    let id = [];
    deleteData.map((data) => {
      id.push(studentList[data.dataIndex].id);
    });
    const del_url = DEL_URL.studentall.api;
    const data = { data: id };
    const url = del_url + 1 + "/";
    deleteRequest(url, data, this.props).then((response) => {
      if (response && response.status === 200) {
        id.map((dataID) => {
          studentList.map((data, index) => {
            if (dataID === data.id) {
              studentList.splice(index, 1);
            }
          });
        });
        this.setState({
          studentList: [...studentList],
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

  deleteStudent = async (id, index) => {
    this.setState({ tableUpdating: true });
    let { studentList, columns } = this.state;
    const del_url = DEL_URL.studentall.api;
    const data = { data: [id] };
    const url = del_url + id + "/";
    deleteRequest(url, data, this.props).then((response) => {
      if (response && response.status === 200) {
        studentList.student_list.splice(index, 1);
        this.setState({
          studentList: cloneDeep(studentList),
          columns: cloneDeep(columns),
        });
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
      }
      this.setState({ tableUpdating: false });
    });
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

  onChangeStudentType = async (e) => {
    let { value } = e.target;
    this.setState(
      {
        student_type: value,
        tableUpdating: true,
      },
      () => {
        this.getStudentList();
      }
    );
  };

  handleOpenDownloadDialog = () => {
    this.setState({
      isOpenDialogReport: !this.state.isOpenDialogReport,
    });
  };

  geFilterOptions = () => {
    let { groupList, selected_group, selected_gender, initialFilterOpen } =
      this.state;
    if (initialFilterOpen) {
      this.setState({ initialFilterOpen: false });
    }
    return (
      <Fragment>
        <div className="mt-30">
          <Dropdown
            className="filter-dropdown"
            data={GENDER_LIST}
            name="selected_gender"
            value={selected_gender}
            onChange={this.onChange}
            label="Student Gender"
            size="small"
            style="width-100-perc"
            fullWidth
          />
        </div>
        {/* {groupList.length > 0 && (
          <div className="mt-30">
            <Dropdown
              className="filter-dropdown"
              data={groupList}
              name="selected_group"
              value={selected_group}
              onChange={this.onChange}
              label="Student Group"
              size="small"
              style="width-100-perc"
              fullWidth
            />
          </div>
        )} */}
      </Fragment>
    );
  };

  onChangeMultipleSelect = (value) => {
    let { standardList } = this.state;
    let is_all_option_selected = false;
    let temp_list = [...standardList];
    value.forEach((data) => {
      if (data.id === "all") {
        is_all_option_selected = true;
        return;
      }
    });
        
    if (is_all_option_selected) {
      temp_list.splice(0, 1);
      this.setState({
        selectedStandard: [...temp_list],
      });
    } else {
      this.setState(
        {
          selectedStandard: value,
        },
        () => {
          this.getStudentList();
        }
      );  
    }
  };

  onFilterChangeHandler = (type) => {
    if (type === "reset") {
      this.setState(
        {
          selected_gender: "",
          selected_group: "",
        },
        () => {
          this.getStudentList();
        }
      );
    }
  };

  generateStandardSummaryPDF = () => {
    const { studentSummary } = this.state;
    const doc = new jsPDF();
    doc.text("Standard-wise Student Summary", 14, 15);
  
    const tableData = studentSummary.map((item) => [
      item.standard__name,
      item.boys,
      item.girls,
      item.total,
    ]);
  
    doc.autoTable({
      head: [['Standard', 'Boys', 'Girls', 'Total']],
      body: tableData,
      startY: 20,
    });
  
    doc.save('standard_summary.pdf');
  };
  
  generateSectionSummaryPDF = () => {
    const { studentSectionSummary } = this.state;
    const doc = new jsPDF();
    doc.text("Standard-Section-wise Student Summary", 14, 15);
  
    const tableData = studentSectionSummary.map((item) => [
      item.standard_section__standard__name,
      item.standard_section__section__name,
      item.boys,
      item.girls,
      item.total,
    ]);
  
    doc.autoTable({
      head: [['Standard', 'Section', 'Boys', 'Girls', 'Total']],
      body: tableData,
      startY: 20,
    });
  
    doc.save('standard_section_summary.pdf');
  };

  render() {
    let {
      ListEnabled,
      GridEnabled,
      downloadStandardList,
      year,
      loading,
      tableUpdating,
      enabledActions,
      isOpenDialogReport,
      studentList,
      pagination,
      studentTypeList,
      student_type,
      standardList,
      selectedStandard,
      sectionList,
      selectedSection,
      sectionLoading,
      groupList,
      yearList,
      selectedYear,
      blankData,
    } = this.state;
    const options = {
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "simple",
      filter: true,
      download: true,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [5, 10, 25, 50, 100],
      onDownload: () => {
        return this.getStudentList("download");
      },
      customFilterDialogFooter: () => {
        return this.geFilterOptions();
      },
      onFilterChange: (column, filterList, type) => {
        this.onFilterChangeHandler(type, filterList);
      },
    };
    console.log(this.state.studentSummary, 'this.state.studentSummary')
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <Paper className={classNames("paper-background")}>
          <div>
            <div className={classNames("header-align")}>
              <Box className="heading">Student List</Box>
            </div>
          </div>
          <div className="flex-gaping header-align">
            <Box>
              <Dropdown
                data={yearList}
                name="selectedYear"
                value={selectedYear}
                onChange={this.onChange}
                label={<FormattedMessage {...commonMessages.academicYear} />}
                className="width-100"
                hideSelect={true}
                size={"small"}
              />
            </Box>
            {selectedYear &&
              <Box className="mt-15">
              {/* <Dropdown
                  data={standardList}
                  name="selectedStandard"
                  value={selectedStandard}
                  onChange={this.onChange}
                  label={<FormattedMessage {...commonMessages.standard} />}
                  className="width-100"
                  hideSelect={true}
                  size={"small"}
                /> */}

              <MultipleSelectDropdown
                data_list={standardList}
                selected_list={selectedStandard}
                label={<FormattedMessage {...commonMessages.standard} />}
                onChange={(e) => this.onChangeMultipleSelect(e, "standard")}
                size="small"
                className="width-350px bg-white"
                limitTags={2}
                />
            </Box>
              }

            {sectionList.length > 2 &&
              selectedStandard !== "all" &&
              (sectionLoading ? (
                <div>
                  <Skeleton
                    variant="rect"
                    className="drop-down-small-skeleton m-t-10px"
                  ></Skeleton>
                </div>
              ) : (
                <div className="flex-gaping">
                  <Box>
                    <Dropdown
                      data={sectionList}
                      name="selectedSection"
                      value={selectedSection}
                      onChange={this.onChange}
                      label={<FormattedMessage {...commonMessages.section} />}
                      className="width-100"
                      hideSelect={true}
                      customId="id"
                      size={"small"}
                    />
                  </Box>
                </div>
              ))}
            {!!isResidential && (
              <div className="flex-gaping">
                <Box>
                  <Dropdown
                    data={studentTypeList}
                    name="student_type"
                    value={student_type}
                    onChange={this.onChangeStudentType}
                    label={
                      <FormattedMessage {...commonMessages.selectStudentType} />
                    }
                    hideSelect={true}
                    className="width-100"
                    size={"small"}
                  />
                </Box>
              </div>
            )}
            {selectedYear && isUserHasPermission("custom_report_download", "view") && (
              <div className="end-flex-prop align-items-center">
                <div>
                  <Button
                    className="custom-button"
                    onClick={this.handleOpenDownloadDialog}
                  >
                    Download Custom Report
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="flex-gaping header-align mt-20">
            <Tabs
              value={this.state.activeTab}
              onChange={this.handleTabChange}
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab label="Student List" />
              <Tab label="Student Summary" />
              <Tab label="Standard-Section Summary" />
            </Tabs>
          </div>
          {selectedYear ? (
            <Grid container className={classNames("flex-justify-center", "header-align")}>
              {this.state.activeTab === 1 ? (
                <Paper className=" p-10" style={{width: '100%'}}>
                  <Box className="mb-10">
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={this.generateStandardSummaryPDF}
                    >
                      Download PDF
                    </Button>
                  </Box>
                  <Box className="heading">Student Summary </Box>
                  <table
                    style={{
                      width: "60%",
                      borderCollapse: "collapse",
                      marginTop: "10px",
                      fontSize: "14px",
                    }}
                  >
                    <thead style={{ backgroundColor: "#f5f5f5" }}>
                      <tr>
                        <th style={{ border: "1px solid #ddd", padding: "5px" }}>Standard</th>
                        <th style={{ border: "1px solid #ddd", padding: "5px", textAlign: "right" }}>Boys</th>
                        <th style={{ border: "1px solid #ddd", padding: "5px", textAlign: "right" }}>Girls</th>
                        <th style={{ border: "1px solid #ddd", padding: "5px", textAlign: "right" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {this.state.studentSummary.map((item, index) => (
                        <tr key={index}>
                          <td style={{ border: "1px solid #ddd", padding: "5px" }}>{item.standard__name}</td>
                          <td style={{ border: "1px solid #ddd", padding: "5px", textAlign: "right" }}>{item.boys}</td>
                          <td style={{ border: "1px solid #ddd", padding: "5px", textAlign: "right" }}>{item.girls}</td>
                          <td style={{ border: "1px solid #ddd", padding: "5px", textAlign: "right", fontWeight: "bold" }}>
                            {item.total}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ backgroundColor: "#f0f0f0", fontWeight: "bold" }}>
                        <td style={{ border: "1px solid #ddd", padding: "5px" }}>TOTAL</td>
                        <td
                          style={{
                            border: "1px solid #ddd",
                            padding: "5px",
                            textAlign: "right",
                          }}
                        >
                          {this.state.studentSummary.reduce((sum, item) => sum + item.boys, 0)}
                        </td>
                        <td
                          style={{
                            border: "1px solid #ddd",
                            padding: "5px",
                            textAlign: "right",
                          }}
                        >
                          {this.state.studentSummary.reduce((sum, item) => sum + item.girls, 0)}
                        </td>
                        <td
                          style={{
                            border: "1px solid #ddd",
                            padding: "5px",
                            textAlign: "right",
                          }}
                        >
                          {this.state.studentSummary.reduce((sum, item) => sum + item.total, 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Paper>
              ) : this.state.activeTab === 2 ? (
                <Paper className=" p-10" style={{ width: '100%' }}>
                   <Box className="mb-10">
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={this.generateSectionSummaryPDF}
                    >
                      Download PDF
                    </Button>
                  </Box>
                  <Box className="heading">Standard-Section-wise Summary</Box>
                  <table
                    style={{
                      width: "80%",
                      borderCollapse: "collapse",
                      marginTop: "10px",
                      fontSize: "14px",
                    }}
                  >
                    <thead style={{ backgroundColor: "#f5f5f5" }}>
                      <tr>
                        <th style={{ border: "1px solid #ddd", padding: "5px" }}>Standard</th>
                        <th style={{ border: "1px solid #ddd", padding: "5px" }}>Section</th>
                        <th style={{ border: "1px solid #ddd", padding: "5px", textAlign: "right" }}>Boys</th>
                        <th style={{ border: "1px solid #ddd", padding: "5px", textAlign: "right" }}>Girls</th>
                        <th style={{ border: "1px solid #ddd", padding: "5px", textAlign: "right" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {this.state.studentSectionSummary.map((item, index) => (
                        <tr key={index}>
                          <td style={{ border: "1px solid #ddd", padding: "5px" }}>{item.standard_section__standard__name}</td>
                          <td style={{ border: "1px solid #ddd", padding: "5px" }}>{item.standard_section__section__name}</td>
                          <td style={{ border: "1px solid #ddd", padding: "5px", textAlign: "right" }}>{item.boys}</td>
                          <td style={{ border: "1px solid #ddd", padding: "5px", textAlign: "right" }}>{item.girls}</td>
                          <td style={{ border: "1px solid #ddd", padding: "5px", textAlign: "right", fontWeight: "bold" }}>
                            {item.total}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Paper>
              ): (
                <Grid item md={12} xs={12}>
                  {GridEnabled === true && (
                    <StudentGridCard
                      list={studentList.student_list}
                      delete={this.deleteStudent}
                      enabledActions={enabledActions}
                      name="Admission"
                      editURL={Actions.general_student_list.update.url}
                      viewURL={Actions.general_student.view.url}
                    />
                  )}
                  {ListEnabled === true && (
                    <Paper>
                      <AllMUIDataTable
                        title={
                          tableUpdating ? <CircularProgress className="white-text" /> : ""
                        }
                        data={studentList.student_list}
                        columns={this.state.columns}
                        options={options}
                        onTableChange={this.getStudentList}
                        serverSide={true}
                        pagination={pagination}
                        count={studentList.count}
                      />
                    </Paper>
                  )}
                </Grid>
              )}
            </Grid>
          ) : (
            <div className="header-align">
              <BlankPagewithIcon data={blankData} />
            </div>
          )}
          {isOpenDialogReport && (
            <StudentCustomReport
              closeInParent={this.handleOpenDownloadDialog}
              standardList={downloadStandardList}
              year={selectedYear}
            />
          )}
        </Paper>
      );
    }
  }
}

export default StudentList;
