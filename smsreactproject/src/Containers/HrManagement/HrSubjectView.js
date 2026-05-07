import React, { Component } from 'react';
import { Paper, Box, Grid, Button, CircularProgress, Avatar } from '@material-ui/core';
import { withRouter } from 'react-router-dom';

import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import { getAcademicYear, SetAcademicYear, isUserHasPermission } from 'Includes/functions';
import { viewTime } from 'Includes/viewFunctions';
import { options } from 'Constants';
import { Dropdown } from 'Components/DropDown';


class HrSubjectView extends Component {
    constructor() {
        super()
        this.state = {
            attendanceList: [],
            loading: true,
            selectedToDelete: [],
            closeMenu: true,
            tableUpdating: false,
            errorContent: '',
            yearList: [],
            year: '',
            selectedYearName: '',
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        display: false
                    }
                },
                {
                    name: "staff",
                    label: "staff",
                    options: {
                        filter: false,
                        sort: false,
                        display: false
                    }
                },
                {
                    name: "staff_name",
                    label: "Staff Name",
                    options: {
                        filter: true,
                        sort: false,
                        display: false,
                        search: true,

                    }
                },
                {
                    name: "profile_pic_details",
                    label: "Staff Name",
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box className='student-profile-position'>
                                    {value &&
                                        <Box>
                                            <Avatar alt='Profile Pic' src={value['file']} className='round-profile-pic' />
                                        </Box>
                                    }
                                    {!value &&
                                        <Box>
                                            <Avatar
                                                className={tableMeta.rowIndex / 2 === 0
                                                    ? 'orange-profile-pic round-profile-pic' : 'green-profile-pic round-profile-pic'}>
                                                {tableMeta.rowData[2] && tableMeta.rowData[2].charAt(0)}
                                            </Avatar>
                                        </Box>
                                    }
                                    <Box className={!tableMeta.rowData[7] ? 'align-self-center' : 'margin-top-10'}>
                                        <Box className='hr-subject-view-staff-name'>
                                            {tableMeta.rowData[2]}
                                        </Box>
                                        {tableMeta.rowData[6] &&
                                            <Box className='hr-subject-view-staff-designation'>
                                                {tableMeta.rowData[6]}
                                            </Box>
                                        }
                                    </Box>
                                </Box>
                            )
                        }
                    }
                },

                {
                    name: "max_hour",
                    label: "Max Hour",
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                value && viewTime(value)
                            )
                        }
                    }
                },
                {
                    name: "assigned_subjects",
                    label: "Subject Assigned",
                    options: {
                        filter: true,
                        sort: true,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<Box className='hr-subject-view-subject-name-position'>
                                {value &&
                                    value.map((data, index) => {
                                        return (
                                            <Box key={index} className='hr-subject-view-subject-name'>
                                                {data.subject_alias}
                                            </Box>
                                        )
                                    })
                                }
                            </Box>
                            )
                        }
                    }
                },
                {
                    name: "designation",
                    label: "Designation",
                    options: {
                        filter: false,
                        sort: false,
                        display: false
                    }
                },
                {
                    name: "group_name",
                    label: "group_name",
                    options: {
                        filter: false,
                        sort: false,
                        display: false
                    }
                },
                {
                    name: "Actions",
                    label: "Action",
                    options: {
                        filter: true,
                        sort: false,
                        search: false,
                        display: this.updatePermissions(),
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <div> {this.updatePermissions() &&
                                    <Button
                                        className='add-modify-button'
                                        onClick={e => this.callAddSubject(tableMeta.rowData[1])}
                                    > {tableMeta.rowData[4] && 'Modify'}
                                        {!tableMeta.rowData[4] && 'Add'}
                                    </Button>}
                                </div>
                            )
                        }
                    }
                },

            ]
        }
    }

    callAddSubject = (id) => {
        let { selectedYear, selectedYearName } = this.state;
        let yearInformation = {
            year: selectedYear,
            yearName: selectedYearName,
            id: id,
        }
        let searchParam = "?" + new URLSearchParams(yearInformation).toString()
        this.props.history.push({
            pathname: Actions.assign_subject.create.url,
            search: searchParam,
        });
    }

    updatePermissions = () => {
        if (isUserHasPermission('assign_subject', 'create')) {
            return true
        }
        else {
            return false
        }
    }

    checkAcademicYear = () => {
        if (getAcademicYear()) {
            let year = getAcademicYear()
            this.SetAcademicYearName(year)
        }
        else {
            this.setState({
                loading: false
            })
        }
    }

    SetAcademicYearName = (year) => {
        let { yearList } = this.state;
        let yearName = ''
        yearList.some((data) => {
            if (data.id == year) {
                yearName = data.name
            }
        })
        this.getStaffList(year, yearName)
    }

    getStaffList = (year, yearName) => {
        const url = GET_URL.getstaffsubject.api
        const params = { academic_year: year }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    staffList: response.data.data,
                    selectedYear: year,
                    selectedYearName: yearName,
                    loading: false
                })
            }
        })
    }

    componentDidMount = async () => {
        const url = GET_URL.getacademicyear.api
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    yearList: response.data.data,
                }, () => {
                    this.checkAcademicYear()
                })
            }
        })
        this.setOptionsForTable();
    }

    setOptionsForTable = () => {
        options['selectableRows'] = 'none'
        this.setState({
            options: options
        })
    }

    onChange = async (e) => {
        let { value, name } = e.target;
        if (name === "selectedYear" && value != 0) {
            this.setState({
                [name]: value,
            })
            SetAcademicYear(value)
            this.SetAcademicYearName(value)
        }
    }


    render() {
        const { loading, staffList, columns, options, tableUpdating, yearList, selectedYear } = this.state
        let allOptions = {
            ...options,
            customSearch: (searchQuery, currentRow, columns) => {
                let isFound = false;
                currentRow.forEach(col => {
                    if (col && typeof (col) === "string" && col.toLowerCase().replace(/\s+/g, "").includes(searchQuery.toLowerCase().replace(/\s+/g, ""))) {
                        isFound = true;
                    }
                    if (Array.isArray(col)) {
                        col.forEach(subject => {
                            if (subject.subject && typeof (subject.subject) === "string" && subject.subject.toLowerCase().replace(/\s+/g, "").includes(searchQuery.toLowerCase().replace(/\s+/g, ""))) {
                                isFound = true;
                            }
                        });
                    }
                });
                return isFound;
            }
        }
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Box>
                    <Paper className='paper-background '>
                        <Grid container>
                            <Grid item md={9} xs={12} className='header-align'>
                                <Box className='heading'>
                                    Assigned Subjects to Staff
                                </Box>
                            </Grid>
                            <Grid item md={3} xs={12} className='margin-top-20'>
                                <Dropdown
                                    data={yearList}
                                    name='selectedYear'
                                    style='width-100'
                                    value={selectedYear}
                                    onChange={this.onChange}
                                    label='Select Academic year'
                                />
                            </Grid>
                        </Grid>
                        <Grid container className='header-align'>
                            <Grid item md={10} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={staffList}
                                        title=''
                                        data={staffList}
                                        columns={columns}
                                        options={allOptions}
                                    />
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>
                </Box>
            )
        }
    }
}
export default withRouter(HrSubjectView)
