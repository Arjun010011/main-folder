import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';

import ActionColumn from 'Components/ActionColumnNew'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest, putRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission } from 'Includes/functions';
import { options } from 'Constants';

const fieldDetails = [
    { label: 'Exam Name', regex: null, name: 'name', md: 12, className: 'width-100', required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text' },
    { label: 'Exam Code', regex: null, name: 'code', md: 12, className: 'width-100', required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text' },
]

class ViewExamType extends Component {
    constructor() {
        super()
        this.state = {
            examTypeList: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: true,
                        sort: true,
                        display: false
                    }
                },
                {
                    name: "name",
                    label: "Exam Type",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "code",
                    label: "Code",
                    options: {
                        filter: true,
                        sort: true,
                        display: true
                    }
                },
                {
                    name: 'Action',
                    label: 'Action',
                    options: {
                        display: this.updatePermissions('display'),
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <ActionColumn
                                    id={tableMeta.rowData[0]}
                                    fieldValues={this.fieldValues(tableMeta.rowData[1], tableMeta.rowData[2])}
                                    label='Please Update Exam Type Details'
                                    fieldDetails={fieldDetails}
                                    updateUrl={PUT_URL.examtypes.api}
                                    updatePostFormat={this.updatePostFormat}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.examtypes.api}
                                    deleteType={this.deleteType}
                                    baseClassName='action-basic-detail-width'
                                    enabledActions={this.state.enabledActions}
                                />
                            </div>
                            );
                        }
                    }
                }

            ]
        }
    }


    fieldValues(name, code) {
        let fieldValues = [];
        fieldValues.push(name);
        fieldValues.push(code);
        return fieldValues
    }

    updatePostFormat = (newData) => {
        let payload = {
            name: newData.name,
            code: newData.code,
            exam_type: 'Exam'
        }
        return payload
    }


    updatePermissions = (name) => {
        let test = true
        const hasEditPermission = isUserHasPermission('exam_type', 'update')
        const hasDeletePermission = isUserHasPermission('exam_type', 'delete')
        let permissions = [];
        let enabledActions = []
        if (hasEditPermission) {
            enabledActions.push('edit')
            permissions.push('exam_type');
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
            permissions.push('exam_type');
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

    componentDidMount = () => {
        this.getExamTypeList()
        this.updatePermissions('actions');
        this.setState({
            options: options
        })
    }


    updateType = (newData, id) => {
        this.setState({ tableUpdating: true })
        let examType = this.state.examTypeList
        examType.map((data, index) => {
            if (data.id === id) {
                examType[index].name = newData.name
                examType[index].code = newData.code
            }
        })
        this.setState({
            examTypeList: [...examType],
            tableUpdating: false,
            columns: this.state.columns
        })
        return true
    }


    getExamTypeList = () => {
        const url = GET_URL.examtypes.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    examTypeList: response.data.data,
                    loading: false
                })

            }
        })
    }

    deleteType = async (id) => {
        let examType = this.state.examTypeList
        examType.map((data, index) => {
            if (data.id === id) {
                examType.splice(index, 1)
            }
        })
        this.setState({
            examTypeList: examType
        })
    }

    render() {
        const { loading, examTypeList, columns, options, tableUpdating } = this.state
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
                                    Exam Type
                                </Box>
                                <Box className='sub-heading'>
                                    For Example: Internal 1, Internal 2 and Sem 1 so on
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('exam_type', 'create') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.exam_type.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.exam_type.create.label}</Button>}
                                </Box>

                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={8}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={examTypeList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={examTypeList}
                                        columns={columns}
                                        options={options}
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
export default ViewExamType




