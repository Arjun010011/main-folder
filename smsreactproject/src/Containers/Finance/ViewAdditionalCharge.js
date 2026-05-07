import React, { Component } from "react";
import { withRouter } from 'react-router-dom';
import { Paper, Box, Grid, Button, Tooltip, CircularProgress } from "@material-ui/core";
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import WarningIcon from '@material-ui/icons/Warning';
import Swal from 'sweetalert2'
import { Link } from 'react-router-dom';
import ActionColumn from "Components/ActionColumnNew";
import AllMUIDataTable from "Components/AllMUIDataTable";
import LoadingGif from 'Components/LoadingGif';
import { createStructuredSelector } from 'reselect';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { makeSelectAcademicYear } from 'Components/CommonComponent/selectors'
import { setAcademicYear } from 'Components/CommonComponent/actions';
import Snackbar from '@material-ui/core/Snackbar';
import { Alert, isUserHasPermission } from 'Includes/functions';

import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { amountgreaterthanzero } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import {
    SetAcademicYear, checkLocalAcademicYear, updatePermissions, numberWithCommas,
    getSettingValue, getUrlParam
} from 'Includes/functions';
import { Dropdown } from "Components/DropDown";
import './styles.scss';
import { options, ADMISSION_CODE, TRANSPORT_CODE } from 'Constants';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import commonMessages from 'Constants/messages';
const ITEM_HEIGHT = 35;

