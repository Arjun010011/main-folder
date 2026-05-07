import React, { Component } from 'react';
import { withRouter, Link } from 'react-router-dom';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Box, CircularProgress, Button, Paper, Grid, TextField, Tooltip } from '@material-ui/core';
import Swal from 'sweetalert2';
import Snackbar from '@material-ui/core/Snackbar';
import { numberWithCommasWithoutSymbol } from 'Includes/functions';
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import _ from 'lodash';

import { GET_URL, POST_URL } from 'Includes/urls';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { validateDate, Alert, dateFormat, getUrlParam } from 'Includes/functions';
import './styles.scss';
import { Actions } from 'Constants/permissions';
import { FormattedMessage } from 'react-intl';
import commonMessages from 'Constants/messages';
import messages from './messages';
import NumberFormat from 'react-number-format';
import { DropDownWithSearch } from 'Components/DropDownWithSearch';

function NumberFormatCustom(props) {
    const { inputRef, onChange, ...other } = props;

    return (
        <NumberFormat
            {...other}
            thousandsGroupStyle="lakh"
            thousandSeparator={true}
            getInputRef={inputRef}
            onValueChange={(values) => {
                onChange({
                    target: {
                        name: props.name,
                        value: values.value,
                    },
                });
            }}
            isNumericString
            prefix="₹ "
        />
    );
}


class StandardConcessionAdd extends Component {
    constructor(props) {
        super(props)
        this.state = {
            feePlanData: [],
            selectedFeePlan: {},
            feePlanwholeData: {},
            alertData: '',
            snackbar: false,
            permissions: ['create'],
            studentType: '',
            standardName: '',
            expandedRowsIndex: [0],
            pendingFeePlan: [],
            concessionTypeList: [],
            selectedConcessionType: '',
            submitDisable: false,
            concessionAmount: '',
            totalAmount: '',
            percentage: ''
        };
        this.getFeeTypes = this.getFeeTypes.bind(this);
    }

    componentDidMount() {
        let { year, standard, studentType, standardName } = getUrlParam();
        if (year && standard && studentType) {
            this.setState({ tableUpdating: true, studentType: studentType, standardName: standardName })
            this.getConcessionTypeList()
            this.getFeeTypes(year, standard, studentType);
        } else {
            this.props.history.push(Actions.fee_term.view.url);
        }
    }

