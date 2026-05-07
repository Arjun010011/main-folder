import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { makeStyles } from "@material-ui/core/styles";
import {
  Button,
  Tooltip,
  Dialog,
  AppBar,
  Toolbar,
  TableContainer,
  Table,
  TableHead,
  TableCell,
  TextField,
  TableRow,
  TableBody,
} from "@material-ui/core";
import MuiDialogContent from "@material-ui/core/DialogContent";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Typography from "@material-ui/core/Typography";
import Snackbar from "@material-ui/core/Snackbar";
import {
  Alert,
  dateFormat,
  getRowsPerPageOptions,
  isUserHasPermission,
} from "Includes/functions";
import { cloneDeep } from "lodash";
import TablePagination from "@material-ui/core/TablePagination";
import { postRequest } from "Includes/api/apicall";
import { POST_URL } from "Includes/urls";
import Swal from "sweetalert2";

// import './styles.scss';
import "./styles.scss";
import Filter from "Components/Filter";

import ReactExport from "react-export-excel";
// import excel from 'xlsx';
import * as XLSX from "xlsx";
import LoadingGif from "Components/LoadingGif";
import AttendanceStatusInfromation from "Containers/Payroll/Components/AttendanceStatusInformation";


const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

const fieldDetails = [
  {
    label: "Name",
    regex: null,
    name: "name",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    autoFocus: true,
    maxLength: "100",
  },
];

const useStyles = makeStyles((theme) => ({
  appBar: {
    position: "relative",
    backgroundColor: "#4680FF",
  },
  title: {
    flex: 1,
  },
}));

const DialogContent = withStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
  },
}))(MuiDialogContent);

