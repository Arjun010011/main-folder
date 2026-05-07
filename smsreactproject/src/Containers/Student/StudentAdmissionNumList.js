import React, { Component, Fragment, forwardRef } from 'react'
import {
    Paper, Box, Button, Grid, Tooltip, CircularProgress, TextField, Dialog, Slide,
    DialogActions, DialogTitle, DialogContent
} from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames'
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import Swal from 'sweetalert2'
import _ from 'lodash';
import { debounceSearchRender } from "mui-datatables";
import PropTypes from "prop-types";
import ClearIcon from "@material-ui/icons/Clear";
import { SUCCESS_MSG_PROPS } from "Constants";
import { MuiPickersUtilsProvider, KeyboardDatePicker, KeyboardDateTimePicker } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import Snackbar from "@material-ui/core/Snackbar";

import { Dropdown } from 'Components/DropDown';
import AdmissionPrintForm from 'Containers/StudentForms/Components/AdmissionPrintForm';
import { DateRange } from 'Components/DateRange';
import StudentGridCard from 'Components/ProfileGridCard';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { getRequest, deleteRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL, POST_URL } from 'Includes/urls';
import StudentListActions from 'Includes/StudentListActions'
import { Actions } from 'Constants/permissions';
import {
    validateDate, dateFormat, getIsGridOrListView, setIsGridOrListView, Alert, SetAcademicYear, getPaginationProps,
    getSettingValue, updatePermissions, getFormatMessage, getFullName, getPreviousAcademicYears, isUserHasPermission,
    getKeyValueMap, getAcademicYear, getUrlParam
} from 'Includes/functions';
import LoadingGif from 'Components/LoadingGif';
import { minDate, DEFAULT_PAGINATION_PROPS_FIRST_NAMES_LIST } from 'Constants';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';

const isResidential = parseInt(getSettingValue('is_residential'));
const admission_in_reg = parseInt(getSettingValue('admission_in_reg'));
let user = localStorage.getItem("user") != 'undefined' ? JSON.parse(localStorage.getItem("user")) : '';

const Transition = forwardRef(function Transition(props, ref) {
    return <Slide direction="down" ref={ref} {...props} />;
});


