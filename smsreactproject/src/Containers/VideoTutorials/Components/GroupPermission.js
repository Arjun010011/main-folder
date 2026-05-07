import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';

import { Box, Checkbox, Tooltip, Button, ListItemText, Grid } from "@material-ui/core";
import { cloneDeep } from "lodash";

class GroupPermission extends Component {
    constructor(props) {
        super(props)
        this.state = {
            submitDisable: false,
            groupList: [],
            groupReset: false
        }
    }

    componentDidMount = () => {
        const { groupList } = this.props;
        groupList.map((data) => {
            data['read'] = false
            data['write'] = false
            data['allpermission'] = false
            data['modified'] = false
            if (data['permission_data']['permission_mode']) {
                if (data['permission_data']['permission_mode'] === 1) {
                    data['read'] = true
                }
                else if (data['permission_data']['permission_mode'] === 2) {
                    data['write'] = true
                }
                else if (data['permission_data']['permission_mode'] === 3) {
                    data['read'] = true
                    data['write'] = true
                }
                else if (data['permission_data']['permission_mode'] === 4) {
                    data['read'] = true
                    data['write'] = true
                    data['allpermission'] = true
                }
            }
        })
        this.setState({
            groupList: groupList
        })
    }

    handleResetGroup = () => {
        Swal.fire({
            title: "Are you sure?",
            text: "You want to remove all the permission!",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Reset",
        }).then(async (result) => {
            if (result.value) {
                const { groupList } = this.state;
                const { treeId , status, tree_ids} = this.props;
                groupList.map((data) => {
                    data['read'] = false
                    data['write'] = false
                    data['allpermission'] = false
                    delete data['permission_data']['id']
                })
                let post_data = {
                    tree_item_list: status==='multiple'?tree_ids:[treeId],
                    group_data: [],
                    is_delete_existing_permission: true,
                    deletable_ids: [],
                }
                this.props.updateToParent(post_data)
                this.setState({
                    groupList,
                    groupReset: true
                })
            }
        });
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

    updateParent = () => {
        const { groupList, groupReset } = this.state;
        const { treeId, status, tree_ids} = this.props;
        let group_list = []
        let deletable_list = []
        let group_temp = {}
        groupList.map((data) => {
            if (data['modified']) {
                if (data['read'] || data['write'] || data['allpermission']) {
                    group_temp = {}
                    group_temp['group'] = data['id']
                    group_temp['permission_mode'] = this.getPermissionMode(data)
                    if (data['permission_data']['id']) {
                        group_temp['id'] = data['permission_data']['id']
                    }
                    group_list.push(group_temp)
                }
                if (data['permission_data']['id'] && !data['read'] && !data['write'] && !data['allpermission']) {
                    deletable_list.push(data['permission_data']['id'])
                }
            }
        })
        let post_data = {
            tree_item_list: status==='multiple'?tree_ids:[treeId],
            group_data: group_list,
            is_delete_existing_permission: groupReset,
            deletable_ids: deletable_list
        }
        this.props.updateToParent(post_data)
    }

    updateGroupStatus = (index, type) => {
        let { groupList } = this.state;
        const groupListDup = cloneDeep(groupList);
        groupListDup[index][type] = !groupListDup[index][type];
        groupListDup[index]['modified'] = true
        if (type === 'allpermission' && groupListDup[index][type]) {
            groupListDup[index]['read'] = groupListDup[index][type]
            groupListDup[index]['write'] = groupListDup[index][type]
        }
        else if (type === 'write' && groupListDup[index][type]) {
            groupListDup[index]['read'] = groupListDup[index][type]
        }
        this.setState({
            groupList: groupListDup
        }, () => {
            this.updateParent()
        })
    };

    render() {
        const { groupList } = this.state;
        const { user_permission } = this.props;
        return (
            <Grid container spacing={2}>
                <Grid item md={7} xs={12}>
                    <div className='tableFixHead'>
                        <table className='w-webkit-fill-available'>
                            <thead>
                                <tr>
                                    <th className="text-bold">
                                        Group
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
                                {groupList.map((data, index) => {
                                    const labelId = `checkbox-list-secondary-label-${data.id}`;
                                    return (
                                        <tr key={data.id}>
                                            <td className=" diary-teacher-name">
                                                <ListItemText id={labelId} primary={data.name} />
                                            </td>
                                            <td className="text-center">
                                                <Tooltip title={data.write ? 'Read is mandatory' : ''} enterDelay={400}
                                                    enterNextDelay={400} placement='top-start'
                                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                                    <Checkbox
                                                        edge="end"
                                                        onChange={data.write ? '' : () => this.updateGroupStatus(index, "read")}
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
                                                        onChange={data.allpermission ? '' : () => this.updateGroupStatus(index, "write")}
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
                                                        onChange={() => this.updateGroupStatus(index, "allpermission")}
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
                            onClick={this.handleResetGroup}
                        >
                            <Box>Reset</Box>
                        </Button>
                    </Tooltip>
                </Grid>
            </Grid>
        )
    }
}

export default withRouter(GroupPermission)