export default function StaffAttendanceDetailed(props) {
  const classes = useStyles();

  const [loading, set_loading] = React.useState(false);
  const [selectedCount, setSelectedCount] = React.useState([]);
  const [showStaffList, setShowStaffList] = React.useState([]);
  const [searchStudent, setSearchStudent] = React.useState("");
  const [alertData, setAlertData] = React.useState("");
  const [isStatusDialog, setIsStatusDialog] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState(false);
  const [downloadData, setDownloadData] = React.useState([]);
  const [attendance_detail, set_attendance_detail] = React.useState({
    day_list: [],
    staff_list: [],
  });
  const [page, setPage] = React.useState(0);
  const [submitDisable, setSubmitDisable] = React.useState(false);
  const [alertType, setAlertType] = React.useState("error");
  const [modified, setModified] = React.useState(false);

  const handleClose = (name) => {
    if (modified && name !== "submit") {
      Swal.fire({
        title: "Are you sure?",
        text: "Modified Attendnace is not save!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, close it!",
      }).then(async (result) => {
        if (result.value) {
          props.closeInParent();
        }
      });
    } else {
      props.closeInParent();
    }
  };

  const handleCloseSnackBar = () => {
    setSnackbar(false);
  };

  React.useEffect(() => {
    set_loading(true);
  }, []);

  React.useEffect(() => {
    if (loading) {
      let attendance_detail = props?.attendance_details ?? {};
      let temp_list = [];
      let temp = {};
      attendance_detail.staff_list.map((data) => {
        temp = {};
        temp["id"] = data["id"] = data["staff_details"]["staff_id"];
        temp["name"] = data["name"] = data["staff_details"]["name"];
        attendance_detail.day_list.map((day_data) => {
          temp[day_data["date"]] =
            data.day_list_status?.[day_data["date"]]?.["alias_name"] ?? "-";
        });
        temp_list.push(temp);
      });
      setDownloadData(temp_list);
      set_attendance_detail(attendance_detail);
      let pageOptions = getRowsPerPageOptions(
        attendance_detail.staff_list.length
      );
      let temp_page_options = [];
      pageOptions.map((pageData) => {
        temp_page_options.push({ id: pageData, name: pageData });
      });
      set_loading(false);
      setSelectedCount(10);
      setShowStaffList(attendance_detail.staff_list.slice(0, 10));
    }
  }, [loading]);

  const handleImportCSV = (file) => {
    const promise = new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsArrayBuffer(file);
      fileReader.onload = (e) => {
        const bufferArray = e.target.result;
        const wb = XLSX.read(bufferArray, { type: "buffer" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        resolve(data);
      };
      fileReader.onerror = (error) => {
        reject(error);
      };
    });
    promise.then((importData) => {
      let validate = true;
      let modified = false;
      let temp_details = cloneDeep(attendance_detail);
      importData.map((imp) => {
        temp_details.staff_list.map((data) => {
          if (data["id"] === imp["Staff ID"]) {
            temp_details.day_list.map((day) => {
              if (!data.day_list_status[day["date"]]) {
                data.day_list_status[day["date"]] = {
                  for_date: day["date"],
                  status: "",
                };
              }
              if (
                data.day_list_status[day["date"]]["alias_name"] !==
                imp[day["date"]] && imp[day["date"]]!=="-"
              ) {
                if (!temp_details.status_alias_list[imp[day["date"]]]) {
                  console.log(imp, 'nikhil imp')
                  console.log(day, 'nikhil date')
                  console.log(temp_details.status_alias_list)
                  data.day_list_status[day["date"]]["error"] = true;
                  validate = false;
                } else {
                  data.day_list_status[day["date"]]["alias_name"] =
                    imp[day["date"]];
                  data.day_list_status[day["date"]]["status"] =
                    temp_details.status_alias_list[imp[day["date"]]]["status"];
                  data.day_list_status[day["date"]]["modified"] = true;
                  modified = true;
                }
              } else {
              }
            });
          }
        });
      });
      set_attendance_detail(() => cloneDeep(temp_details));
      if (validate) {
        setShowStaffList(temp_details.staff_list.slice(0, selectedCount));
        setSnackbar(true);
        setAlertType("success");
        setAlertData("successfully imported click submit to save the data");
        setModified(modified);
        setSubmitDisable(false);
      } else {
        setSnackbar(true);
        setAlertType("error");
        setAlertData(`Invalid Status Found`);
        setSubmitDisable(true);
      }
    });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    let newSelectedCount = "";
    let start_count = 0;
    if (newPage) {
      start_count = newPage * selectedCount;
    }
    newSelectedCount = start_count + selectedCount;
    setShowStaffList(
      attendance_detail.staff_list.slice(start_count, newSelectedCount)
    );
    setSelectedCount(selectedCount);
  };

  const handleChangeRowsPerPage = (e) => {
    setShowStaffList(attendance_detail.staff_list.slice(0, e.target.value));
    setSelectedCount(e.target.value);
    setPage(0);
  };

  const handleFilter = (e) => {
    let { value, filterList } = e.target;
    let finalStudentList = [];
    if (value !== "") {
      let lowerCasedFilter = value.toLowerCase().replace(/\s+/g, "");
      filterList = attendance_detail.staff_list.filter((item) => {
        return Object.keys(item).some(
          (key) =>
            typeof item[key] === "string" &&
            item[key]
              .toLowerCase()
              .replace(/\s+/g, "")
              .includes(lowerCasedFilter)
        );
      });
      finalStudentList = filterList;
    } else {
      finalStudentList = [...attendance_detail.staff_list];
      filterList = [];
    }
    setSearchStudent(value);
    setShowStaffList(finalStudentList.slice(0, selectedCount));
  };

  const handleSubmit = () => {
    let post_data = validationAndGetPostData();
    if (post_data) {
      setSubmitDisable(true);
      let url = POST_URL.staffattendancebulk.api;
      postRequest(url, post_data, props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: response.data.Reason,
            showConfirmButton: false,
            timer: 1500,
          });
          setModified(false);
          handleClose("submit");
          props.getAttendanceDetail();
        }
        setSubmitDisable(false);
      });
    }
  };

  const validationAndGetPostData = () => {
    let return_data = {};
    let staff_temp_list = [];
    attendance_detail.staff_list.map((data) => {
      attendance_detail.day_list.map((day) => {
        if (data.day_list_status[day["date"]] && data.day_list_status[day["date"]]["modified"] === true) {
          staff_temp_list.push({
            staff: data["id"],
            attendance_data: [
              {
                for_date: data.day_list_status[day["date"]]["for_date"],
                status: data.day_list_status[day["date"]]["status"],
                in_time: null,
                out_time: null,
              },
            ],
          });
        }
      });
    });
    if (staff_temp_list.length === 0) {
      return_data = false;
      setSnackbar(true);
      setAlertData("There are no modified staffs");
      setAlertType("error");
    }
    if (return_data) {
      return_data = {
        staff_list: staff_temp_list,
      };
    }
    return return_data;
  };

  const handleStatusInformation = () => {
    setIsStatusDialog(!isStatusDialog);
  };

  return (
    <div>
      <Dialog fullScreen aria-labelledby="customized-dialog-title" open={true}>
        <AppBar className={classes.appBar}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => handleClose("close")}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" className={classes.title}>
              Staff Attendance Detailed Report - {props.selectedMonth.name}
            </Typography>
          </Toolbar>
        </AppBar>
        <DialogContent>
          {loading ? (
            <LoadingGif />
          ) : (
            <>
              <Button
                className="custom-button mr-10"
                onClick={handleStatusInformation}
              >
                Show Status Infomration
              </Button>
              {/* <Filter fieldDetails={fieldDetails} /> */}
              <ExcelFile
                element={
                  <Button className="custom-button">Export All Staff</Button>
                }
              >
                <ExcelSheet data={downloadData} name="Employees">
                  <ExcelColumn label="Staff ID" value="id" />
                  <ExcelColumn label="Name" value="name" />
                  {attendance_detail.day_list.map((day_data) => {
                    return (
                      <ExcelColumn
                        label={day_data["date"]}
                        value={day_data["date"]}
                        style={{
                          alignment: { horizontal: "center" },
                        }}
                        />
                    );
                  })}
                </ExcelSheet>
              </ExcelFile>
              {isUserHasPermission("staff_attendance_report", "create") && (
                <span className="ml-20">
                  <label htmlFor="upload-pic" className="">
                    <Button
                      variant="raised"
                      component="span"
                      className="custom-button profile-pic-button"
                    >
                      Import Excel
                    </Button>
                  </label>
                  <input
                    type="file"
                    id="upload-pic"
                    className="display-none"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      handleImportCSV(file);
                    }}
                    onClick={(e) => (e.target.value = null)}
                  />
                </span>
              )}
              <div className="mt-20">
                <TextField
                  autoFocus
                  id="outlined-name"
                  value={searchStudent}
                  placeholder=""
                  label="Search Staff"
                  name="searchStudent"
                  onChange={(e) => {
                    handleFilter(e);
                  }}
                />
              </div>
              <TableContainer className="mark-enter-bg header-align m-b-60px w-max-content">
                <Table
                  size="small"
                  aria-label="simple table"
                  className="exam-mark-row-table"
                >
                  <TableHead>
                    <TableRow className="">
                      <TableCell className="attendnace-detail-th text-align-center">
                        Staff
                      </TableCell>
                      {attendance_detail.day_list.map((data) => {
                        return (
                          <>
                            <TableCell className="attendnace-detail-th text-align-center">
                              {dateFormat(data.date, "DD")}
                            </TableCell>
                          </>
                        );
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody className="selectable-row-table-body">
                    {showStaffList.map((staff, stIndex) => {
                      return (
                        <TableRow className="selectable-row-table-row">
                          <TableCell
                            className="width-200-px white-space-pre"
                            component="th"
                            scope="row"
                          >
                            {staff.name}
                          </TableCell>
                          {attendance_detail.day_list.map((staff_day) => {
                            return (
                              <>
                                {Object.keys(staff.day_list_status).some(
                                  (key) =>
                                    staff.day_list_status[key]["for_date"] ==
                                    staff_day["date"]
                                ) ? (
                                  <Tooltip
                                    title={`
                                  ${
                                    staff.day_list_status?.[staff_day["date"]][
                                      "description"
                                    ]
                                  } ${
                                      staff.day_list_status?.[
                                        staff_day["date"]
                                      ]["modified"]
                                        ? " - Modified"
                                        : ""
                                    }
                                  `}
                                    enterDelay={400}
                                    enterNextDelay={400}
                                    placement="top-start"
                                    classes={{ tooltip: "tooltip-show-data" }}
                                  >
                                    <TableCell
                                      className={`${
                                        staff.day_list_status?.[
                                          staff_day["date"]
                                        ]["modified"]
                                          ? "bg-color-light"
                                          : staff.day_list_status?.[
                                              staff_day["date"]
                                            ]["error"]
                                          ? "bg-color-error"
                                          : ""
                                      } pointer text-align-center tabcell-small-size text-${
                                        staff.day_list_status?.[
                                          staff_day["date"]
                                        ]?.["color"]
                                      }`}
                                    >
                                      {
                                        staff.day_list_status[
                                          staff_day["date"]
                                        ]["alias_name"]
                                      }
                                    </TableCell>
                                  </Tooltip>
                                ) : (
                                  <>
                                    <TableCell
                                      className="text-align-center tabcell-small-size"
                                      component="th"
                                      scope="row"
                                    >
                                      -
                                    </TableCell>
                                  </>
                                )}
                              </>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <TablePagination
                  component="div"
                  count={attendance_detail.staff_list.length}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={selectedCount}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </TableContainer>
            </>
          )}
          {isUserHasPermission("staff_attendance_report", "create") && (
            <div className="submt-button-float-bottom">
              <Button
                variant="contained"
                color="primary"
                className="submit"
                disabled={submitDisable}
                onClick={handleSubmit}
              >
                submit
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {isStatusDialog && (
        <AttendanceStatusInfromation
          closeInParent={handleStatusInformation}
          status_list={props?.attendance_details?.status_list ?? []}
        /> 
      )}
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        open={snackbar}
        autoHideDuration={8000}
        onClose={handleCloseSnackBar}
      >
        <Alert onClose={handleCloseSnackBar} severity={alertType}>
          {alertData}
        </Alert>
      </Snackbar>
    </div>
  );
}
