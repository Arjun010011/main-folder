/* eslint-disable react/display-name */
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Button, Box, Grid, CircularProgress } from "@material-ui/core";
import Dialog from "@material-ui/core/Dialog";
import Slide from "@material-ui/core/Slide";
import AllMUIDataTable from "Components/AllMUIDataTable";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import CloseIcon from "@material-ui/icons/Close";
import Tooltip from "@material-ui/core/Tooltip";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import {
  SetAcademicYear,
  getAcademicYear,
  getFullName,
  getPaginationProps,
} from "Includes/functions";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { Dropdown } from "Components/DropDown";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import messages from "./../messages";
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from "Constants";

const { forwardRef, useRef, useImperativeHandle } = React;

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

const AssignStudentItemIssue = forwardRef((props, ref) => {
  const classes = useStyles();
  useImperativeHandle(ref, () => ({
    openModal() {
      setStandard("");
      setOpen(true);
      getAcademicYearList();
      if (getAcademicYear()) {
        getStandardList(getAcademicYear());
        set_selected_year(getAcademicYear())
      }
    },
  }));

  const [open, setOpen] = React.useState(false);
  const [areaName, setAreaName] = React.useState("");
  const [areaIndex, setAreaIndex] = React.useState(0);
  const [options, setOptions] = React.useState();
  const [selectedStudents, setselectedStudents] = React.useState([]);
  const [standardList, setStandardList] = React.useState([]);
  const [yearList, setYearList] = React.useState([]);
  const [standard, setStandard] = React.useState("");
  const [selected_year, set_selected_year] = React.useState("");
  const [studentList, setStudentList] = React.useState([]);
  const [loadingStudent, setloadingStudent] = React.useState(false);
  const [pagination, setPagination] = React.useState(
    DEFAULT_PAGINATION_PROPS_ID_LIST
  );

  const getStandardList = (year) => {
    const f_url = GET_URL.getstandardandsection.api;
    const param = { academic_year: year, is_active: true };
    getRequest(f_url, param, props).then((response) => {
      if (response && response.status === 200) {
        setStandardList(response.data.data);
      }
    });
  };

  const getAcademicYearList = () => {
    const url = GET_URL.getacademicyear.api;
    const params = { is_active: true };
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        setYearList(response.data.data);
      }
    });
  };

  const [columns, setColumn] = React.useState([
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
      label: "Student Name",
      options: {
        filter: true,
        sort: true,
      },
    },
    {
      name: "email",
      label: "Email",
      options: {
        filter: true,
        sort: true,
      },
    },
    {
      name: "current_standard_name",
      label: "Standard",
      options: {
        filter: true,
        sort: true,
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
  ]);

  const handleClose = () => {
    setStandardList([]);
    set_selected_year("");
    setYearList([])
    setStandard("");
    setOpen(false);
  };

  const saveData = () => {
    let student_data = [];
    for (let index of selectedStudents) {
      student_data.push(studentList.student_list[index]);
    }
    props.addDataToList(student_data);
    handleClose();
  };

  const setOptionsForTable = () => {
    let newOptions = { ...options };
    newOptions["selectableRows"] = "multiple";
    newOptions["customToolbarSelect"] = () => {
      return (
        <div className={"custom-toolbar-select-feature"}>
          <Tooltip title={"icon 2"}>
            <IconButton></IconButton>
          </Tooltip>
        </div>
      );
    };
    newOptions["onRowsClick"] = (data) => {};
    newOptions["onTableChange"] = (action, tableState) => {
      if (action !== "propsUpdate") {
        if (action === "rowSelectionChange") {
          let selectedStudents = [];
          tableState.selectedRows.data.map((row) => {
            selectedStudents.push(row["dataIndex"]);
          });
          setselectedStudents(selectedStudents);
        } else {
          getStudentList(tableState);
        }
      }
    };
    newOptions["download"] = false;
    newOptions["print"] = false;
    newOptions["viewColumns"] = false;
    newOptions["filter"] = false;
    setOptions(newOptions);
  };

  const intialize = () => {
    setselectedStudents([]);
  };

  const descriptionElementRef = React.useRef(null);
  React.useEffect(() => {
    if (open) {
      const { current: descriptionElement } = descriptionElementRef;
      if (descriptionElement !== null) {
        descriptionElement.focus();
      }
    }
    setOptionsForTable();
    intialize();
  }, [open, standard]);

  const onChange = (e) => {
    const { value } = e.target;
    setStandard(value);
  };

  const onChangeYear = (e) => {
    const { value } = e.target;
    set_selected_year(value);
    getStandardList(value)
    setStandardList([])
    setStandard("")
    SetAcademicYear(value)
    setStudentList([])
  };

  React.useEffect(() => {
    if (standard) {
      getStudentList();
    }
  }, [standard]);

  const getStudentList = (paginationProps) => {
    setloadingStudent(true);
    let currentPagination = pagination;
    if (paginationProps) {
      currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(currentPagination);

    // let pagination_params = getPaginationProps(
    //   paginationProps ? paginationProps : pagination
    // );
    const url = GET_URL.student.api;
    let params = {
      ...pagination_params,
      is_active: true,
      current_standard: standard,
      student_academic_year:selected_year
    };
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.student_list.map((data) => {
          data["full_name"] = getFullName(
            data["first_name"],
            data["middle_name"],
            data["last_name"]
          );
        });
        // if (paginationProps) {
        setPagination(currentPagination);
        // }
        setStudentList(response.data.data);
        setloadingStudent(false);
      }
    });
  };

  return (
    <div>
      <Dialog fullScreen open={open} onClose={handleClose}>
        <AppBar className={classes.appBar} style={{ position: "fixed" }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={handleClose}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" className={classes.title}>
              Select Students
            </Typography>
            <Button autoFocus color="inherit" onClick={saveData}>
              save
            </Button>
          </Toolbar>
        </AppBar>
        <Box className="student-route-table-popup">
          <Grid container spacing={3}>
            <Grid item md={3} xs={12}>
              <Dropdown
                data={yearList}
                name="selected_year"
                value={selected_year}
                onChange={onChangeYear}
                label={<FormattedMessage {...commonMessages.academicYear} />}
                className="w-100"
                hideSelect={true}
                size={"small"}
              />
            </Grid>
            <Grid item md={3} xs={12}>
              <Dropdown
                data={standardList}
                name="standard"
                value={standard}
                onChange={onChange}
                label={<FormattedMessage {...commonMessages.standard} />}
                className="w-100"
                hideSelect={true}
                size={"small"}
              />
            </Grid>
          </Grid>
          <Box className="m-t-20px">
            {standard ? (
              studentList?.student_list?.length > 0 ? (
                <Box>
                  <AllMUIDataTable
                    key={studentList.student_list}
                    data={studentList.student_list}
                    columns={columns}
                    options={options}
                    // onTableChange={onTableChange}
                    serverSide={true}
                    pagination={pagination}
                    count={studentList.count}
                  />
                </Box>
              ) : (
                <BlankPagewithIcon
                  data={
                    loadingStudent ? <CircularProgress /> : "No Students found"
                  }
                />
              )
            ) : (
              <BlankPagewithIcon
                data={loadingStudent ? <CircularProgress /> : "Select Standard"}
              />
            )}
          </Box>
        </Box>
      </Dialog>
    </div>
  );
});

export default AssignStudentItemIssue;
