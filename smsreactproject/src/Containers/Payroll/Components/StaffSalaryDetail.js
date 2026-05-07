import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { makeStyles } from "@material-ui/core/styles";
import {
  Button,
  Box,
  Dialog,
  AppBar,
  Toolbar,
  TableContainer,
  Table,
  TableHead,
  TableCell,
  TableRow,
  TableBody,
  Tooltip,
} from "@material-ui/core";
import MuiDialogContent from "@material-ui/core/DialogContent";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Typography from "@material-ui/core/Typography";
import Snackbar from "@material-ui/core/Snackbar";
import { Alert, dateFormat, getFullName } from "Includes/functions";
import AttendanceStatusInfromation from "./AttendanceStatusInformation";

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

export default function StaffSalaryDetail(props) {
  const classes = useStyles();
  const { salaryMonthName, details, staff_id } = props;
  const [open, setOpen] = React.useState(true);
  const [alertData, setAlertData] = React.useState("");
  const [isStatusDialog, setIsStatusDialog] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState(false);
  const [attendance_detail, set_attendance_detail] = React.useState(null);
  const [daysList, setDaysList] = React.useState([]);

  const handleClose = () => {
    props.closeInParent();
  };

  const handleCloseSnackBar = () => {
    setSnackbar(false);
  };

  React.useEffect(() => {
    let temp_details = {
      days_details: props.salaryDetailedReport.day_list,
      staff_details: [
        {
          id: staff_id,
          name: getFullName(
            details.first_name,
            details.middle_name,
            details.last_name
          ),
          days_details:
            props.salaryDetailedReport?.["data"]?.[staff_id]?.[
              "day_list_status"
            ],
        },
      ],
    };
    set_attendance_detail(temp_details);
    let status_report = props?.salaryDetailedReport?.status_report ?? {};
    let temp_list = [];
    Object.keys(status_report).map((data) => {
      temp_list.push({
        name: props?.salaryDetailedReport?.status_list[data]["description"],
        value: status_report[data]["count"],
      });
    });
    setDaysList(temp_list);
  }, []);

  const handleStatusInformation = () => {
    setIsStatusDialog(!isStatusDialog);
  };

  return (
    <div>
      <Dialog fullScreen aria-labelledby="customized-dialog-title" open={open}>
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
              {getFullName(
                details.first_name,
                details.middle_name,
                details.last_name
              )}{" "}
              Attendance Detailed Report For - {salaryMonthName}
            </Typography>
          </Toolbar>
        </AppBar>
        <DialogContent>
          <Button className="custom-button" onClick={handleStatusInformation}>
            Show Status Infomration
          </Button>
          {/* </div> */}
          <TableContainer className="mark-enter-bg header-align m-b-60px mt-30">
            <Table
              // size="small"
              aria-label="simple table"
              className="exam-mark-row-table"
            >
              <TableHead>
                <TableRow className="">
                  <TableCell className="attendnace-detail-th">Staff</TableCell>
                  {attendance_detail?.days_details.map((data) => {
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
                {attendance_detail?.staff_details.map((staff, stIndex) => {
                  return (
                    <TableRow className="selectable-row-table-row">
                      <TableCell
                        className="tabcell-small-size"
                        component="th"
                        scope="row"
                      >
                        {staff.name}
                      </TableCell>
                      {attendance_detail.days_details.map(
                        (staff_day, subIndex) => {
                          return (
                            <>
                              {Object.keys(staff.days_details).some(
                                (key) =>
                                  staff.days_details[key]["for_date"] ==
                                  staff_day["date"]
                              ) ? (
                                <>
                                  <Tooltip
                                    title={
                                      staff.days_details[staff_day["date"]][
                                        "description"
                                      ]
                                    }
                                    enterDelay={400}
                                    enterNextDelay={400}
                                    placement="top-start"
                                    classes={{ tooltip: "tooltip-show-data" }}
                                  >
                                    <TableCell
                                      className={`pointer text-align-center tabcell-small-size text-${
                                        staff.days_details[staff_day["date"]][
                                          "color"
                                        ]
                                      }`}
                                      component="th"
                                      scope="row"
                                    >
                                      {
                                        staff.days_details[staff_day["date"]][
                                          "alias_name"
                                        ]
                                      }
                                    </TableCell>
                                  </Tooltip>
                                </>
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
                        }
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {daysList && daysList.length > 0 && (
              <table className="width-600px mt-50">
                <thead>
                  <tr className="thead-adjustment">
                    <th>Name</th>
                    <th>No of days</th>
                  </tr>
                </thead>
                <tbody>
                  {daysList.map((data, index) => {
                    return (
                      <tr className="tbody-adjustment" key={index}>
                        <td>{data["name"]}</td>
                        <td>{data["value"]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </TableContainer>
        </DialogContent>
      </Dialog>
      {isStatusDialog && (
        <AttendanceStatusInfromation
          closeInParent={handleStatusInformation}
          status_list={props?.salaryDetailedReport?.status_list ?? []}
        />
      )}
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        open={snackbar}
        autoHideDuration={10000}
        onClose={handleCloseSnackBar}
      >
        <Alert onClose={handleCloseSnackBar} severity="error">
          {alertData}
        </Alert>
      </Snackbar>
    </div>
  );
}
