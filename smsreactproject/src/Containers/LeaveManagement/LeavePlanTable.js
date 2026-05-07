import React, { Component } from 'react';
import {
    Paper, TableContainer, Table, TableHead, TableCell, TableRow, TableBody, Grid, Box, CircularProgress, Button,
    FormControl, Select, MenuItem, FormHelperText, Tooltip, TextField
} from '@material-ui/core';
import CreateIcon from '@material-ui/icons/Create';
import DeleteIcon from '@material-ui/icons/Delete';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import InfoIcon from "@material-ui/icons/Info";

import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import loadingBar from 'images/loading.gif'
import { getRequest, deleteRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL, POST_URL } from 'Includes/urls'
import { Dropdown } from 'Components/DropDown';
import { floatNumberWithTwoDecimalRegex } from 'Constants/regularExpression';
import { Actions } from 'Constants/permissions';
import { getFinancialYear, SetFinancialYear, isUserHasPermission } from 'Includes/functions';

function Alert(props) {
    return <MuiAlert elevation={6} variant='filled' {...props} />;
}


export default class LeavePlanTable extends Component {
    constructor(props) {
        super(props)

        this.state = {
            leaveTypesList: [],
            newLeaveTypeList: [],
            isEdit: false,
            year: 0,
            errors: {},
            open: false,
            alertData: '',
            loading: true,
            submitDisable: false,
            enterValue: false,
            fieldError: {}
        }
    }




