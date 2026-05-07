import React from "react";
import _, { cloneDeep } from "lodash";
import {
  Box,
  Grid,
  DialogContent,
  Dialog,
  CircularProgress,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Slide from "@material-ui/core/Slide";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import {
  FROM_ACTIVE_USER_TYPE,
  FROM_ACTIVE_USER_STATUS,
  DEFAULT_PAGINATION_PROPS_FIRST_NAMES_LIST,
  USER_OPTIONS,
} from "Constants";
import LoadingGif from "Components/LoadingGif";
import {
  dateFormat,
  getPaginationProps,
  getFullName,
  getFormatMessage,
} from "Includes/functions";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { staffColumns, studentColumns } from "./ActiveUsersColumns";

let user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";

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

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function ActiveUserListModal(props) {
  const { selected_from, selected_details, series, optionsChart } = props;
  const [loading, set_loading] = React.useState(true);
  const [selected_standard, set_selected_standard] = React.useState("");
  const [standardList, set_standardList] = React.useState([]);
  const [studentList, setStudentList] = React.useState({ student_list: [] });
  const [staffList, setStaffList] = React.useState([]);
  const [staffOptions] = React.useState(cloneDeep(USER_OPTIONS));
  const [selected_status, set_selected_status] = React.useState("");
  const [tableUpdating, setTableUpdating] = React.useState(false);
  const [isStaff, setIsStaff] = React.useState(false);
  const [pagination, setPagination] = React.useState({
    ...DEFAULT_PAGINATION_PROPS_FIRST_NAMES_LIST,
  });

  const classes = useStyles();

  const handleClose = () => {
    props.handleClose(false);
  };

  React.useEffect(() => {
    if (!optionsChart || !series || !selected_details) {
      console.error("Missing required props for ActiveUserListModal");
      return;
    }
    
    let temp_details = {};
    const categories = optionsChart?.xaxis?.categories || [];
    const selectedCategory = categories[selected_details.dataIndex];
    const selectedSeries = series[selected_details.seriesIndex];
    
    temp_details["standard"] = selectedCategory || "";
    temp_details["status"] = selectedSeries?.name || "";
    
    if (!temp_details["standard"] || !temp_details["status"]) {
      console.error("Invalid chart selection data");
      return;
    }
    
    set_selected_status({
      id: temp_details?.status,
      name: temp_details?.status,
    });
    if (temp_details["standard"] === "Staff") {
      setIsStaff(true);
      getStaffList();
    } else {
      getStandardList(temp_details["standard"]);
    }
  }, []);

  const getStaffList = () => {
    if (selected_status.id) {
      const url = GET_URL.staff.api;
      const params = { is_active: true, ordering: "first_name" };
      params["user_last_activity_date_range"] = getDateTime();
      if (selected_status.id === "Active Users") {
        params["last_activity_active_users"] = 1;
      } else if (selected_status.id === "In Active Users") {
        params["last_activity_inactive_users"] = 1;
      } else if (selected_status.id === "Total Logged in Users") {
        params["logged_in_users"] = 1;
      } else if (selected_status.id === "Total Not Logged in Users") {
        params["not_logged_in_users"] = 1;
      }
      getRequest(url, params, props).then((response) => {
        if (response && response.status === 200) {
          setStaffList(response.data.data);
        }
        setTableUpdating(false);
        set_loading(false);
      });
    }
  };

  const getUserReport = (paginationProps) => {
    if (selected_standard.id && selected_status.id) {
      let currentPagination = pagination;
      if (paginationProps) {
        currentPagination = { ...paginationProps };
      }
      let pagination_params = getPaginationProps(currentPagination);
      let params = {
        ...pagination_params,
        is_active: true,
        admission_num: true,
        current_standard: selected_standard.id,
      };
      params["admission_history"] = true;
      params["user_last_activity_date_range"] = getDateTime();
      if (selected_status.id === "Active Users") {
        params["last_activity_active_users"] = 1;
      } else if (selected_status.id === "In Active Users") {
        params["last_activity_inactive_users"] = 1;
      } else if (selected_status.id === "Total Logged in Users") {
        params["logged_in_users"] = 1;
      } else if (selected_status.id === "Total Not Logged in Users") {
        params["not_logged_in_users"] = 1;
      }
      const url = GET_URL.student.api;
      getRequest(url, params, props).then((response) => {
        if (response && response.status === 200) {
          const studentList = response.data.data;
          studentList.student_list.map((data) => {
            data["full_name"] = getFullName(
              data["first_name"],
              data["middle_name"],
              data["last_name"]
            );
          });
          setPagination(currentPagination);
          setStudentList(studentList);
        }
        setTableUpdating(false);
        set_loading(false);
      });
    }
  };

  const getDateTime = () => {
    let new_date = new Date();
    new_date.setHours(0, 0, 0, 0);
    if (selected_from.id === "Today") {
      return dateFormat(new_date, "YYYY-MM-DD HH:mm:ss");
    } else if (selected_from.id === "This Week") {
      new_date = new Date(new_date.setDate(new_date.getDate() - 7));
      return dateFormat(new_date, "YYYY-MM-DD HH:mm:ss");
    } else if (selected_from.id === "This Month") {
      new_date = new Date(new_date.getFullYear(), new_date.getMonth(), 1);
      return dateFormat(new_date, "YYYY-MM-DD HH:mm:ss");
    } else if (selected_from.id === "This Academic Year") {
      let start_year_date = user?.other_details?.academic_year?.start_date;
      return dateFormat(start_year_date, "YYYY-MM-DD HH:mm:ss");
    }
  };

  React.useEffect(() => {
    setTableUpdating(true);
    if (isStaff) {
      getStaffList();
    } else {
      getUserReport();
    }
  }, [selected_from, selected_standard, selected_status]);

  const getStandardList = (selectedStandard) => {
    const param = { is_active: true };
    getRequest(GET_URL.getstandard.api, param, props).then((response) => {
      if (response && response.status === 200) {
        set_standardList(response.data.data);
        response.data.data.forEach((element) => {
          if (element.name === selectedStandard) {
            set_selected_standard(element);
          }
        });
      }
    });
  };

  const handleDropDownStandard = (value) => {
    set_selected_standard(value);
  };

  const handleDropDownStatus = (value) => {
    set_selected_status(value);
  };

  const optionsDataGrid = {
    selectableRows: "none",
    filterType: "dropdown",
    responsive: "simple",
    filter: false,
    download: true,
    print: false,
    viewColumns: false,
    rowsPerPageOptions: [5, 10, 25, 50, 100],
    onDownload: (buildHead, buildBody, columns, data) => {
      const bodyData = data.map((data_value, i) => {
        return data_value;
      });
      columns.forEach((column_name) => {
        column_name.label = getFormatMessage(column_name.label);
      });
      return "\uFEFF" + buildHead(columns) + buildBody(bodyData);
    },
    downloadOptions: {
      filename: `${isStaff ? "Staff" : selected_standard?.name}_${
        selected_status.id
      }.csv`,
      filterOptions: {
        useDisplayedColumnsOnly: true,
        useDisplayedRowsOnly: true,
      },
    },
  };

  return (
    <Dialog
      fullScreen
      open={true}
      onClose={() => handleClose()}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      maxWidth="md"
      fullWidth={true}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        style: {
          boxShadow: "none",
        },
      }}
    >
      <AppBar className={classes.appBar} style={{ position: "sticky" }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => handleClose()}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
          <Box fontWeight="bold">User Active List</Box>
        </Toolbar>
      </AppBar>
      <DialogContent>
        {loading ? (
          <LoadingGif />
        ) : (
          <Grid container className="mt-20">
            <Grid item lg={3} md={3} sm={12}>
              <DropDownWithSearch
                options={FROM_ACTIVE_USER_TYPE}
                name={"selected_from"}
                value={props.selected_from}
                onChange={(e, newValue) => props.handleDropDown(newValue)}
                label={"From"}
                hideClearIcon={true}
                className="width-300px"
                size='small'
              />
            </Grid>
            {!isStaff && (
              <Grid item lg={3} md={3} sm={12}>
                <DropDownWithSearch
                  options={standardList}
                  name={"selected_standard"}
                  value={selected_standard}
                  onChange={(e, newValue) => handleDropDownStandard(newValue)}
                  label={"Select Standard"}
                  hideClearIcon={true}
                  className="width-300px"
                  size='small'
                />
              </Grid>
            )}
            <Grid item lg={3} md={3} sm={12}>
              <DropDownWithSearch
                options={FROM_ACTIVE_USER_STATUS}
                name={"selected_status"}
                value={selected_status}
                onChange={(e, newValue) => handleDropDownStatus(newValue)}
                label={"Select Status"}
                hideClearIcon={true}
                className="width-300px"
                size='small'
              />
            </Grid>
            <Grid item lg={12} md={12} sm={12}>
              <div className="mt-20">
                {isStaff ? (
                  <AllMUIDataTable
                    key={staffList}
                    title={
                      tableUpdating ? (
                        <CircularProgress className="white-text" />
                      ) : (
                        ""
                      )
                    }
                    data={staffList}
                    columns={staffColumns}
                    options={staffOptions}
                  />
                ) : (
                  <AllMUIDataTable
                    title={
                      tableUpdating ? (
                        <CircularProgress className="white-text" />
                      ) : (
                        ""
                      )
                    }
                    data={studentList.student_list}
                    columns={studentColumns}
                    options={optionsDataGrid}
                    onTableChange={getUserReport}
                    serverSide={true}
                    pagination={pagination}
                    count={studentList.count}
                    hideTextTransform={true}
                  />
                )}
              </div>
            </Grid>
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
}