    getConcessionTypeList = () => {
        const url = GET_URL.concessiontypes.api;
        const params = { is_active: true, automatic_concession_only: 1 };
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                this.setState({
                    concessionTypeList: response.data.data,
                });
            }
        });
    };

    getFeeTypes = (year, standard, studentType) => {
        const params = { academic_year: year, standard: standard, student_type: studentType };
        const url =GET_URL.feeplan.api
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let totalAmount = 0
                let feePlanData = response.data.data.plan;
                if (feePlanData.is_approved) {
                    this.props.history.push(Actions.fee_standard_concession.view.url);
                    return
                }
                if (feePlanData.length > 0) {
                    feePlanData.forEach((plan, index) => {
                        plan.standard_fee.forEach(fee => {
                            totalAmount += fee.amount;
                            fee.amount = Math.round(fee.amount);
                            fee.fee_fine_frequency_in_days = Math.round(fee.fee_fine_frequency_in_days);
                            fee.fee_fine_rate = Math.round(fee.fee_fine_rate);
                            fee.max_fee_fine_rate = Math.round(fee.max_fee_fine_rate);
                            fee.concession_amount=fee?.automatic_concession_data?.concession_fee_plan_mapping?.concession_amount??0;
                            if (!Boolean(fee.payment_start_date)) {
                                fee.payment_start_date = plan.academic_year_start_date
                                fee.payment_end_date = plan.academic_year_end_date
                                fee.term_start_date = plan.academic_year_start_date
                                fee.term_end_date = plan.academic_year_end_date
                            }
                            if(fee?.automatic_concession_data?.concession_fee_plan_mapping){
                                fee.concession_id=fee?.automatic_concession_data?.concession_fee_plan_mapping?.id
                            }
                        });
                        feePlanData[index]['total_terms'] = plan.standard_fee.length;
                    });
                }
                this.setState({
                    feePlanData,
                    pendingFeePlan: feePlanData,
                    tableUpdating: false,
                    totalAmount,
                    selectedConcessionType: response.data.data?.automatic_concession_details ?? ''
                });
            } else {
                this.setState({
                    tableUpdating: false
                })
            }
        });
    }

    showErrorPopUp = (text) => {
        this.setState({ snackbar: true, alertData: text })
    }

    validateAndGetPostFormat = () => {
        const { selectedConcessionType } = this.state;
        let enteredConcession = false;
        let tempselectedFeeType = this.state.pendingFeePlan
        tempselectedFeeType.map((data) => {
            data['standard_fee'].map((standardFee) => {
                if (parseFloat(standardFee.concession_amount) >= 0) {
                    enteredConcession = true
                    return
                }
            });
        });
        if (!enteredConcession) {
            this.setState({ alertData: 'Enter Concession Amount', snackbar: true })
            return false;
        }
        if (!selectedConcessionType) {
            this.setState({ alertData: 'Select Concession Type', snackbar: true })
            return false;
        }
        let feePlanData = [...this.state.pendingFeePlan];
        let fee_term_list = []
        for (let data of feePlanData) {
            for (let selectedFeeData of data.standard_fee) {
                if (selectedFeeData.concession_amount >= 0) {
                    fee_term_list.push({ fee_plan: selectedFeeData.id, concession_amount: selectedFeeData.concession_amount , id: selectedFeeData?.concession_id ?? null})
                }
            }
        }
        let post_data = {
            concession_type: selectedConcessionType.id,
            fee_term_list: fee_term_list
        }
        return post_data;
    }

    submitFeeTems = () => {
        const url = POST_URL.feeplanconcession.api;
        if (this.validateAndGetPostFormat()) {
            this.setState({submitDisable:true},()=>{
                postRequest(url, this.validateAndGetPostFormat(), this.props).then((response) => {
                    this.setState({submitDisable:false})
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
                    this.props.history.push(Actions.fee_standard_concession.view.url)
                }
            }); 
        })
        }
    }

    getTitle = () => {
        if (this.state.tableUpdating || this.props.loading) {
            return <CircularProgress className="white-text" />;
        }
    };

    handleCloseSnackbar = () => {
        this.setState({ alertData: '', snackbar: false });
    }

    expandGivenRosws = (allRowsExpanded) => {
        let temprowsExpanded = allRowsExpanded.map((data) => {
            return data['index']
        })
        this.setState({
            expandedRowsIndex: temprowsExpanded
        })
    }

    getTotalAmount = () => {
        let totalAmount = 0;
        let tempselectedFeeType = this.state.pendingFeePlan
        tempselectedFeeType.map((data) => {
            data['standard_fee'].map((standardFee) => {
                totalAmount += parseFloat(standardFee?.concession_amount ?? 0)
            });
        });
        return totalAmount;
    }

    changeFeePlan = (e, findex, sindex) => {
        let { name, value } = e.target;
        let { pendingFeePlan } = this.state;
        pendingFeePlan[findex]['standard_fee'][sindex][name] = value
        this.setState({
            pendingFeePlan,
        })
    }

    onChangeConcessionType = (e, newValue) => {
        this.setState({
            selectedConcessionType: newValue
        })
    }

    applyConcession = () => {
        const { concessionAmount, pendingFeePlan, totalAmount } = this.state;
        let tempFeePlan = _.cloneDeep(pendingFeePlan);
        if (isNaN(concessionAmount)) {
            this.setState({
                alertData: <FormattedMessage {...commonMessages.enterValidAmount} />,
                snackbar: true
            })
            return false;
        }
        if (concessionAmount <= 0) {
            this.setState({
                alertData: <FormattedMessage {...commonMessages.enterAmountError} />,
                snackbar: true
            })
            return false;
        }
        if (concessionAmount > totalAmount) {
            this.setState({
                alertData: 'The concession amount entered exceeds the total amount.',
                snackbar: true
            })
            return false;
        }
        let newtempFeePlan = this.updateWithConcessionPercentage(tempFeePlan);
        newtempFeePlan = this.calculateConcession(newtempFeePlan, concessionAmount);
        this.setState({
            pendingFeePlan: [...newtempFeePlan]
        })
    }

    applyPercentageConcession = () => {
        const { percentage, totalAmount } = this.state;
        if (isNaN(percentage)) {
            this.setState({
                alertData: <FormattedMessage {...commonMessages.enterValidAmount} />,
                snackbar: true
            })
            return false;
        }
        if (percentage <= 0) {
            this.setState({
                alertData: <FormattedMessage {...commonMessages.enterAmountError} />,
                snackbar: true
            })
            return false;
        }
        let concessionAmount = (totalAmount * percentage) / 100
        this.setState({
            concessionAmount
        }, () => {
            this.applyConcession()
        })
    }

    updateWithConcessionPercentage = (tempFeePlan) => {
        let totalPendingAmount = 0; //selected fee type total pending amount
        tempFeePlan.forEach(element => {
            totalPendingAmount += element['amount'];
        });
        tempFeePlan.map((feeData) => {
            let feePercentage = this.getPercentageForAmount(totalPendingAmount, feeData['amount']);
            feeData['standard_fee'].map((standardData) => {
                standardData['concession_percentage_local'] = this.getPercentageForTerm(feeData['amount'], feePercentage, standardData['amount'])
            })
        })
        return tempFeePlan;
    }

    getPercentageForAmount = (totalAmount, amount) => {
        return ((amount / totalAmount) * 100);
    }

    getPercentageForTerm = (totalAmount, totalPercentage, standardPending) => {
        return ((totalPercentage * standardPending) / totalAmount); //check how much percentage for each term
    }

    changeConcessionAmount = (value) => {
        this.setState({
            concessionAmount: value,
            percentage: ''
        })
    }

    changePercentageAmount = (value) => {
        if (value > 100) {
            return
        }
        this.setState({
            percentage: value
        })
    }

    calculateConcession = (tempFeePlan, concessionAmount) => {
        let remainingFraction = 0;
        let applyingConcession = 0;
        tempFeePlan.map((data, findex) => {
            data['standard_fee'].map((standardData, index) => {
                applyingConcession = ((standardData['concession_percentage_local'] / 100) * concessionAmount);
                remainingFraction += Math.abs(Math.floor(applyingConcession) - applyingConcession);
                applyingConcession = Math.floor(applyingConcession)
                standardData['concession_amount'] = applyingConcession;
                standardData['showinvoice'] = 1;
            })
        })
        remainingFraction = Math.round(remainingFraction);
        let pendingAmount = 0;
        let appliedConcession = 0;
        let count = 0;
        loop1:
        while (remainingFraction > 0) {
            if (count > 150) { //for safety puropose
                break;
            }
            for (let i = 0; i < tempFeePlan.length; i++) {
                for (let j = 0; j < tempFeePlan[i]['standard_fee'].length; j++) {
                    pendingAmount = tempFeePlan[i]['standard_fee'][j]['amount'];
                    appliedConcession = tempFeePlan[i]['standard_fee'][j]['concession_amount'];
                    if ((pendingAmount - appliedConcession) > 0) {
                        tempFeePlan[i]['standard_fee'][j]['concession_amount'] += 1;
                        tempFeePlan[i]['standard_fee'][j]['showinvoice'] = 1;
                        tempFeePlan[i]['standard_fee'][j]['payable_amount'] = (
                            parseFloat(tempFeePlan[i]['standard_fee'][j]['amount']) - parseFloat(tempFeePlan[i]['standard_fee'][j]['concession_amount'])
                        );
                        remainingFraction--;
                        if (remainingFraction <= 0) {
                            break loop1;
                        }
                    }
                }
            }
        }
        return tempFeePlan;
    }

    render() {
        const { feePlanData, permissions, studentType, pendingFeePlan, concessionTypeList, selectedConcessionType,
            snackbar, alertData, standardName, expandedRowsIndex, submitDisable, concessionAmount, totalAmount,
            percentage
        } = this.state;
        return (
            <Box>
                <Paper className='paper-background'>
                    <Grid container>
                        <Grid item md={6} xs={12} className='header-align'>
                            <Box className='heading'>
                                {Actions.fee_standard_concession.create.label}
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12} >
                            <Box className='header-align end-flex-prop'>
                                <Button
                                    variant='contained'
                                    component={Link} to={Actions.fee_standard_concession.view.url + '?studentType=' + studentType}
                                    className='editbutton-view'
                                ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.fee_standard_concession.create.label}</Button>
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12} >
                            <Box className="year-std-box" mr={2}>
                                <Box className="academic-std-head"> <FormattedMessage {...commonMessages.standard} /> </Box>
                                <Box className="aca-std-white-background">{standardName}</Box>
                            </Box>
                        </Grid>
                    </Grid>
                    <Paper className='paper-plain-background mt-20'>
                        <Grid container>
                            <Grid item lg={8} md={10} sm={12}>
                                <Box display='flex' mt={2} mb={2} className='align-items-center'>
                                    <Box className='mt-20'>
                                        <DropDownWithSearch
                                            id="combo-box-demo"
                                            options={concessionTypeList}
                                            value={selectedConcessionType}
                                            onChange={(e, newValue) => this.onChangeConcessionType(e, newValue)}
                                            optionValue='name'
                                            label={'Select Concession Type'}
                                            autoCompleteClassName='width-300px'
                                            className='width-inherit bg-white'
                                        />
                                    </Box>
                                    <div className='sub-heading text-align-end mt-20 w-100'>Total Amount : {totalAmount}</div>
                                </Box>
                                <Box mt={2} className='text-align-end '>
                                    <TextField
                                        onChange={(e) => this.changePercentageAmount(e.target.value)}
                                        value={percentage}
                                        type="number"
                                        style={{ width: '200px', textAlign: 'right' }}
                                        inputProps={{
                                            max: 100
                                        }}
                                    />
                                    <Tooltip title={'Divide and Apply to all the below fee and terms'} enterDelay={400} enterNextDelay={400} placement='top-start'>
                                        <Button color="primary" variant="outlined" style={{ verticalAlign: 'bottom', marginLeft: '10px', marginRight: '10px' }} onClick={() => this.applyPercentageConcession()}>
                                            Percentage
                                        </Button>
                                    </Tooltip>
                                    <TextField
                                        onChange={(e) => this.changeConcessionAmount(e.target.value)}
                                        value={concessionAmount}
                                        type="number"
                                        style={{ width: '200px', textAlign: 'right' }}
                                    />
                                    <Tooltip title={'Divide and Apply to all the below fee and terms'} enterDelay={400} enterNextDelay={400} placement='top-start'>
                                        <Button color="primary" variant="outlined" style={{ verticalAlign: 'bottom', marginLeft: '10px' }} onClick={() => this.applyConcession()}>
                                            Divide
                                        </Button>
                                    </Tooltip>
                                </Box>
                                <table className='quick-pay-table mb-30 mt-30'>
                                    <thead>
                                        <tr className='fs-14 quick-pay-thead font-weight-bold'>
                                            <td><FormattedMessage {...messages.viewFeeTermFeeType} /></td>
                                            <td className='text-align-right'><FormattedMessage {...messages.viewFeeTermTotalAmount} /></td>
                                            <td><FormattedMessage {...messages.concessionAmount} /></td>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {
                                            pendingFeePlan.map((feeData, findex) => {
                                                return <>
                                                    {feeData['standard_fee'].map((standardData, sindex) => {
                                                        return <tr>
                                                            <td>
                                                                <Box>{feeData['fee_type_name']} ({standardData?.['term_alias']??standardData['terms']})</Box>
                                                            </td>
                                                            <td className='text-align-right'>
                                                                {numberWithCommasWithoutSymbol(standardData['amount'])}
                                                            </td>
                                                            <td>
                                                                <TextField
                                                                    autoComplete='off'
                                                                    name='concession_amount'
                                                                    variant='outlined'
                                                                    size="small"
                                                                    error={Boolean(standardData['amount_paid_error']) ? true : false}
                                                                    helperText={Boolean(standardData['amount_paid_error']) ? standardData['amount_paid_error'] : ''}
                                                                    value={standardData['concession_amount']}
                                                                    InputProps={{
                                                                        inputComponent: NumberFormatCustom,
                                                                    }}
                                                                    onChange={(e) => this.changeFeePlan(e, findex, sindex)}
                                                                    inputProps={{ style: { textAlign: 'right' } }}
                                                                />
                                                            </td>
                                                        </tr>
                                                    })
                                                    }
                                                </>
                                            })
                                        }
                                        <tr style={{ marginTop: "1rem" }}>
                                            <td className='padding-top-10'><Box fontWeight="bold"> Total </Box></td>
                                            <td></td>
                                            <td className='padding-top-10'>
                                                <TextField
                                                    size="small"
                                                    style={{ border: 'none' }}
                                                    InputProps={{
                                                        inputComponent: NumberFormatCustom,
                                                    }}
                                                    value={this.getTotalAmount()}
                                                    disabled={true}
                                                    inputProps={{ style: { fontWeight: 'bold', color: 'black', textAlign: 'right' } }}
                                                />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                                <Box className="submt-button-float-bottom" mt={3}>
                                    <Button variant='contained'
                                        color='primary' className='submit'
                                        disabled={submitDisable}
                                        onClick={() => this.submitFeeTems()}>
                                        <FormattedMessage {...messages.applyConcession} />
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </Paper>
                </Paper>
                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={snackbar} autoHideDuration={5000} onClose={this.handleCloseSnackbar}>
                    <Alert onClose={this.handleCloseSnackbar} severity="error">
                        {alertData}
                    </Alert>
                </Snackbar>
            </Box>
        )
    }
}


export default withRouter(StandardConcessionAdd);