    async componentDidMount() {
        if (getFinancialYear()) {
            let yearValue = getFinancialYear()
            if (yearValue !== 0) {
                let url = GET_URL.leaveplan.api
                const params = `?financial_year=${yearValue}`
                url = url + params
                getRequest(url, {}, this.props).then(response => {
                    if (response && response.status === 200) {
                        this.setState({
                            leaveTypesList: response.data.data,
                            newLeaveTypeList: [],
                            leaveType: [],
                            isEdit: false,
                            year: yearValue,
                            loading: false
                        })
                    }
                })
            }
        }

        const f_url = GET_URL.getfinancialyear.api
        const params = '?is_active=true'
        const fin_url = f_url + params
        getRequest(fin_url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    yearList: response.data.data,
                })
            }
        })

        const l_url = GET_URL.leavetype.api
        const url = l_url + params
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.map((field, index) => {
                    if (field.code === 'lop') {
                        response.data.data.splice(index, 1)
                    }
                })
                this.setState({
                    leaveTypes: response.data.data,
                    loading: false
                })
            }
        })
    }

    onChange = async (e) => {
        let { value } = e.target;
        if (value !== 0) {
            this.setState({ loadingTable: true })
            let url = GET_URL.leaveplan.api
            const params = `?financial_year=${value}`
            url = url + params
            getRequest(url, {}, this.props).then(response => {
                if (response && response.status === 200) {
                    this.setState({
                        leaveTypesList: response.data.data,
                        newLeaveTypeList: [],
                        leaveType: [],
                        isEdit: false
                    })
                }
                this.setState({
                    year: value,
                    loadingTable: false
                })
            })
            SetFinancialYear(value)
        }
    }

    formatMaxLeaneNum = (num) => {
        let number = num.split('.')
        return number[0]
    }


    onChangeMaxLeave = (e, index) => {
        const { leaveTypesList, errors } = this.state
        let name = e.target.name
        let value = e.target.value
        delete errors['max_leave_num' + index]
        leaveTypesList[index][name] = value
        this.setState({
            leaveTypesList,
            isSubmit: true,
            enterValue: false,
            errors
        })

    }
    onChangeNewMaxLeave = (e, index) => {
        const { newLeaveTypeList, year, errors } = this.state
        let name = e.target.name
        let value = e.target.value
        newLeaveTypeList[index][name] = value
        newLeaveTypeList[index].financial_year = year
        delete errors[`new_max_leave_num${index}`]
        this.setState({
            newLeaveTypeList,
            isSubmit: true,
            enterValue: false,
            errors
        })
    }

    deleteLeaveType = (id) => {
        this.setState({
            deleteDisable: true
        })
        const del_url = DEL_URL.leaveplan.api
        const url = del_url + id + '/';
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                let leave = this.state.leaveTypesList
                leave.map((data, index) => {
                    if (data.id === id) {
                        leave.splice(index, 1)
                    }
                })
                this.setState({
                    leaveTypesList: leave,
                    deleteDisable: false
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
    }

    addData = () => {
        let { newLeaveTypeList, errors } = this.state
        errors = {}
        if (newLeaveTypeList.length !== 0) {
            let test = this.validate(errors)
            if (test) {
                let list = { max_leave_num: 0, carry_forward_num: 0, leave_type: '', financial_year: '' }
                newLeaveTypeList.push(list)
            }
        }
        else {
            let list = { max_leave_num: 0, carry_forward_num: 0, leave_type: '', financial_year: '' }
            newLeaveTypeList.push(list)
        }

        this.setState({
            newLeaveTypeList,
            isEdit: true
        })
    }

    onChangeLeave = async (e, index) => {
        let { leaveType, leaveTypes, leaveTypesList, newLeaveTypeList } = this.state
        let errors = this.state.errors
        let { value } = e.target
        if (value !== 0) {
            let result = leaveTypesList.some((data) => {
                if (data.leave_type === value) {
                    return true
                }
            }
            )
            if (!result) {
                result = leaveType.some((data) => {
                    if (data === value) {
                        return true
                    }
                })
            }
            if (!result) {
                leaveTypes.some((data) => {
                    if (data.id === value) {
                        newLeaveTypeList[index].code = data.code
                        newLeaveTypeList[index].name = data.name
                        newLeaveTypeList[index].leave_type = data.id
                    }
                })
                delete errors['new' + index]
                let data = [...this.state.leaveType]
                data[index] = value
                this.setState({
                    errors: errors,
                    leaveType: data,
                    newLeaveTypeList,
                    open: false
                })
            }
            else {
                this.setState({
                    open: true,
                    alertData: 'Select New Leave Type'
                })
            }
        }
    }
    handleClose = () => {
        this.setState({
            open: false
        })
    }

    handleRemove(index) {
        let { leaveTypesList, newLeaveTypeList, errors, leaveType, isEdit } = this.state;
        newLeaveTypeList.splice(index, 1)
        delete errors['new' + index]
        leaveType.splice(index, 1)
        if (leaveTypesList.length === 0 && newLeaveTypeList.length === 0) {
            isEdit = false
        }
        this.setState({
            newLeaveTypeList,
            errors,
            leaveType,
            isEdit
        })
    }

    saveData = () => {
        let { leaveTypesList, newLeaveTypeList, year, errors, enterValue } = this.state
        errors = {}
        let test = this.validate(errors)
        if (test) {
            this.setState({ submitDisable: true })
            let FinalleaveTypesList = [...leaveTypesList, ...newLeaveTypeList]
            const url = POST_URL.leaveplan.api
            postRequest(url, FinalleaveTypesList, this.props).then(response => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Leave Plan Submitted',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.setState({ loadingTable: true })
                    let g_url = GET_URL.leaveplan.api
                    const params = `?financial_year=${year}`
                    g_url = g_url + params
                    getRequest(g_url, {}, this.props).then(response => {
                        if (response && response.status === 200) {
                            this.setState({
                                leaveTypesList: response.data.data,
                                newLeaveTypeList: [],
                                leaveType: [],
                                isEdit: false,
                                afterSubmit: true,
                                loadingTable: false
                            })
                        }
                    })
                }
                this.setState({ submitDisable: false })
            })
        }
        else {
            this.setState({
                errors
            })

        }
    }

    validate = (errors) => {
        let { newLeaveTypeList, leaveTypesList, enterValue } = this.state
        let test = true;
        let alertData = ''
        if (newLeaveTypeList.length === 0 && leaveTypesList.length === 0) {
            test = false
            alertData = 'Please add leave type'
        }
        newLeaveTypeList.map((data, index) => {
            test = floatNumberWithTwoDecimalRegex.value.test(data.max_leave_num);
            if (data.leave_type === '') {
                test = false
                alertData = 'Please Clear Errors'
                errors['new' + index] = 'select Leave Type'
            }
            else if (!parseInt(data.max_leave_num) && data.code !== 'lop') {
                test = false
                enterValue = true
                errors['new_max_leave_num' + index] = 'Enter Value'
                alertData = 'Please Enter the Value'
            }
            if (test) {
                if (parseFloat(data.max_leave_num) > 250) {
                    errors['max_leave_num' + index] = 'Cannot Exceed 250'
                }
            }
            else {
                errors['max_leave_num' + index] = 'Invalid Number Ex:- 10'
            }
        })

        leaveTypesList.map((data, index) => {
            test = floatNumberWithTwoDecimalRegex.value.test(data.max_leave_num);
            if (!parseInt(data.max_leave_num) && data.leavetype_code !== 'lop') {
                test = false
                enterValue = true
                errors['max_leave_num' + index] = 'Enter Value'
                alertData = 'Please Enter the Value'
            }
            if (test) {
                if (parseFloat(data.max_leave_num) > 250) {
                    errors['max_leave_num' + index] = 'Cannot Exceed 250'
                }
            }
            else {
                errors['max_leave_num' + index] = 'Invalid Number Ex:- 10'
            }
        })

        if (!test) {
            this.setState({
                open: true,
                enterValue,
                alertData:alertData?alertData:'Clear the error(s)',
                errors
            })
            return test
        }
        else {
            return test
        }
    }

    onBlurValidationNew = (index) => {
        const { newLeaveTypeList, errors } = this.state;
        let value = newLeaveTypeList[index]['max_leave_num']
        let test = floatNumberWithTwoDecimalRegex.value.test(value);
        if (test) {
            if (parseFloat(value) > 250) {
                errors['max_leave_num' + index] = 'Cannot Exceed 250'
            }
        }
        else {
            errors['max_leave_num' + index] = 'Invalid Number Ex:- 10'
        }
        this.setState({
            errors
        })
    }

    onBlurValidationMax = (index) => {
        const { leaveTypesList, errors } = this.state;
        let value = leaveTypesList[index]['max_leave_num']
        let test = floatNumberWithTwoDecimalRegex.value.test(value);
        if (test) {
            if (parseFloat(value) > 250) {
                errors['max_leave_num' + index] = 'Cannot Exceed 250'
            }
        }
        else {
            errors['max_leave_num' + index] = 'Invalid Number Ex:- 10.50'
        }
        this.setState({
            errors
        })
    }

    render() {
        const { leaveTypesList, loadingTable, yearList, year, isEdit, newLeaveTypeList, errors, leaveTypes, leaveType, open,
            alertData, isSubmit, submitDisable } = this.state;
        if (this.state.loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <div>
                    <Paper className='paper-background'>
                        <Grid container>
                            <Grid item md={8} xs={12} className='header-align'>
                                <Box className='heading'>
                                    Leave Plan
                                </Box>
                                <Box className='sub-heading'>
                                    Here You can give Max No Of Leaves to Each Leave Type
                                </Box>
                            </Grid>
                            <Grid item md={4} xs={12} className='header-align'>
                                <Dropdown
                                    data={yearList}
                                    name='year'
                                    fullWidth
                                    value={year}
                                    onChange={this.onChange}
                                    label='Select Financial year'
                                />
                            </Grid>
                        </Grid>
                        {loadingTable &&
                            <Box className='loading' >
                                <CircularProgress />
                            </Box>
                        }
                        <Box className={loadingTable ? 'display-none' : ''}>
                            {year !== 0 && isEdit === false &&
                                <Grid container>
                                    <Grid item md={12} xs={12} className='header-align end-flex-prop'>
                                        <Box>
                                            {isUserHasPermission('manage_leave_plan', 'update') && <Button
                                                variant='contained'
                                                onClick={e => this.setState({ isEdit: true })}
                                                className='editbutton-view'
                                            ><CreateIcon className='visibility-icon' /> {Actions.manage_leave_plan.update.label}</Button>}
                                        </Box>
                                    </Grid>
                                </Grid>

                            }
                            {year !== 0 && isEdit === true &&
                                <Box marginTop='40px' marginBottom='10px'></Box>
                            }
                            <Box className={year === 0 ? 'display-none' : 'leave-plan-table-margin'}>
                                <TableContainer>
                                    <Table size='large' aria-label='simple table' className='leave-plan-row-margin'>
                                        <TableHead>
                                            <TableRow className='leave-plan-table-header'>
                                                <TableCell className='leave-plan-header-label'>Name</TableCell>
                                                <TableCell className='leave-plan-header-label'>Code</TableCell>
                                                <TableCell className='leave-plan-header-label'> Max No Leave</TableCell>
                                                {isEdit &&
                                                    <TableCell align='center'></TableCell>
                                                }
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {leaveTypesList.map((data, index) => {
                                                return <TableRow key={index} className='leave-plan-table-data-row'>
                                                    <TableCell className='leave-plan-header-value' component='th' scope='row'>
                                                        {data.leavetype_name}
                                                    </TableCell>
                                                    <TableCell className='leave-plan-header-value'>{data.leavetype_code}</TableCell>
                                                    {
                                                        year !== 0 && isEdit === false && data.leavetype_code !== 'lop' &&
                                                        <TableCell className='leave-plan-header-value'>{data.max_leave_num}</TableCell>
                                                    }
                                                    {
                                                        year !== 0 && data.leavetype_code === 'lop' &&
                                                        <TableCell className='leave-plan-header-value'>
                                                            <Tooltip
                                                                title="Cant Edit/Delete default leave type"
                                                                placement="top-start"
                                                                arrow
                                                            >
                                                                <InfoIcon />
                                                            </Tooltip></TableCell>
                                                    }
                                                    {isEdit && data.leavetype_code !== 'lop' &&
                                                        <TableCell className='leave-plan-header-value'>
                                                            <TextField
                                                                autoComplete="Off"
                                                                type='text'
                                                                value={data.max_leave_num}
                                                                name='max_leave_num'
                                                                className={errors[`max_leave_num${index}`] ? "error-leave-number edit-input-leave-plan" : 'edit-input-leave-plan'}
                                                                maxlength='5'
                                                                onChange={e => this.onChangeMaxLeave(e, index)}
                                                                onBlur={() => this.onBlurValidationMax(index)}
                                                            />
                                                            <Box className='error-text-leave'>{errors[`max_leave_num${index}`]}</Box>
                                                        </TableCell>
                                                    }
                                                    {isEdit && data.leavetype_code !== 'lop' &&
                                                        <TableCell className='leave-plan-header-value'>
                                                            <Box onClick={e => this.deleteLeaveType(data.id)}>
                                                                <Button className='leave-plan-add-delete'>
                                                                    <DeleteIcon style={{ marginRight: '7px', fontSize: '22px' }} />
                                                                    Delete
                                                                </Button>
                                                            </Box>
                                                        </TableCell>
                                                    }
                                                </TableRow>
                                            })}
                                            {newLeaveTypeList.map((data, index) => {
                                                return <TableRow key={index} className='leave-plan-table-data-row'>
                                                    <TableCell className='leave-plan-header-value' component='th' scope='row'>
                                                        <FormControl
                                                            style={{ width: '-webkit-fill-available' }}
                                                            error={errors['new' + index] && (errors['new' + index] ? true : false)}
                                                        >
                                                            <Select name='leaveType'
                                                                value={leaveType[index] ? leaveType[index] : 0}
                                                                required={true}
                                                                onChange={e => this.onChangeLeave(e, index)}
                                                            >
                                                                <MenuItem value={0}>Please Select</MenuItem>
                                                                {leaveTypes.map((temp) => {
                                                                    return <MenuItem key={temp.id} value={temp.id}>{temp.name}</MenuItem>
                                                                })}
                                                            </Select>
                                                            {errors['new' + index] &&
                                                                <FormHelperText className='error-leave-type-drop'>{errors['new' + index]}</FormHelperText>
                                                            }
                                                        </FormControl>
                                                    </TableCell>
                                                    <TableCell className='leave-plan-header-value' component='th' scope='row'>
                                                        {data.code}
                                                    </TableCell>
                                                    <TableCell className='leave-plan-header-value' component='th' scope='row'>
                                                        <TextField
                                                            autoComplete="Off"
                                                            type='text'
                                                            value={data.max_leave_num}
                                                            name='max_leave_num'
                                                            className={errors[`new_max_leave_num${index}`] ? "error-leave-number edit-input-leave-plan" : 'edit-input-leave-plan'}
                                                            maxlength='5'
                                                            disabled={leaveType[index] ? false : true}
                                                            onChange={e => this.onChangeNewMaxLeave(e, index)}
                                                            onBlur={() => this.onBlurValidationNew(index)}

                                                        />
                                                        <Box className='error-text-leave'>{errors[`new_max_leave_num${index}`]}</Box>
                                                    </TableCell>
                                                    <TableCell className='leave-plan-header-value'>
                                                        <Box onClick={() => this.handleRemove(index)}>
                                                            <Button className='leave-plan-add-delete'>
                                                                <DeleteIcon style={{ marginRight: '7px', fontSize: '22px' }} />
                                                                Delete
                                                            </Button>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                {isUserHasPermission('manage_leave_plan', 'create') && <Button
                                    variant='contained' p={1}
                                    className='leave-plan-add-details'
                                    onClick={this.addData}
                                ><AddCircleOutlineOutlinedIcon style={{ marginRight: '10px', marginTop: '3px', fontSize: '25px', }} />
                                    Add New LeaveType Plan</Button>}
                                <Box display='flex' justifyContent='flex-end' marginTop='60px'>
                                    {(newLeaveTypeList.length !== 0 || isEdit) && isUserHasPermission('manage_leave_plan', 'create') &&
                                        <Button variant='contained'
                                            className='submit'
                                            disabled={submitDisable}
                                            onClick={this.saveData}>
                                            Submit
                                        </Button>
                                    }
                                    {!isEdit &&
                                        <Box marginBottom='50px'></Box>
                                    }
                                </Box>
                            </Box>
                            {
                                year === 0 &&
                                <BlankPagewithIcon data='Please Change the Financial year and expect the result' />
                            }
                        </Box>
                    </Paper>
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity='error'>
                            {alertData}
                        </Alert>
                    </Snackbar>
                </div>
            )
        }
    }
}
