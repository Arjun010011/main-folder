import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { Box, Checkbox, Tooltip, Button, ListItemText, Grid, CircularProgress } from "@material-ui/core";
import { cloneDeep } from "lodash";

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

class StandardPermission extends Component {
    constructor(props) {
        super(props)
        this.state = {
            submitDisable: false,
            standardList: [],
            loading: false,
            isApiCalled: false,
            groupReset: false
        }
    }

    componentDidUpdate = () => {
        if (this.props.tabValue === 2 && !this.state.isApiCalled) {
            this.getStandardList()
            this.setState({ isApiCalled: true })
        }
    }

    getStandardList = () => {
        const url = GET_URL.tutorialstandardpermission.api
        const params = { is_active: true, tree_item: this.props.treeId, only_standards: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.map((data) => {
                    data['read'] = false
                    data['write'] = false
                    data['allpermission'] = false
                    data['modified'] = false
                    if (data['permission_data']['permission_mode']) {
                        if (data['permission_data']['permission_mode'] == 1) {
                            data['read'] = true
                        }
                        else if (data['permission_data']['permission_mode'] == 2) {
                            data['write'] = true
                        }
                        else if (data['permission_data']['permission_mode'] == 3) {
                            data['read'] = true
                            data['write'] = true
                        }
                        else if (data['permission_data']['permission_mode'] == 4) {
                            data['read'] = true
                            data['write'] = true
                            data['allpermission'] = true
                        }
                    }
                })
                this.setState({
                    standardList: response.data.data,
                    loading: false
                })
            }
        })
    }

    updateParent = () => {
        const { standardList, groupReset } = this.state;
        const { treeId, status, tree_ids } = this.props;
        let standard_list = []
        let standard_temp = {}
        let deletable_list = []
        standardList.map((data) => {
            if (data['modified']) {
                if (data['read'] || data['write'] || data['allpermission']) {
                    standard_temp = {}
                    standard_temp['standard'] = data['id']
                    standard_temp['permission_mode'] = this.getPermissionMode(data)
                    if (data['permission_data']['id']) {
                        standard_temp['id'] = data['permission_data']['id']
                    }
                    standard_list.push(standard_temp)
                }
                if (data['permission_data']['id'] && !data['read'] && !data['write'] && !data['allpermission']) {
                    deletable_list.push(data['permission_data']['id'])
                }
            }
        })
        let post_data = {
            tree_item_list: status==='multiple'?tree_ids:[treeId],
            standard_data: standard_list,
            is_delete_existing_permission: groupReset,
            deletable_ids: deletable_list
        }
        this.props.updateToParent(post_data)
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


    updatestandardStatus = (index, type) => {
        let { standardList } = this.state;
        const standardListDup = cloneDeep(standardList);
        standardListDup[index][type] = !standardListDup[index][type];
        standardListDup[index]['modified'] = true
        if (type === 'allpermission' && standardListDup[index][type]) {
            standardListDup[index]['read'] = standardListDup[index][type]
            standardListDup[index]['write'] = standardListDup[index][type]
        }
        else if (type === 'write' && standardListDup[index][type]) {
            standardListDup[index]['read'] = standardListDup[index][type]
        }
        this.setState({
            standardList: standardListDup
        }, () => {
            this.updateParent()
        })
    };


    handleResetstandard = () => {
        Swal.fire({
            title: "Are you sure?",
            text: "You want to remove all the permission!",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Reset",
        }).then(async (result) => {
            if (result.value) {
                const { standardList } = this.state;
                const { treeId, status, tree_ids } = this.props;
                standardList.map((data) => {
                    data['read'] = false
                    data['write'] = false
                    data['allpermission'] = false
                    delete data['permission_data']['id']
                })
                let post_data = {
                    tree_item_list: status==='multiple'?tree_ids:[treeId],
                    standard_data: [],
                    is_delete_existing_permission: true,
                    deletable_ids: [],
                }
                this.props.updateToParent(post_data)
                this.setState({
                    standardList,
                    groupReset: true
                })
            }
        })
    }

    render() {
        const { standardList, loading } = this.state;
        const { user_permission } = this.props;
        if (loading) {
            return (
                <Box className='loading'>
                    <CircularProgress />
                </Box>
            )
        }
        else {
            return (
                <Grid container spacing={2}>
                    <Grid item md={8} xs={12} className='permission-set-height'>
                        <div className='tableFixHead'>
                            <table className='w-webkit-fill-available'>
                                <thead>
                                    <tr>
                                        <th className="text-bold">
                                            {`${alias_names['standard']}`}
                                        </th>
                                        <th className="text-bold text-center">
                                            Read
                                        </th>
                                        <th className="text-bold text-center">
                                            Write
                                        </th>
                                        {user_permission === 4 &&
                                            <th className="text-bold text-center">
                                                Delete
                                            </th>
                                        }
                                    </tr>
                                </thead>
                                <tbody>
                                    {standardList.map((data, index) => {
                                        const labelId = `checkbox-list-secondary-label-${data.id}`;
                                        return (
                                            <tr key={data.id}>
                                                <td className="diary-teacher-name">
                                                    <ListItemText id={labelId} primary={data.name} />
                                                </td>
                                                <td className="text-center">
                                                    <Tooltip title={data.write ? 'Read is mandatory' : ''} enterDelay={400}
                                                        enterNextDelay={400} placement='top-start'
                                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                                        <Checkbox
                                                            edge="end"
                                                            onChange={data.write ? '' : () => this.updatestandardStatus(index, "read")}
                                                            checked={data.read}
                                                            inputProps={{ "aria-labelledby": labelId }}
                                                            className={data.write ? 'cursor-not-allowed opacity-0-5 padding-0' : 'padding-0'}
                                                        />
                                                    </Tooltip>
                                                </td>
                                                <td className="text-center">
                                                    <Tooltip title={data.allpermission ? 'Write is mandatory' : ''} enterDelay={400}
                                                        enterNextDelay={400} placement='top-start'
                                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                                        <Checkbox
                                                            edge="end"
                                                            onChange={data.allpermission ? '' : () => this.updatestandardStatus(index, "write")}
                                                            checked={data.write}
                                                            inputProps={{ "aria-labelledby": labelId }}
                                                            className={data.allpermission ? 'cursor-not-allowed opacity-0-5 padding-0' : 'padding-0'}
                                                        />
                                                    </Tooltip>
                                                </td>
                                                {user_permission === 4 &&
                                                    <td className="text-center">
                                                        <Checkbox
                                                            edge="end"
                                                            onChange={() => this.updatestandardStatus(index, "allpermission")}
                                                            checked={data.allpermission}
                                                            inputProps={{ "aria-labelledby": labelId }}
                                                            className={'padding-0'}

                                                        />
                                                    </td>
                                                }
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Grid>
                    <Grid item md={4} xs={12}>
                        <Tooltip title={'Remove all the permissions'} enterDelay={400}
                            enterNextDelay={400} placement='top-start'
                            classes={{ tooltip: 'tooltip-show-data' }}>
                            <Button
                                className={'exam-mark-absent-button'}
                                onClick={this.handleResetstandard}
                            >
                                <Box>Reset</Box>
                            </Button>
                        </Tooltip>
                    </Grid>
                </Grid>
            )
        }
    }
}

export default withRouter(StandardPermission)