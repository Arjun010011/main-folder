import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import { Paper, Box, Grid, Button, Tooltip, TextField, FormControl, FormHelperText, CircularProgress } from '@material-ui/core';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import Snackbar from '@material-ui/core/Snackbar';
import InfoIcon from '@material-ui/icons/Info';
import { Dropdown } from 'Components/DropDown';
import InputAdornment from '@material-ui/core/InputAdornment';
import IconButton from '@material-ui/core/IconButton';
import Visibility from '@material-ui/icons/Visibility';
import VisibilityOff from '@material-ui/icons/VisibilityOff';
import BlankPagewithIcon from 'Components/BlankPageWithIcon'
import loadingBar from 'images/loading.gif'
import { amountRegexWithDecimals } from 'Constants/regularExpression'
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import { getUrlParam, Alert, isUserHasPermission, getFullName, getPaginationProps } from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import { DEFAULT_PAGINATION_PROPS_FIRST_NAME_LIST, IMPORT_CONFIGURATION_LIST } from 'Constants';
import AddInputUserField from 'Containers/Student/Components/AddInputUserField';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

class StudentAdmissionNumAdd extends Component {

    constructor(props) {
        super(props)

        this.state = {
            transaction: { comment: '', type: 'Distribute' },
            fieldErrors: {},
            loading: true,
            isEnable: {},
            upload_name: 'Upload Receipt',
            openError: false,
            alertData: 'Clear the errors',
            expenseDetails: {},
            isEdit: false,
            submitDisable: false,
            pageLoading: false,
            isBlankPage: false,
            bankInformation: {},
            staffList: [],
            finalStudentList: [],
            lowBalanceStudentList: [],
            currentIndex: 0,
            tableUpdating: false,
            importCongiguration: '',
            pagination: { ...DEFAULT_PAGINATION_PROPS_FIRST_NAME_LIST },
            showPassword: false,
        }
        this.selectStudentRef = React.createRef();
    }


    componentDidMount = () => {
        let { standard, year, year_name, standard_name } = getUrlParam();
        this.setState({
            selectedStandard: standard,
            selectedYear: year,
            yearName: year_name,
            standardName: standard_name,
        }, () => {
            this.getStudentList()
        })
    }

