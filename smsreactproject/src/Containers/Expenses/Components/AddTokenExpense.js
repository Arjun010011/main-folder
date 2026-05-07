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
import { isUserHasPermission, getKeyValueMap, getUrlParam, getPaginationProps, dateFormat } from 'Includes/functions';
import { DEFAULT_PAGINATION_PROPS } from 'Constants';


class AddTokenExpense extends Component {

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
            tableUpdating: false,
            visit_date: '',
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        display: false,
                        download: false
                    }
                },
                {
                    name: "token_num",
                    label: "Token Number",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                    }
                },
                {
                    name: "staff_first_name",
                    label: "Staff Name",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box>
                                    <Box>
                                        {tableMeta.rowData[2]} {tableMeta.rowData[7]} {tableMeta.rowData[8]}
                                    </Box>
                                </Box>

                            )

                        },
                    }
                },
                {
                    name: "other_details",
                    label: "Vehicle Details",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box>
                                    {`${value.vehicle_num} (${value.name})`}
                                </Box>
                            )

                        },
                    }
                },
                {
                    name: "liter",
                    label: "No of liters",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box>
                                    {value}
                                </Box>
                            )

                        },
                    }
                },
                {
                    name: "for_date",
                    label: "created date",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box>
                                    {dateFormat(value, 'DD-MM-YYYY')}
                                </Box>

                            )

                        },
                    }
                },
                {
                    name: "is_active",
                    label: "Is Claimed",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box>
                                    {value && !tableMeta.rowData[7] &&
                                        <Box className='deposit-transaction'>Not Claimed</Box>
                                    }
                                    {value && tableMeta.rowData[7] &&
                                        <Box className='deposit-transaction'>Claimed</Box>
                                    }
                                    {!value &&
                                        <Box className='withdraw-transaction'>Cancelled</Box>
                                    }
                                </Box>

                            )

                        },
                    }
                },

                {
                    name: "staff_middle_name",
                    label: "Staff Name",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false,
                        viewColumns: false,
                        download: false
                    }
                },
                {
                    name: "staff_last_name",
                    label: "Staff Name",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false,
                        viewColumns: false,
                        download: false
                    }
                },
                {
                    name: 'Actions',
                    label: 'Actions',
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <Button
                                    className='add-modify-button'
                                    onClick={e => this.setAndSubmit(tableMeta.rowData[0])}
                                > Add Token
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
        data_list.data_list.map((data, index) => {
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
            ListLoading: true,
            from_date: this.props.startDate,
            to_date: this.props.toDate,
        }, () => {
            this.getDataList()
        })
    }


    getDataList = (paginationProps) => {
        this.setState({ tableUpdating: true })
        let { pagination, is_opened } = this.state;
        const { from_date, to_date } = this.props;
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = { ...pagination_params, is_active: 3, from_date: dateFormat(from_date, 'YYYY-MM-DD'), to_date: dateFormat(to_date, 'YYYY-MM-DD') }
        const url = GET_URL.token.api
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                this.callApi = true
                this.setState({
                    data_list: response.data.data,
                    loading: false,
                    ListLoading: false,
                    tableUpdating: false,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                });
            }
        });
    };

    handleClose = () => {
        this.setState({
            openDialog: false
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
        const { blankData, pagination, data_list, standardList, selectedStandard, ListLoading, openDialog, columns, tableUpdating, selected_name } = this.state;
        const { data_is_there } = this.props;
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: true,
            print: true,
            viewColumns: true,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
            viewColumns: true,
            customFilterDialogFooter: () => {
                return this.geFilterOptions();
            },
            onFilterChange: (onFilterChange, filterList, type) => {
                this.onFilterChangeHandler(type, onFilterChange);
            },
        };


        return (
            <Box>
                <Button
                    disabled={data_is_there}
                    className={data_is_there ? 'add-modify-button disable-button' : 'add-modify-button'}
                    onClick={e => this.addStudentStaff('student')}
                >Select Token
                </Button>

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
                        {!ListLoading && data_list &&
                            <Box className='header-align'>
                                <AllMUIDataTable
                                    key={data_list.data_list}
                                    data={data_list.data_list}
                                    columns={columns}
                                    options={options}
                                    title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                    onTableChange={this.getDataList}
                                    serverSide={true}
                                    pagination={pagination}
                                    count={data_list.count}
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

export default withRouter(AddTokenExpense)