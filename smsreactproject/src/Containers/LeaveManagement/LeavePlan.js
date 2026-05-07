import React, { Component } from 'react'
import { Grid, FormControl,  MenuItem, Select, Paper, Box, Button,  FormHelperText, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2'
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import loadingBar from '../../images/loading.gif'
import CreateIcon from '@material-ui/icons/Create';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import DeleteIcon from '@material-ui/icons/Delete';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';


import { getFinancialYear, SetFinancialYear, isUserHasPermission } from 'Includes/functions';
import { getRequest, deleteRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL, POST_URL } from 'Includes/urls'
import { Dropdown } from 'Components/DropDown';
import { Actions } from 'Constants/permissions';

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class LeavePlan extends Component {
    state = {
        year: 0,
        yearList: [],
        leaveTypesList: [],
        leaveTypes: [],
        newLeaveTypeList: [],
        isEdit: false,
        leaveType: [],
        loading: true,
        isSubmit: false,
        afterSubmit: false,
        deleteDisable: false,
        errors: {},
        submitDisable: false,
        loadingTable: false,
        alertData: '',
        open: false,
        submitSuccess: false
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
                            leaveType: [0],
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
                this.setState({
                    leaveTypes: response.data.data,
                    loading: false
                })
            }
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

    addData = () => {
        let { newLeaveTypeList } = this.state
        let list = { max_leave_num: '0', carry_forward_num: '0.00', leave_type: '', financial_year: '' }
        newLeaveTypeList.push(list)
        this.setState({
            newLeaveTypeList,
            isEdit: true
        })


    }

    onChangeMaxLeave = (e, index) => {
        const { leaveTypesList } = this.state
        var regex = /^[0-9_ ]{0,500}$/;
        let name = e.target.name
        let value = e.target.value
        let test = regex.test(e.target.value);
        if (test && (value <= 250)) {
            leaveTypesList[index][name] = value
            this.setState({
                leaveTypesList,
                isSubmit: true

            })
        }
    }
    onChangeNewMaxLeave = (e, index) => {
        const { newLeaveTypeList, year } = this.state
        let name = e.target.name
        let value = e.target.value
        var regex = /^[0-9_ ]{0,500}$/;
        let test = regex.test(e.target.value);
        if (test && (value <= 250)) {
            newLeaveTypeList[index][name] = value
            newLeaveTypeList[index].financial_year = year
            this.setState({
                newLeaveTypeList,
                isSubmit: true
            })
        }
    }

    saveData = async () => {
        let { leaveTypesList, newLeaveTypeList, year, errors, submitSuccess } = this.state
        this.validate(errors)
        if ((Object.keys(errors).length === 0)) {
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

    validate(errors) {
        let { newLeaveTypeList } = this.state
        newLeaveTypeList.map((data, index) => {
            if (data.leave_type === '') {
                errors['new' + index] = 'select Leave Type'
            }
        })
    }
    deleteLeaveType = async (id) => {
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
    handleRemove(i) {
        let newLeaveTypeList = this.state.newLeaveTypeList
        let errors = this.state.errors
        newLeaveTypeList.splice(i, 1)
        delete errors['new' + i]
        this.setState({
            newLeaveTypeList: newLeaveTypeList,
            errors: errors
        })
    }

    formatMaxLeaneNum = (num) => {
        let number = num.split('.')
        return number[0]
    }
    render() {
        const { errors, alertData, open, loadingTable, submitDisable, year, yearList, leaveTypesList, newLeaveTypeList, leaveTypes, leaveType, isSubmit, afterSubmit } = this.state
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
                            <Grid item md={4} xs={12} className='margin-top-10'>
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
                            {year !== 0 && this.state.isEdit === false &&
                                <Grid container>
                                    <Grid item md={12} xs={12} className='header-align end-flex-prop'>
                                        <Box>
                                            {isUserHasPermission('manage_leave_plan', 'update') && <Button
                                                variant="contained"
                                                onClick={e => this.setState({ isEdit: true })}
                                                className='editbutton-view'
                                            ><CreateIcon className='visibility-icon' /> {Actions.manage_leave_plan.update.label}</Button>}
                                        </Box>
                                    </Grid>
                                </Grid>

                            }
                            {year !== 0 && this.state.isEdit === true &&
                                <Box marginTop='40px' marginBottom='10px'></Box>
                            }
                            <Box className={year === 0 ? 'display-none' : 'margin-top-20'}>
                                <Paper className='paper-head-leave-plan'>
                                    <Grid container>
                                        <Grid item md={3} xs={4}>
                                            <Box className='leave-plan-heading-name'>
                                                Name
                                                </Box>
                                        </Grid>
                                        <Grid item md={3} xs={4}>
                                            <Box className='leave-plan-heading-name'>
                                                Code
                                                </Box>
                                        </Grid>
                                        <Grid item md={4} xs={4}>
                                            <Box className='leave-plan-heading-name'>
                                                Max No Leave
                                                </Box>
                                        </Grid>
                                        {/*   <Grid item md={3} xs={2}>
                                                <Box className='leave-plan-heading-name'>
                                                    Max CarryForward
                                                    </Grid>
                                                </Box> */}
                                    </Grid>
                                </Paper>

                                {leaveTypesList.map((data, index) => {
                                    return <Paper key={index} className='paper-leave-plan'>
                                        <Box key={index} >
                                            <Grid container>
                                                <Grid item md={3} xs={4} >
                                                    <Box className='leave-plan-heading-value'>
                                                        {data.leavetype_name}
                                                    </Box>

                                                </Grid>
                                                <Grid item md={3} xs={4}>
                                                    <Box className='leave-plan-heading-value'>
                                                        {data.leavetype_code}
                                                    </Box>
                                                </Grid>
                                                {
                                                    year !== 0 && this.state.isEdit === false &&
                                                    <Grid item md={4} xs={4} >
                                                        <Box className='leave-plan-heading-value'>
                                                            {this.formatMaxLeaneNum(data.max_leave_num)}
                                                        </Box>

                                                    </Grid>
                                                }
                                                {this.state.isEdit === true &&
                                                    <Grid item md={4} xs={4} style={{ textAlign: 'center' }}>
                                                        <input
                                                            type='text'
                                                            value={this.formatMaxLeaneNum(data.max_leave_num)}
                                                            name='max_leave_num'
                                                            className='edit-input-leave-plan'
                                                            maxlength="3"
                                                            onChange={e => this.onChangeMaxLeave(e, index)

                                                            }
                                                        />
                                                    </Grid>
                                                }
                                                { /* 
                                                 {this.state.isEdit === true &&
                                                        <Grid item md={2} xs={12}>
                                                            <input
                                                                type='text'
                                                                value={data.carry_forward_num}
                                                                name='carry_forward_num'
                                                                className='edit-input-leave-plan'
                                                                onChange={e => this.onChangeMaxLeave(e, index)
                                                                }
                                                            />
                                                        </Grid>
                                                    } */}
                                                {this.state.isEdit === true &&
                                                    <Grid item md={2} xs={12} className='leave-plan-delete-position'>
                                                        <Box onClick={e => this.deleteLeaveType(data.id)}>
                                                            <Button className='leave-plan-add-delete'>
                                                                <DeleteIcon style={{ marginRight: '7px', fontSize: '22px' }} />
                                                            Delete
                                                            </Button>
                                                        </Box>
                                                    </Grid>
                                                }
                                            </Grid>
                                        </Box>
                                    </Paper>
                                })}
                                {newLeaveTypeList.map((data, index) => {
                                    return <Box>
                                        <Paper key={index} className='paper-leave-plan'>
                                            <Box p={1} key={index} >
                                                <Grid container>
                                                    <Grid item md={3} xs={4} style={{ alignSelf: 'flex-end', textAlign: 'center' }}>
                                                        <FormControl
                                                            style={{ marginTop: '1rem' }}
                                                            error={errors["new" + index] && (errors["new" + index] ? true : false)}
                                                        >
                                                            <Select name='leaveType'
                                                                value={leaveType[index] ? leaveType[index] : leaveType[0]}
                                                                required={true}
                                                                onChange={e => this.onChangeLeave(e, index)}
                                                            >
                                                                <MenuItem value={0}>Please Select</MenuItem>
                                                                {leaveTypes.map((temp) => {
                                                                    return <MenuItem key={temp.id} value={temp.id}>{temp.name}</MenuItem>
                                                                })}
                                                            </Select>
                                                            {errors["new" + index] &&
                                                                <FormHelperText>{errors["new" + index]}</FormHelperText>
                                                            }
                                                        </FormControl>
                                                    </Grid>
                                                    <Grid item md={3} xs={4}>
                                                        <Box className='leave-plan-heading-value'>
                                                            {data.code}
                                                        </Box>
                                                    </Grid>
                                                    <Grid item md={4} xs={3} style={{ textAlign: 'center' }}>
                                                        <input
                                                            type='text'
                                                            value={data.max_leave_num}
                                                            name='max_leave_num'
                                                            className='edit-input-leave-plan'
                                                            maxlength="3"
                                                            disabled={leaveType[index] ? false : true}
                                                            onChange={e => this.onChangeNewMaxLeave(e, index)
                                                            }

                                                        />
                                                    </Grid>
                                                    {/*  <Grid item md={2} xs={3} >
                                                        <input
                                                            type='text'
                                                            value={data.carry_forward_num}
                                                            name='carry_forward_num'
                                                            className='edit-input-leave-plan'
                                                            disabled={leaveType[index] ? false : true}
                                                            onChange={e => this.onChangeNewMaxLeave(e, index)
                                                            }
                                                        />
                                                        </Grid> */}
                                                    <Box style={{
                                                        marginLeft: 'auto',
                                                        alignSelf: 'flex-end',
                                                    }}>

                                                        {/*  <HighlightOffIcon className="cross-btn-nominee" onClick={() => this.handleRemove(index)}
                                                    style={{ position: 'relative', "top": "-10px", "right": "-10px" }} /> */}
                                                        <Button className='leave-plan-add-delete' onClick={() => this.handleRemove(index)}>
                                                            <DeleteIcon style={{ marginRight: '7px', fontSize: '22px' }} />Delete</Button>
                                                    </Box>
                                                </Grid>
                                            </Box>
                                        </Paper>
                                    </Box>
                                })}
                                {isUserHasPermission('manage_leave_plan', 'create') && <Button
                                    variant="contained" p={1}
                                    className='leave-plan-add-details'
                                    onClick={this.addData}
                                ><AddCircleOutlineOutlinedIcon style={{ marginRight: '10px', marginTop: '3px', fontSize: '25px', }} /> Add New LeaveType Plan</Button>}

                                <Box display='flex' justifyContent='flex-end' marginTop='60px'>
                                    {(this.state.newLeaveTypeList.length !== 0 || this.state.isEdit) && isUserHasPermission('manage_leave_plan', 'create') &&
                                        <Button variant="contained"
                                            className='submit'
                                            disabled={(isSubmit ? false : true) || (submitDisable)}
                                            onClick={this.saveData}>
                                            Submit
                                    </Button>
                                    }
                                    {!this.state.isEdit &&
                                        <Box marginBottom='50px'></Box>
                                    }
                                </Box>
                            </Box>
                            {
                                year === 0 &&
                                <BlankPagewithIcon data="Please Change the Financial year and expect the result" />
                            }
                        </Box>
                    </Paper>
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar> 
                </div>
            )
        }
    }
}







export default LeavePlan