const fieldDetails = [
    {
        label: <FormattedMessage {...commonMessages.amount} />, regex: amountgreaterthanzero,
        name: 'amount', md: 12, className: 'width-100', id: 'outlined-textarea',
        default: '', rows: null, type: 'text', maxLength: "8", required: true
    }
]
const isResidential = parseInt(getSettingValue('is_residential'));
class ViewAdditionalCharge extends Component {
    constructor() {
        super();
        this.permission = ('fee_term', ['create']);
        this.permission.push('view');
        this.state = {
            loading: true,
            yearList: [],
            year: 0,
            selectedType: 'D',
            yearName: '',
            alertData: '',
            feeTermPlan: [],
            snackbar: false,
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        display: false,
                    },
                },
                {
                    name: "sequence",
                    label: <FormattedMessage {...commonMessages.standard} />,
                    options: {
                        sort: true,
                        customBodyRender: (value, tableMeta) => {
                            let standardName = tableMeta.rowData[4]
                            return standardName
                        }
                    },
                },
                {
                    name: "totalAmount",
                    label: <FormattedMessage {...commonMessages.amount} />,
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta) => {
                            if (!value) {
                                value = 0;
                            }
                            return numberWithCommas(value)
                        }
                    },
                },
                {
                    name: "fee_types",
                    label: <FormattedMessage {...commonMessages.actions} />,
                    options: {
                        display: this.permission.length > 0,
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            let standardName = tableMeta.rowData[4]
                            const viewData = { 
                                'redirectToUrl': Actions.fee_additional_charge_plan.create.url,
                                'params': {
                                    year: this.state.year, standard: tableMeta.rowData[0],
                                    studentType: this.state.selectedType, standardName: standardName
                                }
                            }
                            return <Button
                                className='approve-button-finance font-weight-bold'
                                variant="contained"
                                color="primary"
                                size="small"
                                // component={Link} to={viewData}
                                onClick={() => this.handleViewDetail(viewData)}
                            >
                                View Detail
                            </Button>
                        }
                    },
                },
                {
                    name: "name",
                    options: {
                        display: false
                    }
                }
            ]
        };
    }

    handleViewDetail = (newEditData) => {
        let pushData = { pathname: newEditData.redirectToUrl }
        let searchParam = "?" + new URLSearchParams(newEditData.params).toString()
        pushData['search'] = searchParam
        this.props.history.push(pushData);
    }

    componentDidMount() {
        let { year, studentType } = getUrlParam();
        this.setState({
            year: year, selectedType: studentType ? studentType : 'D'
        }, () => {
            this.getYearsList();
        })
    }


    getYearsList = async () => {
        let storedYearList = this.props.getAcademicYearList;
        if (!storedYearList) {
            let params = { is_active: true, is_finance_page: true };
            getRequest(GET_URL.getacademicyear.api, params, this.props).then((response) => {
                if (response && response.status === 200) {
                    const yearList = response.data.data;
                    this.setFeeCollectionAcademicYear(yearList);
                    this.props.setAcademicYear(yearList);
                }
            });
        } else {
            this.setFeeCollectionAcademicYear(storedYearList);
        }
    }

    validatePostData = (id) => {
        const feeTermPlan = this.state.feeTermPlan;
        let addmission_fee_found = false;
        let partialFeePlan = '';
        let warningMessage = "You won't be able to change feeplan once approved!";
        for (let fee of feeTermPlan) {
            if (id === fee.id) {
                fee.fee_types.map((fee_type) => {
                    if (ADMISSION_CODE === fee_type.codename) {
                        addmission_fee_found = true;
                    }
                    if (fee_type.student_type == 'R' && partialFeePlan == '' && partialFeePlan == 'D') {
                        partialFeePlan = fee_type.student_type;
                    } else if (fee_type.student_type == 'D' && partialFeePlan == '' && partialFeePlan == 'R') {
                        partialFeePlan = fee_type.student_type;
                    } else {
                        partialFeePlan = fee_type.student_type;
                    }
                })
            }
        }
        if (partialFeePlan == 'R') {
            warningMessage = `You have configured only for ${partialFeePlan} Student type fees only. Once Approved You cant be able to configure for Day Scholar`;
        } else if (partialFeePlan == 'D') {
            warningMessage = `You have configured only for ${partialFeePlan} Student type fees only. Once Approved You cant be able to configure for Residential`;
        }
        // if (!addmission_fee_found) {
        //     this.setState({
        //         alertData: <FormattedMessage {...messages.viewFeeTermAdmissionFeeIsNotAddedForTheStandard} />,
        //         snackbar: true,
        //         severity: "error"
        //     });
        //     return { Result: false }
        // }
        return { 'Result': true, 'warningMessage': warningMessage }
    }

    approve = (standardId) => {
        let result = this.validatePostData(standardId)
        const { selectedType } = this.state
        if (!result['Result']) {
            return;
        }
        Swal.fire({
            title: 'Are you sure?',
            text: result['warningMessage'],
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Approve'
        }).then(async (result) => {
            if (result.value) {
                let payload = {
                    academic_year: this.state.year,
                    standard: standardId,
                    student_type: selectedType === 'D' ? 'Day Scholar' : 'Residential'
                };
                const url = POST_URL.finance_approve.api;
                postRequest(url, payload, this.props).then((response) => {
                    if (response && response.status === 200) {
                        this.getFeeTermPlan(this.state.year, 'year')
                        const title = 'Fees plan has approved successfully'
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: title,
                            showConfirmButton: false,
                            timer: 1500
                        })
                    }
                });
            }
        })
    }

    setFeeCollectionAcademicYear = (yearList) => {
        const year = checkLocalAcademicYear(yearList);
        let tempyearName = '';
        for (const yearData of yearList) {
            if (yearData['id'] === year) {
                tempyearName = yearData['name'];
                break;
            }
        }
        this.setState({ yearList, year: year ? year : '', yearName: tempyearName }, () => {
            if (year) {
                this.getFeeTermPlan();
            }
        });
        this.setState({ loading: false })
    }

    getFeeTermPlan = () => {
        this.setState({ tableLoading: true });
        let { selectedType, year } = this.state;
        let params = { is_active: 1, academic_year: year, student_type: selectedType }
        getRequest(GET_URL.getFeeTermPlan.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let data = response.data.data;
                data.forEach((temp, i) => {
                    data[i].totalAmount = 0;
                    temp.fee_types.forEach((j) => {
                        if (j.codename !== TRANSPORT_CODE) {
                            data[i].totalAmount += j.amount;
                        }
                    })
                })
                this.setState({
                    feeTermPlan: data,
                })
            }
            this.setState({ tableLoading: false })
        });

    }

    deleteType = async (id) => {
        let miscPlan = this.state.feeTermPlan
        let index = miscPlan.findIndex(data => data.id === id)
        miscPlan.splice(index, 1);
        this.setState({
            feeTermPlan: [...miscPlan]
        })
    }

    updatePostFormat = (newData) => {
        let payload = {
            amount: newData.amount
        }
        return payload
    }

    updateType = (newData, id) => {
        let miscPlan = this.state.feeTermPlan;
        for (const data of miscPlan) {
            if (data.id === id) {
                data.amount = newData.amount;
                break;
            }
        }
        this.setState({
            feeTermPlan: [...miscPlan]
        })
        return true
    }


    onChangeAcademicYear = async (e) => {
        let value = e.target.value;
        const { yearList } = this.state
        let tempyearName = '';
        if (value !== 0) {
            SetAcademicYear(value);
            for (const yearData of yearList) {
                if (yearData['id'] === value) {
                    tempyearName = yearData['name'];
                    break;
                }
            }
            this.setState({ year: value, yearName: tempyearName, tableLoading: true, alertData: '' }, () => {
                this.getFeeTermPlan();
            })
        }
    }

    onChangeStudentType = async (e) => {
        let value = e.target.value;
        this.setState({
            selectedType: value
        }, () => {
            this.getFeeTermPlan();
        })
    }

    closeSnackBar = () => {
        this.setState({
            snackbar: false,
        });
    };


    render() {
        let { loading, yearList, year, columns, feeTermPlan, alertData, selectedType, snackbar } = this.state;
        if (loading) {
            return <LoadingGif />
        } else {
            return (
                <Box>
                    <Paper className='paper-background'>
                        <Grid container>
                            <Grid item md={6} xs={12} className='header-align'>
                                <Box className='heading'>
                                    Fee Additional Charge Plan
                                </Box>
                            </Grid>
                        </Grid>
                        <Box display='flex' flexWrap='wrap'>
                            <Box mr={4} mt={3}>
                                <Dropdown
                                    data={yearList}
                                    name="year"
                                    value={year}
                                    hideSelect={true}
                                    onChange={this.onChangeAcademicYear}
                                    label={<FormattedMessage {...commonMessages.academicYear} />}
                                />
                            </Box>
                            {isResidential ?
                                <Box mt={3}>
                                    <Dropdown
                                        data={
                                            [
                                                { id: 'D', name: <FormattedMessage {...commonMessages.dayScholar} /> },
                                                { id: 'R', name: <FormattedMessage {...commonMessages.residential} /> }
                                            ]
                                        }
                                        name="student_type"
                                        value={selectedType}
                                        hideSelect={true}
                                        required={true}
                                        onChange={this.onChangeStudentType}
                                        label={<FormattedMessage {...commonMessages.studentType} />}
                                    />
                                </Box>
                                : <></>
                            }
                        </Box>
                        <Grid container className="header-align">
                            <Grid item xl={8} lg={10} xs={12}>
                                <AllMUIDataTable
                                    data={this.state.tableLoading ? [] : feeTermPlan}
                                    title={this.state.tableLoading ? <CircularProgress className='white-text' /> : ''}
                                    columns={columns}
                                    options={options}
                                />
                            </Grid>
                        </Grid>
                    </Paper>
                    <Snackbar
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        open={snackbar}
                        autoHideDuration={10000}
                        onClose={this.closeSnackBar}
                    >
                        <Alert onClose={this.closeSnackBar} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </Box>
            );
        }
    }
}

const mapStateToProps = createStructuredSelector({
    getAcademicYearList: makeSelectAcademicYear()
})
function mapDispatchToProps(dispatch) {
    return bindActionCreators({ setAcademicYear }, dispatch);
}
export default withRouter(connect(mapStateToProps, mapDispatchToProps)(ViewAdditionalCharge));