import React, { useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Button,
  Box,
  Dialog,
  Slide,
  Grid,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  CircularProgress,
  Tooltip,
} from "@material-ui/core";
import AllMUIDataTable from "Components/AllMUIDataTable";
import CloseIcon from "@material-ui/icons/Close";
import Snackbar from "@material-ui/core/Snackbar";
import {
  MuiPickersUtilsProvider,
  KeyboardDateTimePicker,
  KeyboardTimePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import { withRouter } from "react-router-dom";
import { Dropdown } from "Components/DropDown";
import Swal from "sweetalert2";
import _ from "lodash";
import { Actions } from "Constants/permissions";

import BlankPagewithIcon from "Components/BlankPageWithIcon";
import loadingBar from "images/loading.gif";
import {
  checkLocalAcademicYear,
  SetAcademicYear,
  Alert,
  getPaginationProps,
  getFullName,
  dateFormat,
  validateDate,
  getKeyValueMap,
  getAcademicYear,
} from "Includes/functions";
import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import { TrendingUpTwoTone } from "@material-ui/icons";
import { DEFAULT_PAGINATION_PROPS, minDate, maxDate } from "Constants";

const { forwardRef, useRef, useImperativeHandle } = React;

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles((theme) => ({
  appBar: {
    position: "relative",
    backgroundColor: "#4680FF",
  },
  title: {
    marginLeft: theme.spacing(2),
    flex: 1,
  },
}));

const SelectStudent = forwardRef((props, ref) => {
  const [openDialog, setOpenDialog] = React.useState(false);
  const [studentList, setStudentList] = React.useState(null);
  const [pageLoading, setPageLoading] = React.useState(true);
  const [yearList, setYearList] = React.useState([]);
  const [standardList, setStandardList] = React.useState([]);
  const [year, setYear] = React.useState(props.year);
  const [standard, setStandard] = React.useState("");
  const [submitDisable, setSubmitDisable] = React.useState(false);
  const [errorContent, setErrorContent] = React.useState("");
  const [studentId, setStudentId] = React.useState("");
  const [pagination, setPagination] = React.useState(DEFAULT_PAGINATION_PROPS);
  const [blankData, setBlankData] = React.useState(
    `Select year, ${alias_names["standard"]} and start date`
  );
  const [tableUpdating, setTableUpdating] = React.useState(false);
  const [openSnackBar, setOpenSnackBar] = React.useState(false);
  const [selectedYear, setSelectedYear] = React.useState(props.year);

  const [date_range, set_date_range] = React.useState({
    minDate: "",
    maxDate: "",
  });
  const [startDateObject, setStartDateObject] = React.useState({});
  const [endDateObject, setEndDateObject] = React.useState({});

  const columns = React.useMemo(() => [
    {
      name: "id",
      label: "id",
      options: {
        filter: false,
        sort: false,
        display: false,
      },
    },
    {
      name: "full_name",
      label: "Name",
      options: {
        filter: true,
        sort: true,
      },
    },
    {
      name: "current_standard_name",
      label: "Standard",
      options: {
        filter: false,
        sort: true,
        display: true,
      },
    },
    {
      name: "admission_num",
      label: "Admission Number",
      options: {
        filter: false,
        sort: true,
        display: true,
      },
    },
    {
      name: "mobile_num",
      label: "Mobile Number",
      options: {
        filter: true,
        sort: true,
      },
    },
    {
      name: "action",
      label: "Actions",
      options: {
        filter: true,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => {
          const studentId = tableMeta.rowData[0];
          const studentData = studentList && studentList.student_list 
            ? studentList.student_list.find(s => s.id === studentId) 
            : null;
          const isStudyCertIssued = studentData && studentData.is_study_certificate_issued;
          return (
            <Box style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <Tooltip
                title={_.isEmpty(value) ? "" : "Already assigned"}
                enterDelay={400}
                enterNextDelay={400}
                placement="top-start"
                classes={{ tooltip: "tooltip-show-data" }}
              >
                <Button
                  className={"add-modify-button"}
                  onClick={() =>
                    submit(
                      tableMeta.rowData[0],
                      tableMeta.rowData[1],
                      tableMeta.rowData[6],
                      tableMeta.rowData[2],
                      tableMeta.rowData[3],
                    )
                  }
                >
                  {" "}
                  Select
                </Button>
              </Tooltip>
              {isStudyCertIssued && (
                <Typography
                  style={{
                    fontSize: "12px",
                    color: "#856404",
                    backgroundColor: "#fff3cd",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "1px solid #ffc107",
                    fontWeight: 500,
                  }}
                >
                  Study certificate already issued
                </Typography>
              )}
            </Box>
          );
        },
      },
    },
    {
      name: "current_standard",
      label: "Standard",
      options: {
        filter: false,
        sort: false,
        display: false,
        download: false,
      },
    },
  ], [studentList]);

  React.useEffect(() => {
    setStudentList(null);
    setStandardList([]);
    setOpenDialog(() => true);
    setPageLoading(true);
    setStandard(() => "");
    setYear(() => props.year);
    setSelectedYear(() => props.year);
    getStandardList();
  }, []);

  const getStandardList = () => {
    const params = { academic_year: year, is_active: true };
    getRequest(GET_URL.getstandardandsection.api, params, props).then(
      (response) => {
        if (response && response.status === 200) {
          const standardList = response.data.data;
          standardList.unshift({ id: "all", name: "All" });
          setStandardList(standardList);
          setStandard(() => "all");
        }
      }
    );
  };

  const handleClose = () => {
    props.closeSelectStudent()
    setStudentList(null);
    setStandardList([]);
  };

  useEffect(() => {
    if (openDialog) {
      getStudentList();
    }
  }, [standard]);

  const onChange = (e) => {
    let value = e.target.value;
    const name = e.target.name;
    if (value !== 0) {
      if (name === "standard") {
        setStandard(() => value);
      }
      setErrorContent("");
      setStudentId(null);
    }
  };

  const getStudentList = (paginationProps) => {
    // setTableUpdating(() => true)
    let currentPagination = pagination;
    if (paginationProps) {
      currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(currentPagination);
    let params = { ...pagination_params, is_active: true, admission_num: true };
    if (standard && standard !== "all") {
      let temp = {};
      temp["current_standard"] = standard;
      params = { ...params, ...temp };
    }
    // Add academic year if available
    if (props.year) {
      params["student_academic_year"] = props.year;
    }
    // Add study certificate issue details check if selected misc is study certificate
    if (props.selectedMisc && props.selectedMisc.misc_code_name && props.selectedMisc.misc_code_name === 'sc') {
      params["show_study_certificate_issue_details"] = "1";
    }
    const url = GET_URL.student.api;
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.student_list.map((data) => {
          data["full_name"] = getFullName(
            data["first_name"],
            data["middle_name"],
            data["last_name"]
          );
        });
        setStudentList(() => response.data.data);
        setPagination(() => currentPagination);
        setPageLoading(() => false);
        if (response.data.data.length === 0) {
          setBlankData("There is no students");
          setStudentList(() => null);
        }
      }
    });
  };

  React.useEffect(() => {
    setTableUpdating(() => false);
  }, [pagination]);

  const submit = (
    id,
    studentName,
    current_standard,
    standard_name,
    regNumber
  ) => {
    // Find the student data to get study certificate status
    const studentData = studentList && studentList.student_list 
      ? studentList.student_list.find(s => s.id === id) 
      : null;
    const isStudyCertIssued = studentData && studentData.is_study_certificate_issued;
    
    let return_details = {
      studentName: studentName,
      regNumber: regNumber,
      studentID: id,
      standard_name: standard_name,
      studentStandard: current_standard,
      is_study_certificate_issued: isStudyCertIssued || false,
    };
    props.getStudentDetails(return_details);
  };

  const handleCloseSnackBar = () => {
    setOpenSnackBar(() => false);
    setErrorContent(() => false);
  };

  const options = {
    selectableRows: "none",
    filterType: "dropdown",
    responsive: "simple",
    filter: false,
    download: true,
    print: false,
    viewColumns: false,
    rowsPerPageOptions: [5, 10, 25, 50, 100],
  };

  return (
    <div>
      <Dialog fullScreen open={openDialog} onClose={handleClose}>
        <AppBar style={{ position: "fixed" }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={handleClose}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <Typography variant="h6">Select Student</Typography>
          </Toolbar>
        </AppBar>
        <Box className="student-route-table-popup margin-top">
          {pageLoading && (
            <Box display="flex">
              <img src={loadingBar} className="loading" alt="loading" />
            </Box>
          )}
          {!pageLoading && (
            <Box>
              <Grid container spacing={1}>
                <Grid item md={3} xs={12}>
                  <Box className="width-97">
                    <Dropdown
                      data={standardList}
                      name="standard"
                      value={standard}
                      onChange={(e) => onChange(e, "standard")}
                      disabled={year ? false : true}
                      label="Select Standard"
                      hideSelect={true}
                    />
                  </Box>
                </Grid>
              </Grid>
              {studentList !== null && (
                <Box className="header-align">
                  <AllMUIDataTable
                    key={studentList.student_list}
                    data={studentList.student_list}
                    columns={columns}
                    options={options}
                    title={
                      tableUpdating ? (
                        <CircularProgress className="white-text" />
                      ) : (
                        ""
                      )
                    }
                    onTableChange={getStudentList}
                    serverSide={true}
                    pagination={pagination}
                    count={studentList.count}
                  />
                </Box>
              )}
              {studentList === null && <BlankPagewithIcon data={blankData} />}
            </Box>
          )}
        </Box>
        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={openSnackBar}
          autoHideDuration={2000}
          onClose={handleCloseSnackBar}
        >
          <Alert onClose={handleCloseSnackBar} severity="error">
            {errorContent}
          </Alert>
        </Snackbar>
      </Dialog>
    </div>
  );
});

export default withRouter(SelectStudent);
