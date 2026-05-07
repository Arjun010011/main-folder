import React, { Component } from 'react'
import { Paper, Box, Grid, Button, makeStyles, CircularProgress, AppBar, Toolbar, Typography, IconButton, Dialog, DialogActions } from '@material-ui/core';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import CloseIcon from '@material-ui/icons/Close';
import { withRouter } from 'react-router-dom';

import { Dropdown } from 'Components/DropDown';
import loadingBar from 'images/loading.gif'
import { Actions } from 'Constants/permissions';
import { getRequest, } from 'Includes/api/apicall';
import { GET_URL, } from 'Includes/urls';
import blankProfile from 'images/blank_profile_pic.png';
import RightArrow from 'images/RightArrow.png'
import BlankPagewithIcon from 'Components/BlankPageWithIcon'
import { getFullName, getKeyValueMap, getUrlParam, getPaginationProps, dateFormat } from 'Includes/functions';
import { DEFAULT_PAGINATION_PROPS } from 'Constants';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}


class AddStudentOrStaff extends Component {

    constructor(props) {
        super(props)

        this.state = {
            pageLoading: false,
            reasonOpen: false,
            upcoming: { student: [], staff: [] },
            current: { student: [], staff: [] },
            standardList: [],
            selectedStandard: 'all',
            ListLoading: false,
            pagination: DEFAULT_PAGINATION_PROPS,
            openDialog: false,
            data_list: [],
            all_data_list: {},
            tableUpdating: false,
            visit_date: '',
            student_columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        download: false,
                    },
                },
                {
                    name: 'full_name',
                    label: 'Name',
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: 'current_standard_name',
                    label: `${alias_names['standard']}`,
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: 'email',
                    label: 'Email',
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "dob",
                    label: "Date of birth",
                    options: {
                        filter: false,
                        sort: true,
                        display: true
                    }
                },
                {
                    name: "current_reg_num",
                    label: "Register Number",
                    options: {
                        filter: false,
                        sort: true,
                        display: true
                    }
                },
                {
                    name: 'mobile_num',
                    label: 'Mobile Number',
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: 'Actions',
                    label: 'Action',
                    options: {
                        filter: true,
                        sort: true,
                        download: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <Button
                                    className='add-modify-button'
                                    onClick={(e) => this.setAndSubmit(tableMeta.rowData[0])}
                                > Add Student
                                </Button>
                            </div>
                            );
                        }
                    }
                }

            ],
            staff_columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        download: false
                    },
                },
                {
                    name: 'full_name',
                    label: 'Name',
                    options: {
                        filter: true,
                        sort: true,
                    }
                },

                {
                    name: "dob",
                    label: "Date of birth",
                    options: {
                        filter: false,
                        sort: true,
                        display: true
                    }
                },
                {
                    name: "group_name",
                    label: "groups",
                    options: {
                        filter: true,
                        sort: true,
                        display: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box>
                                    {value && value[0]}
                                </Box>
                            )
                        }
                    }
                },
                {
                    name: 'mobile_num',
                    label: 'Mobile Number',
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "email",
                    label: "Email",
                    options: {
                        filter: false,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div className='mui-table-custom-value-left-align text-transform-none'>
                                {value}
                            </div>)

                        }
                    }
                },
                {
                    name: 'Actions',
                    label: 'Action',
                    options: {
                        filter: true,
                        sort: true,
                        download: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <Button
                                    className='add-modify-button'
                                    onClick={e => this.setAndSubmit(tableMeta.rowData[0])}
                                > Add Staff
                                </Button>
                            </div>
                            );
                        }
                    }
                }
            ]
        }
    }


    setAndSubmit = (id) => {
        const { selected_name, data_list } = this.state;
        let return_details = { details: {}, selected_name: selected_name, id: id }
        data_list.map((data) => {
            if (data.id == id) {
                return_details['details'] = data
            }
        })
        this.props.return_details(return_details)
        this.setState({
            openDialog: false
        })
    }

    addStudentStaff = (name) => {
        this.setState({
            openDialog: true,
            selected_name: name,
            tableUpdating: true
        }, () => {
            this.getDataList()
            this.getStandardList()
        })
    }

    getDataList = (paginationProps) => {
        const { pagination, selected_name, visit_date, selectedStandard } = this.state;
        let currentPagination = pagination;
        if (paginationProps) {
            currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(currentPagination);

        let url = GET_URL.student.api
        if (selected_name === 'staff') {
            url = GET_URL.staff.api
        }
        let params = { is_active: true };
        if (selectedStandard && selectedStandard !== 'all') {
            params = { ...pagination_params, is_active: true, current_standard: selectedStandard };
        }
        else if (selected_name !== 'staff') {
            params = { ...pagination_params, is_active: true };
        }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let data_list = response.data.data
                if (selected_name !== 'staff') {
                    data_list = response.data.data.student_list
                }
                data_list.map((data) => {
                    data['full_name'] = getFullName(data['first_name'], data['middle_name'], data['last_name'])
                    data['dob'] = data['dob'] ? dateFormat(data['dob'], 'DD-MM-YYYY') : ''
                })
                this.setState({
                    data_list,
                    pagination: currentPagination,
                    tableUpdating: false,
                    all_data_list: response.data.data
                })
                if (response.data.data.length === 0) {
                    this.setState({
                        blankData: `There is no ${selected_name}`,
                        data_list: null
                    })
                }
            }
        })
    }

    handleClose = () => {
        this.setState({
            openDialog: false
        })
    }

    getStandardList = async () => {
        const f_url = GET_URL.getstandard.api
        const param = { is_active: true, only_standards: true }
        await getRequest(f_url, param, this.props).then(response => {
            if (response && response.status === 200) {
                let removeIndex = ''
                response.data.data.map((data, index) => {
                    if (data.codename === 'promoted') {
                        removeIndex = index
                    }
                })
                if (removeIndex !== '') {
                    response.data.data.splice(removeIndex, 1)
                }
                let temp = { id: 'all', name: 'All' }
                response.data.data.unshift(temp)

                this.setState({
                    standardList: response.data.data,
                })
            }
        })
    }

    onChange = async (e) => {
        let { value } = e.target;
        if (value !== 0) {
            this.setState({
                selectedStandard: value,
            }, () => {
                this.getDataList();
            })
        }
    }

    render() {
        const { blankData, pagination, data_list, all_data_list, standardList, selectedStandard, ListLoading, openDialog, columns, tableUpdating, student_columns, staff_columns, selected_name } = this.state;
        const { data_is_there } = this.props;
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: true,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
            customFilterDialogFooter: () => {
                return this.geFilterOptions();
            },
            // onFilterChange: (onFilterChange, filterList, type) => {
            //     this.onFilterChangeHandler(type, onFilterChange);
            // },
        };

        return (
            <Box>
                <Grid container>
                    <Grid item md={6} className='header-align'>
                        <Button
                            disabled={data_is_there}
                            className={data_is_there ? 'add-modify-button disable-button' : 'add-modify-button'}
                            onClick={e => this.addStudentStaff('student')}
                        >Select Student
                        </Button>
                    </Grid>
                    <Grid item md={6} className='header-align'>
                        <Button
                            disabled={data_is_there}
                            className={data_is_there ? 'add-modify-button disable-button' : 'add-modify-button'}
                            onClick={e => this.addStudentStaff('staff')}
                        >Select Staff
                        </Button>
                    </Grid>
                </Grid>

                <Dialog fullScreen open={openDialog} onClose={this.handleClose} >
                    <AppBar style={{ position: 'fixed', backgroundColor: "#4680FF" }}>
                        <Toolbar>
                            <IconButton edge="start" color="inherit" onClick={this.handleClose} aria-label="close">
                                <CloseIcon />
                            </IconButton>
                        </Toolbar>
                    </AppBar>
                    <Box className='student-route-table-popup margin-top'>
                        {ListLoading &&
                            <Box display='flex'>
                                <img src={loadingBar} className='loading' alt='loading' />
                            </Box>
                        }
                        {!ListLoading && data_list && selected_name === 'student' &&
                            <Box className='header-align'>
                                <Dropdown
                                    data={standardList}
                                    name='selectedStandard'
                                    value={selectedStandard}
                                    onChange={this.onChange}
                                    label={`Select ${alias_names['standard']}`}
                                    className='width-100'
                                    hideSelect={true}

                                />
                            </Box>
                        }
                        {(!ListLoading && data_list && selected_name === 'student') ?
                            <Box className='header-align'>
                                <AllMUIDataTable
                                    key={data_list}
                                    data={data_list}
                                    columns={student_columns}
                                    options={options}
                                    title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                    onTableChange={this.getDataList}
                                    serverSide={true}
                                    pagination={pagination}
                                    count={all_data_list.count}
                                />
                            </Box>
                            :
                            !ListLoading && data_list &&
                            <Box className='header-align'>
                                <AllMUIDataTable
                                    key={data_list}
                                    data={data_list}
                                    columns={staff_columns}
                                    options={options}
                                    title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                    onTableChange={this.getDataList}
                                />
                            </Box>
                        }
                        {!data_list &&
                            <BlankPagewithIcon data={blankData} />
                        }
                    </Box>
                </Dialog>
            </Box>


        )
    }

}

export default withRouter(AddStudentOrStaff)