import React, { Component } from 'react';
import { Link, withRouter } from 'react-router-dom';
import { Grid, Paper, Box, Button } from '@material-ui/core';
import Snackbar from '@material-ui/core/Snackbar';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';

import { GET_URL, POST_URL } from 'Includes/urls';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { Alert, isUserHasPermission, getUrlParam } from 'Includes/functions';
import LoadingGif from 'Components/LoadingGif';
import { Actions } from 'Constants/permissions';
import StudentCollectionDetailedView from 'Containers/Finance/Components/StudentCollectionDetailedView';
import Swal from 'sweetalert2'
import { Dropdown } from 'Components/DropDown';
import ConcessionInvoiceView from 'Containers/Finance/ConcessionInvoiceView';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import commonMessages from 'Constants/messages';
class StudentFeeConcessionNew extends Component {
    constructor() {
        super()
        this.state = {
            yearid: '',
            standardid: '',
            studentid: '',
            loading: true,
            feePlan: [],
            studentData: {},
            disableSubmit: false,
            enabledActions: [],
            updatedData: [],
            selectedConcession: '',
            totalApplied: 0,
            reason: '',
            studentName: '',
            totalPendingAmount: 0,
            invoiceData: [],
            concessionTypeName: '',
            summaryList: [
                {'type': 'label', 'label': 'Total '},
                {'type': 'label', 'label': ''},
                {'type': 'total', 'key_to_sum' : 'amount'},
                {'type': 'total', 'key_to_sum' : 'applied_concession'},
                {'type': 'total', 'key_to_sum' : 'adjustment_amount'},
                {'type': 'total', 'key_to_sum' : 'payable_amount'}
            ],
            invoiceFields: [
                { 'name': <FormattedMessage {...messages.viewFeeTermFeeType} />, 'key': 'fee_type_name', 'is_amount': false },
                { 'name': <FormattedMessage {...messages.viewFeeTermTermName} />, 'key': 'terms', 'is_amount': false },
                { 'name': <FormattedMessage {...messages.feeAmount} />, 'key': 'amount', 'is_amount': true },
                { 'name': <FormattedMessage {...messages.concessionApplied} />, 'key': 'applied_concession', 'is_amount': true },
                { 'name': 'Fee Adjustment', 'key': 'adjustment_amount', 'is_amount': true },
                { 'name': <FormattedMessage {...messages.payableAmount} />, 'key': 'payable_amount', 'is_amount': true },
            ],
            invoiceFieldsView: [
                { 'name': <FormattedMessage {...messages.viewFeeTermFeeType} />, 'key': 'fee_type_name', 'is_amount': false },
                { 'name': <FormattedMessage {...messages.viewFeeTermsTermName} />, 'key': 'terms', 'is_amount': false },
                { 'name': <FormattedMessage {...messages.feeAmount} />, 'key': 'rate_amount', 'is_amount': true },
                { 'name': <FormattedMessage {...messages.concessionApplied} />, 'key': 'applied_concession', 'is_amount': true },
                { 'name': 'Fee Adjustment', 'key': 'adjustment_amount', 'is_amount': true },
                { 'name': <FormattedMessage {...messages.payableAmount} />, 'key': 'amount', 'is_amount': true },
            ],
            summaryListView: [
                {'type': 'label', 'label': 'Total'},
                {'type': 'label', 'label': ''},
                {'type': 'total', 'key_to_sum' : 'rate_amount'},
                {'type': 'total', 'key_to_sum' : 'applied_concession'},
                {'type': 'total', 'key_to_sum' : 'adjustment_amount'},
                {'type': 'total', 'key_to_sum' : 'amount'}
            ],
            isView: false
        }
    }

    async componentDidMount() {
        this.updatePermissions();
        let currentSelectedList = getUrlParam();
        if( !('year' in currentSelectedList) || !('standard' in currentSelectedList) || !('student' in currentSelectedList )){
            this.props.history.push(Actions.fee_collection.view.url)
        }else{
            if (this.props.location.pathname === Actions.student_fee_concession_individual.view.url) {
                this.setState({isView: true})
            }
            const { year, standard, student, name } = currentSelectedList;
            this.setState({
                yearid: year,
                standardid: standard,
                studentid: student,
                studentName: name
            }, () => {
                this.getFeePlan();
                if( !this.state.isView ){
                    this.getConcessionTypeList();
                }
            });
        }
    }

