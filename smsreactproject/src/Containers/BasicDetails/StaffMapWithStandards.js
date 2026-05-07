import React, { Component } from 'react'
import {
    Paper, FormHelperText, Box, CircularProgress, Grid, Button, ListItemText, withStyles, FormControl, InputLabel, MenuItem, Select
} from '@material-ui/core';
import Swal from 'sweetalert2'
import classNames from 'classnames'
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";

import { Link, withRouter } from 'react-router-dom';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { Actions } from 'Constants/permissions';
import { getCommaSeperatedArrayOfObjects, getPaginationProps } from 'Includes/functions';
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import backGround from 'images/backgroundSchoolView.png';
import MultipleSelectDropdown from 'Components/MultipleSelectDropdown';
import './styles.scss'

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

const useStyles = {
    divStyle: {
        backgroundRepeat: 'no-repeat',
        backgroundImage: `url(${backGround})`,
        backgroundSize: '105%',
        marginBottom: '40px',
        paddingBottom: '40px'

    },
    loading: {
        marginRight: 'auto',
        marginLeft: 'auto',
        marginTop: '35vh',
        width: '20vh'
    },
    submit: {
        height: '37px',
        marginTop: 'auto',
        marginBottom: '20px',
        marginRight: '20px',
        color: '#ffffff'
    },
};

class StaffMapWithStandards extends Component {
    state = {
        yearList: [],
        loading: true,
        loadingStaff: false,
        year: '',
        fromDate: '',
        toDate: '',
        errors: {},
        shiftTypeList: [],
        selectedShift: '',
        openFromCalender: false,
        openToCalender: false,
        manageyear: { start_date: null, end_date: null },
        pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
        staffList: [],
        selectedToggle: 'custom',
        staffIndex: [],
        staffids: [],
        submitDisable: false,
        yearError: '',
        customDate: false,
        applyDisable: true,
        enableTitle: false,
        enableTable: false,
        blankPageMessage: '',
        standardList: [],
        selected_list: [],
        isBlankPage: false,
        fieldErrors: {},
        columns: [
            {
                name: "name",
                label: "Staff Name",
                options: {
                    filter: true,
                    sort: true,
                }
            },
            {
                name: "group_names",
                label: "Group Name",
                options: {
                    filter: true,
                    sort: true,
                }
            },
        ]
    }

    componentDidMount = async () => {
        this.getStaffStandardMap()
        this.getStandardList()
    }

    getStandardList = () => {
        let params = { is_active: true }
        getRequest(GET_URL.getstandardandsection.api, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    standardList: response.data.data,
                    // loading: false,
                })
            }
        })
    }


    getStaffStandardMap = (paginationProps) => {
        let { pagination } = this.state;
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = { ...pagination_params, is_active: true, mapped_type: 'only_not_mapped' }
        const url = GET_URL.staff_standard_mapping.api
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                if (response.data.data.data_list.length === 0) {
                    this.setState({
                        isBlankPage: true,
                        blankPageMessage: 'No staffs available, all are assigned standards/add new staff',
                        loading: false
                    })
                    return
                }
                response.data.data.data_list.map((field) => {
                    field['group_names'] = []
                    field['group_names'] = field.group_name.toString()
                })
                this.setState({
                    staffList: response.data.data,
                    loading: false,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                })

            }
        })
    }

    onChangeStandard = (e) => {
        this.setState({
            selected_list: e,
            fieldErrors: {}
        })
    }

    submit = async () => {
        let validate_post_data = this.validate()
        if (validate_post_data) {
            this.setState({ submitDisable: true })
            let url = POST_URL.staff_standard_mapping.api
            postRequest(url, validate_post_data, this.props).then(response => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(Actions.assign_standard.view.url);
                }
                this.setState({ submitDisable: false })
            })
        }
    }

    validate = () => {
        let { staffIndex, selected_list, staffList, open, fieldErrors, alertData } = this.state;
        let returnValue = true
        if (selected_list.length === 0) {
            returnValue = false
            fieldErrors['selected_list'] = 'This field is mandatory'
        }
        if (staffIndex.length === 0) {
            returnValue = false
            open = true
            alertData = 'Select atleast one staff'
        }
        if (returnValue) {
            let post_data = []
            let standard_ids = getCommaSeperatedArrayOfObjects(selected_list, 'id').split(' ,').map(element => { return Number(element) })
            staffIndex.map((data) => {
                post_data.push({ standards: standard_ids, staff: staffList.data_list[data.dataIndex]['id'] })
            })
            returnValue = post_data
        }
        else {
            this.setState({
                open,
                alertData,
                fieldErrors
            })
        }
        return returnValue
    }


    handleClose = () => {
        this.setState({
            open: false
        })
    }

    handleRowSelectionChange = (paginationProps) => {
        let { errors } = this.state
        delete errors['staffNotSelected']
        this.setState({
            staffIndex: paginationProps.selectedRows.data,
            errors,
            open: false
        })
    }

    render() {
        const {
            loading, columns, alertData, open, blankPageMessage, staffList, isBlankPage, staffIndex,
            pagination, standardList, selected_list, fieldErrors
        } = this.state
        const options = {
            selectableRows: 'multiple',
            filter: false,
            download: false,
            print: false,
            viewColumns: false,
            customToolbarSelect: () => { },
        }
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
                                    Assign Standard to Staffs
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12}>
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    <Button
                                        variant='contained'
                                        component={Link} to={Actions.assign_standard.view.url}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.assign_standard.view.label}</Button>
                                </Box>
                            </Grid>
                        </Grid>
                        {/* <Box className='staff-list-assigned-shift'>Note : Staffs added with custom date range can also exceed the financial year date range.</Box> */}
                        {isBlankPage ?
                            <BlankPagewithIcon data={blankPageMessage} />
                            :
                            <Grid container spacing={3} className='pt-10'>
                                <Grid item md={8} xs={12}>
                                    <AllMUIDataTable
                                        key={staffList.data_list}
                                        title={''}
                                        data={staffList.data_list}
                                        columns={columns}
                                        options={options}
                                        onTableChange={this.getStaffStandardMap}
                                        rowSelectionChange={this.handleRowSelectionChange}
                                        serverSide={true}
                                        pagination={pagination}
                                        count={staffList.count}
                                    />
                                </Grid>
                                <Grid item md={4} xs={12}>
                                    <Paper className='paper-plain-background p-20px'>
                                        <MultipleSelectDropdown
                                            data_list={standardList}
                                            selected_list={selected_list}
                                            error={fieldErrors['selected_list'] && fieldErrors['selected_list']}
                                            label={`${alias_names['standard']} List`}
                                            onChange={this.onChangeStandard}
                                            className='w-100'
                                        />
                                        <Box>
                                            <Box className='staff-list-assigned-shift'>Selected users for assign standard</Box>
                                            <Box className='height-55vh'>
                                                {staffIndex.map((data, index) => {
                                                    return (
                                                        <Box key={index}>
                                                            <Box className='text-blue pv-5'>
                                                                {`${index + 1}. ${staffList.data_list[data.dataIndex].name}`}
                                                            </Box>
                                                        </Box>
                                                    )
                                                })
                                                }
                                            </Box>
                                        </Box>
                                        <Box className='assign-shift-submit-position'>
                                            <Button variant="contained"
                                                className='submit'
                                                onClick={this.submit}
                                                disabled={this.state.submitDisable}
                                            >
                                                Submit
                                            </Button>
                                        </Box>
                                    </Paper>
                                </Grid>
                            </Grid>
                        }
                    </Paper>
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </Box>
            )
        }
    }
}

export default withRouter(StaffMapWithStandards)