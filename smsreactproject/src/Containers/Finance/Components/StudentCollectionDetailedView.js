/* eslint-disable react/jsx-key */
import React from "react";
import { makeStyles } from '@material-ui/core/styles';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { Box, Grid, Divider, Tooltip, Button } from '@material-ui/core';
import TextField from '@material-ui/core/TextField';
import _ from 'lodash';
import CheckCircleOutlinedIcon from "@material-ui/icons/CheckCircleOutlined";
import WarningIcon from '@material-ui/icons/Warning';
import { numberWithCommas, isUserHasPermission, NumberFormatCustom, numberWithCommasWithoutSymbol } from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import Snackbar from '@material-ui/core/Snackbar';
import { Alert } from 'Includes/functions';
import { FormattedMessage } from 'react-intl';
import messages from '../messages';
import commonMessages from 'Constants/messages';
import InfoIcon from '@material-ui/icons/Info';

const useStyles = makeStyles({
    expanded: {
        '&$expanded': {
            margin: '0px 0',
            height: '0px',
            backgroundColor: '#f8f8ff',
            borderBottom: '1px solid rgba(0,0,0,.125)'
        },
        minHeight: '60px'
    },
    root: {
        boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.15)',
        marginBottom: '20px'
    }
});

export default function FeeCollectionStudentProfilefrom(props) {
    const classes = useStyles();
    const [feePlan, setFeePlan] = React.useState([]);
    const [intialData, setIntialData] = React.useState([]);
    const [isAddPermission, setAddPermission] = React.useState(false)
    const [feeTypeList, setFeeTypeList] = React.useState([]);
    const [selectedFeeType, setselectedFeeType] = React.useState([])
    const [concessionAmount, setConcessionAmount] = React.useState('')
    const [snackbar, setSnackbar] = React.useState(false)
    const [alertData, setAlertData] = React.useState('')
    const [severity, setSeverity] = React.useState('error')
    const [totalPendingAmount, settotalPendingAmount] = React.useState(0)

    // const [maximumAmount, setMaximumAmount] = React.useState(0)

    const changeConcessionAmount = (value) => {
        if (value >= 0 && value <= totalPendingAmount) {
            setConcessionAmount(value)
        }
    }

    const updatePermissions = () => {
        const hasAddPermission = isUserHasPermission('fee_collection', 'create')
        const hasViewPermission = isUserHasPermission('fee_collection', 'view')
        if (!hasViewPermission) {
            props.history.push(Actions.fee_collection.view.url);
        }
        if (hasAddPermission) {
            setAddPermission(hasAddPermission)
        }
    }

    const setToDefault = (feeplanData) => {
        let tempFeePlan = _.cloneDeep(feeplanData);
        let totalAmount = 0;
        let totPendingAmount = 0;
        let tempFeeTypeList = [];
        let tempAmount = 0;
        let totalAmountNew = 0;
        let selectedFeeType = [];
        let standard_fee_temp = []
        tempFeePlan.map((data, findex) => {
            totalAmount = 0;
            totalAmountNew = 0;
            totPendingAmount = 0;
            tempAmount = 0;
            standard_fee_temp = []
            if ('standard_fee' in data) {
                data.standard_fee.map((feetermData, index) => {
                    feetermData.is_checked = false;
                    if (!feetermData.is_disabled) {
                        totalAmountNew += feetermData.amount;
                    }
                    totalAmount += (feetermData.is_amount) ? parseFloat(feetermData.rate) : parseFloat(feetermData.rate_amount)
                    if (feetermData.pending_amount > 0 && !feetermData.is_disabled) {
                        totalAmount += feetermData.pending_amount;
                        totPendingAmount += feetermData.pending_amount;
                        feetermData.amount_paid = '';
                        tempAmount++;
                        standard_fee_temp.push(feetermData)
                    }
                });
            }
            data.standard_fee = [...standard_fee_temp]
            data['total_amount_local'] = totalAmount;
            data['amount'] = totalAmountNew;
            data['total_pending_amount_local'] = totPendingAmount;
            if (tempAmount > 0) {
                tempFeeTypeList.push({ value: data['id'], label: data['fee_type_name'] })
            }
            selectedFeeType.push({ 'value': data['id'], 'label': data['fee_type_name'] })
        });
        setselectedFeeType(() => selectedFeeType);
        setFeePlan(() => tempFeePlan);
        setFeeTypeList(tempFeeTypeList);
        props.updateToParent(tempFeePlan, getAppliedConcession(tempFeePlan))
    }

    const applyConcession = () => {
        let tempFeePlan = _.cloneDeep(feePlan);
        let selectedFeeTypeIds = {};
        selectedFeeType.map(({ value, label }) => {
            selectedFeeTypeIds[value] = label;
        })
        if (!selectedFeeType || Object.keys(selectedFeeType).length === 0) {
            setAlertData(<FormattedMessage {...messages.selectFeeType} />);
            setSnackbar(true)
            return false;
        }
        if (isNaN(concessionAmount)) {
            setAlertData(<FormattedMessage {...commonMessages.enterValidAmount} />);
            setSnackbar(true)
            return false;
        }
        if (concessionAmount <= 0) {
            setAlertData(<FormattedMessage {...commonMessages.enterAmountError} />);
            setSnackbar(true)
            return false;
        }
        if (concessionAmount > totalPendingAmount) {
            setAlertData(<FormattedMessage {...messages.concessionAmountGreaterThanPending} />);
            setSnackbar(true)
            return false;
        }
        let newtempFeePlan = getSlectedFeeType(tempFeePlan, selectedFeeTypeIds);
        newtempFeePlan = updateWithConcessionPercentage(newtempFeePlan);
        newtempFeePlan = calculateConcession(newtempFeePlan, concessionAmount);
        tempFeePlan.map((feeData) => {
            if (feeData['id'] in selectedFeeTypeIds) {
                for (let i in newtempFeePlan) {
                    if (i['id'] === feeData['id']) {
                        feeData['standard_fee'] = i['standard_fee'];
                        break;
                    }
                }
            }
        })
        setFeePlan(() => tempFeePlan)
        setAlertData(<FormattedMessage {...messages.concessionApplied} />)
        setConcessionAmount('');
        props.updateToParent(tempFeePlan, getAppliedConcession(tempFeePlan));
    }

    const updateWithConcessionPercentage = (tempFeePlan) => {
        let totalPendingAmount = 0; //selected fee type total pending amount
        tempFeePlan.forEach(element => {
            totalPendingAmount += element['total_pending_amount_local'];
        });
        tempFeePlan.map((feeData) => {
            let feePercentage = getPercentageForAmount(totalPendingAmount, feeData['total_pending_amount_local']);
            feeData['standard_fee'].map((standardData) => {
                standardData['concession_percentage_local'] = getPercentageForTerm(feeData['total_pending_amount_local'], feePercentage, standardData['pending_amount'])
            })
        })
        return tempFeePlan;
    }

    const getSlectedFeeType = (tempFeePlan, selectedFeetypeIds) => {
        let returnData = [];
        tempFeePlan.map((data) => {
            if (data['pending_amount'] > 0 && data['id'] in selectedFeetypeIds) {
                returnData.push(data);
            }
        })
        return returnData;
    }

    const getPercentageForAmount = (totalAmount, amount) => {
        return ((amount / totalAmount) * 100);
    }

    const getPercentageForTerm = (totalAmount, totalPercentage, standardPending) => {
        return ((totalPercentage * standardPending) / totalAmount); //check how much percentage for each term
    }

    const calculateConcession = (tempFeePlan, concessionAmount) => {
        let remainingFraction = 0;
        let applyingConcession = 0;
        tempFeePlan.map((data, findex) => {
            data['standard_fee'].map((standardData, index) => {
                applyingConcession = ((standardData['concession_percentage_local'] / 100) * concessionAmount);
                remainingFraction += Math.abs(Math.floor(applyingConcession) - applyingConcession);
                applyingConcession = Math.floor(applyingConcession)
                standardData['applied_concession'] = applyingConcession;
                standardData['payable_amount'] = parseFloat(standardData['amount']) - parseFloat(standardData['applied_concession']);
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
                    pendingAmount = tempFeePlan[i]['standard_fee'][j]['pending_amount'];
                    appliedConcession = tempFeePlan[i]['standard_fee'][j]['applied_concession'];
                    if ((pendingAmount - appliedConcession) > 0) {
                        tempFeePlan[i]['standard_fee'][j]['applied_concession'] += 1;
                        tempFeePlan[i]['standard_fee'][j]['showinvoice'] = 1;
                        tempFeePlan[i]['standard_fee'][j]['payable_amount'] = (
                            parseFloat(tempFeePlan[i]['standard_fee'][j]['amount']) - parseFloat(tempFeePlan[i]['standard_fee'][j]['applied_concession'])
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

    const onchangeConcesssion = (e, index, findex) => {
        let tempFeePlan = _.cloneDeep(feePlan);
        if (parseFloat(tempFeePlan[index]['standard_fee'][findex]['pending_amount']) >= parseFloat(e.target.value) || e.target.value === '') {
            tempFeePlan[index]['standard_fee'][findex]['applied_concession'] = parseFloat(e.target.value)
            tempFeePlan[index]['standard_fee'][findex]['showinvoice'] = 1
            tempFeePlan[index]['standard_fee'][findex]['payable_amount'] = tempFeePlan[index]['standard_fee'][findex]['amount'] - parseFloat(e.target.value)
        }
        setFeePlan(tempFeePlan)
        props.updateToParent(tempFeePlan, getAppliedConcession(tempFeePlan))
    }

    const getAppliedConcession = (tempFeePlan) => {
        let tempTotal = 0;
        tempFeePlan.map((feeData) => {
            feeData['standard_fee'].map((standardData) => {
                if (standardData['applied_concession'] && standardData['applied_concession'] != '') {
                    tempTotal += parseFloat(standardData['applied_concession']);
                }
            })
        })
        return tempTotal;
    }

    React.useEffect(() => {
        setToDefault(props.feePlan);
        let tempClone = _.cloneDeep(props.feePlan);
        setIntialData(tempClone)
        settotalPendingAmount(props.totalPendingAmount);
        updatePermissions()
    }, []);

    const showPaidAmount = (feeSummary) => {
        return <table>
            <tr>
                <td>
                    Total Paid Amount
                </td>
                <td>{numberWithCommasWithoutSymbol(feeSummary.paid_amount - feeSummary.total_fine_paid_amount)}</td>
            </tr>
            {feeSummary.total_fine_paid_amount > 0 &&
                <tr>
                    <td>
                        Fine Paid Amount
                    </td>
                    <td>{numberWithCommasWithoutSymbol(feeSummary.total_fine_paid_amount)}</td>
                </tr>
            }
            <tr>
                <td>
                    <hr />
                    Term Paid Amount
                </td>
                <td>
                    <hr />
                    <div className='text-align-right' >{numberWithCommasWithoutSymbol(feeSummary.paid_amount)}</div>
                </td>
            </tr>
        </table>
    }

    return (
        <div>
            <Box mt={1} pb={2}>
                <Box>
                    <div>Reason</div>
                    <textarea rows="2" style={{ maxWidth: '320px', minWidth: '220px', width: '100%' }} value={props.reason}
                        onChange={(e) => props.updateReason(e)} className="text-area-css" maxLength="100" />
                </Box>
                <Box mt={2}>
                    <TextField
                        onChange={(e) => changeConcessionAmount(e.target.value)}
                        value={concessionAmount}
                        type="number"
                        style={{ width: '150px', textAlign: 'right' }}
                    />
                    <Tooltip title={'Divide and Apply to all the below fee and terms'} enterDelay={400} enterNextDelay={400} placement='top-start'>
                        <Button color="primary" variant="outlined" style={{ verticalAlign: 'bottom', marginLeft: '10px' }} onClick={() => applyConcession()}>
                            Divide
                        </Button>
                    </Tooltip>
                </Box>
            </Box>
            {
                feePlan.map((data, findex) => {
                    return <div key={findex} className={classes.root}><Accordion key={findex} defaultExpanded>
                        <AccordionSummary
                            expandIcon={data['total_pending_amount_local'] ? <ExpandMoreIcon /> : <Box> </Box>}
                            aria-label="Expand"
                            aria-controls="additional-actions1-content"
                            id="additional-actions1-header"
                            className={classes.expanded}
                        >
                            <div className='feecollection-feetype-heading display-flex'>
                                {data.fee_type_name}
                                {
                                    (data.reason) ? <Tooltip title={data.reason} enterDelay={400} enterNextDelay={400} placement='top-start' arrow>
                                        <Box ml={2} ><WarningIcon style={{ color: '#f6c342' }} /></Box>
                                    </Tooltip>
                                        : ''
                                }
                            </div>
                            <Box className='feecollection-feetype-heading margin-left-auto'>
                                {numberWithCommas(data.total_amount)}
                            </Box>
                            <Box>
                                {parseFloat(data['total_pending_amount_local']) <= 0 && !(data.reason) &&
                                    <Box color='green' textAlign='right'> Fee Paid</Box>
                                }
                            </Box>
                            <Divider />
                        </AccordionSummary>
                        {data['total_pending_amount_local'] > 0 &&
                            <Grid className='d-flex flex-wrap padding-top-10'>
                                {
                                    (data['reason']) ?
                                        <Grid item xl={12} className='margin-bottom-20 pb-5'>
                                            <Box display="flex" className='warning-message' mb={2} mt={2}>
                                                <WarningIcon style={{ color: '#f6c342' }} /> {data['reason']}
                                            </Box>
                                        </Grid>
                                        :
                                        data.standard_fee.map((feetermData, index) => {
                                            let is_amount_checked = feetermData.is_checked;
                                            let selectedClassName = (is_amount_checked) ? 'selected-checkbox rounded-box display-flex' : 'rounded-box display-flex';
                                            let isNotOpted = feetermData['is_disabled'];
                                            if (!feetermData['total_pending_amount_local'] || isNotOpted) {
                                                selectedClassName += ' opacity';
                                            }
                                            if (!isNotOpted) {
                                                return <Grid item md={6} xl={6} key={index} className='margin-bottom-20 pb-5'>
                                                    {<div className={selectedClassName} >
                                                        <div className='margin-left-10 pt-6 margin-right-10 w-100'>
                                                            <div className='feecollection-term-name'>
                                                                {feetermData.terms}
                                                            </div>
                                                            <div className='term-total-amount d-flex'>
                                                                <div>
                                                                    <FormattedMessage {...messages.termTotal} />
                                                                </div>
                                                                {/* fetch amount from rate_amount when fee type is percentage */}
                                                                <div className='margin-left-auto'>{(feetermData.is_amount) ?
                                                                    numberWithCommas(feetermData.total_amount) : numberWithCommas(feetermData.rate_amount)}</div>
                                                            </div>
                                                            {!!feetermData.concession_amount &&
                                                                <div className='term-pending-amount d-flex'>
                                                                    <div>
                                                                        <FormattedMessage {...messages.concessionAmount} />
                                                                    </div>
                                                                    <div className='margin-left-auto'>
                                                                        {numberWithCommas(-feetermData.concession_amount)}
                                                                    </div>
                                                                </div>
                                                            }
                                                            {!!feetermData.adjustment_amount &&
                                                                <div className='term-pending-amount d-flex'>
                                                                    <div>
                                                                        <FormattedMessage {...messages.adjustedAmount} />
                                                                    </div>
                                                                    <div className='margin-left-auto'>
                                                                        {numberWithCommas(-feetermData.adjustment_amount)}
                                                                    </div>
                                                                </div>
                                                            }
                                                            <div className='term-paid-amount d-flex '>
                                                                <div className="align-items-center display-flex pointer">
                                                                    <FormattedMessage {...commonMessages.amountPaid} />
                                                                    {('total_fine_paid_amount' in feetermData && feetermData['total_fine_paid_amount'] > 0) &&
                                                                        <Tooltip title={showPaidAmount(feetermData)} enterDelay={400}
                                                                            enterNextDelay={400} placement='top-start' className='text-info' arrow
                                                                        >
                                                                            <InfoIcon />
                                                                        </Tooltip>
                                                                    }
                                                                </div>
                                                                <div className='margin-left-auto'>
                                                                    {numberWithCommas(feetermData.paid_amount)}
                                                                </div>
                                                            </div>
                                                            <div className='term-pending-amount d-flex'>
                                                                <div>
                                                                    <FormattedMessage {...messages.pendingAmount} />
                                                                </div>
                                                                <div className='margin-left-auto'>
                                                                    {numberWithCommas(feetermData.pending_amount)}
                                                                </div>
                                                            </div>
                                                            {
                                                                feetermData['pending_amount'] ? (
                                                                    <Box mt={1} style={{ backgroundColor: '#edf2ff', padding: '10px 10px 15px 18px' }}>
                                                                        <TextField value={feetermData['applied_concession']}
                                                                            label={<FormattedMessage {...messages.concessionAmount} />}
                                                                            InputLabelProps={{ shrink: true }}
                                                                            inputProps={{ LmaxLength: 15, style: { textAlign: 'right' } }}
                                                                            InputProps={{
                                                                                inputProps: { min: 0, max: feetermData.paid_amount },
                                                                                style: { color: 'black', fontWeight: 'bold', textAlign: 'right' },
                                                                                inputComponent: NumberFormatCustom,
                                                                            }}
                                                                            onChange={(e) => onchangeConcesssion(e, findex, index)}
                                                                        />
                                                                    </Box>
                                                                ) : (
                                                                    <>
                                                                        <div className='amount-paid-fully'>
                                                                            {feetermData?.term_alias??feetermData.terms} Amount Paid
                                                                        </div>
                                                                    </>
                                                                )
                                                            }
                                                        </div>
                                                        {feetermData['pending_amount'] ? (
                                                            <Box></Box>
                                                        ) : (
                                                            <Box marginLeft='auto' color='green'>
                                                                <CheckCircleOutlinedIcon />
                                                            </Box>
                                                        )
                                                        }
                                                    </div>
                                                    }
                                                </Grid>
                                            }
                                        })
                                }
                            </Grid>
                        }
                    </Accordion>
                    </div>
                })
            }
            <Snackbar
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                open={snackbar}
                autoHideDuration={10000}
                onClose={() => setSnackbar(false)}
            >
                <Alert onClose={() => setSnackbar(false)} severity={severity ? severity : 'error'}>
                    {alertData}
                </Alert>
            </Snackbar>
        </div>
    );
}