import React from "react";
import _ from 'lodash';
import { Box, Grid, TextField, Button } from '@material-ui/core';
import Dialog from '@material-ui/core/Dialog';
import { makeStyles } from '@material-ui/core/styles';
import NumberFormat from 'react-number-format';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import Slide from '@material-ui/core/Slide';
import { numberWithCommasWithoutSymbol } from 'Includes/functions';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";

const useStyles = makeStyles(theme => ({
    appBar: {
        position: 'relative',
        backgroundColor: '#4680FF'
    },
    title: {
        marginLeft: theme.spacing(2),
        flex: 1,
    },
}));

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

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export default function QuickPayModal(props) {
    const [pendingFeePlan, setFeePlan] = React.useState([]);
    const [selectedFeeType, setselectedFeeType] = React.useState([])
    const [feeTypeList, setFeeTypeList] = React.useState([]);
    const [totalPendingAmount, setTotalPendingAmount] = React.useState(0);
    const classes = useStyles();

    const setToDefault = (feeplanData) => {
        let tempFeePlan = _.cloneDeep(feeplanData);
        let totalPendingAmount = 0;
        let tempFeeTypeList = [];
        let tempAmount = 0;
        let finalFeePlan = [];
        tempFeePlan.forEach((data, findex) => {
            tempAmount = 0;
            if ('standard_fee' in data) {
                let termData = [];
                data.standard_fee.forEach((feetermData, index) => {
                    if (feetermData.pending_amount <= 0 || feetermData.is_disabled) {
                        // data.standard_fee.splice(index, 1);
                    } else {
                        totalPendingAmount += feetermData.pending_amount;
                        feetermData.amount_paid = '';
                        tempAmount++;
                        termData.push(feetermData);
                    }
                });
                if (tempAmount > 0) {
                    data['standard_fee'] = termData;
                    tempFeeTypeList.push({ value: data['id'], label: data['fee_type_name'] ,id: data['id'],name: data['fee_type_name'] })
                    finalFeePlan.push(data);
                }
            }
        });
        setFeePlan(finalFeePlan);
        setselectedFeeType(tempFeeTypeList);
        setFeeTypeList(tempFeeTypeList);
        setTotalPendingAmount(totalPendingAmount);
    }


    const getTotalAmount = () => {
        let totalAmount = 0;
        let tempselectedFeeType = _.cloneDeep(selectedFeeType);
        let selectedFeeList = {};
        tempselectedFeeType.forEach((temp) => {
            selectedFeeList[temp['value']] = 1;
        })
        pendingFeePlan.forEach((data) => {
            data['standard_fee'].forEach((standardFee, index) => {
                if (data['id'] in selectedFeeList) {
                    if (standardFee.pending_amount <= 0 || standardFee.is_disabled) {
                        data.standard_fee.splice(index, 1);
                    }
                    else if (standardFee.amount_paid !== '') {
                        totalAmount += parseFloat(standardFee.amount_paid)
                    }
                }
            });
        });
        return totalAmount;
    }

    const changeFeePlan = (e, findex, sindex) => {
        let tempFeePlan = _.cloneDeep(pendingFeePlan);
        let { value } = e.target
        let pendingAmount = tempFeePlan[findex]['standard_fee'][sindex]['pending_amount'];
        if (value > pendingAmount || value < 0) {
            tempFeePlan[findex]['standard_fee'][sindex]['amount_paid_error_text'] = 'Amount is Greater than the pending amount';
        } else {
            tempFeePlan[findex]['standard_fee'][sindex]['amount_paid'] = value;
        }
        setFeePlanData(tempFeePlan)
    }

    const onChangeFeeType = (e) => {
        let tempFeePlan = _.cloneDeep(pendingFeePlan);
        setselectedFeeType(e)
        tempFeePlan.forEach((data, findex) => {
            if ('standard_fee' in data) {
                data.standard_fee.forEach((feetermData, index) => {
                    if (!(e.some(el => el.value === data.id))) {
                        feetermData.amount_paid = '';
                    }
                });
            }
        });
        setFeePlanData(tempFeePlan)
    }

    const setFeePlanData = (feeplanData) => {
        setFeePlan(feeplanData)
    }

    const formatPlanAndCollect = async () => {
        let tempFeePlan = _.cloneDeep(pendingFeePlan);
        tempFeePlan.forEach((data, findex) => {
            if ('standard_fee' in data) {
                data.standard_fee.forEach((feetermData, index) => {
                    let value = feetermData['amount_paid'];
                    if (value > 0) {
                        feetermData['is_checked'] = true;
                    } else {
                        feetermData['is_checked'] = false;
                    }
                })
            }
        });
        await props.updateToParent(tempFeePlan)
        props.collectFees()
    }

    const handleClose = () => {
        props.handleClose(false)
    }

    React.useEffect(() => {
        setToDefault(props.feePlan);
    }, [props.feePlan]);


    return (
        <Dialog
            fullScreen open={true}
            onClose={() => handleClose()}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
            maxWidth="md"
            fullWidth={true}
            TransitionComponent={Transition}
            keepMounted
            PaperProps={{
                style: {
                    boxShadow: 'none',
                },
            }}
        >
            <AppBar className={classes.appBar} style={{ position: 'sticky' }}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={() => handleClose()} aria-label="close">
                        <CloseIcon />
                    </IconButton>
                    <Box className="fs-14">
                        Student Name
                        <span className='fee-collection-student-name'>
                            {props.studentData['first_name']} {props.studentData['middle_name']} {props.studentData['last_name']}
                        </span>
                    </Box>
                </Toolbar>
            </AppBar>
            <Grid container style={{ placeContent: 'center' }}>
                <Grid item lg={6} md={8} sm={12}>
                    <Box display='flex' mt={2} mb={2}>
                        <Box>
                            <MultipleSelectDropdown
                                data_list={feeTypeList}
                                selected_list={selectedFeeType}
                                error={false}
                                label={'Select Fee Type'}
                                onChange={onChangeFeeType}
                                // className={{ width: '300px' }}
                            />
                            {/* <MultiSelect
                                className="room-strength-asset fee-collection-term-list"
                                options={feeTypeList}
                                value={selectedFeeType}
                                onChange={(e) => onChangeFeeType(e)}
                                labelledBy={"Select Fee Type"}
                                style={{ minWidth: '250px', maxWidth: '400px' }}
                                overrideStrings={{
                                    selectSomeItems: "Fee Type",
                                    allItemsAreSelected: "All types are selected",
                                    selectAll: "Select All",
                                    search: "Search",
                                }}
                            /> */}
                        </Box>
                        <Box className='fs-14' ml="auto" style={{ placeSelf: 'flex-end' }}>
                            <FormattedMessage {...messages.viewQuickPayTotalPendingAmount} />  &nbsp;{numberWithCommasWithoutSymbol(totalPendingAmount)}
                        </Box>
                    </Box>
                    <table className='quick-pay-table'>
                        <thead>
                            <tr className='fs-14 quick-pay-thead font-weight-bold'>
                                <td><FormattedMessage {...messages.viewFeeTermFeeType} /></td>
                                <td className='text-align-right'><FormattedMessage {...messages.pendingAmount} /></td>
                                <td><FormattedMessage {...messages.amountPayable} /></td>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                pendingFeePlan.map((feeData, findex) => {
                                    return <>
                                        {selectedFeeType.some(el => el.value === feeData.id) &&
                                            feeData['standard_fee'].map((standardData, sindex) => {
                                                return <tr>
                                                    <td>
                                                        <Box>{feeData['fee_type_name']} ({standardData?.['term_alias']??standardData['terms']})</Box>
                                                    </td>
                                                    <td className='text-align-right'>
                                                        {numberWithCommasWithoutSymbol(standardData['pending_amount'])}
                                                    </td>
                                                    <td>
                                                        <TextField
                                                            variant='outlined'
                                                            size="small"
                                                            error={Boolean(standardData['amount_paid_error']) ? true : false}
                                                            helperText={Boolean(standardData['amount_paid_error']) ? standardData['amount_paid_error'] : ''}
                                                            value={standardData['amount_paid']}
                                                            InputProps={{
                                                                inputComponent: NumberFormatCustom,
                                                            }}
                                                            onChange={(e) => changeFeePlan(e, findex, sindex)}
                                                            inputProps={{ style: { textAlign: 'right' } }}
                                                        />
                                                    </td>
                                                </tr>
                                            })
                                        }
                                    </>
                                })
                            }
                            {selectedFeeType.length > 0 &&
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
                                            value={getTotalAmount()}
                                            disabled={true}
                                            inputProps={{ style: { fontWeight: 'bold', color: 'black', textAlign: 'right' } }}
                                        />
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                    <Box mb={4} mt={5} className="text-align-right">
                        <Box className="submit-box">
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => formatPlanAndCollect()}
                                className="submit">
                                Collect Fees
                            </Button>
                        </Box>
                    </Box>
                </Grid>
            </Grid>
        </Dialog>
    );
}