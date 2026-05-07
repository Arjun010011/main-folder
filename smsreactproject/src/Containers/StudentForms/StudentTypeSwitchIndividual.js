import React, { Component } from 'react'
import { withRouter } from 'react-router-dom';
import { Paper, Grid, Button, Tooltip, withStyles, Divider } from '@material-ui/core'
import Box from '@material-ui/core/Box';
import classNames from "classnames";
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import EditTwoToneIcon from '@material-ui/icons/EditTwoTone';
import moment from "moment";
import {
    MuiPickersUtilsProvider,
    KeyboardDatePicker,
} from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import Swal from 'sweetalert2'


import loadingBar from 'images/loading.gif'
import { getRequest, putRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, POST_URL } from 'Includes/urls';
import { dateFormat, isUserHasPermission, getUrlParam, validateDate } from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import { image_formats } from 'Containers/Expenses/Constants';



const Styles = theme => ({

    studentLabel: {
        color: '#00000',
        fontSize: '12px',
        lineHeight: '23px',
        padding: '5px',
        wordBreak: 'break-word',

    },
    studentValue: {
        color: '#00000',
        fontSize: '16px',
        lineHeight: '25px',
        padding: '5px',
        textTransform: 'capitalize',
        wordBreak: 'break-word',

    },
    studentValueEmpty: {
        padding: '5px',
        width: '40px'
    },
    header: {
        padding: '10px 25px',
    },
    innerBorder: {
        width: '2px',
        height: '80%',
        background: '#E4E7EB',
        // marginLeft: 'auto',
        marginRight: '5%',
    },
    displayFlex: {
        display: 'flex',
        padding: '20px 5px'
    },
})


class StudentTypeSwitchIndividual extends Component {

    constructor(props) {
        super(props)

        this.state = {
            type_details: [],
            largeImagePreview: '',
            loading: true,
            studentId: '',
            student_type_details: [],
            student_name: '',
            isEdit: false,
            editableArray: [],
            lastElementStudentType: {},
            newStudentType: false,
            errors: {},
            minDate: '',
            isChangeTypeButtonEnabled: true
        }
    }


    componentDidMount = () => {
        this.getstudentDetials();
        let { minDate } = this.state;
        minDate = moment(new Date()).add(1, 'days')
        minDate = dateFormat(minDate, 'YYYY-MM-DD')
        this.setState({
            minDate
        })
    }

    getstudentDetials = () => {
        let { id } = getUrlParam();
        if (id) {
            const url = GET_URL.studenttype.api
            const param = { student: id }
            getRequest(url, param, this.props).then(response => {
                if (response && response.status === 200) {
                    const first_name = response.data.data.student_details.first_name
                    const middle_name = response.data.data.student_details.middle_name
                    const last_name = response.data.data.student_details.last_name
                    let full_name
                    if (middle_name) {
                        full_name = `${first_name} ${middle_name} ${last_name}`
                    }
                    else {
                        full_name = `${first_name}  ${last_name}`
                    }
                    this.setState({
                        studentDetials: response.data.data,
                        student_name: full_name,
                        pageLoading: false,
                        studentId: id
                    }, () => {
                        this.updateExpenseView();
                    })
                }
            })
        }
        else {
            this.props.history.push(Actions.student_type_switch.view.url)
        }
    }

    updateExpenseView = () => {
        let { studentDetials, newStudentType, editableArray, lastElementStudentType, isChangeTypeButtonEnabled } = this.state;
        let type_details = []

        let type = {}
        studentDetials.student_type_details.map((data, index) => {
            if (studentDetials.student_type_details.length === 1 || studentDetials.student_type_details.length === 0 || studentDetials.student_type_details.length === (index + 1)) {
                type = {
                    'sub_heading': `Current Student Type Detail`,
                    'data': []
                }
            }
            else {
                type = {
                    'sub_heading': `Student Type Detail ${index + 1}`,
                    'data': []
                }
            }
            type.data.push({ label: 'Student Type', value: data['student_type'] }, { label: 'Register Number', value: data['reg_num'] },
                { label: 'Opted From Date', value: dateFormat(data['from_date'], 'DD-MM-YYYY') }, { label: 'To Date', value: dateFormat(data['to_date'], 'DD-MM-YYYY') })
            type_details.push(type)
        })
        if (studentDetials.student_type_details.length !== 0) {
            let tempArray = [...studentDetials.student_type_details]
            let lastElement = tempArray.pop();
            let from_date = dateFormat(lastElement.from_date, 'YYYY-MM-DD')
            let to_date = dateFormat(new Date(), 'YYYY-MM-DD')
            let from_moment = moment(from_date);
            let to_moment = moment(to_date).add();
            let diffDays = from_moment.diff(to_moment, 'days')
            if (diffDays <= 0) {
                newStudentType = true
                lastElementStudentType = lastElement
                lastElementStudentType['student_type'] = lastElementStudentType['student_type'] === 'Day Scholar' ? 'Residential' : 'Day Scholar'
                lastElementStudentType['sub_heading'] = `Student Type `
            }
            else {
                editableArray = []
                lastElementStudentType = lastElement
                lastElementStudentType['sub_heading'] = `Student Type Detail ${studentDetials.student_type_details.length}`
            }
            let to_date_check = moment(lastElement.to_date);
            let diffDaysCheck = to_date_check.diff(to_moment, 'days')
            if (diffDaysCheck <= 0) {
                isChangeTypeButtonEnabled = false
            }

        }
        type_details = type_details.reverse()
        this.setState({
            type_details,
            newStudentType,
            loading: false,
            editableArray,
            lastElementStudentType,
            isChangeTypeButtonEnabled
        })

    }

