import React from "react";
import { Paper, Box, Grid, Button, CircularProgress, Menu, Tooltip, MenuItem, IconButton } from "@material-ui/core";
import { Dropdown } from "Components/DropDown";
import Snackbar from "@material-ui/core/Snackbar";
import {
  Alert,
  SetFinancialYear,
  getFinancialYear,
  getKeyValueMap,
  getMonthFromDateRange,
} from "Includes/functions";
import { options } from "Constants";
import AllMUIDataTable from "Components/AllMUIDataTable";
import LoadingGif from "Components/LoadingGif";
import StaffAttendanceDetailed from "./components/StaffAttendanceDetailed";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import { dateFormat } from "Includes/functions";

export default function StaffAttendnaceReport(props) {
  const [yearList, setYearList] = React.useState([]);
  const [monthList, setMonthList] = React.useState([]);
  const [selectedYear, setSelectedYear] = React.useState("");
  const [selectedMonth, setSelectedMonth] = React.useState("");
  const [tableLoading, setTableLoading] = React.useState(false);
  const [dataList, setDataList] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [columns, setColumns] = React.useState(null);
  const [detailDialog, setDetailDialog] = React.useState(false);
  const [attendance_details, set_attendance_details] = React.useState({});
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [downloadLoading, setDownloadLoading] = React.useState(false);
  const [downloadingStaffId, setDownloadingStaffId] = React.useState(null);
  const [anchorElDept, setAnchorElDept] = React.useState(null);
  const [deptDownloadLoading, setDeptDownloadLoading] = React.useState(false);

  React.useEffect(() => {
    getFinancialYearList();
  }, []);

  const setSelectedMonthFun = () => {
    let columnsTemp = [
      {
        name: "staff_id",
        label: "id",
        options: {
          filter: false,
          sort: false,
          viewColumns: false,
          display: false,
        },
      },
      {
        name: "name",
        label: "Staff Name",
        options: {
          sort: true,
        },
      },
      {
        name: "total_days",
        label: "Total Days",
        options: {
          sort: true,
        },
      },
      {
        name: "present_days",
        label: "Present Days",
        options: {
          sort: true,
        },
      },
      {
        name: "nonworkingday",
        label: "Non Working Days",
        options: {
          sort: true,
        },
      },
      {
        name: "lop_days",
        label: "LOP Days",
        options: {
          sort: true,
        },
      },
      {
        name: "late_days",
        label: "Late Days",
        options: {
          sort: true,
        },
      },

      {
        name: "half_days",
        label: "HalfDays",
        options: {
          sort: true,
          customBodyRender: (value) => {
            if (value) {
              return `${value} (${value / 2} days)`;
            }
          },
        },
      },
      {
        name: "leave_applied",
        label: "Leave Applied Days",
        options: {
          sort: false,
          customBodyRender: (value) => {
            if (value) {
              return `${value}`;
            }
          },
        },
      },
      {
        name: "Actions",
        label: "Actions",
        options: {
          filter: false,
          sort: false,
          customBodyRender: (value, tableMeta) => {
            const staff_id = tableMeta.rowData[0];
            const isDownloading = downloadLoading && downloadingStaffId === staff_id;
            return (
              <Button
                onClick={() => downloadStaffReport(staff_id)}
                variant="contained"
                color="primary"
                disabled={downloadLoading}
                startIcon={isDownloading ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {isDownloading ? "DOWNLOADING..." : "DOWNLOAD REPORT"}
              </Button>
            );
          },
        },
      },
    ];
    setColumns(() => columnsTemp);
  }

  const downloadStaffReport = (staff_id) => {
    setDownloadLoading(true);
    setDownloadingStaffId(staff_id);
    let prop = { ...props };
    prop.responseType = "blob";
    const url = GET_URL.staffattendance.api;
    let param = {
      from_date: selectedMonth.start_date,
      to_date: selectedMonth.end_date,
      return_intime_outtime_report: 1,
      download_pdf: 1,
      staff_ids: staff_id,
    };
    console.log(selectedMonth.start_date, selectedMonth.end_date);
    getRequest(url, param, prop).then((response) => {
      if (response && response.status === 200) {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `Staff_Attendance_${dateFormat(
            new Date(),
            "DD-MM-YYYY HH:MM:SS A"
          )}.pdf`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      setDownloadLoading(false);
      setDownloadingStaffId(null);
    }).catch((error) => {
      console.error("Download error:", error);
      setDownloadLoading(false);
      setDownloadingStaffId(null);
    });
    return false;
  };

  const getFinancialYearList = () => {
    const url = GET_URL.financialyear.api;
    getRequest(url, {}, props).then((response) => {
      if (response && response.status === 200) {
        setYearList(response.data.data);
        if (getFinancialYear()) {
          setSelectedYear(getFinancialYear());
          let startDate = getKeyValueMap(
            response.data.data,
            "id",
            "start_date"
          );
          let endDate = getKeyValueMap(response.data.data, "id", "end_date");
          startDate = startDate[getFinancialYear()];
          endDate = endDate[getFinancialYear()];
          let monthListTemp = getMonthFromDateRange(startDate, endDate);
          setMonthList(monthListTemp["list"]);
          setSelectedMonth(monthListTemp["selected_month"]);
        }
      }
      setLoading(false);
    });
  };

  React.useEffect(() => {
    setLoading(() => false);
  }, [columns]);

  React.useEffect(() => {
    if (selectedMonth) {
      setTableLoading(true);
      setDataList([]);
      getAttendanceDetail();
      setSelectedMonthFun();
    }
  }, [selectedMonth]);

  const getAttendanceDetail = () => {
    const url = GET_URL.staffattendance.api;
    let param = {
      from_date: selectedMonth.start_date,
      to_date: selectedMonth.end_date,
      return_detailed_report: 1,
    };
    getRequest(url, param, props).then((response) => {
      if (response && response.status === 200) {
        let details = response?.data?.data;
        let temp_list = [];
        let temp = {};
        if (details.staff_list) {
          details.staff_list.map((data) => {
            temp = {};
            temp["staff_id"] = data["staff_details"]["staff_id"];
            temp["name"] = data["staff_details"]["name"];
            temp["total_days"] = data["total_days"];
            temp["lop_days"] = data["lop_days"];
            temp["nonworkingday"] = data["status_report"]?.["nonworkingday"]?.["count"];
            temp["present_days"] = data?.["status_report"]?.present?.count;
            temp["late_days"] = data?.["status_report"]?.late?.count;
            temp["half_days"] = data?.["status_report"]?.["halfday"]?.["count"];
            temp["leave_applied"] = data?.["status_report"]?.["leave_applied"]?.["count"];
            temp_list.push(temp);
          });
          details.status_alias_list = {};
          Object.keys(details.status_list).map((status) => {
            details.status_alias_list[
              details.status_list[status]["alias_name"]
            ] = details.status_list[status];
          });
        }
        setDataList(temp_list);
        set_attendance_details(details);
      }
      setTableLoading(false);
    });
  };

  const onChangeYear = (e) => {
    let value = e.target.value;
    setSelectedYear(value);
    SetFinancialYear(value);
    let startDate = getKeyValueMap(yearList, "id", "start_date");
    let endDate = getKeyValueMap(yearList, "id", "end_date");
    startDate = startDate[value];
    endDate = endDate[value];
    let monthListTemp = getMonthFromDateRange(startDate, endDate);
    setMonthList(monthListTemp["list"]);
    setSelectedMonth(monthListTemp["selected_month"]);
    set_attendance_details({});
    setDataList([]);
  };

  const onChangeMonth = (e, newValue) => {
    setSelectedMonth(newValue);
  };

  const handleDetailedReport = () => {
    setDetailDialog(() => true);
  };

  const closeInParent = () => {
    setDetailDialog(() => false);
  };

  const getOptions = () => {
    const options = {
      selectableRows: "none",
      filterType: false,
      responsive: "simple",
      filter: false,
      download: false,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [5, 10, 25, 50, 100],
      onDownload: () => {
        return downloadReport();
      },
    };
    return options;
  };

  const downloadReport = (downloadType) => {
    setDownloadLoading(true);
    let prop = { ...props };
    prop.responseType = "blob";
    const url = GET_URL.staffattendance.api;
    let param = {
      from_date: selectedMonth.start_date,
      to_date: selectedMonth.end_date,
      return_intime_outtime_report: 1,
    };
    if (downloadType === "pdf") {
      param.download_pdf = 1;
    } else if (downloadType === "excel") {
      param.download_excel = 1;
    }
    getRequest(url, param, prop).then((response) => {
      if (response && response.status === 200) {
        const fileExtension = downloadType === "pdf" ? "pdf" : "xlsx";
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `Staff_Attendance_${dateFormat(
            new Date(),
            "DD-MM-YYYY HH:MM:SS A"
          )}.${fileExtension}`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      setDownloadLoading(false);
    }).catch((error) => {
      console.error("Download error:", error);
      setDownloadLoading(false);
    });
    return false;
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (downloadType) => {
    if (downloadType) {
      downloadReport(downloadType);
    }
    setAnchorEl(null);
  };

  const downloadDeptReport = (downloadType) => {
    setDeptDownloadLoading(true);
    let prop = { ...props };
    prop.responseType = "blob";
    const url = GET_URL.staffattendance.api;
    let param = {
      from_date: selectedMonth.start_date,
      to_date: selectedMonth.end_date,
      download_department_wise_report: 1,
      download_department_wise_type: downloadType,
    };
    getRequest(url, param, prop).then((response) => {
      if (response && response.status === 200) {
        const fileExtension = downloadType === "pdf" ? "pdf" : "xlsx";
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `Staff_Attendance_Department_Wise_${dateFormat(
            new Date(),
            "DD-MM-YYYY HH:MM:SS A"
          )}.${fileExtension}`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      setDeptDownloadLoading(false);
    }).catch((error) => {
      console.error("Dept download error:", error);
      setDeptDownloadLoading(false);
    });
    return false;
  };

  const handleDeptClick = (event) => {
    setAnchorElDept(event.currentTarget);
  };

  const handleDeptClose = (downloadType) => {
    if (downloadType) {
      downloadDeptReport(downloadType);
    }
    setAnchorElDept(null);
  };
  return (
    <>
      {loading ? (
        <LoadingGif />
      ) : (
        <Paper className="paper-background">
          <Grid container>
            <Grid item md={6} xs={12} className="header-align">
              <Box className="heading">Staff Attendance Details</Box>
            </Grid>
          </Grid>
          <Grid container>
            <Grid item md={4} xs={12} className="header-align">
              <Dropdown
                data={yearList}
                name="year"
                value={selectedYear}
                hideSelect={true}
                onChange={onChangeYear}
                label={"Financial Year"}
              />
            </Grid>
            <Grid item md={3} xs={12} className="header-align">
              <DropDownWithSearch
                id="combo-box-demo"
                options={monthList}
                value={selectedMonth}
                onChange={onChangeMonth}
                name="month"
                label="Month"
                optionValue="name"
                className="width-100-perc"
              />
            </Grid>
          </Grid>
          <Grid container>
            <Grid item md={2} xs={12} className="header-align">
              {dataList.length > 0 && (
                <Button
                  onClick={handleDetailedReport}
                  className="custom-button mt-20"
                >
                  Staff Detailed Report
                </Button>
              )}
            </Grid>
            <Grid item md={2} xs={12} className="header-align">
              <Button
                className="custom-button mt-20"
                aria-controls="download-menu"
                aria-haspopup="true"
                onClick={handleClick}
                variant="contained"
                color="primary"
                disabled={downloadLoading || !selectedMonth}
                startIcon={downloadLoading ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {downloadLoading ? "Downloading..." : "Download Report"}
              </Button>
            </Grid>
            <Grid item md={3} xs={12} className="header-align">
              <Button
                className="custom-button mt-20"
                aria-controls="dept-download-menu"
                aria-haspopup="true"
                onClick={handleDeptClick}
                variant="contained"
                color="primary"
                disabled={deptDownloadLoading || !selectedMonth}
                startIcon={deptDownloadLoading ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {deptDownloadLoading ? "Downloading..." : "Download Department Wise Report"}
              </Button>
            </Grid>
          </Grid>
          <Menu
            id="download-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => handleClose(null)}
          >
            <MenuItem
              onClick={() => handleClose("pdf")}
              disabled={downloadLoading}
            >
              {downloadLoading ? (
                <>
                  <CircularProgress size={16} style={{ marginRight: 8 }} /> Downloading PDF...
                </>
              ) : (
                "Download as PDF"
              )}
            </MenuItem>
            <MenuItem
              onClick={() => handleClose("excel")}
              disabled={downloadLoading}
            >
              {downloadLoading ? (
                <>
                  <CircularProgress size={16} style={{ marginRight: 8 }} /> Downloading Excel...
                </>
              ) : (
                "Download as Excel"
              )}
            </MenuItem>
          </Menu>
          <Menu
            id="dept-download-menu"
            anchorEl={anchorElDept}
            open={Boolean(anchorElDept)}
            onClose={() => handleDeptClose(null)}
          >
            <MenuItem
              onClick={() => handleDeptClose("pdf")}
              disabled={deptDownloadLoading}
            >
              {deptDownloadLoading ? (
                <>
                  <CircularProgress size={16} style={{ marginRight: 8 }} /> Downloading PDF...
                </>
              ) : (
                "Download as PDF"
              )}
            </MenuItem>
            <MenuItem
              onClick={() => handleDeptClose("excel")}
              disabled={deptDownloadLoading}
            >
              {deptDownloadLoading ? (
                <>
                  <CircularProgress size={16} style={{ marginRight: 8 }} /> Downloading Excel...
                </>
              ) : (
                "Download as Excel"
              )}
            </MenuItem>
          </Menu>
          {columns && (
            <div className="mt-30">
              <AllMUIDataTable
                data={dataList}
                title={
                  tableLoading ? (
                    <CircularProgress className="white-text" />
                  ) : (
                    ""
                  )
                }
                columns={columns}
                options={getOptions()}
              />
            </div>
          )}
        </Paper>
      )}
      {detailDialog && (
        <StaffAttendanceDetailed
          closeInParent={closeInParent}
          attendance_details={attendance_details}
          getAttendanceDetail={getAttendanceDetail}
          selectedMonth={selectedMonth}
        />
      )}
    </>
  );
}
