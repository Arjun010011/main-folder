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
        label: 'Name', regex: nameWithQuoteRegex, autoFocus: true, name: 'name', md: 12, className: 'width-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 30, gridClassName: "margin-vertical-20",
    },
    {
        label: 'Code', regex: nameAndNumberAndHyphenRegex, autoFocus: false, name: 'code', md: 12, className: 'width-100', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 30, gridClassName: "margin-vertical-20",
    }
]
class ManageProgramSpecificOutcomeView extends Component {
    constructor() {
        super()
        this.permission = updatePermissions('programspecificoutcome', ['update', 'delete']);
        this.state = {
            programspecificList: [],
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
                    name: "name",
                    label: "Program Specific Name",
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box display='flex'>
                                    <Box>
                                        {value}
                                    </Box>
                                </Box>
                            )
                        }
                    }
                },
                {
                    name: "code",
                    label: 'Code',
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: 'Actions',
                    label: <FormattedMessage {...commonMessages.actions} />,
                    options: {
                        display: true,
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <ActionColumn
                                    id={tableMeta.rowData[0]}
                                    fieldValues={this.getFieldValue([tableMeta.rowData[1],tableMeta.rowData[2]])}
                                    label="Update Program Specific Outcome"
                                    fieldDetails={fieldDetails_global}
                                    updateUrl={PUT_URL.programspecificoutcome.api}
                                    updatePostFormat={this.updatePostFormat}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.programspecificoutcome.api}
                                    deleteType={this.deleteType}
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

    getFieldValue = (fieldValues) => {
        let returnValue = fieldValues

        return returnValue
    }
    getFieldValue(name, code) {
        let fieldValues = [];
        fieldValues.push(name);
        fieldValues.push(code);
        return fieldValues
    }

    updatePostFormat = (newData) => {
        let payload = {
            name: newData.name,
            code: newData?.code ?? "",
        }
        return payload
    }

    componentDidMount = () => {
        this.getProgramSpecificList()
        let fieldTemp = []
        fieldTemp = cloneDeep(fieldDetails_global)
        fieldTemp.splice(0, 1)
        this.setState({
            fieldDetails: [...fieldTemp],
            optionsLocal: { ...options }
        })
    }

    getProgramSpecificList = () => {
        const url = GET_URL.programspecificoutcome.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let programspecificList = []
                response.data.data.map((field) => {
                    programspecificList.push(field)
                })
                this.setState({
                    programspecificList,
                    loading: false
                })

            }
        })
    }
    updatePermissions = (name) => {
            let test = true
            const hasEditPermission = isUserHasPermission('programspecificoutcome', 'update')
            const hasDeletePermission = isUserHasPermission('programspecificoutcome', 'delete')
            let permissions = [];
            let enabledActions = []
            if (hasEditPermission) {
                enabledActions.push('edit')
                permissions.push('programspecificoutcome');
            }
            if (hasDeletePermission) {
                enabledActions.push('delete')
                permissions.push('programspecificoutcome');
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
                    permissions,
                    columns: this.state.columns
                })
            }
        }

    updateType = (newData, id) => {
        let course = this.state.programspecificList;
        for (const data of course) {
            if (data.id === id) {
                data.name = newData.name;
                data.code = newData.code;
                break;
            }
        }
        this.setState({
            programspecificList: [...course],
            columns: this.state.columns
        })
        return true
    }

    deleteType = async (id) => {
        let course = this.state.programspecificList
        console.log(course)
        course.map((data, index) => {
            if (data.id === id) {
                course.splice(index, 1)
            }
        })
        this.setState({
            programspecificList: course
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
        const { loading, programspecificList, columns, tableUpdating, optionsLocal } = this.state
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
                                   Program Specific Outcome
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {
                                    // isUserHasPermission('courseoutcome', 'create') && 
                                    <Button
                                        variant="contained"
                                        component={Link} to={Actions.programspecificoutcomedata.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.programspecificoutcomedata.create.label}</Button>}
                                </Box>

                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={8} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={programspecificList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={programspecificList}
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
export default ManageProgramSpecificOutcomeView