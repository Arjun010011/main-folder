import React, { Component } from "react";
import { Paper, Box, Button, Grid ,Dialog} from "@material-ui/core";
import classNames from "classnames";
import { withRouter } from "react-router-dom";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import {
    dateFormat,
    SetAcademicYear,
    getKeyValueMap,
    getCurrentAndPreviousAcademicYears,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { LEAVEOPTIONS, minDate, maxDate } from "Constants";
import { Dropdown } from "Components/DropDown";
import { roundOffDecimal } from "Constants";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import moment from "moment";
import { DateRange } from "Components/DateRange";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
    ? JSON.parse(localStorage.getItem("alias_name"))
    : {};
const user =
    localStorage.getItem("user") != "undefined"
        ? JSON.parse(localStorage.getItem("user"))
        : "";

class StaffTimebaleAttendanceReport extends Component {
    constructor() {
        super();
        let date = new Date();
        this.state = {
            year: "",
            yearList: [],
            standard: "",
            standardList: [],
            standard_section: "",
            subject_list: [],
            timelist: [],
            subject: "",
            staffNameList: [],
            staffList: [],
            startDate: dateFormat(new Date(), "YYYY-MM-DD"),
            endDate: dateFormat(date, "YYYY-MM-DD"),
            minDate: "",
            maxDate: "",
            loading: true,
            tableLoading: false,
            date_range: { minDate: "", maxDate: "" },
            updating_date_range: false,
            is_open_staff_subject_details: false,
            is_open_student_details:false,
            attendance_list:[],
            columns: [
                {
                    name: "staff_name",
                    label: <FormattedMessage {...commonMessages.staffName} />,
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                    },
                },
                {
                    name: "attendance_detail",
                    label: "No of classes Taken / No of Class Alloted",
                    options: {
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta) => {
                            return (
                                <Box className="cloumn-width white-space">
                                    <Box textTransform="capitalize">
                                        {tableMeta.rowData[2]}
                                        {"/"}
                                        {tableMeta.rowData[3]}
                                    </Box>
                                </Box>
                            );
                        },

                    },
                },
                {
                    name: "total_attendance_marked",
                    label: "Total Attendance Marked",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false
                    },
                },
                {
                    name: "total_attendance_timetable",
                    label: "Total Attendance TimeTable",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false
                    },
                },
                {
                    name: "Percentage",
                    label: <FormattedMessage {...commonMessages.percentage} />,
                    options: {
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta) => {
                            let percentage = 0;
                            if (tableMeta.rowData[2] && tableMeta.rowData[3]) {
                                percentage = (tableMeta.rowData[2] / tableMeta.rowData[3]) * 100;
                                percentage = percentage.toFixed(roundOffDecimal);
                            }
                            return (
                                <Box className="cloumn-width white-space">
                                    <Box textTransform="capitalize">
                                        {percentage}
                                        {"%"}
                                    </Box>
                                </Box>
                            );
                        },
                    },
                },
                {
                    name: "subject_list",
                    label: <FormattedMessage {...commonMessages.staffName} />,
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false,
                    },
                },
                {
                    name: "Details",
                    label: "Details",
                    options: {
                        filter: true,
                        sort: false,
                        customBodyRender: (value, tableMeta) => {
                            return (
                                <div>
                                    <Button
                                        className="add-modify-button"
                                        onClick={() =>
                                            this.getAttendanceReportIndividualStaff(tableMeta.rowData[5])
                                        }
                                    >
                                        <FormattedMessage {...messages.generateReport} />
                                    </Button>
                                </div>
                            );
                        },
                    },
                },
            ],
            columns_subject: [
                {
                    name: "subject_name",
                    label: <FormattedMessage {...commonMessages.subjectName} />,
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                    },
                },
                {
                    name: "attendance_detail",
                    label: "No of classes Taken / No of Class Alloted",
                    options: {
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta) => {
                            return (
                                <Box className="cloumn-width white-space">
                                    <Box textTransform="capitalize">
                                        {tableMeta.rowData[2]}
                                        {"/"}
                                        {tableMeta.rowData[3]}
                                    </Box>
                                </Box>
                            );
                        },

                    },
                },
                {
                    name: "total_attendance_marked",
                    label: "Total Attendance Marked",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false
                    },
                },
                {
                    name: "total_attendance_timetable",
                    label: "Total Attendance TimeTable",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false
                    },
                },
                {
                    name: "Percentage",
                    label: <FormattedMessage {...commonMessages.percentage} />,
                    options: {
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta) => {
                            let percentage = 0;
                            if (tableMeta.rowData[2] && tableMeta.rowData[3]) {
                                percentage = (tableMeta.rowData[2] / tableMeta.rowData[3]) * 100;
                                percentage = percentage.toFixed(roundOffDecimal);
                            }
                            return (
                                <Box className="cloumn-width white-space">
                                    <Box textTransform="capitalize">
                                        {percentage}
                                        {"%"}
                                    </Box>
                                </Box>
                            );
                        },
                    },
                },
                {
                    name: "student_attendance_detail",
                    label: "Student Attendance Detail",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false
                    },
                },
                {
                    name: "Details",
                    label: "Details",
                    options: {
                        filter: true,
                        sort: false,
                        customBodyRender: (value, tableMeta) => {
                            return (
                                <div>
                                    <Button
                                        className="add-modify-button"
                                        onClick={() =>
                                            this.getstudentAttendanceReport(tableMeta.rowData[5])
                                        }
                                    >
                                        <FormattedMessage {...messages.generateReport} />
                                    </Button>
                                </div>
                            );
                        },
                    },
                },


            ],
            columns_student: [
                {
                    name: "for_date",
                    label: "Attendance Taken Date",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                    },
                },
                {
                    name: "from_time",
                    label: "From Time",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false
                    },
                },
                {
                    name: "to_time",
                    label: "To Time",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false
                    },
                },
                {
                    name: "present",
                    label: "Present",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false
                    },
                },
                {
                    name: "absent",
                    label: "Absent",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false
                    },
                },
                {
                    name: "time",
                    label: "time",
                    options: {
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta) => {
                            // Extract times outside JSX
                            const startDatetime = tableMeta.rowData[1];
                            const endDatetime = tableMeta.rowData[2];

                            const [startTime] = startDatetime.split('T')[1].split(':'); // Get hours
                            const [endTime] = endDatetime.split('T')[1].split(':');     // Get hours

                            const formattedStartTime = startDatetime.split('T')[1].substring(0, 5);
                            const formattedEndTime = endDatetime.split('T')[1].substring(0, 5);

                            return (
                                <Box className="cloumn-width white-space">
                                    <Box textTransform="capitalize">
                                        {formattedStartTime} - {formattedEndTime}
                                    </Box>
                                </Box>
                            );
                        },
                    },
                },
                {
                    name: "attendance_detail",
                    label: "Present / Absent",
                    options: {
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta) => {
                            return (
                                <Box className="cloumn-width white-space">
                                    <Box textTransform="capitalize">
                                        {tableMeta.rowData[3]}
                                        {"/"}
                                        {tableMeta.rowData[4]}
                                    </Box>
                                </Box>
                            );
                        },

                    },
                },
                {
                    name: "Percentage",
                    label: <FormattedMessage {...commonMessages.percentage} />,
                    options: {
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta) => {
                            let percentage = 0;
                            let marked = Number(tableMeta.rowData[3]);
                            let notMarked = Number(tableMeta.rowData[4]);
                            let total = marked + notMarked;

                            if (total > 0) {
                                percentage = ((marked / total) * 100).toFixed(roundOffDecimal);
                            }

                            return (
                                <Box className="cloumn-width white-space">
                                    <Box textTransform="capitalize">
                                        {percentage}%
                                    </Box>
                                </Box>
                            );
                        },
                    },
                }
            ],
        };
    }

    componentDidMount() {
        this.getAcademicYear();
        this.getStaffNameList();
        this.getSubjects();
    }

    getStaffNameList = () => {
        const param = { is_active: true, group_type: 1 };
        getRequest(GET_URL.staff.api, param, this.props).then(
            (response) => {
                if (response && response.status === 200) {
                    let staffNameList = response.data.data
                    staffNameList.map((staffname) => {
                        staffname.name = staffname.full_name
                    })
                    this.setState(
                        {
                            staffNameList
                        }
                    );
                }
            }
        );
    }

    getAttendanceReportIndividualStaff = (subject_list) => {
        this.setState({
            subject_list: subject_list,
            is_open_staff_subject_details: true
        })
    };

    closestudentreport = () => {
        this.setState({
            is_open_student_details:false
        })
    };

    closesubjectreport = () => {
        this.setState({
            is_open_staff_subject_details:false
        })
    };

    closereport = () => {
        this.setState({
            is_open_staff_subject_details:false,
            is_open_student_details:false
        })
    };

    getstudentAttendanceReport = (attendance_list) => {
        this.setState({
            attendance_list: attendance_list,
            is_open_student_details: true
        })
    };

    getAcademicYear = () => {
        const param = { is_active: true };
        getRequest(GET_URL.getacademicyear.api, param, this.props).then(
            (response) => {
                if (response && response.status === 200) {
                    const yearList = getCurrentAndPreviousAcademicYears(
                        response.data.data
                    );
                    let start_date_object = getKeyValueMap(yearList, "id", "start_date");
                    let end_date_object = getKeyValueMap(yearList, "id", "end_date");
                    const year = user.other_details.academic_year.id;
                    this.setState(
                        {
                            yearList,
                            year: year ? year : "",
                            start_date_object,
                            end_date_object,
                        },
                        () => {
                            if (year) {
                                let date_range = {};
                                date_range["minDate"] = start_date_object[year];
                                date_range["maxDate"] = end_date_object[year];
                                this.setState({ date_range }, () => {
                                    this.getStandard();
                                },
                                    () => {
                                        this.getSubjects();
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
            }
        );
    };

    getStandard = () => {
        let { year } = this.state;
        const params = { academic_year: year, is_active: true };
        getRequest(GET_URL.getstandardandsection.api, params, this.props).then(
            (response) => {
                if (response && response.status === 200) {
                    let standardList = response.data.data;
                    this.setState(
                        {
                            standardList,
                            loading: false,
                        },
                    );
                }
            }
        );
    };

    getSubjects = () => {
        const params = {};
        getRequest(GET_URL.subject.api, params, this.props).then(
            (response) => {
                if (response && response.status === 200) {
                    let subject_list = response.data.data;
                    this.setState(
                        {
                            subject_list,
                            loading: false,
                        },
                        () => {
                            this.getStaffList();
                        }
                    );
                }
            }
        );
    };

    onChange = async (e) => {
        const { start_date_object, end_date_object } = this.state;
        let value = e.target.value;
        const name = e.target.name;
        if (value) {
            if (name === "year") {
                this.setState({ updating_date_range: true }, () => {
                    let date_range = {};
                    date_range["minDate"] = start_date_object[value];
                    date_range["maxDate"] = end_date_object[value];
                    this.setState(
                        {
                            [name]: value,
                            standard: "",
                            date_range,
                            updating_date_range: false,
                        },
                        () => {
                            this.getStandard();
                            SetAcademicYear(value);
                        },
                        () => {
                            this.getStaffList();
                        }
                    );
                });
            } 
            else if (name === "staff") {
                this.setState(
                    {
                        [name]: value,
                    },
                    () => {
                        this.getStaffList();
                    }
                );
            }
            else if (name === "standard") {
                this.setState(
                    {
                        [name]: value,
                    },
                    () => {
                        this.getStaffList();
                    }
                );
            }
            else if (name === "subject") {
                this.setState(
                    {
                        [name]: value,
                    },
                    () => {
                        this.getSubjects();
                    },
                    () => {
                        this.getStaffList();
                    }
                );
            }
        }
    };

    getDataParams = () => {
        let { dateRangeValue, startDate, endDate } = this.state;
        let from_date, to_date;
        if (dateRangeValue) {
            from_date = dateRangeValue.start;
            to_date = dateRangeValue.end;
        } else {
            from_date = startDate;
            to_date = endDate;
        }
        let temp = {
            from_date: moment(from_date).format("YYYY-MM-DD"),
            to_date: moment(to_date).format("YYYY-MM-DD"),
        }
        return temp
    };

    getStaffList = () => {
        let {standard,staff,subject}=this.state
        this.setState({ tableLoading: true });
        const url = GET_URL.stafftimetableattendance.api;
        let params = this.getDataParams();
        if (standard){
        params['standard'] = standard;}
        if (staff) {
        params['staff']=staff;}
        if (subject) {
        params['subject']=subject;}
        getRequest(url, params).then((response) => {
            if (response && response.status === 200) {
                const staffList = response.data.staff_list;
                this.setState({
                    staffList: staffList,
                    tableLoading: false,
                });
            }
        });
    };

    handleChangeDateRange = (value) => {
        this.setState(
            {
                dateRangeValue: value,
                startDate: "",
                endDate: "",
            },
            () => {
                this.getStaffList();
            }
        );
    };

    getBlankPageMessage = () => {
        let { standard, year } = this.state;
        if (!standard) {
            if (!year) {
                return `Select the Academic year, ${alias_names["standard"]} and ${alias_names["section"]} to view the student List`;
            }
            return `Select the ${alias_names["standard"]} and ${alias_names["section"]} to view the student List`;
        }
    };

    render() {
        let {
            loading,
            subject_list,
            subject,
            staff,
            standardList,
            standard,
            staffNameList,
            tableLoading,
            staffList,
            is_open_student_details,
            is_open_staff_subject_details,
            attendance_list
        } = this.state;
        if (loading) {
            return <LoadingGif />;
        } else {
            let options = {
                ...LEAVEOPTIONS,
                textLabels: {
                    body: {
                        noMatch: tableLoading
                            ? "Loading..."
                            : "Sorry, there is no matching data to display",
                    },
                },
            };
            return (
                <Paper
                    className={classNames("paper-background")}
                    style={{ background: "transparent", boxShadow: "none" }}
                >
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames("header-align")}>
                            <Box className="heading">
                                Staff Time Table Attendance Report
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container>
                    </Grid>
                    {(
                        <>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item lg={3} md={4} xs={6}>
                                    <DateRange
                                        fullWidth
                                        handleChange={this.handleChangeDateRange}
                                        minDate={minDate}
                                        maxDate={maxDate}
                                        label='From Date To Date'
                                        ref={this.dateRange}
                                        hideClearIcon
                                    />
                                </Grid>
                                <Grid item lg={3} md={4} xs={6}>
                                    <Dropdown
                                        fullWidth
                                        data={staffNameList}
                                        name="staff"
                                        value={staff}
                                        hideSelect={true}
                                        onChange={(e) => this.onChange(e, "staff")}
                                        label={<FormattedMessage {...commonMessages.staffName} />}
                                        size="small"
                                    />
                                </Grid>
                                <Grid item lg={3} md={4} xs={6}>
                                    <Dropdown
                                        data={standardList}
                                        name="standard"
                                        value={standard}
                                        hideSelect={true}
                                        onChange={(e) => this.onChange(e, "standard")}
                                        label={<FormattedMessage {...commonMessages.standard} />}
                                        size={"small"}
                                    />
                                </Grid>
                                <Grid item lg={3} md={4} xs={6}>
                                    <Dropdown
                                        data={subject_list}
                                        name="subject"
                                        value={subject}
                                        hideSelect={true}
                                        onChange={(e) => this.onChange(e, "subject")}
                                        label="Subject"
                                        size={"small"}
                                    />
                                </Grid>
                            </Grid>
                            <Grid
                                container
                                className={classNames("flex-justify-center", "header-align")}
                            >
                                <Grid
                                    item
                                    md={12}
                                    xs={12}
                                    className={classNames("header-align")}
                                >
                                    {/* {!standard_section && (
                    <BlankPagewithIcon data={this.getBlankPageMessage()} />
                  )} */}
                                    {(
                                        <Paper>
                                            {(
                                                <AllMUIDataTable
                                                    data={staffList}
                                                    columns={this.state.columns}
                                                    options={options}
                                                />)
                                            }
                                        </Paper>
                                    )}
                                </Grid>
                            </Grid>
                        </>
                    )}
                    <Dialog
                        className="md-down-full-width md-down-m-0"
                        fullScreen={window.innerWidth >= 1000}
                        aria-labelledby="max-width-dialog-title"
                        open={is_open_staff_subject_details}
                    >
                        <Paper
                            className={classNames("paper-background")}
                            style={{ background: "transparent", boxShadow: "none" }}
                        >
                            <Grid container>
                                <Grid item md={6} xs={12} className={classNames("header-align")}>
                                    <Box className="heading">
                                        Staff Time Table Attendance Report
                                    </Box>
                                </Grid>
                            </Grid>
                            <Grid container>
                            </Grid>
                            {(
                                <>
                                    <Grid
                                        container
                                        className={classNames("flex-justify-center", "header-align")}
                                    >
                                        <Grid
                                            item
                                            md={12}
                                            xs={12}
                                            className={classNames("header-align")}
                                        >
                                            {/* {!standard_section && (
                    <BlankPagewithIcon data={this.getBlankPageMessage()} />
                  )} */}
                                            {(
                                                <Paper>
                                                    <Button
                                                        className="add-modify-button"
                                                        onClick={() =>
                                                            this.closesubjectreport()
                                                        }
                                                    >
                                                        Back
                                                    </Button>
                                                    {(
                                                        <AllMUIDataTable
                                                            data={subject_list}
                                                            columns={this.state.columns_subject}
                                                            options={options}
                                                        />)
                                                    }
                                                </Paper>
                                            )}
                                        </Grid>
                                    </Grid>
                                </>
                            )}
                        </Paper>

                    </Dialog>
                    <Dialog
                        className="md-down-full-width md-down-m-0"
                        fullScreen={window.innerWidth >= 1000}
                        aria-labelledby="max-width-dialog-title"
                        open={is_open_student_details}
                    >
                        <Paper
                            className={classNames("paper-background")}
                            style={{ background: "transparent", boxShadow: "none" }}
                        >
                            <Grid container>
                                <Grid item md={6} xs={12} className={classNames("header-align")}>
                                    <Box className="heading">
                                        Staff Time Table Attendance Report
                                    </Box>
                                </Grid>
                            </Grid>
                            <Grid container>
                            </Grid>
                            {(
                                <>
                                    <Grid
                                        container
                                        className={classNames("flex-justify-center", "header-align")}
                                    >
                                        <Grid
                                            item
                                            md={12}
                                            xs={12}
                                            className={classNames("header-align")}
                                        >
                                            {/* {!standard_section && (
                    <BlankPagewithIcon data={this.getBlankPageMessage()} />
                  )} */}
                                            {(
                                                <Paper>
                                                <Button
                                                    className="add-modify-button"
                                                    onClick={() =>
                                                        this.closestudentreport()
                                                    }
                                                >
                                                    Back
                                                </Button>
                                                <Button
                                                    className="add-modify-button"
                                                    onClick={() =>
                                                        this.closereport()
                                                    }
                                                >
                                                    Close
                                                </Button>
                                                    {(
                                                        <AllMUIDataTable
                                                            data={attendance_list}
                                                            columns={this.state.columns_student}
                                                            options={options}
                                                        />)
                                                    }
                                                </Paper>
                                            )}
                                        </Grid>
                                    </Grid>
                                </>
                            )}
                        </Paper>

                    </Dialog>

                </Paper>
            );
        }
    }
}

export default withRouter(StaffTimebaleAttendanceReport);
