import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { Paper, Box, Grid } from '@material-ui/core';
import Swal from 'sweetalert2';
import classNames from "classnames";
import Snackbar from '@material-ui/core/Snackbar';

// Redux
import { createStructuredSelector } from 'reselect';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { makeSelectAcademicYear } from 'Components/CommonComponent/selectors'
import { setAcademicYear } from 'Components/CommonComponent/actions';

import { Dropdown } from 'Components/DropDown';
import { ADMISSION_CODE, TRANSPORT_CODE } from 'Constants';
import CollapsableFeePlan from './Components/CollapsableFeePlan';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import { GET_URL, POST_URL, DEL_URL } from 'Includes/urls';
import { getRequest, postRequest, deleteRequest } from 'Includes/api/apicall';
import { checkLocalAcademicYear, Alert, SetAcademicYear, getSettingValue, printPDFService } from 'Includes/functions';
import loadingBar from 'images/loading.gif';

const isResidential = parseInt(getSettingValue('is_residential'));

class FeePlanView extends Component {
    state = {
        loading: true,
        yearList: [],
        year: 0,
        standard: 'ALL', 
        selectedStandardList: [],
        feesTypeViewList: [],
        downloading: false,
    }
    
    componentDidMount() {
        this.getYearsList();
    }

    setFeeCollectionAcademicYear = (yearList) => {
        const year = checkLocalAcademicYear(yearList);
        let loading = false;
        if (year !== 0) {
          loading = true;
        }
        this.setState({ yearList, year, loading }, () => {
          if (year !== 0) {
            this.getFeeTermPlans(year, "year");
          }
        });
    }

    onChange = async (e) => {
        let name = e.target.name;
        let value = e.target.value;

        if (value !== 0) {

            if (name === "year") {
                SetAcademicYear(value);
                this.getFeeTermPlans(value, name);
            }

            if (name === "standard") {
                // If selecting "ALL", pass null to API to get all standards
                // Otherwise pass the standard_id
                this.setState({ standard: value }, () => {
                    this.getFeeTermPlans(this.state.year, name);
                });
            }

            this.setState({ [name]: value });
        }
    }

