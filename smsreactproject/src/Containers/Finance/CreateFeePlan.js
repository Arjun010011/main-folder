import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Paper, Box, Grid, Hidden, Button } from '@material-ui/core';
import Swal from 'sweetalert2';
import classNames from "classnames";
import Snackbar from '@material-ui/core/Snackbar';

import MenuList from 'Containers/Finance/Components/MenuList';
import FeeTermInput from 'Containers/Finance/Components/FeeTermInput';
import { getPercentValue } from 'Includes/functions';
import { GET_URL, POST_URL } from 'Includes/urls';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { validateDate, Alert, dateFormat, getUrlParam } from 'Includes/functions';
import './styles.scss';
import { Actions } from 'Constants/permissions';

class CreateFeePlan extends Component {
    constructor(props) {
        super(props)
        this.state = {
            feePlanData: [],
            selectedFeePlan: {},
            feePlanData: [],
            localSelectedFeePlan: {},
            feePlanwholeData: {},
            alertData: '',
            snackbar: false,
        }
        this.getFeeTypes = this.getFeeTypes.bind(this);
    }

    componentDidMount() {
        let { year, standard } = getUrlParam();
        if (year && standard) {
          this.getFeeTypes(year, standard);
        } else {
          this.props.history.push(Actions.fee_term.view.url);
        }
    }

