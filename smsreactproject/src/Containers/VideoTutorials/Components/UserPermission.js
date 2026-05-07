import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { Box, CircularProgress, Checkbox, Tooltip, ListItem, ListItemIcon, Button, FormControlLabel, Switch } from "@material-ui/core";
import PropTypes from "prop-types";
import { getPaginationProps, getFullName } from "Includes/functions";
import { DEFAULT_PAGINATION_PROPS_PERPAGE_5 } from 'Constants';
import Snackbar from '@material-ui/core/Snackbar';
import { Alert } from 'Includes/functions';

class UserPermission extends Component {
    constructor(props) {
        super(props)
        this.state = {
            submitDisable: false,
            userList: { data_list: [] },
            tableUpdating: false,
            selectedIds: [],
            modified_list: [],
            loading: true,
            pagination: DEFAULT_PAGINATION_PROPS_PERPAGE_5,
            isApiCalled: false,
            updateParentData: false,
            deletable_ids: [],
            user_data: { read: false, write: false, allpermission: false, expanded: false },
            loadingText: 'loading..............................................',
            opensnackbar: false,
            alertData: '',
            groupReset: false,
            columns: [
                {
                    name: "id",// replacing id index will impact onRowChange functionality also
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        display: false
                    }
                },
                {
                    name: "first_name",
                    label: 'User Name',
                },
                {
                    name: "user_type",
                    label: 'User Type',
                },
                {
                    name: "read",
                    label: 'Read',
                    options: {
                        filter: false,
                        sort: false,
                        empty: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Tooltip title={this.props.login_user_id === parseInt(tableMeta.rowData[0]) ? 'Cannot modify creater permission' : tableMeta.rowData[4] ? 'Read is mandatory' : ''} enterDelay={400}
                                    enterNextDelay={400} placement='top-start'
                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                    <Checkbox
                                        edge="end"
                                        checked={this.props.login_user_id === parseInt(tableMeta.rowData[0]) ? true : value}
                                        defaultChecked={this.props.login_user_id === parseInt(tableMeta.rowData[0]) ? true : value}
                                        onChange={(this.props.login_user_id === parseInt(tableMeta.rowData[0]) || tableMeta.rowData[4]) ? '' : () => this.handleCheckClick(tableMeta.rowIndex, 'read')}
                                        className={(tableMeta.rowData[4] || this.props.login_user_id === parseInt(tableMeta.rowData[0])) ? 'cursor-not-allowed opacity-0-5 padding-0' : 'padding-0'}
                                    />
                                </Tooltip>
                            );
                        }
                    }
                },
                {
                    name: "write",
                    label: 'Write',
                    options: {
                        filter: false,
                        sort: false,
                        empty: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Tooltip title={this.props.login_user_id === parseInt(tableMeta.rowData[0]) ? 'Cannot modify creater permission' : tableMeta.rowData[5] ? 'Write is mandatory' : ''} enterDelay={400}
                                    enterNextDelay={400} placement='top-start'
                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                    <Checkbox
                                        edge="end"
                                        checked={this.props.login_user_id === parseInt(tableMeta.rowData[0]) ? true : value}
                                        defaultChecked={this.props.login_user_id === parseInt(tableMeta.rowData[0]) ? true : value}
                                        onChange={(tableMeta.rowData[5] || this.props.login_user_id === parseInt(tableMeta.rowData[0])) ? '' : () => this.handleCheckClick(tableMeta.rowIndex, 'write')}
                                        className={(tableMeta.rowData[5] || this.props.login_user_id === parseInt(tableMeta.rowData[0])) ? 'cursor-not-allowed opacity-0-5 padding-0' : 'padding-0'}
                                    />
                                </Tooltip>
                            );
                        }
                    }
                },
                {
                    name: "allpermission",
                    label: 'Delete',
                    options: {
                        filter: false,
                        sort: false,
                        empty: true,
                        display: this.props.user_permission == 4 ? true : false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Tooltip title={this.props.login_user_id === parseInt(tableMeta.rowData[0]) ? 'Cannot modify creater permission' : ''} enterDelay={400}
                                    enterNextDelay={400} placement='top-start'
                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                    <Checkbox
                                        checked={this.props.login_user_id === parseInt(tableMeta.rowData[0]) ? true : value}
                                        defaultChecked={this.props.login_user_id === parseInt(tableMeta.rowData[0]) ? true : value}
                                        className={this.props.login_user_id === parseInt(tableMeta.rowData[0]) ? 'cursor-not-allowed opacity-0-5 padding-0' : 'padding-0'}
                                        onClick={this.props.login_user_id === parseInt(tableMeta.rowData[0]) ? '' : () => this.handleCheckClick(tableMeta.rowIndex, 'allpermission')}
                                    />
                                </Tooltip>
                            );
                        }
                    }
                }
            ]
        }
        this.totalTimer = null
        this.currentTimer = null
        this.startTotalTimer = this.startTotalTimer.bind(this);
        this.countDownTotal = this.countDownTotal.bind(this);
    }

    handleCheckClick = (index, name) => {
        let { userList, modified_list } = this.state;
        let user_temp = [...userList.data_list]
        user_temp[index][name] = !user_temp[index][name]
        user_temp[index]['modified'] = true
        if (name === 'allpermission' && user_temp[index][name]) {
            user_temp[index]['read'] = user_temp[index][name]
            user_temp[index]['write'] = user_temp[index][name]
        }
        else if (name === 'write' && user_temp[index][name]) {
            user_temp[index]['read'] = user_temp[index][name]
        }
        userList['data_list'] = user_temp
        if (!modified_list.includes(user_temp[index]['id'])) {
            modified_list.push(user_temp[index]['id'])
        }
        this.setState({
            userList: { ...userList },
            modified_list
        })
        this.props.handleUserDataExist(true)
    }

    componentDidUpdate = () => {
        if (this.props.tabValue === 1 && !this.state.isApiCalled) {
            this.getUserList()
            this.setState({ isApiCalled: true })
        }
        if (this.state.resetState && !this.state.resetDone) {
            this.setState({
                submitDisable: false,
                userList: [],
                tableUpdating: false,
                selectedIds: [],
                modified_list: [],
                loading: true,
                pagination: DEFAULT_PAGINATION_PROPS_PERPAGE_5,
                isApiCalled: false,
                updateParentData: false,
                deletable_ids: [],
                resetDone: true
            })
        }
        if (this.props.updateParentData && !this.state.updateParentData) {
            this.rowSelectionChange()
            this.setState({ updateParentData: true })
        }
    }

    onChangeGroup = (index) => {
        let { userList } = this.state;
        if (userList[index]['id'] === 'all') {
            let enable = !userList[index]['enable']
            userList.map((data) => {
                data['enable'] = enable
            })
        }
        else {
            userList[index]['enable'] = !userList[index]['enable']
            let is_selected_all = true
            userList.map((data) => {
                if (!data['enable'] && data['id'] !== 'all') {
                    is_selected_all = false
                }
            })
            if (is_selected_all) {
                userList[0]['enable'] = true
            }
            else {
                userList[0]['enable'] = false
            }
        }
        this.setState({ userList }, () => {
            this.updateParent()
        })
    }


    getUserList = (paginationProps) => {
        let { group, pagination, selectedIds, modified_list } = this.state;
        this.setState({ tableUpdating: true })
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        const { treeId } = this.props;
        let params = {
            ...pagination_params, groups: group, is_active: true, pagination: true, tree_item: treeId
        }
        getRequest(GET_URL.tutorialuserpermission.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                const data = response.data.data;
                data.data_list.map((user) => {
                    user['read'] = false
                    user['write'] = false
                    user['allpermission'] = false
                    user['modified'] = false
                    selectedIds.map((data) => {
                        if (data['user'] === user['id']) {
                            if (data['read']) {
                                user['read'] = true
                            }
                            if (data['write']) {
                                user['write'] = true
                            }
                            if (data['allpermission']) {
                                user['allpermission'] = true
                            }
                        }
                    })
                    if (modified_list.includes(user['id'])) {
                        user['modified'] = true
                    }
                    else if (!modified_list.includes(user['id']) && user['permission_data']['permission_mode']) {
                        user['permission_id'] = user['permission_data']['id']
                        if (user['permission_data']['permission_mode'] == 1) {
                            user['read'] = true
                        }
                        else if (user['permission_data']['permission_mode'] == 3) {
                            user['write'] = true
                            user['read'] = true
                        }
                        else if (user['permission_data']['permission_mode'] == 4) {
                            user['read'] = true
                            user['write'] = true
                            user['allpermission'] = true
                        }
                    }
                    user['first_name'] = user.username;
                    user['user_type'] = user.staff ? 'Staff' : user.student ? 'Student' : 'Super Admin';
                    if (user.staff) {
                        user['first_name'] = getFullName(user.staff.first_name, user.staff.middle_name, user.staff.last_name)
                    } else if (user.student) {
                        user['first_name'] = getFullName(user.student.first_name, user.student.middle_name, user.student.last_name)
                    }
                })
                this.setState({
                    userList: data, loading: false, tableUpdating: false, selectedIds,
                    pagination: this.currentPagination,
                });
            }
        })
    }

    getPermissionMode = (data) => {
        let returnPermission = ''
        if (data['allpermission']) {
            returnPermission = 4
        }
        else if (data['read'] && data['write']) {
            returnPermission = 3
        }
        else if (data['read']) {
            returnPermission = 1
        }
        else if (data['write']) {
            returnPermission = 2
        }
        return returnPermission
    }

    countDownTotal(paginationProps) {
        this.currentTimer = this.currentTimer - 1
        if (this.currentTimer == 0) {
            clearInterval(this.totalTimer);
            // this.rowSelectionChange(paginationProps)
            this.getUserList(paginationProps)
        }
    }

    startTotalTimer(paginationProps) {
        this.currentTimer = 1
        this.totalTimer = setInterval(() => this.countDownTotal(paginationProps), 1000);

    }

    rowSelectionChange = (paginationProps, action) => {
        let post_data = {}
        let { selectedIds, userList, deletable_ids, groupReset } = this.state;
        let deleteble_temp_id = [...deletable_ids]
        let selectedTempId = [...selectedIds]
        let selectedTempIdObj = {}
        let existingData = false
        let removalIndex = []
        let remove_index = ''
        userList.data_list.map((user) => {
            selectedTempIdObj = {}
            existingData = false
            if (user['modified']) {
                selectedTempId.map((selData) => {
                    if (selData['user'] === user['id']) {
                        existingData = true
                        selData['read'] = user['read']
                        selData['write'] = user['write']
                        selData['allpermission'] = user['allpermission']
                        selData['permission_mode'] = this.getPermissionMode(user)
                        if (user['permission_id']) {
                            selData['id'] = user['permission_id']
                        }
                    }
                })
                if (!existingData && (user.read || user.write || user.allpermission)) {
                    selectedTempIdObj['user'] = user['id']
                    selectedTempIdObj['read'] = user.read
                    selectedTempIdObj['write'] = user.write
                    selectedTempIdObj['allpermission'] = user.allpermission
                    selectedTempIdObj['permission_mode'] = this.getPermissionMode(user)
                    if (user['permission_id']) {
                        selectedTempIdObj['id'] = user['permission_id']
                        if (deleteble_temp_id.includes(user['permission_id'])) {
                            remove_index = deleteble_temp_id.findIndex(data => data === user['permission_id']);
                            deleteble_temp_id.splice(remove_index, 1)
                        }
                    }
                    selectedTempId.push(selectedTempIdObj)
                }
                if (user['permission_id'] && !user.read && !user.write && !user.allpermission) {
                    deleteble_temp_id.push(user['permission_id'])
                }
            }
        })
        removalIndex = []
        selectedTempId.map((selData, sIndex) => {
            userList.data_list.map((data) => {
                if (data['id'] == selData['user'] && !data.read && !data.write && !data.allpermission) {
                    removalIndex.push(sIndex)
                }
            })
        })
        if (removalIndex.length > 0) {
            removalIndex.map((data) => {
                selectedTempId.splice(data, 1)
            })
        }
        const { treeId, status, tree_ids } = this.props;
        post_data = {
            tree_item_list: status === 'multiple' ? tree_ids : [treeId],
            user_data: selectedTempId,
            is_delete_existing_permission: groupReset,
            deletable_ids: deleteble_temp_id
        }
        if (selectedTempId.length === 0 && deleteble_temp_id.length === 0) {
            post_data = null
        }
        this.setState({
            selectedIds: [...selectedTempId],
            deletable_ids: deleteble_temp_id
        }, () => {
            this.props.updateToParent(post_data)
            if (paginationProps) {
                this.getUserList(paginationProps)
            }
        })
        return post_data
    }

    handleAllCheckClick = (name) => {
        let { user_data } = this.state;
        user_data[name] = !user_data[name]
        if (name === 'allpermission' && user_data[name]) {
            user_data['read'] = user_data[name]
            user_data['write'] = user_data[name]
        }
        else if (name === 'write' && user_data[name]) {
            user_data['read'] = user_data[name]
        }
        this.setState({
            user_data
        })
    }

    handleResetUser = () => {
        Swal.fire({
            title: "Are you sure?",
            text: "You want to remove all the permission!",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Reset",
        }).then(async (result) => {
            if (result.value) {
                const { userList } = this.state;
                const { treeId, status, tree_ids} = this.props;
                let user_temp_list = [...userList.data_list]
                user_temp_list.map((data) => {
                    data['read'] = false
                    data['write'] = false
                    data['allpermission'] = false
                    delete data['permission_data']
                    delete data['permission_id']
                })
                let post_data = {
                    tree_item_list: status === 'multiple' ? tree_ids : [treeId],
                    user_data: [],
                    is_delete_existing_permission: true,
                    deletable_ids: [],
                }
                user_temp_list['data_list'] = user_temp_list
                this.props.updateToParent(post_data)
                this.setState({
                    userList: { ...user_temp_list },
                    groupReset: true,
                    selectedIds: [],
                    modified_list: [],
                    user_data: { read: false, write: false, allpermission: false, expanded: false },
                    loading: true
                }, () => {
                    this.props.submit('dontSubmit')
                    this.getUserList()
                    // this.setState({ 
                    //     submitDisable: false,
                    //     userList: [],
                    //     tableUpdating: false,
                    //     selectedIds: [],
                    //     modified_list: [],
                    //     loading: true,
                    //     pagination: DEFAULT_PAGINATION_PROPS_PERPAGE_5,
                    //     isApiCalled: false,
                    //     updateParentData: false,
                    //     deletable_ids: [],
                    //     resetDone: true
                    // })
                })
            }
        })
    }

    handleApplyToAll = () => {

        const { userList, user_data } = this.state;
        const { treeId, status, tree_ids } = this.props;
        if (user_data.read || user_data.write || user_data.allpermission) {
            Swal.fire({
                title: "Are you sure?",
                text: "You want to apply for all users! , existing permission will be override",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Apply",
            }).then(async (result) => {
                if (result.value) {
                    let user_temp_list = [...userList.data_list]
                    user_temp_list.map((data) => {
                        data['read'] = user_data.read
                        data['write'] = user_data.write
                        data['allpermission'] = user_data.allpermission
                    })
                    let post_data = {
                        tree_item_list: status === 'multiple' ? tree_ids : [treeId],
                        user_data: [],
                        is_delete_existing_permission: true,
                        deletable_ids: [],
                        apply_to_all: {
                            permission_mode: this.getPermissionMode(user_data)
                        }
                    }
                    user_temp_list['data_list'] = user_temp_list
                    user_temp_list['count'] = userList.count
                    this.props.updateToParent(post_data)
                    this.setState({
                        userList: { ...user_temp_list },
                        groupReset: true,
                        selectedIds: [],
                        modified_list: [],
                        user_data: { read: false, write: false, allpermission: false, expanded: false }
                    }, () => {
                        this.props.submit('dontSubmit')
                    })
                }
            })
        }
        else {
            this.setState({
                opensnackbar: true,
                alertData: 'Select atleast one permission'
            })
        }
    }

    handleCloseSnackBar = () => {
        this.setState({
            opensnackbar: false,
            alertData: ''
        })
    }

    render() {
        const { userList, tableUpdating, loading, columns, pagination, user_data, opensnackbar, alertData } = this.state;
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: false,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: [5],
            selectToolbarPlacement: 'none',
            rowsPerPage: 5,
            customFilterDialogFooter: () => {
                return this.geFilterOptions();
            },
            onFilterChange: (onFilterChange, filterList, type) => {
                this.onFilterChangeHandler(type, onFilterChange);
            },
        };

        if (loading) {
            return (
                <Box className='loading'>
                    <CircularProgress />
                </Box>
            )
        }
        else {
            return (
                <div >
                    <div className='display-flex justify-content-space-between align-items-center'>
                        <div className='display-flex align-items-center'>
                            <div>
                                <FormControlLabel
                                    className='margin-left-0'
                                    control={<Switch checked={user_data.expanded}
                                        name={'Expand'}
                                        value={user_data.expanded}
                                        color="primary"
                                        onChange={() => this.handleAllCheckClick('expanded')} />}
                                    label={'Is apply to all'}
                                />
                            </div>
                            {user_data.expanded &&
                                <div>
                                    <ListItem
                                        dense
                                        className='p-l-0'
                                    >
                                        <ListItemIcon className='exam-list-item-icon align-items-center'>
                                            Read
                                            <Tooltip title={user_data.write ? 'Read is mandatory' : ''} enterDelay={400}
                                                enterNextDelay={400} placement='top-start'
                                                classes={{ tooltip: 'tooltip-show-data' }}>
                                                <Checkbox
                                                    checked={user_data.read}
                                                    defaultChecked={user_data.read}
                                                    onChange={user_data.write ? '' : () => this.handleAllCheckClick('read')}
                                                    className={user_data.write ? 'cursor-not-allowed opacity-0-5' : ''}
                                                />
                                            </Tooltip>
                                        </ListItemIcon>
                                        <ListItemIcon className='exam-list-item-icon align-items-center'>
                                            Write
                                            <Tooltip title={user_data.allpermission ? 'Write is mandatory' : ''} enterDelay={400}
                                                enterNextDelay={400} placement='top-start'
                                                classes={{ tooltip: 'tooltip-show-data' }}>
                                                <Checkbox
                                                    checked={user_data.write}
                                                    defaultChecked={user_data.write}
                                                    onChange={user_data.allpermission ? '' : () => this.handleAllCheckClick('write')}
                                                    className={user_data.allpermission ? 'cursor-not-allowed opacity-0-5' : ''}
                                                />
                                            </Tooltip>
                                        </ListItemIcon>
                                        <ListItemIcon className='exam-list-item-icon align-items-center'>
                                            Delete
                                            <Checkbox
                                                checked={user_data.allpermission}
                                                defaultChecked={user_data.allpermission}
                                                onClick={() => this.handleAllCheckClick('allpermission')}
                                            />
                                        </ListItemIcon>
                                    </ListItem>
                                </div>
                            }
                            {user_data.expanded &&
                                <div>
                                    <Tooltip title={'Apply all the permissions'} enterDelay={400}
                                        enterNextDelay={400} placement='top-start'
                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                        <Button
                                            className={'exam-enter-marks-button'}
                                            onClick={this.handleApplyToAll}
                                        >
                                            <Box>Apply to all</Box>
                                        </Button>
                                    </Tooltip>
                                </div>
                            }
                        </div>
                        <div>
                            <Tooltip title={'Remove all the permissions'} enterDelay={400}
                                enterNextDelay={400} placement='top-start'
                                classes={{ tooltip: 'tooltip-show-data' }}>
                                <Button
                                    className={'exam-mark-absent-button'}
                                    onClick={this.handleResetUser}
                                >
                                    <Box>Reset</Box>
                                </Button>
                            </Tooltip>
                        </div>
                    </div>
                    <div className='padding-top-10 permission-set-height'>
                        <AllMUIDataTable
                            key={userList.data_list}
                            data={userList.data_list}
                            columns={columns}
                            options={options}
                            onTableChange={this.rowSelectionChange}
                            serverSide={true}
                            pagination={pagination}
                            count={userList.count}
                            title=''
                        />
                    </div>
                    <Snackbar
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        open={opensnackbar}
                        autoHideDuration={10000}
                        onClose={this.handleCloseSnackBar}
                    >
                        <Alert onClose={this.handleCloseSnackBar} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </div>
            )
        }
    }
}

export default withRouter(UserPermission)