    updatePermissions = (name) => {
        const hasViewPermission = isUserHasPermission('fee_collection', 'view')
        const hasAddPermission = isUserHasPermission('fee_collection', 'create')
        const hasAdjustmentPermission = isUserHasPermission('fee_adjustment', 'create')
        let enabledActions = [];
        if (hasViewPermission) {
            enabledActions.push('view')
        }else{
            this.props.history.push(Actions.fee_collection.view.url);
        }
        if (hasAddPermission) {
            enabledActions.push('create')
        }
        this.setState({
            enabledActions: enabledActions,
            adjustmentPermission:hasAdjustmentPermission
        })
    }

    getConcessionTypeList = () => {
        const url = GET_URL.concessiontypes.api;
        const params = { is_active: true };
        getRequest(url, params, this.props).then((response) => {
          if (response && response.status === 200) {
            this.setState({
              concessionTypeList: response.data.data,
            });
          }
        });
    };

    getFeePlan = () => {
        const { studentid, yearid, standardid, isView, updatedData } = this.state;
        let concessionTypeName = '';
        let localIsPaidFullFee = false;
        let params = { academic_year: yearid, standard: standardid, student: studentid };
        getRequest(GET_URL.feeplan.api, params, this.props).then((response) => {
            let feePlan = [];
            let studentData = {};
            if (response && response.status === 200) {
                feePlan = response.data.data.plans;
                localIsPaidFullFee = response.data.data['is_paid_full_fee'];
                concessionTypeName = response.data.data['concession_type']
                feePlan.map((data)=>{
                    let tempdata =[];
                    data['standard_fee'].map((termData, index)=>{
                        termData['amount_paid'] =  termData['pending_amount'];
                        termData['is_checked'] = false;
                        if( isView && termData['concession_amount'] > 0 ){
                            termData['showinvoice'] = 1
                            termData['applied_concession'] = termData['concession_amount']
                            if( termData['is_amount'] ){
                                termData['rate_amount'] = termData['rate'];
                            }
                            tempdata.push(termData)
                        }
                    })
                    if( tempdata.length > 0 ){
                        data['standard_fee'] = tempdata;
                        updatedData.push(data)
                    }
                })
                studentData = response.data.data.student;
                this.setState({ feePlan, studentData, loading:false, isPaidFullFee: localIsPaidFullFee, 
                    totalPendingAmount: response.data.data.total_pending_amount, updatedData,
                    concessionTypeName: concessionTypeName
                });
            }
        });
    }

    updateToParent = (feePlanData, totalApplied) =>{
        this.setState({
            updatedData: feePlanData,
            totalApplied: totalApplied
        })
    }