    getFeeTypes = (year, standard) => {
        const params = { academic_year: year, standard: standard };
        getRequest(GET_URL.feeplan.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let feePlanData = response.data.data.plan;
                const feePlanwholeData = response.data.data;
                let selectedFeePlan = {};
                if(feePlanData.length > 0){
                    feePlanData.forEach(plan => {
                        plan.standard_fee.forEach(fee=>{
                            fee.amount = Math.round(fee.amount); 
                            if(!Boolean(fee.payment_start_date)){
                                fee.payment_start_date = plan.academic_year_start_date
                                fee.payment_end_date = plan.academic_year_end_date
                                fee.term_start_date = plan.academic_year_start_date
                                fee.term_end_date = plan.academic_year_end_date
                            }
                        });
                    });
                    selectedFeePlan = feePlanData[0];
                }
                this.setState({ 
                    localSelectedFeePlan: selectedFeePlan,
                    feePlanData: feePlanData,
                    feePlanwholeData,
                    feePlanData,
                    selectedFeePlan,
                });
            }
        });
    }
    setFeePlan = (selectedFeePlan) => {
        
        const testTotal = this.validateTotalAmount(this.state.localSelectedFeePlan)
        if(testTotal){
            this.setState({ selectedFeePlan, feePlanData: this.state.feePlanData, localSelectedFeePlan: selectedFeePlan });
        } 
        else{
            const text = `${this.state.localSelectedFeePlan.fee_type_name} total amount and sum of terms amount is not matching.`;
                Swal.fire({
                    title: 'Are you sure?',
                    text,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'OK'
                  }).then((result) => {
                    if (result.value) {
                        this.setState({ localSelectedFeePlan: selectedFeePlan, selectedFeePlan, feePlanData: this.state.feePlanData });
                    }
                  })
        }
    }
    showErrorPopUp = (text) => {
        Swal.fire({
            type: 'error',
            title: 'Error',
            text: text,
        })
    }
    validateTotalAmount = (selectedFeePlanData) => {
        if (selectedFeePlanData) {
            const total_amount = selectedFeePlanData.amount;
            let total = 0
            for (let selectedFeeData of selectedFeePlanData.standard_fee) {
                let { amount } = selectedFeeData;
                if(isNaN(amount)){
                    amount = 0;
                }
                total = total + amount;
            }
            if (total !== total_amount) {
                return false
            }
            return true;
        }
        else {
            let feePlanData = [...this.state.feePlanData];
            for (let fee_plan_index in this.state.feePlanData) {
                let data = this.state.feePlanData[fee_plan_index];
                const total_amount = data.amount;
                let total = 0;
                for (let standard_fee_ind in data.standard_fee) {
                  let selectedFeeData = data.standard_fee[standard_fee_ind];
                  let { amount } = selectedFeeData;

                  if (!this.validateField(selectedFeeData, data)) {
                    feePlanData[fee_plan_index].hasError = true;
                    return false;
                  } else {
                    feePlanData[fee_plan_index].hasError = false;
                  }
                  if (amount == 0) {
                    const text = `Fee Type: ${data.fee_type_name} and Term ${parseInt(standard_fee_ind) + 1} can not be zero!!`;
                    this.showErrorPopUp(text);
                    return false;
                  }
                  if (isNaN(amount)) {
                    const text = `Fee Type: ${data.fee_type_name} and Term ${parseInt(standard_fee_ind) + 1} can not be special character!!`;
                    this.showErrorPopUp(text);
                    return false;
                  }
                  if (parseFloat(amount) < 0) {
                    const text = `Fee Type: ${data.fee_type_name} and Term${parseInt(standard_fee_ind) + 1} has amount with negetive value!!`;
                    this.showErrorPopUp(text);
                    return false;
                  }
                  total = total + amount;
                }
                if (total !== total_amount) {
                    const text = `${data.fee_type_name} total amount and sum of terms amount is not matching.`;
                    this.showErrorPopUp(text);
                    return false;
                }
            }
            this.setState({ feePlanData });
            return true;
        }
    }
    getPostData = () => {
        let feePlanData = [...this.state.feePlanData];
        for (let data of this.state.feePlanData) {
            for (let selectedFeeData of data.standard_fee) {
                selectedFeeData.term_start_date = dateFormat(selectedFeeData.term_start_date, 'YYYY-MM-DD');
                selectedFeeData.term_end_date = dateFormat(selectedFeeData.term_end_date, 'YYYY-MM-DD'); 
                selectedFeeData.payment_end_date = dateFormat(selectedFeeData.payment_end_date, 'YYYY-MM-DD');
                selectedFeeData.payment_start_date = dateFormat(selectedFeeData.payment_start_date, 'YYYY-MM-DD');
                selectedFeeData.rate = selectedFeeData.amount;
            }
        }
        return feePlanData;
    }
    submitFeeTems = () => {
        const url = POST_URL.feeplan.api;
        const params = this.getPostData();
        this.setState({ feePlanData: params },()=>{
            if(this.validateTotalAmount()){
                postRequest(url, params, this.props).then((response)=>{
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: response.data.Reason,
                            showConfirmButton: false,
                            timer: 1500
                        });
                        const { year, standard } = getUrlParam();
                        this.getFeeTypes(year, standard);
                        this.props.history.push(Actions.fee_term.view.url)
                    }
                });
            }
        });
    }
    validateField = (selectedFeeData, data) =>{
        let { term_start_date, term_end_date, payment_end_date, payment_start_date, terms } = selectedFeeData;
        let validate_term_start_date = validateDate(term_start_date, null, null, 'YYYY-MM-DD');
        let validate_term_end_date = validateDate(term_end_date, null, null, 'YYYY-MM-DD');
        let validate_payment_end_date = validateDate(payment_end_date, null, null, 'YYYY-MM-DD');
        let validate_payment_start_date = validateDate(payment_start_date, null, null, 'YYYY-MM-DD');
        if(validate_payment_end_date !== ''){
            this.setState({ alertData: `${validate_payment_end_date} for ${terms} payment end date to ${data.fee_type_name}`, snackbar: true, severity: "error" });
            return false;
        }
        if(validate_term_start_date !== ''){
            this.setState({ alertData: `${validate_term_start_date} for  ${terms} term start date to ${data.fee_type_name}`, snackbar: true, severity: "error" });
            return false;
        }
        if(validate_term_end_date !== ''){
            this.setState({ alertData: `${validate_term_start_date} for  ${terms} term end date to ${data.fee_type_name}`, snackbar: true, severity: "error" });
            return false;
        }
        if(validate_payment_start_date !== ''){
            this.setState({ alertData: `${validate_payment_start_date} for  ${terms} payment start date to ${data.fee_type_name}`, snackbar: true, severity: "error" });
            return false;
        }
        return true;
    }
    updateFeeData = (selectedFeePlanData, validateFieldOtherFields) =>{
        let feePlanData = [...this.state.feePlanData];
        let selectedFeePlanDataInd = null;
        for(let index in feePlanData){
            let data = feePlanData[index];
            if(feePlanData[index].id === selectedFeePlanData.id){
                selectedFeePlanDataInd = index;
                feePlanData[index] = selectedFeePlanData;
                for (let standard_fee_ind in feePlanData[index].standard_fee) {
                    let selectedStdFeeData = feePlanData[index].standard_fee[standard_fee_ind];
                    feePlanData[index].hasError = false;
                }
                
                break;
            }
        }
        let localSelectedFeePlan = selectedFeePlanData;
        if (selectedFeePlanDataInd){
            localSelectedFeePlan = feePlanData[selectedFeePlanDataInd];
        }
        this.setState({ localSelectedFeePlan, feePlanData: feePlanData });
    }
    handleClose = () => {
        this.setState({
            snackbar: false
        })
    }
    render() {
        const { selectedFeePlan, feePlanData, localSelectedFeePlan, feePlanwholeData, snackbar, alertData } = this.state;
        const updateInputFields = localSelectedFeePlan === selectedFeePlan;
        return (
            <>
                <Paper className={"paper-background"}>
                    <Box>
                    <Grid container>
                                <Grid item md={6} xs={12} className={classNames('header-align')}>
                                    <Box className='heading'> Fee Plan </Box>
                                </Grid>
                                <Grid item md={6} xs={12} >
                                    <Box className={classNames('header-align', 'end-flex-prop')}>
                                         <Button
                                            variant='contained'
                                            onClick={() => this.props.history.push(Actions.fee_term.view.url)}
                                            className='editbutton-view'
                                        ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.fee_term.view.label}</Button>
                                    </Box>
                                </Grid>
                            </Grid>
                                    <Box className={feePlanwholeData.academic_year_value ? 'year-std-info' : 'display-none'}>
                            <Box className='plan-sub-head-det'>Academic Year: <Box className='aca-std-white-background'>{feePlanwholeData.academic_year_value}</Box></Box> 
                             <Box className="std-det-plan plan-sub-head-det"> Standard: <div className='aca-std-white-background'>{feePlanwholeData.standard_name}</div></Box>
                        </Box>
                        <Box className={classNames("md-up-justify-space-between sub-header-filter-info")}>
                        
                        </Box>
                         <Box className={feePlanData.length > 0 ? "create-fee-term-body" : "display-none"}>
                            <Box className="menu-outer-box create-fee-term-item">
                                <MenuList 
                                    feePlanData={feePlanData} 
                                    setFeePlan={this.setFeePlan} 
                                    selectedFeePlan={selectedFeePlan}  
                                />
                            </Box>
                            <Box className="fee-term-inp-box create-fee-term-item">
                                <FeeTermInput 
                                    selectedFeePlan={selectedFeePlan} 
                                    updateFeeData={this.updateFeeData} 
                                    updateInputFields={updateInputFields}
                                    submitFeeTems={this.submitFeeTems}
                                    feePlanData={feePlanData}
                                    
                                /> 
                                </Box>
                        </Box>
                    </Box>
                </Paper>

                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={snackbar} autoHideDuration={10000} onClose={this.handleClose}>
                    <Alert onClose={this.handleClose} severity="error">
                        {alertData}
                    </Alert>
                </Snackbar>
            </>
        )
    }
}


export default withRouter(CreateFeePlan);
