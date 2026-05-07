import React, { Component, Fragment } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { DateRange } from 'Components/DateRange';
import moment from 'moment';

import Skeleton from '@material-ui/lab/Skeleton';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import { Dropdown } from 'Components/DropDown';
import StudentListActions from 'Includes/StudentListActions'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest, putRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getKeyValueMap, getUrlParam, timeFormat, getPaginationProps, dateFormat } from 'Includes/functions';
import { DEFAULT_PAGINATION_PROPS, minDate } from 'Constants';
import { values } from 'react-intl/locale-data/hi';

class ListVisitors extends Component {
    constructor() {
        super()
        let date = new Date();
        this.state = {
            visitorsList: { data_list: [] },
            buildingList: [],
            selectedBuilding: '',
            loading: true,
            dateRangeValue: {
                start: dateFormat(new Date(date.getFullYear(), date.getMonth(), 1), 'YYYY-MM-DD'), end: dateFormat(new Date(), 'YYYY-MM-DD')
            },
            error: {},
            floorLoading: false,
            pageLoading: false,
            pagination: { ...DEFAULT_PAGINATION_PROPS },
            isBlankPage: true,
            blankData: 'Select Building',
            isSingleBuilding: 'false',
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        viewColumns: false,
                        download: false,
                    }
                },
                {
                    name: "name",
                    label: "Visitor Name",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "checkin",
                    label: "Check In",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "checkout",
                    label: "Check Out",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "allocation_details",
                    label: "Floor (Room)",
                    options: {
                        filter: false,
                        sort: false,
                    }
                },
                {
                    name: "visited_to",
                    label: "Visited To",
                    options: {
                        filter: false,
                        sort: false,
                    }
                },
                {
                    name: 'Actions',
                    label: 'Action',
                    options: {
                        display: this.updatePermissions('display'),
                        filter: true,
                        sort: true,
                        download: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <StudentListActions
                                    id={tableMeta.rowData[0]}
                                    index={tableMeta.rowIndex}
                                    deleteStudent={this.deleteVisitor}
                                    editURL={Actions.hostel_visitor.update.url}
                                    viewURL={Actions.hostel_visitor_individual.view.url}
                                    enabledActions={this.state.enabledActions}
                                />
                            </div>
                            );
                        }
                    }
                }

            ],
        }
        this.dateRange = React.createRef();
    }



    updateCreatePermissions = () => {
        if (isUserHasPermission('room_allocation', 'view')) {
            return true
        }
        else {
            return false
        }
    }

    updatePermissions = (name) => {
        let test = true
        const hasViewPermission = isUserHasPermission('hostel_visitor_individual', 'view')
        const hasEditPermission = isUserHasPermission('hostel_visitor', 'update')
        const hasDeletePermission = isUserHasPermission('hostel_visitor', 'delete')
        let enabledActions = [];
        if (hasViewPermission) {
            enabledActions.push('view')
        }
        if (hasEditPermission) {
            enabledActions.push('edit')
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
        }
        if (enabledActions.length === 0) {
            test = false;
        }
        if (name === 'display') {
            return test
        }
        else {
            this.setState({
                enabledActions: enabledActions,
                columns: this.state.columns
            })
        }
    }

    deleteVisitor = async (id, index) => {
        this.setState({ tableUpdating: true })
        let { visitorsList, columns } = this.state
        const del_url = DEL_URL.visitor.api
        const url = del_url + id + '/';
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                visitorsList.data_list.splice(index, 1)
                this.setState({
                    visitorsList,
                    columns: [...columns]
                })
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                })
            }
        })
        this.setState({ tableUpdating: false })
    }

    componentDidMount = () => {
        this.getHostelBuildingList()
        this.updatePermissions('actions');
    }

    getHostelBuildingList = () => {
        const url = GET_URL.buildingdata.api
        const params = { is_active: true, building_type: 'Hostel' }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    buildingList: response.data.data,
                    selectedBuilding: response.data.data.length === 1 ? response.data.data[0]['id'] : '',
                    isSingleBuilding: response.data.data.length === 1 ? true : false,
                    loading: response.data.data.length === 1 ? true : false
                }, () => {
                    if (response.data.data.length === 1) {
                        this.getVisitorsList()
                    }
                    else {
                        let { selectedBuilding } = getUrlParam();
                        if (!!selectedBuilding && selectedBuilding !== 'undefined') {
                            this.setState({
                                selectedBuilding,
                                loading: true
                            }, () => {
                                this.getVisitorsList()
                            })
                        }
                    }
                })
            }
        })
    }

    getVisitorsList = (paginationProps) => {
        this.setState({ tableUpdating: true })
        let { pagination, dateRangeValue, selectedBuilding } = this.state;
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = {
            ...pagination_params, pagination: true, is_active: true, fromDate: `${dateRangeValue.start} 00:00:00`, toDate: `${dateRangeValue.end} 23:59:00`,
            roomallocation__room__floor__building: selectedBuilding
        };
        const url = GET_URL.visitor.api
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.data_list.map((data) => {
                    data.checkin = dateFormat(data.checkin, 'DD-MM-YYYY hh:mm A')
                    data.checkout = data.checkout?dateFormat(data.checkout, 'DD-MM-YYYY hh:mm A'):''
                    if (data.allocation_details) {
                        data.visited_to = (data.allocation_details['staff'] && !data.allocation_details['student']) ? `${data.allocation_details['staff_details']['full_name']}` : `${data.allocation_details['student_details']['name']}`
                        data.allocation_details = `${data.allocation_details['floor_name']} (${data.allocation_details['room_name']})`
                    }
                })
                this.setState({
                    visitorsList: response.data.data,
                    isBlankPage: false,
                    tableUpdating: false,
                    loading: false,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                })
            }
        })
    }

    handleChangeDateRange = (value) => {
        let { pagination } = this.state;
        this.setState({
            dateRangeValue: value,
        }, () => {
            this.getVisitorsList(pagination)
        })
    }

    onChange = (e) => {
        let { name, value } = e.target;
        this.setState({
            [name]: value,
            error: {}
        }, () => {
            this.getVisitorsList()
        })
    }

    handleAddVisitor = () => {
        let { selectedBuilding, buildingList, error } = this.state;
        let buildingInformation = {}
        if (!!selectedBuilding) {
            let buildingName = getKeyValueMap(buildingList, 'id', 'name')
            buildingName = buildingName[selectedBuilding]
            buildingInformation = {
                selectedBuilding: selectedBuilding,
                buildingName: buildingName,
            }
            let searchParam = "?" + new URLSearchParams(buildingInformation).toString()
            this.props.history.push({
                pathname: Actions.hostel_visitor.create.url,
                search: searchParam,
            });
        }
        else {
            error['selectedBuilding'] = 'Select Building'
            this.setState({
                error
            })
        }
    }


    render() {
        const { loading, selectedBuilding, columns, tableUpdating, buildingList, isBlankPage, error, floorList,
            visitorsList, pageLoading, blankData, pagination, dateRangeValue, isSingleBuilding } = this.state
        const { isComponent } = this.props;
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: true,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
            downloadOptions: {
                filename: "Hostel_Visitors.csv",
                filterOptions: {
                    useDisplayedColumnsOnly: true,
                    useDisplayedRowsOnly: true,
                },
            },
        };
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
                    <Paper className='paper-background'>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                Hostel Visitors
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('hostel_visitor', 'create') && <Button
                                        variant='contained'
                                        onClick={this.handleAddVisitor}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.hostel_visitor.create.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container spacing={2}>
                            {!isSingleBuilding &&
                                <Grid item md={3} xs={12} className='mt-20'>
                                    <Dropdown
                                        data={buildingList}
                                        name='selectedBuilding'
                                        fullWidth
                                        value={selectedBuilding}
                                        onChange={this.onChange}
                                        label='Building'
                                        hideSelect={true}
                                        error={error.selectedBuilding}
                                    />
                                </Grid>
                            }
                            {selectedBuilding &&
                                <Grid item md={4} xs={12}>
                                    <DateRange
                                        handleChange={this.handleChangeDateRange}
                                        minDate={minDate}
                                        maxDate={new Date()}
                                        label='Visitors date range'
                                        ref={this.dateRange}
                                        hideClearIcon={true}
                                        startDate={dateRangeValue.start}
                                        endDate={dateRangeValue.end}
                                    />
                                </Grid>
                            }

                        </Grid>
                        {(isBlankPage && !pageLoading) &&
                            <Box className='header-align'>
                                <BlankPagewithIcon data={blankData} />
                            </Box>
                        }
                        {pageLoading &&
                            <Box display='flex'>
                                <CircularProgress className='loading' />
                            </Box>
                        }
                        {!isBlankPage && !pageLoading &&
                            <Grid container className='header-align'>
                                <Grid item md={12}>
                                    <Paper>
                                        <AllMUIDataTable
                                            title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                            key={visitorsList.data_list}
                                            data={visitorsList.data_list}
                                            columns={columns}
                                            options={options}
                                            onTableChange={this.getVisitorsList}
                                            serverSide={true}
                                            pagination={pagination}
                                            count={visitorsList.count}
                                        />
                                    </Paper>
                                </Grid>
                            </Grid>
                        }

                    </Paper>
                </Box>
            )
        }
    }
}
export default withRouter(ListVisitors)