    getStudentList = (paginationProps) => {
        let { pagination, selectedYear, selectedStandard, } = this.state;
        this.setState({ tableUpdating: true })
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = {
            ...pagination_params,
            student_academic_year: selectedYear,
            is_active: true, admission_num: true
        }
        if (selectedStandard && selectedStandard !== 'all') {
            let temp = {}
            temp['current_standard'] = selectedStandard;
            params = { ...params, ...temp }
        }
        params['admission_history'] = true
        const url = GET_URL.student.api
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                const studentList = response.data;
                studentList.data.student_list.map((data) => {
                    data['full_name'] = getFullName(data['first_name'], data['middle_name'], data['last_name'])
                })
                this.setState({
                    finalStudentList: studentList.data.student_list,
                    allFinalStudentList: studentList.data.student_list,
                    loading: false,
                    tableUpdating: false,
                    pagination: this.currentPagination
                });
            }
        });
    };

    validateAmount = () => {
        let { fieldErrors, transaction, bankInformation } = this.state;
        let error = false
        if (parseFloat(bankInformation.balance) < parseFloat(transaction.amount) && transaction.type === 'Distribute') {
            error = true
            fieldErrors['amount'] = `Enter below amount ${bankInformation.balance}`
        }
        if (parseFloat(transaction.amount) === 0) {
            error = true
            fieldErrors['amount'] = 'Amount should be grater than 0'
        }
        this.setState({
            fieldErrors,
            error
        })
    }

    validation = () => {
        let returnValue = true
        let { fieldErrors, finalStudentList } = this.state;
        fieldErrors = {}
        let duplicate_rfid = []
        let return_result = []
        finalStudentList.map((parent, pIndex) => {
            if (parent.username) {
                finalStudentList.map((child, cIndex) => {
                    if (parent['username'] && child['username'] && parent['username'] == child['username'] && pIndex !== cIndex) {
                        if (duplicate_rfid.includes(child['username']) && !fieldErrors[`rfid_${pIndex}`]) {
                            fieldErrors[`username_${pIndex}`] = `Duplicate Found ${child.full_name}`
                            returnValue = false
                        }
                    }
                })
                if (parent['password'] && parent['password'].trim().length < 8) {
                    fieldErrors[`password_${pIndex}`] = <FormattedMessage {...commonMessages.passwordInvalidError} />;
                    returnValue = false
                }
                duplicate_rfid.push(parent['username'])
                return_result.push({ user_id: parent.user_id, username: parent['username'], password: parent['password'] })
            }
        })
        if (returnValue) {
            returnValue = { user_list: return_result }
        }
        this.setState({
            fieldErrors,
            openError: !returnValue,
            alertData: !returnValue ? 'Clear duplicate error(s)' : ''
        })
        return returnValue
    }

    submit = () => {
        let validate = this.validation();
        if (validate) {
            this.setState({ submitDisable: true })
            let url = POST_URL.updateuserdata.api;
            postRequest(url, validate, this.props)
                .then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Your Data has been saved',
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.handleViewButton()
                    }
                    this.setState({ submitDisable: false })
                });
        }
    }

    handleClose = () => {
        this.setState({
            openError: false,
            alertImageData: ''
        })
    }

    handleFilter = (e) => {
        let { name, value, filterList } = e.target;
        let { allFinalStudentList, finalStudentList } = this.state;
        if (value !== '') {
            let lowerCasedFilter = value.toLowerCase().replace(/\s+/g, "");
            filterList = allFinalStudentList.filter(item => {
                return Object.keys(item).some(key =>
                    typeof (item[key]) === "string" && item[key].toLowerCase().replace(/\s+/g, "").includes(lowerCasedFilter)
                );
            });
            finalStudentList = filterList
        }
        else {
            finalStudentList = [...allFinalStudentList]
            filterList = []
        }
        this.setState({
            [name]: value,
            filterList,
            finalStudentList
        })
    }


    handleValidation = () => {
        this.setState({
            neededSort: true
        })
    }

    handleViewButton = () => {
        const { selectedYear, selectedStandard, selectedSection } = this.state;

        let searchState = { selectedYear, selectedStandard, selectedSection }

        let searchParam = "?" + new URLSearchParams(searchState).toString()
        this.props.history.push({
            pathname: Actions.student_username_list.view.url,
            search: searchParam,
        })
    }

    handleChange = (e, index) => {
        let { name, value } = e.target;
        let { finalStudentList, fieldErrors, tableUpdating } = this.state;
        finalStudentList[index][name] = value
        finalStudentList[index]['modified'] = true
        delete fieldErrors[`${name}_${index}`]
        this.setState({
            finalStudentList,
            fieldErrors,
            tableUpdating
        }, () => {
            this.validation()
        })
    }

    handleKeyDown = (e, index) => {
        if (e.key === 'Enter') {
            this.setState({ tableUpdating: true }, () => {
                this.setState({
                    currentIndex: index + 1,
                    tableUpdating: false
                })
            })
        }
    }

    handleImportCSV = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const { importCongiguration, finalStudentList } = this.state
            const text = e.target.result;
            let rowDataTemp = this.convertCSVtoJSON(text);
            let finalTempList = [...finalStudentList]
            rowDataTemp.map((rowData, rowIndex) => {
                if (importCongiguration === 'Direct') {
                    finalTempList[rowIndex]['username'] = rowData['username']
                    finalTempList[rowIndex]['password'] = rowData['password']
                }
                else {
                    finalTempList.map((finalData) => {
                        if (rowData[importCongiguration] === finalData[importCongiguration]) {
                            finalData['username'] = rowData['username']
                            finalData['password'] = rowData['password']
                        }
                    })
                }
            })
            this.setState({
                finalStudentList: finalTempList
            })
        }
        reader.readAsText(file);
    }

    convertCSVtoJSON = (csv) => {
        const { importCongiguration } = this.state;
        var lines = csv.split("\n");
        var result = [];
        let isValue = false
        var headers = lines[0].split(',');
        let importCongigurationR = importCongiguration + '\r'
        if (!headers.includes('username') && !headers.includes('username\r')) {
            this.setState({
                openError: true,
                alertData: 'username column is not available in the CSV file'
            })
            return []
        }
        else if (importCongiguration !== 'Direct' && !headers.includes(importCongiguration) && !headers.includes(importCongigurationR)) {
            this.setState({
                openError: true,
                alertData: `${importCongiguration} column is not available in the CSV file`
            })
            return []
        }
        for (var i = 1; i < lines.length; i++) {
            var obj = {};
            var currentline = lines[i].split(',');
            isValue = false
            for (var j = 0; j < headers.length; j++) {
                headers[j] = headers[j].replace('\r', '')
                if (currentline[j] !== '' && currentline[j] !== undefined) {
                    currentline[j] = currentline[j].replace('\r', '')
                    isValue = true
                }
                obj[headers[j]] = currentline[j];
            }
            if (isValue) {
                result.push(obj);
            }
        }
        return result;
    }

    onChange = (e) => {
        const { name, value } = e.target;
        this.setState({
            [name]: value
        })
    }

    handleClickShowPassword = () => {
        this.setState({
            showPassword: !this.state.showPassword
        })
    }

    onBlurFieldValue = (e, index) => {
        let { name, value } = e.target;
        let { finalStudentList, fieldErrors, tableUpdating } = this.state;
        finalStudentList[index][name] = value
        finalStudentList[index]['modified'] = true
        delete fieldErrors[`${name}_${index}`]
        this.setState({
            finalStudentList,
            fieldErrors,
            tableUpdating
        }, () => {
            this.validation()
        })
    }

    render() {
        const { loading, yearName, standardName, showPassword, openError, alertData, searchStudent, finalStudentList,
            fieldErrors, currentIndex, tableUpdating, submitDisable, importCongiguration } = this.state
        if (loading) {
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
                                    Student Admission Number
                                </Box>
                            </Grid>
                            <Grid item md={4} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    {isUserHasPermission('student_username_list', 'view') &&
                                        <Button
                                            variant="contained"
                                            onClick={this.handleViewButton}
                                            // component={Link} to={Actions.hostel_student_transaction_list.view.url}
                                            className='editbutton-view'
                                        ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.student_username_list.view.label}</Button>
                                    }
                                </Box>

                            </Grid>
                        </Grid>
                        <Box className='md-down-justify-start md-up-justify-start mb-y-20'>
                            <Box className="year-std-box mr-40">
                                <Box className="academic-std-head"> Academic Year</Box>
                                <Box className=" exam-mark-add-heading-bg">{yearName}</Box>
                                <Box className="exam-mark-heading-box">{`${alias_names['standard']}`}</Box>
                                <Box className=" exam-mark-add-heading-bg">{standardName}</Box>
                            </Box>
                        </Box>
                        <Paper className='plain-paper-background pl-20 pt-20  '>
                            <div>
                                <div className='d-flex align-items-center'>
                                    <Dropdown
                                        data={IMPORT_CONFIGURATION_LIST}
                                        name='importCongiguration'
                                        value={importCongiguration}
                                        onChange={this.onChange}
                                        label='Import Configuration'
                                        error={fieldErrors.importCongiguration}
                                        hideSelect={true}
                                    />
                                    {!importCongiguration ?
                                        <div className='staff-list-assigned-shift ml-20'>
                                            Select configuration to import
                                        </div>
                                        :
                                        <div className='ml-20'>
                                            <label htmlFor='upload-pic' className=''>
                                                <Button variant="raised" component='span' className='custom-button profile-pic-button'>
                                                    Import CSV
                                                </Button>
                                            </label>
                                            <input type='file' id='upload-pic' className='display-none' onChange={(e) => this.handleImportCSV(e)}
                                                onClick={e => (e.target.value = null)} />
                                        </div>
                                    }
                                </div>
                            </div>
                            <Box className='no-feature-label'>
                                Note: Required column name(s) in csv file - <br />1. username <br />2. password <br />{importCongiguration !== 'Direct' ? importCongiguration ? `3. ${importCongiguration}` : '' : ''}
                            </Box>
                        </Paper>
                        <Paper className='paper-plain-background student-rfid-add pt-10'>
                            <TextField
                                id="outlined-name"
                                value={searchStudent}
                                placeholder=""
                                label="Search Student"
                                name='searchStudent'
                                onChange={(e) => { this.handleFilter(e) }}
                            />
                            {!tableUpdating &&
                                <table width="100%" className="selectable-row-table mt-20">
                                    <thead className='table-select-hostel-thead'>
                                        <th className={`selectable-table-head`}> Student Name  </th>
                                        <th className={`selectable-table-head`}> Admission No.  </th>
                                        <th className={`selectable-table-head`}> Username </th>
                                        <th className={`selectable-table-head`}> Password </th>
                                    </thead>
                                    <tbody className="selectable-row-table-body">
                                        {finalStudentList.map((student, index) => {
                                            return (
                                                <tr key={index} className={student.is_low_balance ? "selectable-row-table-row text-red" : "selectable-row-table-row"}>
                                                    <td className={student.is_low_balance ? 'textAlign' : 'textAlign pl-15 '}>
                                                        {student.full_name}
                                                    </td>
                                                    <td className={'textAlign pl-15 '}>
                                                        {student.admission_num}
                                                    </td>
                                                    <td className={'textAlign pl-15 '}>
                                                        <AddInputUserField
                                                            name='username'
                                                            type='text'
                                                            fieldValue={student.username}
                                                            currentIndex={currentIndex}
                                                            index={index}
                                                            onBlurFieldValue={this.onBlurFieldValue}
                                                            fieldError={fieldErrors[`username_${index}`]}
                                                        />
                                                    </td>
                                                    <td className={'textAlign pl-15 '}>
                                                        <AddInputUserField
                                                            name='password'
                                                            type='password'
                                                            fieldValue={student.password}
                                                            currentIndex={currentIndex}
                                                            index={index}
                                                            onBlurFieldValue={this.onBlurFieldValue}
                                                            fieldError={fieldErrors[`password_${index}`]}
                                                            showPassword={showPassword}
                                                            handleClickShowPassword={this.handleClickShowPassword}
                                                        />
                                                    </td>
                                                </tr>
                                            )
                                        })
                                        }
                                        {finalStudentList.length === 0 && (
                                            <tr className="text-center font-weight-bold">
                                                No Data Found
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            }
                        </Paper>
                    </Paper>
                    <Box className="submt-button-float-bottom">
                        <Button variant='contained'
                            color='primary' className='submit'
                            disabled={submitDisable}
                            onClick={() => this.submit()}>submit
                        </Button>
                    </Box>
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openError} autoHideDuration={10000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </div>
            )
        }
    }
}


export default withRouter(StudentAdmissionNumAdd)