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
import { nameWithQuoteRegex, nameAndNumberAndHyphenRegex } from 'Constants/regularExpression';
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getSettingValue, updatePermissions } from 'Includes/functions';
import { options } from 'Constants';
import messages from './messages';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';
import { cloneDeep } from 'lodash';

const fieldDetails_global = [
    {
        selectLabel: 'Select Branch', name: 'branch', md: 12, className: 'width-100', required: true,
        id: 'outlined-textarea', default: '', type: 'multiselect', allSelected: 'All branches are selected',
        gridClassName: "margin-vertical-20", list: []
    },
    {
        label: 'Part Type', regex: null, name: 'subject_part_type', md: 12, className: 'width-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'dropDown', maxLength: 25, gridClassName: "margin-vertical-20",
        list: []
    },
    {
        label: 'Name', regex: nameWithQuoteRegex, autoFocus: true, name: 'name', md: 12, className: 'width-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 30, gridClassName: "margin-vertical-20",
    },
    {
        label: 'Code', regex: nameAndNumberAndHyphenRegex, autoFocus: false, name: 'subject_code', md: 12, className: 'width-100', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 30, gridClassName: "margin-vertical-20",
    },
    {
        label: <FormattedMessage {...commonMessages.isLanguage} />, regex: null, autoFocus: false, name: 'is_language', md: 12, className: 'width-100', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'checkbox', maxLength: 20, gridClassName: "margin-vertical-20",
        hide: parseInt(getSettingValue('number_of_language')) == 0 ? true : false
    },
]
class ManageSubjectView extends Component {
    constructor() {
        super()
        this.permission = updatePermissions('subjects', ['update', 'delete']);
        this.branch_list = (localStorage.getItem("branches") && localStorage.getItem("branches") !== 'undefined') ? JSON.parse(localStorage.getItem("branches")) : [];
        this.state = {
            subjectList: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            isBranchExist: false,
            optionsLocal: {},
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
                    name: "subject_part_type",
                    label: 'Part',
                    options: {
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        display: false
                    }
                },
                {
                    name: "subject_part_type_name",
                    label: 'Part Type',
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "name",
                    label: <FormattedMessage {...commonMessages.subjectName} />,
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box display='flex'>
                                    <Box>
                                        {value}
                                    </Box>
                                    <Tooltip title={tableMeta.rowData[5] === true ? 'Language' : ''} enterDelay={400}
                                        enterNextDelay={400} placement='top-start'
                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                        <Box className={tableMeta.rowData[5] === true ? 'subject-list-is-language' : ''}>
                                        </Box>
                                    </Tooltip>
                                </Box>
                            )
                        }
                    }
                },
                {
                    name: "subject_code",
                    label: 'Code',
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "is_language",
                    label: <FormattedMessage {...commonMessages.isLanguage} />,
                    options: {
                        filter: false,
                        sort: false,
                        display: false
                    }
                },
                {
                    name: "branch_list",
                    label: <FormattedMessage {...commonMessages.isLanguage} />,
                    options: {
                        filter: false,
                        sort: false,
                        display: false
                    }
                },
                {
                    name: "branch_names",
                    label: 'Branche(s)',
                    options: {
                        filter: true,
                        sort: true,
                        display: this.branch_list.length > 0,
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
                                    fieldValues={this.getFieldValue([tableMeta.rowData[6], tableMeta.rowData[1], tableMeta.rowData[3], tableMeta.rowData[4], tableMeta.rowData[5]])}
                                    label={<FormattedMessage {...messages.editSubject} />}
                                    fieldDetails={this.state.fieldDetails}
                                    updateUrl={PUT_URL.subject.api}
                                    updatePostFormat={this.updatePostFormat}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.subject.api}
                                    deleteType={this.deleteType}
                                    baseClassName='action-basic-detail-width'
                                    enabledActions={this.permission}
                                    getData={this.getPartTypeList}
                                    isGetData={true}
                                />
                            </div> 
                            );
                        }
                    }
                }

            ]
        }
    }
 
    getPartTypeList = async () => {
        let { standardListLoaded, fieldDetails, isBranchExist } = this.state;
        if (!standardListLoaded) {
            const url = GET_URL.subjectparttype.api
            const params = { is_active: true }
            await getRequest(url, params, this.props).then(response => {
                if (response && response.status === 200) {
                    let column_temp = cloneDeep(this.state.columns)
                    if(isBranchExist){
                        fieldDetails[1]['list'] = response.data.data
                    }
                    else{
                        fieldDetails[0]['list'] = response.data.data
                    }
                    this.setState({
                        part_type_list: response.data.data,
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

    getFieldValue = (fieldValues) => {
        let returnValue = fieldValues
        if (this.branch_list.length === 0) {
            returnValue.splice(0, 1)
        }
        return returnValue
    }

    updatePostFormat = (newData) => {
        let branches = []
        if (this.state.isBranchExist) {
            newData.branch.map((data) => {
                branches.push(data['id'])
            })
        }
        let payload = {
            name: newData.name,
            is_language: newData?.is_language ?? false,
            subject_code: newData?.subject_code ?? "",
            subject_part_type: newData.subject_part_type,
            branches: branches
        }
        return payload
    }

    componentDidMount = () => {
        this.getSubjectList()
        let fieldTemp = []
        let branch_temp_list = []
        let branch_temp = {}
        if (this.branch_list.length > 0) {
            this.branch_list.map((data) => {
                branch_temp = {}
                branch_temp['id'] = data['id']
                branch_temp['name'] = data['name']
                branch_temp_list.push(branch_temp)
            })
            this.branch_list = cloneDeep(branch_temp_list)
            fieldTemp = cloneDeep(fieldDetails_global)
            fieldTemp[0]['list'] = branch_temp_list
        }
        else {
            fieldTemp = cloneDeep(fieldDetails_global)
            fieldTemp.splice(0, 1)
        }
        this.setState({
            fieldDetails: [...fieldTemp],
            branch_list: this.branch_list,
            isBranchExist: this.branch_list.length > 0,
            optionsLocal: { ...options }
        })
    }

    getSubjectList = () => {
        const url = GET_URL.subject.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let subjectList = []
                let temp = {}
                let branch_names = []
                response.data.data.map((field) => {
                    branch_names = []
                    field['branch_list'] = []
                    if (field.is_language) {
                        if (field.sequence === 1) {
                            subjectList.push(field)
                        }
                    }
                    else {
                        subjectList.push(field)
                    }
                    if (field.branches.length > 0) {
                        field.branches.map((data) => {
                            if (data.branch) {
                                temp = {}
                                temp['id'] = data['branch']
                                temp['name'] = data['branch__name']
                                field['branch_list'].push(temp)
                                branch_names.push(data['branch__name'])
                            }
                        })
                    }
                    field['branch_names'] = branch_names.toString()
                })
                this.setState({
                    subjectList,
                    loading: false
                })

            }
        })
    }

    updateType = (newData, id) => {
        // let subject = this.state.subjectList;
        // let branch_names=[]
        // if(this.state.isBranchExist){
        //     newData.branch.map((data)=>{
        //         branch_names.push(data['name'])
        //     })
        // }
        // for (const data of subject) {
        //     if (data.id === id) {
        //         data.name = newData.name;
        //         data.is_language = newData.is_language;
        //         data.subject_code = newData.subject_code;
        //         data.branch_list = newData.branch;
        //         data.branch_names = branch_names.toString();
        //         break;
        //     }
        // }
        // this.setState({
        //     subjectList: [...subject],
        // })
        this.getSubjectList()
        return true
    }

    deleteType = async (id) => {
        let subject = this.state.subjectList
        subject.map((data, index) => {
            if (data.id === id) {
                subject.splice(index, 1)
            }
        })
        this.setState({
            subjectList: subject
        })
    }

    onTableChange = (tableState) => {
        let newOptions={...this.state.optionsLocal}
        newOptions['searchText']=tableState['searchText']
        this.setState({
            optionsLocal: { ...newOptions }
        })
    }

    render() {
        const { loading, subjectList, columns, tableUpdating, optionsLocal } = this.state
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
                                    <FormattedMessage {...commonMessages.subjects} />
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('subjects', 'create') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.subjects.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.subjects.create.label}</Button>}
                                </Box>

                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={8} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={subjectList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={subjectList}
                                        columns={columns}
                                        options={optionsLocal}
                                        onTableChange={this.onTableChange}
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
export default ManageSubjectView