class StudentAdmissionNumList extends Component {
    constructor() {
        super()
        this.permission = updatePermissions('admission_student', ['view'])
        this.state = {
            studentList: [],
            AllStudentList: [],
            dataReady: false,
            GridEnabled: false,
            ListEnabled: true,
            loading: true,
            tableUpdating: false,
            tableLoading: true,
            studentTypeList: [{ name: 'All', id: 'All' }, { name: 'Day Scholar', id: 'Day Scholar' }, { name: 'Residential', id: 'Residential' }],
            student_type: 'All',
            pagination: { ...DEFAULT_PAGINATION_PROPS_FIRST_NAMES_LIST },
            filterList: [],
            openPopup: false,
            selectedStudentList: [],
            showEnrollSubmitPopUp: false,
            error: {},
            year: '',
            yearToList: [],
            to_academic_year: '',
            current_standard: '',
            to_standard: '',
            standardList: [],
            standardToList: [],
            fieldError: {},
            admission_date: null,
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
                                <Tooltip title={tableMeta.rowData[8] ? 'Old Student' : 'New Admission Student'} enterDelay={400}
                                    enterNextDelay={400} placement='top-start'
                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                    <Box display='flex'>
                                        <Box className={tableMeta.rowData[8] ? 'application-old-student-list-admitted' : 'application-student-list-admitted'}>
                                        </Box>
                                        <Box>
                                            {value}
                                        </Box>
                                    </Box>
                                </Tooltip>
                            )
                        }
                    }
                },
                {
                    name: "current_standard_name",
                    label: <FormattedMessage {...commonMessages.standard} />,
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "username",
                    label: "User Name",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "mobile_num",
                    label: <FormattedMessage {...commonMessages.mobileNo} />,
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "admission_date",
                    label: 'Admission Date',
                    options: {
                        filter: false,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (value && dateFormat(value, 'DD-MM-YYYY'))
                        },
                    }
                },
                {
                    name: "id",
                    label: "ID",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        viewColumns: false,
                    }
                },
                {
                    name: "admission_num",
                    label: 'Admission Num',
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "student_type",
                    label: <FormattedMessage {...commonMessages.studentType} />,
                    options: {
                        filter: false,
                        sort: true,
                        display: !!isResidential,
                        download: !!isResidential
                    }
                },
                {
                    name: "is_new_student",
                    label: <FormattedMessage {...commonMessages.studentType} />,
                    options: {
                        filter: false,
                        sort: true,
                        display: false,
                        download: false,
                    }
                },
                // {
                //     name: "Actions",
                //     label: <FormattedMessage {...commonMessages.actions} />,
                //     options: {
                //         display: this.permission.length > 0,
                //         filter: false,
                //         sort: false,
                //         download: false,
                //         customBodyRender: (value, tableMeta, updateValue) => {
                //             return (<div>
                //                 <StudentListActions
                //                     id={tableMeta.rowData[5]}
                //                     index={tableMeta.rowIndex}
                //                     deleteStudent={this.deleteStudent}
                //                     editURL={Actions.admission_student_list.update.url}
                //                     viewURL={Actions.admission_student.view.url}
                //                     enabledActions={this.permission}
                //                     handlePrintForm={this.handlePrintForm}
                //                     viewExtraParams={{ studentId: tableMeta.rowData[5] }}
                //                 />
                //             </div>
                //             );
                //         }
                //     }
                // }
            ]
        }
        this.dateRange = React.createRef();
    }

    handlePrintForm = (id) => {
        this.setState({
            student_id: id,
            openPopup: true
        })
    }

    async componentDidMount() {
        let { GridEnabled, ListEnabled, year } = this.state
        this.getAcademicYearList();
        this.permission = [...this.permission, ...updatePermissions('admission_student_list', ['update', 'delete'])]
        if (getIsGridOrListView()) {
            let isGridView = (getIsGridOrListView() === 'true')
            if (isGridView) {
                // GridEnabled = true
                // ListEnabled = false
            }
        }

        this.setState({
            GridEnabled,
            ListEnabled,
        })
    }


    getAcademicYearList = async () => {
        let { year } = this.state;
        const url = GET_URL.getacademicyear.api
        const param = { is_active: true }
        await getRequest(url, param, this.props).then(response => {
            if (response && response.status === 200) {
                let fromYear = ''
                let ToYear = ''
                response.data.data.map((data) => {
                    fromYear = data.start_date.split('-');
                    ToYear = data.end_date.split('-');
                    // data.name = fromYear[0] + '-' + ToYear[0]
                })
                this.setState({
                    yearList: response.data.data,
                }, () => {
                    const academicYearId = getAcademicYear();
                    if (academicYearId) {
                        year = academicYearId
                        this.setState({
                            year
                        }, () => {
                            this.getStandardList();
                        })
                    }
                    else {
                        this.setState({
                            loading: false
                        })
                    }
                })
            }
        })
    }

    onChange = async (e) => {
        let { value, name } = e.target;
        if (value !== 0) {
            SetAcademicYear(value)
            this.setState({
                [name]: value,
                error: {}
            }, () => {
                this.getStandardList();
            })
        }
    }

    onChangeToYear = async (e) => {
        let { fieldError } = this.state;
        let { value, name } = e.target;
        delete fieldError[name]
        if (value !== 0) {
            this.setState({
                [name]: value,
                error: {},
                fieldError
            }, () => {
                this.getToStandardList();
            })
        }
    }

    getToStandardList = () => {
        let { to_academic_year } = this.state;
        const url = GET_URL.getstandard.api
        const param = { is_active: true, academic_year: to_academic_year }
        getRequest(url, param, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    standardToList: response.data.data,
                })
            }
        })
    }

    getStudentList = (paginationProps) => {
        let { pagination, year, current_standard, dateRangeValue, student_type } = this.state;
        this.setState({ tableUpdating: true, dateRangeValue: dateRangeValue })
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = {
            ...pagination_params,
            student_academic_year: year,
            is_active: true, admission_num: true
        }
        if (current_standard && current_standard !== 'all') {
            let temp = {}
            temp['current_standard'] = current_standard;
            params = { ...params, ...temp }
        }
        params['admission_history'] = true
        const url = GET_URL.student.api
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                this.setState({
                    tableUpdating: false,
                    columns: [...this.state.columns]
                }, () => {
                    const studentList = response.data;
                    studentList.data.student_list.map((data) => {
                        data['full_name'] = getFullName(data['first_name'], data['middle_name'], data['last_name'])
                    })
                    this.setState({
                        studentList: studentList.data,
                        AllStudentList: studentList.data,
                        // tableUpdating: false,
                        rowsSelected: [],
                        dataReady: true,
                        loading: false,
                        tableLoading: false,
                        pagination: this.currentPagination
                    });
                })
            }
        });
    };


    getStandardList = () => {
        const { selectedStandard } = getUrlParam()
        let { year, yearList, academicYearFromDate, academicYearToDate } = this.state;
        yearList.map((data) => {
            if (data.id == year) {
                academicYearFromDate = data.start_date
                academicYearToDate = data.end_date
            }
        })
        const url = GET_URL.getstandard.api
        const param = { is_active: true, academic_year: year }
        getRequest(url, param, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.unshift({ id: 'all', name: 'All' })
                this.setState({
                    standardList: response.data.data,
                    current_standard: selectedStandard ? selectedStandard : 'all',
                    academicYearFromDate,
                    academicYearToDate
                }, () => {
                    this.getStudentList();
                })
            }
        })
    }

    onChangeHandleView = (name) => {
        let { AllStudentList, studentList, filterList } = this.state;
        let GridEnabled = false
        let ListEnabled = false
        let setValue = false
        if (name === 'GridEnabled') {
            setValue = true
            GridEnabled = true
            if (filterList.length !== 0)
                studentList = [...filterList]
        }
        else {
            studentList = [...AllStudentList]
            ListEnabled = true
        }
        setIsGridOrListView(setValue)
        this.setState({
            GridEnabled,
            ListEnabled,
            studentList
        })
    }

    handleFilter = (e) => {
        let { name, value, filterList } = e.target;
        let { studentList, AllStudentList } = this.state;
        if (value !== '') {
            let lowerCasedFilter = value.toLowerCase();
            filterList = AllStudentList.filter(item => {
                return Object.keys(item).some(key =>
                    typeof (item[key]) === "string" && item[key].toLowerCase().includes(lowerCasedFilter)
                );
            });
            studentList = filterList
        }
        else {
            studentList = [...AllStudentList]
            filterList = []
        }
        this.setState({
            [name]: value,
            studentList,
            filterList
        })
    }

    onChangeStudentType = async (e) => {
        let { value } = e.target;
        this.setState({
            student_type: value,
            academicYearFromDate: '',
            academicYearToDate: '',
            current_standard: null,
            dateRangeValue: {}
        }, () => {
            this.getStudentList();
        })
    }

    onFilterChangeHandler = (type) => {
        if (type === 'reset') {
            this.setState({
                current_standard: null,
                dateRangeValue: {},
                dateRangeValueDefault: {}
            }, () => {
                this.getStudentList();
                this.dateRange.current.handleClear();
            })
        }
    }

    handleStandardChange = (e) => {
        let { value } = e.target;
        const { pagination, error } = this.state;
        delete error['current_standard']
        this.setState({
            current_standard: value,
            error
        }, () => {
            this.getStudentList(pagination)
        }
        )
    }


    geFilterOptions = () => {
        let { current_standard, dateRangeValueDefault, academicYearFromDate, academicYearToDate, standardList } = this.state;
        return <Fragment>

            <DateRange
                handleChange={this.handleChangeDateRange}
                minDate={academicYearFromDate}
                maxDate={academicYearToDate}
                ref={this.dateRange}
                label={<FormattedMessage {...commonMessages.dateRange} />}
            />
        </Fragment>;
    }

    handleChangeDateRange = (value) => {
        let { pagination } = this.state;
        this.setState({
            dateRangeValue: value,
            dateRangeValueDefault: {}
        }, () => {
            this.getStudentList(pagination)
        })
    }

    handleClosePopup = () => {
        this.setState({
            openPopup: false
        })
    }

    handleAddAdmissionButton = () => {
        let { year, error, alertData, yearList, standardList, current_standard } = this.state;
        if (!year) {
            alertData = <FormattedMessage {...commonMessages.selectAcademicYear} />
            error.year = alertData
            this.setState({
                open: true,
                alertData,
                error
            })
            return
        }
        if (!current_standard || current_standard === 'all') {
            alertData = 'Standard All is not a valid choice'
            error.current_standard = alertData
            this.setState({
                open: true,
                alertData,
                error
            })
            return
        }
        let year_name = getKeyValueMap(yearList, 'id', 'name')
        let standard_name = getKeyValueMap(standardList, 'id', 'name')
        let yearInformation = {
            year,
            year_name: year_name[year],
            standard: current_standard,
            standard_name: standard_name[current_standard]
        }
        let searchParam = "?" + new URLSearchParams(yearInformation).toString()
        this.props.history.push({
            pathname: Actions.student_username_list.create.url,
            search: searchParam,
        });
    }

    handlePopupStatus = (selectedRows, actionStatus) => {
        let { studentList, showEnrollSubmitPopUp, selectedStudentList, yearList, academicYearFromDate } =
            this.state;
        const yearToList = getPreviousAcademicYears(yearList, academicYearFromDate);
        if (selectedRows && selectedRows.data) {
            const selectedIndices = selectedRows.data.map((data) => data.dataIndex);
            selectedStudentList = studentList.student_list.filter((data, index) =>
                selectedIndices.includes(index)
            );
        }
        this.setState({
            showEnrollSubmitPopUp: !showEnrollSubmitPopUp,
            selectedStudentList,
            actionStatus,
            yearToList
        });
    };

    onChangeStandard = (e) => {
        let { fieldError } = this.state;
        let { value, name } = e.target;
        delete fieldError[name]
        this.setState({
            [name]: value,
            fieldError
        })
    }

    handleSearchChange = (e) => {
        let { fieldError } = this.state;
        delete fieldError['admission_date']
        this.setState({
            admission_date: e,
            fieldError
        })
    }

    render() {
        let { ListEnabled, GridEnabled, yearList, yearToList, year, loading, tableUpdating, enabledActions, searchStudent, studentList,
            pagination, studentTypeList, student_type, openPopup, student_id, error, showEnrollSubmitPopUp,
            selectedStudentList, to_standard, standardToList, to_academic_year, current_standard, standardList,
            fieldError, academicYearFromDate, admission_date, snackbar, alertData, rowsSelected } = this.state
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: true,
            print: false,
            viewColumns: false,
            rowsSelected: this.state.rowsSelected,
            // customSearchRender: debounceSearchRender(200),
            rowsPerPageOptions: [5, 10, 25, 50, 100, 200],
            onFilterChange: (onFilterChange, filterList, type) => {
                this.onFilterChangeHandler(type, onFilterChange);
            },
            onDownload: (buildHead, buildBody, columns, data) => {
                const bodyData = data.map((data_value) => {
                    return data_value;
                })
                const bodyColumn = columns.map((column_name) => {
                    column_name.label = getFormatMessage(column_name.label)
                    return column_name;
                })
                return "\uFEFF" + buildHead(bodyColumn) + buildBody(bodyData);
            },
            downloadOptions: {
                filename: "Admission_Students.csv",
                filterOptions: {
                    useDisplayedColumnsOnly: true,
                    useDisplayedRowsOnly: true,
                },
            },
        };
        if (loading) {
            return <LoadingGif />
        }
        else {
            return (
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className='heading'>
                                Student Admission Number List
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12} >
                            <Box className={classNames('header-align', 'end-flex-prop')}>
                                {isUserHasPermission('student_username_list', 'create') && <Button
                                    variant="contained"
                                    onClick={this.handleAddAdmissionButton}
                                    className='editbutton-view'
                                ><AddCircleOutlineIcon className='visibility-icon' /> {Actions.student_username_list.create.label}</Button>}
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container className='m-bt-15px'>
                        <Grid item md={4} xs={12}>
                            <Box className='header-align'>
                                <Dropdown
                                    data={yearList}
                                    name='year'
                                    value={year}
                                    onChange={this.onChange}
                                    label={<FormattedMessage {...commonMessages.academicYear} />}
                                    error={error.year}
                                    hideSelect={true}
                                />
                            </Box>
                        </Grid>
                        <Grid item md={4} xs={12}>
                            <Box className='header-align'>
                                <Dropdown
                                    data={standardList}
                                    name={current_standard}
                                    value={current_standard}
                                    onChange={(e) => this.handleStandardChange(e)}
                                    label={<FormattedMessage {...commonMessages.standard} />}
                                    hideSelect={true}
                                    error={error.current_standard}
                                />
                            </Box>
                        </Grid>
                        <Grid item md={4} xs={12}>
                            {year && !!isResidential &&
                                <Box className='header-align'>
                                    <Dropdown
                                        data={studentTypeList}
                                        name='student_type'
                                        value={student_type}
                                        onChange={this.onChangeStudentType}
                                        label={<FormattedMessage {...commonMessages.selectStudentType} />}
                                        hideSelect={true}
                                    />
                                </Box>
                            }
                        </Grid>.
                        {GridEnabled &&
                            <Grid item md={6} xs={12} className='end-flex-prop header-align'>
                                <TextField
                                    id="outlined-name"
                                    value={searchStudent}
                                    placeholder=""
                                    label="Search Student"
                                    name='searchStudent'
                                    onChange={(e) => { this.handleFilter(e) }}
                                />
                            </Grid>
                        }
                    </Grid>
                    <Grid container className={classNames('flex-justify-center', 'header-align')}>
                        <Grid item md={12} xs={12}>
                            <Paper>
                                <AllMUIDataTable
                                    title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                    data={studentList.student_list}
                                    columns={this.state.columns}
                                    options={options}
                                    onTableChange={this.getStudentList}
                                    serverSide={true}
                                    pagination={pagination}
                                    count={studentList.count}
                                    hideTextTransform={true}
                                />
                            </Paper>
                        </Grid>
                    </Grid>
                    <Snackbar
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        open={snackbar}
                        autoHideDuration={10000}
                        onClose={this.handleClose}
                    >
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </Paper>

            )
        }
    }
}

export default withRouter(StudentAdmissionNumList)