    submitConcession = () => {
        let {updatedData} = this.state
        this.setState({disableSubmit: true});
        let temp = {};
        if( this.validatefeePlanData() ){
            Swal.fire({
                title: 'Are You Sure',
                text: `Concession can be applied once and can't be reverted or modified.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: `Apply Concession`
            }).then(async (result) => {
                if( result.value){
                    const { studentid, yearid, standardid, selectedConcession, reason } = this.state;
                    let postData = { academic_year: yearid, standard: standardid, student: studentid, 
                        concession_type: selectedConcession,
                    concession_types: [], concession_on_type: 'feetype' };
                    updatedData.map((feeData)=>{
                        feeData['standard_fee'].map((standardData)=>{
                            if( standardData['applied_concession'] > 0 ){
                                temp = {fee_plan: standardData['id'], amount: standardData['applied_concession'], 
                                reason: reason,
                                    terms: standardData?.['term_alias']??standardData['terms'], fee_type_name: feeData['fee_type_name']
                                }
                                postData['concession_types'].push(temp);
                            }
                        })
                    });
                    const url = POST_URL.concession.api;
                    postRequest(url, postData, this.props)
                    .then((response) => {
                        if (response && response.status === 200) {
                            Swal.fire({
                                position: 'top-end',
                                type: 'success',
                                title: 'Data Added successfully',
                                showConfirmButton: false,
                                timer: 1500
                            })
                            this.props.history.push(Actions.student_fee_concession.view.url)
                        }
                        this.setState({ disableSubmit: false })
                    });
                }
                this.setState({disableSubmit: false});
            });
        }else{
            this.setState({disableSubmit: false});
        }
    }

    validatefeePlanData = () =>{
        let {updatedData, totalApplied, selectedConcession} = this.state;
        let errorText = '';
        let proceed = true;
        if( !totalApplied || totalApplied <=0 ){
            errorText = <FormattedMessage {...messages.enterConcessionAmountError} />;
            proceed = false;
        }
        if( updatedData.length === 0 || !Boolean(updatedData)  ){
            proceed = false;
            errorText= 'No change'
        }
        if( !Boolean(selectedConcession) ){
            proceed = false;
            errorText = <FormattedMessage {...messages.selectConcession} />;
        }
        if( proceed ){
            updatedData.map((feeData)=>{
                feeData['standard_fee'].map((standardData)=>{
                    let pendingAmount = standardData['pending_amount'] + (standardData['concession_amount']);
                    if( standardData['applied_concession'] > pendingAmount){
                        errorText = `Applied concession is greater than pending amount in ${feeData['fee_type_name']} ${standardData?.['term_alias']??standardData['terms']}`
                        proceed = false
                    }
                })
            })
        }
        if( !proceed ){
            this.setState({
                alertData: errorText,
                snackbar: true
            })
            return false
        }
        return true;
    }

    handleSearchChange = (e) =>{
        this.setState({
            selectedConcession: e.target.value
        })
    }

    handleClose = () =>{
        this.setState({
            snackbar: false,
            alertData: ''
        })
    }

    updateReason =(e) => {
        this.setState({
            reason: e.target.value
        })
    }

    render() {
        const { feePlan, isView, disableSubmit, snackbar, 
            isPaidFullFee, alertData, loading, adjustmentEnabled, 
            selectedConcession, summaryList, summaryListView, 
            concessionTypeName } = this.state;
        if (loading) {
            return <LoadingGif />
        }
        return (
            <Paper className="paper-background ">
                <Grid container >
                    <Grid item md={6} xs={12} className={'header-align'}>
                        <Box className='heading'>Fee Concession</Box>
                        <Box display='flex'>
                            <Box className="md-up-justify-start md-down-justify-space-evenly mb-y-20">
                                <Box mt={2}>
                                    <Box className="academic-std-head"> <FormattedMessage {...commonMessages.studentName} /></Box>
                                    <Box className="aca-std-white-background">{this.state.studentData.name}</Box>
                                </Box>
                            </Box>
                            {isView &&
                                <Box className="md-up-justify-start md-down-justify-space-evenly mb-y-20" ml={3}>
                                    <Box mt={2}>
                                        <Box className="academic-std-head"> <FormattedMessage {...messages.concessionType} /></Box>
                                        <Box className="aca-std-white-background">{concessionTypeName}</Box>
                                    </Box>
                                </Box>
                            }
                        </Box>
                    </Grid>
                    <Grid item md={6} xs={12} >
                        <Box className='header-align end-flex-prop'>
                            <Button
                                variant='contained'
                                component={Link} to={Actions.student_fee_concession.view.url}
                                className='editbutton-view'
                            ><VisibilityOutlinedIcon className='visibility-icon' /> 
                            <FormattedMessage {...messages.feeConcessionList} /></Button>
                        </Box>
                    </Grid>
                </Grid>
                {!isView && 
                    <>
                        <Grid container className='place-content-center-900-mx header-align'>
                            <Grid item lg={10} sm={12}>
                                <Dropdown
                                    data={this.state.concessionTypeList}
                                    value={selectedConcession}
                                    onChange={(e) => this.handleSearchChange(e)}
                                    label='Concession Type'
                                    hideSelect={true}
                                    required={true}
                                />
                            </Grid>
                        </Grid>
                        <Grid container className='place-content-center-900-mx  header-align'>
                            <Grid item lg={10} sm={12}>
                                {
                                    feePlan.length > 0 && 
                                        feePlan.length > 0 && 
                                    feePlan.length > 0 && 
                                    <Box mt={2}>
                                        <StudentCollectionDetailedView feePlan={feePlan} adjustmentEnabled={adjustmentEnabled}
                                        updateToParent={this.updateToParent} enabledActions={this.state.enabledActions} reason={this.state.reason} 
                                        updateReason={this.updateReason} totalPendingAmount={this.state.totalPendingAmount}/>
                                    </Box>
                                }
                            </Grid>
                        </Grid>
                    </>
                }
                <Grid container className='place-content-center-900-mx'>
                    <Grid item lg={10} sm={12}>
                        <ConcessionInvoiceView invoiceData={this.state.updatedData}
                            invoiceFields={isView ? this.state.invoiceFieldsView : this.state.invoiceFields} summary={isView ? summaryListView : summaryList}
                        />
                        {(this.state.enabledActions.includes('create') && !isPaidFullFee && !isView ) &&
                            <Box textAlign='right' mt={3}>
                                <Button
                                    className={`submit`}
                                    variant="contained"
                                    disabled={disableSubmit}
                                    onClick={(e) => this.submitConcession()}>
                                    Submit
                                </Button>
                            </Box>
                        }
                    </Grid>
                </Grid>
                <Snackbar 
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} 
                    open={snackbar} 
                    autoHideDuration={10000} 
                    onClose={this.handleClose}
                >
                    <Alert onClose={this.handleClose} severity="error">
                        {alertData}
                    </Alert>
                </Snackbar>
            </Paper>
        )
    }
}

export default withRouter(StudentFeeConcessionNew)