    getFeeTermPlans = (value, name) => {
        this.setState({ loading: true });
        let params = { is_active: 1, academic_year: value };

        // Only add standard_id parameter if a specific standard is selected (not ALL)
        if (this.state.standard && this.state.standard !== 'ALL') {
            params.standard = this.state.standard;
        }
        getRequest(GET_URL.getFeeTermPlan.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let data = response.data.data;
                data.forEach((temp, i) => {
                    data[i].totalAmount = 0;
                    data[i].totResAmount = 0;
                    data[i].totDaySchAmount = 0;
                    temp.fee_types.forEach((j) => {
                        if( j.codename !== TRANSPORT_CODE){
                            data[i].totalAmount += j.amount;
                        }
                        if( j.codename !== TRANSPORT_CODE && isResidential ){
                            if( j['student_type'] !== 'Day Scholar' && j['student_type'] !== 'undefined'){
                                data[i].totResAmount += j.amount;
                            }if( j['student_type'] !== 'Residential' && j['student_type'] !== 'undefined'){
                                data[i].totDaySchAmount += j.amount;
                            }
                        }
                    })
                })
                this.setState({
                    feesTypeViewList: data,
                    selectedStandardList: data,
                    [name]: value,

                })
            }
            this.setState({ loading: false })
        });
    }

    getYearsList = async () => {
        let storedYearList = this.props.getAcademicYearList;
        if (!storedYearList) {
            let params = { is_active: true };
            getRequest(GET_URL.getacademicyear.api, params, this.props).then((response) => {
                if (response && response.status === 200) {
                    const yearList = response.data.data;
                    this.props.setAcademicYear(yearList);
                }
            });
        } else {
            this.setFeeCollectionAcademicYear(storedYearList);
        }
    }

    deleteCard = (id, index) => {
        const { feesTypeViewList } = this.state;
        feesTypeViewList[id].fee_types.splice(index, 1)
        this.setState({
            feesTypeViewList
        })
        const del_url = DEL_URL.addFeeType.api;
        const url = del_url + id + '/';
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                })
            }
        });
    }

    loadMore = (i, j) => {
        const { feesTypeViewList } = this.state;
        feesTypeViewList[--i].fee_types[--j].loadMore = true
        this.setState({ feesTypeViewList });
    }
    validatePostData = (id) => {
        const feesTypeViewList =  this.state.feesTypeViewList;
        let addmission_fee_found = false;
        let partialFeePlan = '';
        let errorMessage = "You won't be able to change fee plan once approved";
        for(let fee of feesTypeViewList){
            if(id === fee.id){
                fee.fee_types.map((fee_type)=>{
                    if(ADMISSION_CODE === fee_type.codename){
                        addmission_fee_found = true;
                    }
                    if( fee_type.student_type == 'Residential' &&  partialFeePlan == '' && partialFeePlan == 'Day Scholar' ){
                        partialFeePlan = fee_type.student_type;
                    }else if( fee_type.student_type == 'Day Scholar' &&  partialFeePlan == '' && partialFeePlan == 'Residential' ){
                        partialFeePlan = fee_type.student_type;
                    }else{
                        partialFeePlan = fee_type.student_type;
                    }
                })
            }
        }
        if (partialFeePlan === 'Residential') {
            errorMessage = `You have configured only for ${partialFeePlan} Student type fees only. Once Approved you can't configure for Day Scholar.`;
        } else if (partialFeePlan === 'Day Scholar') {
            errorMessage = `You have configured only for ${partialFeePlan} Student type fees only. Once Approved you can't configure for Residential.`;
        }
        // if(!addmission_fee_found){
        //     this.setState({ 
        //         alertData: Admission Fee is not added for the standard, 
        //         snackbar: true, 
        //         severity: "error" 
        //     });
        //     return { 'Result': false }
        // }
        return { 'Result': true, 'errorMessage': errorMessage }
    }
    approveAction = (id) => {
        let result = this.validatePostData(id)
        if(!result['Result']){
            return;
        }
        Swal.fire({
            title: 'Are you sure?',
            text: result['errorMessage'],
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Approve'
        }).then(async (result) => {
            if( result.value ){
                let payload = {
                    academic_year: this.state.year,
                    standard: id
                };
                const url = POST_URL.finance_approve.api;
                postRequest(url, payload, this.props).then((response) => {
                    if (response && response.status === 200) {
                        this.getFeeTermPlans(this.state.year, 'year')
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Fees plan has approved successfully',
                            showConfirmButton: false,
                            timer: 1500
                        })
                    }
                });
            }
        })
    }
    
    downloadFeePlanPDF = async () => {
        const { year, standard } = this.state

        let params = {
            academic_year: year,
            download_pdf: 1
        }

        if (standard && standard !== "ALL") {
            params.standard = standard
        }

        try {
            this.setState({ downloading: true })

            await printPDFService({
                url: GET_URL.getFeeTermPlan.api,
                params: params
            })

        } finally {
            this.setState({ downloading: false })
        }
    }

    handleClose = () => {
        this.setState({
            snackbar: false
        });
    }
    render() {
        const { history } = this.props;
        const { year, yearList, feesTypeViewList, loading, snackbar, alertData, standard } = this.state;
        // Data is filtered by backend, but we also retain UI Filtering Safety
        const filteredFeePlans =
            standard === "ALL" || !standard
                ? feesTypeViewList
                : feesTypeViewList.filter(
                    plan => String(plan.id) === String(standard) || String(plan.standard_id) === String(standard)
                );

        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className={'loader'} alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <>
                    <Paper className={"paper-background"}>
                        <Box >
                            <Grid container>
                                <Grid item md={6} xs={12} className={'header-align'}>
                                    <Box className='heading'> Fee Term </Box>
                                    <button 
                                        className={'btn btn-success'} 
                                        onClick={this.downloadFeePlanPDF}
                                        style={{ marginLeft: '15px' }}
                                        disabled={this.state.downloading}
                                    > 
                                        {this.state.downloading ? "Downloading..." : "Download PDF"} 
                                    </button>
                                </Grid>
                                <Grid item md={6} xs={12} >
                                    <Box className={classNames('md-up-end-flex-prop md-down-justify-center header-align')}>
                                        <Dropdown
                                            data={yearList}
                                            name="year"
                                            value={year}
                                            onChange={this.onChange}
                                            label="Select Academic year"
                                        />
                                        <Dropdown
                                            data={this.state.selectedStandardList}
                                            name="standard"
                                            customId="id"
                                            customName="standard_name"
                                            value={this.state.standard}
                                            onChange={this.onChange}
                                            label="Select Standard"
                                            defaultOption="ALL"
                                        />
                                    </Box>
                                </Grid>
                            </Grid>
                            <Box>
                                <Box pb={2} mt={2}>
                                    {
                                        filteredFeePlans.length === 0 &&
                                        <BlankPagewithIcon
                                            data="Please Change the Acadamic year and expect the result"
                                        />
                                    }
                                </Box>
                                <CollapsableFeePlan
                                    approveAction={this.approveAction}
                                    data={filteredFeePlans}
                                    loadMore={this.loadMore}
                                    year={year}
                                    yearName={yearList.filter((t) => t.id === year)}
                                    history={history}
                                />
                            </Box>
                        </Box>

                        <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={snackbar} autoHideDuration={10000} onClose={this.handleClose}>
                            <Alert onClose={this.handleClose} severity="error">
                                {alertData}
                            </Alert>
                        </Snackbar>
                    </Paper>
                </>
            )
        }
    }
}

const mapStateToProps = createStructuredSelector({
    getAcademicYearList: makeSelectAcademicYear()
})
function mapDispatchToProps(dispatch) {
    return bindActionCreators({ setAcademicYear }, dispatch);
}
export default withRouter(connect(mapStateToProps, mapDispatchToProps)(FeePlanView));