    handleViewImage = (image) => {
        let file_extension = `${image.slice((Math.max(0, image.lastIndexOf(".")) || Infinity) + 1)}`;
        if (image_formats.includes(file_extension)) {
            this.setState({
                largeImagePreview: image
            })
        }
        else {
            window.open(image);
        }
    }


    handleCloseLargeImage = () => {
        this.setState({
            largeImagePreview: ''
        })
    }

    handleEdit = () => {
        this.setState({
            isEdit: true
        })
    }

    onChangeFromDate = (e) => {
        let { lastElementStudentType, minDate, errors } = this.state;
        if (e != 'Invalid Date') {

            let maxDate = lastElementStudentType['to_date']
            const error = validateDate(e, minDate, maxDate)
            if (error !== '') {
                errors['from_date'] = error
                this.setState({
                    errors
                })
            }
            else {
                delete errors['from_date']
                lastElementStudentType['from_date'] = e
                this.setState({
                    lastElementStudentType
                })
            }
        }
    }

    submit = () => {
        let { errors, lastElementStudentType, studentId, newStudentType } = this.state;
        if (Object.keys(errors).length === 0) {
            if (newStudentType) {
                let post_url = POST_URL.studenttype.api
                let post_data = {
                    student: studentId,
                    student_type: lastElementStudentType['student_type'],
                    from_date: dateFormat(lastElementStudentType['from_date'], 'YYYY-MM-DD')
                }
                postRequest(post_url, post_data, this.props).then(response => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: response.data.Reason,
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.setState({
                            isEdit: false
                        })
                        this.getstudentDetials()
                    }
                })
            }
            else {
                let put_url = PUT_URL.studenttype.api + lastElementStudentType['id'] + '/'
                let post_data = {
                    student: studentId,
                    from_date: dateFormat(lastElementStudentType['from_date'], 'YYYY-MM-DD')
                }
                putRequest(put_url, post_data, this.props).then(response => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: response.data.Reason,
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.setState({
                            isEdit: false
                        })
                        this.getstudentDetials()

                    }
                })
            }
        }
    }

    render() {
        let { type_details, loading, student_name, newStudentType, lastElementStudentType, isEdit, errors, minDate, isChangeTypeButtonEnabled } = this.state;
        let { classes } = this.props;
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Paper className='paper-background'>
                    <Grid container>
                        <Grid item md={8} xs={12} className='header-align'>
                            <Box className='heading'>
                                View Student Type Switch Details
                            </Box>
                        </Grid>

                        <Grid item md={4} xs={12} >
                            <Box className='header-align end-flex-prop'>
                                {isUserHasPermission('student_type_switch', 'view') &&
                                    <Button
                                        variant="contained"
                                        component={Link} to={Actions.student_type_switch.view.url}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.student_type_switch.view.label}</Button>
                                }
                            </Box>
                        </Grid>
                    </Grid>
                    <Box className='md-down-justify-start md-up-justify-start mb-y-20'>
                        <Box className="year-std-box mr-40">
                            <Box className="academic-std-head "> Student Name</Box>
                            <Box className=" aca-std-white-background">{student_name}</Box>
                        </Box>
                    </Box>
                    <Paper className='header-align expense-individual-paper-background'>
                        <Grid container className='margin-top-30'>
                            {!isEdit && type_details.map((headingData, index) => {
                                return (
                                    <Grid item md={12} xs={12} sm={12} key={index} className={classes.displayFlex}>
                                        <Grid container>
                                            <Box className={(type_details.length > 1 && index === 1) ? 'divider-history' : 'display-none'}>
                                                <Divider />
                                            </Box>
                                            <Box className={(type_details.length > 1 && index === 1) ? 'history-label-box' : 'display-none'}>History</Box>
                                            <Box className='form-left-heading'>{headingData.sub_heading}</Box>
                                            {headingData.data.map((data, index) => {
                                                return (
                                                    <Grid item md={3} xs={12} sm={12} key={index} className={classes.header}>
                                                        <Box className='dataLabel break-word'>{data.label}</Box>
                                                        {(!data.value && data !== false) && <Box className={classes.studentValueEmpty}><hr /></Box>}
                                                        {(data.value !== "") &&
                                                            <Box className={data.className ? data.className : 'view-expenses-data-value break-word'}>{data.value}</Box>
                                                        }
                                                    </Grid>
                                                )
                                            })
                                            }
                                        </Grid>
                                    </Grid>
                                )
                            })
                            }
                            {isEdit && !newStudentType &&
                                <Grid container>
                                    <Box className='form-left-heading'>{`Change ${lastElementStudentType.sub_heading} From Date`}</Box>
                                    <Grid item md={3} xs={12} sm={12} className={classes.header}>
                                        <Box className='dataLabel break-word'>Student Type</Box>
                                        <Box className='view-expenses-data-value break-word'>{lastElementStudentType.student_type}</Box>
                                    </Grid>
                                    <Grid item md={3} xs={12} sm={12} className={classes.header}>
                                        <Box className='dataLabel break-word'>Register Number</Box>
                                        <Box className='view-expenses-data-value break-word'>{lastElementStudentType.reg_num}</Box>
                                    </Grid>
                                    <Grid item md={3} xs={12} sm={12} className={classes.header}>
                                        <Box className='dataLabel break-word'>Opted From Date</Box>

                                        <Box className='view-expenses-data-value break-word'>
                                            <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                                <KeyboardDatePicker
                                                    autoOk
                                                    variant='inline'
                                                    inputVariant='outlined'
                                                    label=''
                                                    name='start_date'
                                                    minDate={minDate}
                                                    maxDate={lastElementStudentType.to_date}
                                                    format='dd-MM-yyyy'
                                                    value={lastElementStudentType.from_date}
                                                    onChange={(e) => this.onChangeFromDate(e)}
                                                    KeyboardButtonProps={{
                                                        'aria-label': 'change date',
                                                    }}
                                                    helperText={(!errors.from_date) ? 'Valid Format DD-MM-YYYY' : errors.from_date}
                                                    error={errors.from_date && (errors.from_date ? true : false)}
                                                />
                                            </MuiPickersUtilsProvider>
                                        </Box>
                                    </Grid>
                                    <Grid item md={3} xs={12} sm={12} className={classes.header}>
                                        <Box className='dataLabel break-word'>To Date</Box>
                                        <Box className='view-expenses-data-value break-word'>{lastElementStudentType.to_date}</Box>
                                    </Grid>
                                </Grid>
                            }

                            {newStudentType && isEdit &&
                                <Grid container>
                                    <Box className='form-left-heading'>Change Student Type</Box>
                                    <Grid item md={3} xs={12} sm={12} className={classes.header}>
                                        <Box className='dataLabel break-word'>Student Type</Box>
                                        <Box className='view-expenses-data-value break-word'>{lastElementStudentType.student_type}</Box>
                                    </Grid>
                                    <Grid item md={3} xs={12} sm={12} className={classes.header}>
                                        <Box className='dataLabel break-word'>Register Number</Box>
                                        <Box className='view-expenses-data-value break-word'></Box>
                                    </Grid>
                                    <Grid item md={3} xs={12} sm={12} className={classes.header}>
                                        <Box className='dataLabel break-word'>Opted From Date</Box>

                                        <Box className='view-expenses-data-value break-word '>
                                            <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                                <KeyboardDatePicker
                                                    autoOk
                                                    variant='inline'
                                                    label=''
                                                    name='start_date'
                                                    minDate={minDate}
                                                    maxDate={lastElementStudentType.to_date}
                                                    format='dd-MM-yyyy'
                                                    value={lastElementStudentType.from_date}
                                                    onChange={(e) => this.onChangeFromDate(e)}
                                                    KeyboardButtonProps={{
                                                        'aria-label': 'change date',
                                                    }}
                                                    helperText={(!errors.from_date) ? 'Valid Format DD-MM-YYYY' : errors.from_date}
                                                    error={errors.from_date && (errors.from_date ? true : false)}
                                                />
                                            </MuiPickersUtilsProvider>
                                        </Box>
                                    </Grid>
                                    <Grid item md={3} xs={12} sm={12} className={classes.header}>
                                        <Box className='dataLabel break-word'>To Date</Box>
                                        <Box className='view-expenses-data-value break-word'>{lastElementStudentType.to_date}</Box>
                                    </Grid>
                                </Grid>
                            }
                            {type_details.length === 0 &&
                                <Box className='no-feature-label'>
                                    Note: There is Student Type Details
                                </Box>
                            }
                        </Grid>
                        {!isEdit && isUserHasPermission('student_type_switch_individual', 'update') && isChangeTypeButtonEnabled &&
                            <Box className='expense-individual-view-edit'>
                                <Button onClick={this.handleEdit}>
                                    <EditTwoToneIcon className='expense-individual-edit-icon' /> Change Student Type
                            </Button>
                            </Box>
                        }
                    </Paper>
                    {isEdit &&
                        <Box className='end-flex-prop margin-top-20'>
                            <Button variant="contained" color="primary"
                                className='submit '
                                disabled={this.state.submitDisable}
                                onClick={this.submit}>
                                Submit &nbsp;{' '}
                            </Button>
                        </Box>
                    }
                </Paper>
            )
        }
    }
}

export default withRouter(withStyles(Styles)(StudentTypeSwitchIndividual));