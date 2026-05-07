/* eslint-disable react/display-name */
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Button, Box, Grid } from "@material-ui/core";
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
  getFullName,
  getPaginationProps,
  getStandard,
} from "Includes/functions";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { Dropdown } from "Components/DropDown";
import { FormattedMessage } from "react-intl";
import messages from "./../messages";
import commonMessages from "Constants/messages";
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

const AssignStudentBookIssue = forwardRef((props, ref) => {
  const classes = useStyles();
  useImperativeHandle(ref, () => ({
    openModal() {
      setOpen(true);
      getStandardList();
      if (getStandard()) {
        setStandard(() => getStandard());
      }
    },
  }));

  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState();
  const [selectedStudents, setselectedStudents] = React.useState([]);
  const [standardList, setStandardList] = React.useState([]);
  const [standard, setStandard] = React.useState("");
  const [studentList, setStudentList] = React.useState([]);
  const [loadingStudent, setloadingStudent] = React.useState(false);
  const [pagination, setPagination] = React.useState(
    DEFAULT_PAGINATION_PROPS_ID_LIST
  );

  const getStandardList = async () => {
    const f_url = GET_URL.getstandardandsection.api;
    const param = { is_active: true };
    await getRequest(f_url, param, props).then((response) => {
      if (response && response.status === 200) {
        setStandardList(response.data.data);
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
    setOpen(false);
  };

  const saveData = () => {
    let student_data = [];
    for (let index of selectedStudents) {
      student_data.push(studentList[index]);
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
      let selectedStudents = [];
      tableState.selectedRows.data.map((row) => {
        selectedStudents.push(row["dataIndex"]);
      });
      setselectedStudents(selectedStudents);
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

  React.useEffect(() => {
    if (standard) {
      getStudentList();
    }
  }, [standard]);

  const getStudentList = (paginationProps) => {
    let pagination_params = getPaginationProps(
      paginationProps ? paginationProps : pagination
    );
    const url = GET_URL.student.api;
    let params = {
      ...pagination_params,
      is_active: true,
      current_standard: standard,
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
        if (paginationProps) {
          setPagination(...paginationProps);
        }
        setStudentList(() => response.data.data.student_list);
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
                data={standardList}
                name="standard"
                value={standard}
                onChange={onChange}
                label={<FormattedMessage {...commonMessages.standard} />}
                className="w-100"
                hideSelect={true}
                size="small"
              />
            </Grid>
          </Grid>
          <Box className="margintop-15">
            {standard ? (
              studentList.length > 0 ? (
                <Box>
                  <AllMUIDataTable
                    key={studentList}
                    data={studentList}
                    columns={columns}
                    options={options}
                    onTableChange={getStudentList}
                    serverSide={true}
                    pagination={pagination}
                    count={studentList.count}
                  />
                </Box>
              ) : (
                <BlankPagewithIcon
                  data={loadingStudent ? "" : "No Students found"}
                />
              )
            ) : (
              <BlankPagewithIcon
                data={loadingStudent ? "" : "Select Standard"}
              />
            )}
          </Box>
        </Box>
      </Dialog>
    </div>
  );
});

export default AssignStudentBookIssue;
