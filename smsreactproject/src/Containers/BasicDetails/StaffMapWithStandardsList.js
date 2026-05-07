import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, Tooltip } from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';

import ActionColumn from 'Components/ActionColumnNew';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls';
import { nameAndNumberRegex } from 'Constants/regularExpression';
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getPaginationProps, updatePermissions } from 'Includes/functions';
import { options, DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import messages from './messages';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';
import { cloneDeep } from 'lodash';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

const fieldDetails_global = [
    {
        selectLabel: 'Select Standard', name: 'standards', md: 12, className: 'width-100', required: true,
        id: 'outlined-textarea', default: '', type: 'multiselect', allSelected: 'All branches are selected',
        gridClassName: "margin-vertical-20", list: []
    },
]
class StaffWithStandardsList extends Component {
    constructor() {
        super()
        this.permission = updatePermissions('assign_standard', ['update']);
        this.branch_list = (localStorage.getItem("branches") && localStorage.getItem("branches") !== 'undefined') ? JSON.parse(localStorage.getItem("branches")) : [];
        this.state = {
            standardList: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            isBranchExist: false,
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            standardListLoaded: false,
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        display: false
                    }
                },
                {
                    name: "name",
                    label: <FormattedMessage {...commonMessages.staffName} />,
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "standard_list",
                    label: <FormattedMessage {...commonMessages.standards} />,
                    options: {
                        filter: false,
                        sort: false,
                        display: false
                    }
                },
                {
                    name: "group_names",
                    label: 'Group',
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "standard_names",
                    label: `${alias_names['standard']}(s)`,
                    options: {
                        filter: true,
                        sort: true,
                        // display: this.branch_list.length > 0,
                    }
                },
                {
                    name: 'Actions',
                    label: <FormattedMessage {...commonMessages.actions} />,
                    options: {
                        display: this.permission.length > 0,
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <ActionColumn
                                    id={tableMeta.rowData[0]}
                                    fieldValues={[tableMeta.rowData[2]]}
                                    label={`Update standards for ${tableMeta.rowData[1]}`}
                                    fieldDetails={this.state.fieldDetails}
                                    postUrl={PUT_URL.staff_standard_mapping.api}
                                    updatePostFormat={this.updatePostFormat}
                                    getData={this.getShiftList}
                                    isGetData={true}
                                    updateType={this.updateType}
                                    baseClassName='action-basic-detail-width'
                                    enabledActions={this.permission}
                                />
                            </div>
                            );
                        }
                    }
                }

            ]
        }
    }


    getShiftList = async () => {
        let { standardListLoaded, fieldDetails } = this.state;
        if (!standardListLoaded) {
            const url = GET_URL.getstandard.api
            const params = { is_active: true }
            await getRequest(url, params, this.props).then(response => {
                if (response && response.status === 200) {
                    let column_temp = cloneDeep(this.state.columns)
                    fieldDetails[0]['list'] = response.data.data
                    this.setState({
                        standard_list: response.data.data,
                        fieldDetails: [...fieldDetails],
                        columns: [...column_temp],
                        standardListLoaded: true
                    })
                }
                return true
            })
        }
        else {
            return true
        }
    }

    updatePostFormat = (newData, id) => {
        let standards = []
        newData.standards.map((data) => {
            standards.push(data['id'])
        })
        let payload = {
            standards: standards,
            staff: id
        }
        return [payload]
    }

    componentDidMount = () => {
        this.getStaffStandardMap()
        let fieldTemp = []
        fieldTemp = cloneDeep(fieldDetails_global)
        this.setState({
            fieldDetails: [...fieldTemp],
            branch_list: this.branch_list,
            isBranchExist: this.branch_list.length > 0
        })
    }

    getStaffStandardMap = (paginationProps) => {
        let { pagination } = this.state;
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = { ...pagination_params, is_active: true, mapped_type: 'only_mapped' }
        const url = GET_URL.staff_standard_mapping.api
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let standard_names = []
                let temp = {}
                response.data.data.data_list.map((field) => {
                    standard_names = []
                    field['standard_list'] = []
                    field.staff_standard_mapping_staff.map((data) => {
                        temp = {}
                        temp['id'] = data['standard']
                        temp['name'] = data['standard_name']
                        field['standard_list'].push(temp)
                        standard_names.push(data['standard_name'])
                    })
                    field['standard_names'] = standard_names.toString()
                    field['group_names'] = []
                    field['group_names'] = field.group_name.toString()
                })
                this.setState({
                    standardList: response.data.data,
                    loading: false,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                })

            }
        })
    }

    updateType = (newData, id) => {
        let {standardList}=this.state;
        let subject = cloneDeep(standardList.data_list);
        let standard_names = []
        for (const data of subject) {
            if (data.id === id) {
                data.standard_list=[]
                data.standard_names=[]
                data.standard_list = newData.standards;
                newData.standards.map((data)=>{
                    standard_names.push(data.name)
                })
                data.standard_names = standard_names.toString();
                break;
            }
        }
        standardList.data_list=[...subject]
        this.setState({ 
            standardList
        })
        return true
    }

    render() {
        const { loading, standardList, columns, tableUpdating, pagination } = this.state
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
                                    {Actions.assign_standard.view.label}
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('assign_standard', 'create') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.assign_standard.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.assign_standard.create.label}</Button>}
                                </Box>

                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={12} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={standardList.data_list}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={standardList.data_list}
                                        columns={columns}
                                        options={options}
                                        onTableChange={this.getStaffStandardMap}
                                        serverSide={true}
                                        pagination={pagination}
                                        count={standardList.count}
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
export default StaffWithStandardsList
