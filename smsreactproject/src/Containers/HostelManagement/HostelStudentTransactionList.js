import React, { Component } from 'react'
import {
    Paper, Box, Grid, Button, CircularProgress, Tooltip
} from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import classNames from 'classnames';
import _ from 'lodash';
import { withRouter } from 'react-router-dom';
import StudentListActions from 'Includes/StudentListActions'

import AllMUIDataTable from 'Components/AllMUIDataTable';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import { Dropdown } from 'Components/DropDown';
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getUrlParam, getPaginationProps, dateFormat, getKeyValueMap, numberWithCommas, validateDate, getFullName } from 'Includes/functions';
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import Skeleton from '@material-ui/lab/Skeleton';
import moment from 'moment';
import messages from './messages';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';
import HostelAllStudentListActions from './Components/HostelAllStudentListActions';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

class HostelStudentTransactionList extends Component {
    constructor() {
        super()
        this.state = {
            studentTransactionList: { data_list: [] },
            fieldValue: { checkIn: null, checkOut: null },
            fieldError: {},
            buildingList: [],
            selectedBuilding: '',
            selected_id: '',
            errorContent: '',
            selectedDate: null,
            loading: true,
            submitDisable: false,
            selectedToDelete: [],
            allocation_detail: {},
            user_name: '',
            tableUpdating: false,
            openDialog: false,
            bankLoaded: false,
            fieldDetails: null,
            checkinMinDate: '',
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            enabledActions: [],
            selected_user: 'student',
            selected_action: '',
            bank_id: '',
            id: '',
            bank_name: '',
            account_num: '',
            fee_name: '',
            dateRangeValue: {},
            errors: {},
            largeImagePreview: '',
            isOpenedDateRange: false,
            dateRangeDropdownList: [{ id: 'l1m', name: 'Last 1 Month' }, { id: 'l3m', name: 'Last 3 Months' }, { id: 'l6m', name: 'Last 6 Months' }, { id: 'l1y', name: 'Last 1 Year' }],
            studentTypeList: [{ id: 'current', name: 'Current' }, { id: 'upcoming', name: 'Upcoming' }, { id: 'checkedout', name: 'Checked Out' }],
            studentType: 'current',
            isDateRange: false,
            dateRangeDropdown: 'l1m',
            isBlankPage: true,
            blankData: 'Select Building',
            student_columns: [
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
                    name: "student",
                    label: "student",
                    options: {
                        filter: false,
                        sort: false,
                        viewColumns: false, 
                        display: false,
                        download: false
                    }
                },
                {
                    name: "full_name",
                    label: <FormattedMessage {...commonMessages.studentName} />,
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                    }
                },
                { 
                    name: "standard",
                    label: `${alias_names['standard']}`,
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                    }
                },
                {
                    name: "current_reg_num",
                    label: "Register Num",
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                    }
                },
                {
                    name: "allocation_details",
                    label: "Floor (Room)",
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                    }
                },
                {
                    name: "checkin",
                    label: "Start Date",
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                    }
                },
                {
                    name: "checkout",
                    label: "End Date",
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                    }
                },
                {
                    name: "deposited_amount",
                    label: "Deposited",
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                        customBodyRender: (value) => {
                            return (<div>
                                {numberWithCommas(value ? value : 0)}
                            </div>
                            )
                        }
                    }
                },
                {
                    name: "withdrawed_amount",
                    label: "Distributed",
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                        customBodyRender: (value) => {
                            return (<div>
                                {numberWithCommas(value ? value : 0)}
                            </div>
                            )
                        }
                    }
                },
                {
                    name: "returnback",
                    label: "Returned Back",
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                        customBodyRender: (value) => {
                            return (<div>
                                {numberWithCommas(value ? value : 0)}
                            </div>
                            )
                        }
                    }
                },
                {
                    name: "balance",
                    label: "Balance",
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                        customBodyRender: (value) => {
                            return (<div className='text-green'>
                                {numberWithCommas(value ? value : 0)}
                            </div>
                            )
                        }
                    }
                },
                {
                    name: 'Actions',
                    label: 'Action',
                    options: {
                        display: this.updatePermissions('display'),
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        download: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <HostelAllStudentListActions
                                    id={tableMeta.rowData[0]}
                                    index={tableMeta.rowIndex}
                                    viewURL={Actions.hostel_student_transaction_view.view.url}
                                    roomUrl={Actions.hostel_student_room_history.view.url}
                                    updateParentUpdate={this.updateParentUpdate} 
                                    enabledActions={this.state.enabledActions}
                                    viewExtraParams={{ selectedBuilding: this.state.selectedBuilding, name: tableMeta.rowData[2], student: tableMeta.rowData[1],
                                        balance: tableMeta.rowData[11]}}
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

    updateParentUpdate=(amount,index)=>{
        this.setState({
            isBlankPage:true
        },()=>{
            let{studentTransactionList}=this.state;
            let tempList={...studentTransactionList}
            tempList.data_list[index]['balance']=parseFloat(tempList.data_list[index]['balance'])-parseFloat(amount)
            tempList.data_list[index]['returnback']=parseFloat(tempList.data_list[index]['returnback'])+parseFloat(amount)
            this.setState({studentTransactionList:{...tempList},isBlankPage:false})
        })
    }
 
    updatePermissions = (name) => {
        let test = true
        const hasViewPermission = isUserHasPermission('hostel_student_transaction_view', 'view')
        const hasRoomPermission = isUserHasPermission('hostel_student_room_history', 'view')
        const hasWithDrawPermission = isUserHasPermission('hostel_withdraw', 'view')
        let enabledActions = [];
        if (hasViewPermission) {
            enabledActions.push('Transactions')
        }
        if (hasRoomPermission) {
            enabledActions.push('Room History')
        }
        if (hasWithDrawPermission) {
            enabledActions.push('Return Back')
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
            })
        }
    }

    getStudentTransactionList = (paginationProps) => {
        this.setState({ tableUpdating: true })
        let { pagination, selectedFloor, selectedBuilding, studentType } = this.state;
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = {
            ...pagination_params, is_active: true, pagination: true, building: selectedBuilding
        }
        if (selectedFloor !== 'all') {
            params['floor'] = selectedFloor
        }
        if (studentType === 'checkedout') {
            params['checkedout'] = true
        }
        else if (studentType === 'upcoming') {
            params['is_upcoming'] = true
        }
        const url = GET_URL.studenttransactionlist.api
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                response.data.data.data_list.map((data) => {
                    if (data.roomallocation_student) {
                        data.allocation_details = `${data.roomallocation_student['floor_name']} (${data.roomallocation_student['room_name']})`
                        data.checkin = data.roomallocation_student?.checkin ? dateFormat(data.roomallocation_student?.checkin, 'DD-MM-YYYY') : ''
                        data.checkout = data.roomallocation_student?.checkout ? dateFormat(data.roomallocation_student?.checkout, 'DD-MM-YYYY') : ''
                        data.student = data.roomallocation_student?.student ? data.roomallocation_student?.student : ''
                    }
                    data.full_name = getFullName(data.first_name, data.middle_name, data.last_name)
                })
                this.setState({
                    studentTransactionList: response.data.data,
                    loading: false,
                    tableUpdating: false,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                });
            }
        });
    }

    componentDidMount = () => {
        this.updatePermissions()
        this.getHostelBuildingList()
        let { selectedBuilding } = getUrlParam();
        if (selectedBuilding) {
            this.setState({
                selectedBuilding,
                isBlankPage: false,
                floorLoading: true,
            }, () => {
                this.getFloorList(selectedBuilding)
            })
        }
    }

    getHostelBuildingList = () => {
        const url = GET_URL.buildingdata.api
        const params = { is_active: true, building_type: 'Hostel' }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    buildingList: response.data.data,
                    loading: false
                })
            }
        })
    }

    onChange = (e) => {
        let { name, value } = e.target;
        let { errors } = this.state;
        if (value !== 0) {
            delete errors[name]
            this.setState({ [name]: value, errors, isBlankPage: false }, () => {
                if (name === 'selectedBuilding') {
                    delete errors.selectedFloor
                    this.setState({
                        floorLoading: true,
                        selectedFloor: null,
                        floorList: [],
                    }, () => {
                        this.getFloorList(value)
                    })
                }
                else if (name === 'selectedFloor') {
                    this.setState({
                        pageLoading: true,
                        // isBlankPage: true,
                    })
                    this.getStudentTransactionList()
                }
                else if (name === 'studentType') {
                    this.getStudentTransactionList()
                }
            })
        }
    }

    getFloorList = (building, name) => {
        let { loading } = this.state;
        const url = GET_URL.buildingdata.api + building + '/'
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let temp = { id: 'all', name: 'All' }
                response.data.data.floor_building.unshift(temp)
                if (name === 'loading') {
                    loading = false
                }
                this.setState({
                    floorList: response.data.data.floor_building,
                    floorLoading: false,
                    loading,
                    selectedFloor: 'all'
                }, () => {
                    this.getStudentTransactionList()
                })
            }
        })
    }

    handleChangeCheckInOut = (e, name) => {
        let { fieldValue, fieldError } = this.state;
        if (name === 'checkIn') {
            delete fieldError['checkIn']
        }
        else {
            delete fieldError['checkIn']
        }
        fieldValue[name] = e
        this.setState({
            fieldValue,
            fieldError
        })
    }

    handleClose = () => {
        this.setState({
            openDialog: false
        })
        this.getStudentTransactionList()
    }

    handleAddTransaction = () => {
        const { selectedBuilding, buildingList } = this.state;
        let building_name = getKeyValueMap(buildingList, 'id', 'name')
        building_name = building_name[selectedBuilding]

        let searchState = { selectedBuilding: selectedBuilding, building_name: building_name }

        let searchParam = "?" + new URLSearchParams(searchState).toString()
        this.props.history.push({
            pathname: Actions.hostel_student_transaction_list.create.url,
            search: searchParam,
        })
    }

    render() {
        const { loading, studentTransactionList, floorList, floorLoading, selectedFloor, studentTypeList, studentType,
            checkinMinDate, pagination, isBlankPage, selectedBuilding, blankData, buildingList, errors, selected_user, tableUpdating, student_columns, staff_columns } = this.state
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: true,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
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
                    <Paper className={classNames('paper-background')}>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Hostel Student List
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('hostel_student_transaction_list', 'create') && selectedBuilding && <Button
                                        variant="contained"
                                        onClick={this.handleAddTransaction}
                                        // component={Link} to={Actions.hostel_student_transaction_list.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.hostel_student_transaction_list.create.label}</Button>}
                                </Box>

                            </Grid>
                        </Grid>
                        <Grid container spacing={2}>
                            <Grid item md={3} xs={12} className='mt-20'>
                                <Dropdown
                                    data={buildingList}
                                    name='selectedBuilding'
                                    fullWidth
                                    value={selectedBuilding}
                                    onChange={this.onChange}
                                    label='Building'
                                    hideSelect={true}
                                    error={errors.selectedBuilding}
                                />
                            </Grid>
                            <Grid item md={3} xs={12} className='mt-20'>
                                {!floorLoading && selectedBuilding &&
                                    <Dropdown
                                        data={floorList}
                                        name='selectedFloor'
                                        disabled={!selectedBuilding}
                                        value={selectedFloor}
                                        onChange={this.onChange}
                                        label='Floor'
                                        error={errors.selectedFloor}
                                        hideSelect={true}
                                        helperText={selectedBuilding ? '' : 'Select Building'}
                                    />
                                }
                                {floorLoading &&
                                    <Skeleton variant="rect" className='drop-down-skeleton '></Skeleton>
                                }
                            </Grid>
                            {selectedBuilding &&
                                <Grid item md={3} xs={12} className='mt-20'>
                                    <Dropdown
                                        data={studentTypeList}
                                        name='studentType'
                                        fullWidth
                                        value={studentType}
                                        onChange={this.onChange}
                                        label='Student Type'
                                        hideSelect={true}
                                        error={errors.studentType}
                                    />
                                </Grid>
                            }
                        </Grid>
                        {isBlankPage &&
                            <Box className='header-align'>
                                <BlankPagewithIcon data={blankData} />
                            </Box>
                        }
                        {!isBlankPage &&
                            <Grid container className={classNames('header-align')}>
                                <Grid item md={12} xs={12}>
                                    <Paper>
                                        <AllMUIDataTable
                                            key={studentTransactionList.data_list}
                                            title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                            data={studentTransactionList.data_list}
                                            columns={selected_user === 'student' ? student_columns : staff_columns}
                                            options={options}
                                            onTableChange={this.getStudentTransactionList}
                                            serverSide={true}
                                            pagination={pagination}
                                            count={studentTransactionList.count}
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
export default withRouter(HostelStudentTransactionList)