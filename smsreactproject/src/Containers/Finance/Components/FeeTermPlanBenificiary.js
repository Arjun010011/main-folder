import React from 'react';
import { Box, Button, TextField, Grid, Snackbar, Tooltip, FormControlLabel, Switch } from '@material-ui/core';
import PropTypes from 'prop-types';
import DateFnsUtils from '@date-io/date-fns';
import moment from 'moment';
import { MuiPickersUtilsProvider, KeyboardDatePicker } from '@material-ui/pickers';
import ArrowRightIcon from '@material-ui/icons/ChevronRight';
import ArrowLeftIcon from '@material-ui/icons/ChevronLeft';
import WarningIcon from '@material-ui/icons/Warning';
import ErrorIcon from '@material-ui/icons/Error';
import { FormattedMessage } from 'react-intl';
import messages from 'Containers/Finance/messages';
import commonMessage from 'Constants/messages';
// import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DivideTermsDialog from './DivideTermsDialog';
import { Dropdown } from "Components/DropDown";

import { getPercent, validateDate, Alert, isUserHasPermission, numberWithCommas } from 'Includes/functions';
import AddInputField from 'Components/AddInputField';
import { validateAmount } from 'Includes/validations';
import { TRANSPORT_CODE, APPROVAL_STATUS, minDate, maxDate } from 'Constants';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TablePagination from '@material-ui/core/TablePagination';
import TableRow from '@material-ui/core/TableRow';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import { isFormDefinitionEnabled } from 'Includes/CheckFormDefinition';
import RadioButtonCheckedIcon from '@material-ui/icons/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@material-ui/icons/RadioButtonUnchecked';
import './../styles.scss';
import ReturnItem from 'Containers/StoreManagement/ReturnItem';

class FeeTermPlanBenificiary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            fieldError: {},
            selectedFeePlan: {},
            totalAmountError: "",
            snackbar: { show: false, data: '' },
            permissions: [],
            isFineExpanded: false,
            isEnabledSequence: !isFormDefinitionEnabled('fee_configurations', 'hide_fee_term_sequence', 1),
            beneficiary_data: this.props?.beneficiary_data ?? [],
            deletable_ids: [],
            numberList: [
                { id: 1, name: '1' },
                { id: 2, name: '2' },
                { id: 3, name: '3' },
                { id: 4, name: '4' },
                { id: 5, name: '5' },
            ]
        };
        this.columns = [
            {
                "label": <FormattedMessage {...commonMessage.term} />
            },
            {
                "label": 'Divide Into'
            },
            {
                "label": 'Beneficiary Account'
            },
            {
                "codename": "amount",
                "label": <FormattedMessage {...commonMessage.amount} />
            },
            // {
            //     "label": <FormattedMessage {...messages.viewFeeTermStartDate} />
            // }, {
            //     "label": <FormattedMessage {...messages.viewFeeTermEndDate} />
            // }, {
            //     "label": <FormattedMessage {...messages.viewFeeTermPaymentStartDate} />
            // }, {
            //     "label": <FormattedMessage {...messages.viewFeeTermPaymentEndDate} />
            // },
            // {
            //     "codename": "sequence",
            //     "label": <FormattedMessage {...messages.sequence} />
            // }
            // , {
            //     "codename": "fine",
            //     "label": <FormattedMessage {...messages.fineFrequencyInDays} />
            // }
            // , {
            //     "codename": "fine",
            //     "label": <FormattedMessage {...messages.fineAmountPerFreq} />
            // }
            // , {
            //     "codename": "fine",
            //     "label": <FormattedMessage {...messages.maxFineAmount} />
            // }
        ];
    }
    componentDidMount = () => {
        let permissions = ['create'];
        // if (isUserHasPermission('fee_plan', 'create')) {
        //     permissions.push('create');
        // }
        this.setState({ selectedFeePlan: this.props.selectedFeePlan })
    }
    onBlurFieldValue = (e, index) => {
        let { selectedFeePlan, fieldError, deletable_ids } = this.state;
        let { value, name } = e.target;
        // let amount_perc = getPercent(selectedFeePlan.amount, value);
        let test = validateAmount(value, false, 0, null)
        if (value === '') {
            selectedFeePlan.standard_fee[index][name] = '';
            fieldError[index][name] = "";
        }
        else if (test.errorFound) {
            fieldError[index][name] = test.errorText;
        }
        else {
            if (!Number.isNaN(parseInt(value)) && parseInt(value) !== 0) {
                value = parseInt(value)
            }
            selectedFeePlan.standard_fee[index][name] = value;

            fieldError[index][name] = "";
        }
        this.setState({ selectedFeePlan, fieldError }, () => {
            this.props.updateFeeData(selectedFeePlan, deletable_ids);
            this.calculateDifferenceAmount();
        })
    }
    // onBlurFieldValue = (e, index) => {
    //     let { selectedFeePlan, fieldError } = this.state;
    //     let { value, name } = e.target;
    //     fieldError[index][name] = "";
    //     this.setState({ selectedFeePlan, fieldError }, () => {
    //         this.props.updateFeeData(selectedFeePlan, false);
    //         this.calculateDifferenceAmount();
    //     })
    // }
    onChangeFieldValue = (e, index) => {
        let { fieldError } = this.state;
        let { name } = e.target;
        fieldError[index][name] = ''
        this.setState({
            fieldError
        })
        // let amount_perc = getPercent(selectedFeePlan.amount, value);
        // let test = validateAmount(value, false, 0, null)
        // if (value === '') {
        //     selectedFeePlan.standard_fee[index].amount = '';
        //     fieldError[index][name] = "";
        // }
        // else if (test.errorFound) {
        //     fieldError[index][name] = test.errorText;
        // }
        // else {
        //     if (!Number.isNaN(parseInt(value)) && parseInt(value) !== 0) {
        //         value = parseInt(value)
        //     }
        //     selectedFeePlan.standard_fee[index].amount = value;

        //     fieldError[index][name] = "";
        // }
        // this.setState({ selectedFeePlan, fieldError }, () => {
        //     this.props.updateFeeData(selectedFeePlan, false);
        //     this.calculateDifferenceAmount();
        // })
    }

    onChangeTermDate = (e, type, index) => {
        let selectedFeePlan = { ...this.state.selectedFeePlan };
        let field_name = (e && e.currentTarget) ? e.currentTarget.name : type;
        let fieldValue = e ? e : selectedFeePlan.standard_fee[index][field_name];
        fieldValue = moment(fieldValue).format("YYYY-MM-DD");
        selectedFeePlan.standard_fee[index][field_name] = fieldValue;
        this.setState({
            selectedFeePlan,
        });
    }

    handleCloseSnackbar = () => {
        const snackbar = { show: false, data: '' }
        this.setState({ snackbar });
    }

    handleIsFineExpand = () => {
        this.setState({
            isFineExpanded: !this.state.isFineExpanded
        })
    }

    onChange = (e, index, accIndex) => {
        let { value, name } = e.target;
        let { selectedFeePlan, fieldError, deletable_ids } = this.state;
        delete fieldError[`${index}_${accIndex}_${name}`]
        selectedFeePlan.standard_fee[index]['beneficiary_split'][accIndex][name] = value;
        this.setState({ selectedFeePlan, fieldError }, () => {
            this.props.updateFeeData(selectedFeePlan, deletable_ids);
            this.onBlurValidation()
        })
    }

    onChangeDivided = (e, index) => {
        let { value, name } = e.target;
        let { selectedFeePlan, deletable_ids } = this.state;
        let temp_plan = { ...selectedFeePlan }
        selectedFeePlan.standard_fee[index]['beneficiary_split'].map((data) => {
            if (data['id'] && !deletable_ids.includes(data['id'])) {
                deletable_ids.push(data['id'])
            }
        })
        temp_plan.standard_fee[index][name] = value;
        let totalAmount = temp_plan.standard_fee[index]['is_amount'] ? temp_plan.standard_fee[index]['rate'] : 100
        temp_plan.standard_fee[index]['beneficiary_split'] = []
        for (let i = 0; i < value; i++) {
            temp_plan.standard_fee[index]['beneficiary_split'].push(
                { priority: i + 1, beneficiary_id: '', rate: Math.floor(totalAmount / value) }
            )
        }

        this.setState({ selectedFeePlan: { ...temp_plan }, deletable_ids }, () => {
            this.props.updateFeeData(temp_plan, deletable_ids);
            this.onBlurValidation()
        })
    }

    onChangeIsAmount = (e, index) => {
        let { selectedFeePlan, deletable_ids } = this.state;
        selectedFeePlan.standard_fee[index]['is_amount'] = !selectedFeePlan.standard_fee[index]['is_amount'];
        this.setState({ selectedFeePlan }, () => {
            this.props.updateFeeData(selectedFeePlan, deletable_ids);
            this.onBlurValidation()
        })
    }

    onBlurValidation = () => {
        let { selectedFeePlan, deletable_ids } = this.state;
        let fieldError = {}
        let termTotal = 0
        let beneficiary_list = []
        selectedFeePlan.standard_fee.map((term, index) => {
            termTotal = 0
            term.reason = ''
            beneficiary_list = []
            term.beneficiary_split.map((account, accIndex) => {
                termTotal += parseFloat(account.rate)
                if (!account.beneficiary_id) {
                    fieldError[`${index}_${accIndex}_beneficiary_id`] = <FormattedMessage {...commonMessage.fieldMandatoryError} />
                }
                else if (beneficiary_list.includes(account.beneficiary_id)) {
                    fieldError[`${index}_${accIndex}_beneficiary_id`] = <FormattedMessage {...commonMessage.duplicateFoundLabel} />
                }
                beneficiary_list.push(account['beneficiary_id'])
            })
            if (term.is_amount && termTotal !== parseFloat(term.rate)) {
                term.reason = `Difference amount ${term.rate - termTotal}`;
            }
            else if (!term.is_amount && termTotal != 100) {
                term.reason = `Difference percentage ${100 - termTotal}`;
            }
            if (!("is_primary_adjustment" in term)) {
                term.reason = `Select any radio primary adjustment`;
            }
        })
        this.setState({ selectedFeePlan, fieldError }, () => {
            this.props.updateFeeData(selectedFeePlan, deletable_ids);
        })
    }

    handlePrimaryAdjustment = (index, strIndex) => {
        let { selectedFeePlan } = this.state;
        selectedFeePlan.standard_fee[index]['is_primary_adjustment'] = strIndex
        delete selectedFeePlan.standard_fee[index]['reason']
        this.setState({ selectedFeePlan })
    }

    render() {
        const { fieldError, selectedFeePlan, differenceAmount, snackbar, permissions, isFineExpanded,
            isDivideTermsDialogOpen, isEnabledSequence, beneficiary_data, numberList } = this.state;
        const disabled = selectedFeePlan.is_approved === APPROVAL_STATUS.approved ||
            !permissions.includes('create') ? false : true;
        let showAddButton = false;
        if (!disabled) {
            showAddButton = true;
        }
        let rowIndex = 0;
        const academic_year_max_date = (selectedFeePlan && selectedFeePlan.academic_year_end_date) ? moment(selectedFeePlan.academic_year_end_date).format('YYYY-MM-DD') : maxDate;
        const academic_year_min_date = (selectedFeePlan && selectedFeePlan.academic_year_start_date) ? moment(selectedFeePlan.academic_year_start_date).format('YYYY-MM-DD') : minDate;
        const headerAmountOrPercent = (selectedFeePlan.codename === TRANSPORT_CODE) ? 'Percentage' : 'Amount (₹)'
        return (
            <>
                <TableRow>
                    <TableCell colSpan={this.columns.length} >
                        <Table aria-label="simple table" width='100%' style={{ border: '1px solid #e9e9e9' }}>
                            <TableHead style={{ backgroundColor: '#f0f8ff' }}>
                                <TableRow>
                                    {this.columns.map((columnHeader, index) => {
                                        if (columnHeader.codename && columnHeader.codename === 'amount') {
                                            return <TableCell key={index} className='word-break-normal feeterm-text-size'>{headerAmountOrPercent}</TableCell>
                                        } else if (columnHeader.codename && columnHeader.codename === 'fine' && isFineExpanded) {
                                            return <TableCell key={index} className='word-break-normal feeterm-text-size'>{columnHeader.label}</TableCell>
                                        }
                                        else if (columnHeader.codename && columnHeader.codename === 'sequence' && isEnabledSequence) {
                                            return <TableCell key={index} className='word-break-normal feeterm-text-size'>{columnHeader.label}</TableCell>
                                        }
                                        else if (!columnHeader.codename) {
                                            return <TableCell key={index} className='word-break-normal feeterm-text-size'>{columnHeader.label}</TableCell>
                                        }
                                    })
                                    }
                                    {/* {!isFineExpanded &&
                                        <TableCell className='word-break-normal feeterm-text-size'>Expand fine</TableCell>
                                    }
                                    {isFineExpanded &&
                                        <TableCell className='word-break-normal feeterm-text-size'>Collapse fine</TableCell>
                                    } */}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <>
                                    {selectedFeePlan.standard_fee && selectedFeePlan.standard_fee.map((term, index) => {
                                        rowIndex = index;
                                        return <>
                                            <TableRow key={index}>
                                                <TableCell><Box className=''>{`${term?.term_alias??term.terms} - ${numberWithCommas(term.rate)}`}</Box></TableCell>
                                                <TableCell>
                                                    <Box className='width-100-px'>
                                                        <Dropdown
                                                            data={numberList}
                                                            name='divide_into'
                                                            // style='width-100'
                                                            value={term['divide_into']}
                                                            onChange={(e) => this.onChangeDivided(e, index)}
                                                            label='Divide Into'
                                                            hideSelect={true}
                                                            size='small'
                                                            variant='outlined'
                                                            error={fieldError[`${index}_divide_into`] && fieldError[`${index}_divide_into`]}
                                                            helperText={fieldError[`${index}_divide_into`] && fieldError[`${index}_divide_into`]}
                                                        />
                                                    </Box>
                                                </TableCell>
                                                <TableCell></TableCell>
                                                <TableCell>
                                                    <FormControlLabel
                                                        control={<Switch checked={term.is_amount}
                                                            name={'is_amount'}
                                                            value={term.is_amount}
                                                            color="primary"
                                                            onChange={(e) => this.onChangeIsAmount(e, index)}
                                                        />}
                                                        label={<div className='text-blue'>Is Amount</div>}
                                                    />
                                                    <div className='text-red'>{term.reason}</div>
                                                </TableCell>
                                            </TableRow>
                                            <>
                                                {term.beneficiary_split && term.beneficiary_split.map((termacc, accIndex) => {
                                                    return <TableRow key={`${index}${accIndex}`}>
                                                        <TableCell>
                                                            <div className='text-align-center'>
                                                                {term.is_primary_adjustment === accIndex ?
                                                                    <Tooltip title={'Primary Adjustment Enabled'} enterDelay={400}
                                                                        enterNextDelay={400} placement='top-start'
                                                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                                                        <RadioButtonCheckedIcon className='text-blue pointer' />
                                                                    </Tooltip>
                                                                    :
                                                                    <Tooltip title={'Make Primary Adjustment'} enterDelay={400}
                                                                        enterNextDelay={400} placement='top-start'
                                                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                                                        <RadioButtonUncheckedIcon className='pointer'
                                                                            onClick={() => this.handlePrimaryAdjustment(index, accIndex)} />
                                                                    </Tooltip>
                                                                }
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Box className='width-100-px'>
                                                                <Dropdown
                                                                    data={numberList}
                                                                    name='priority'
                                                                    style='width-100'
                                                                    value={termacc?.['priority']}
                                                                    onChange={(e) => this.onChange(e, index, accIndex)}
                                                                    label='Priority'
                                                                    hideSelect={true}
                                                                    size='small'
                                                                    variant='outlined'
                                                                    error={fieldError[`${index}_${accIndex}_priority`] && fieldError[`${index}_${accIndex}_priority`]}
                                                                    helperText={fieldError[`${index}_${accIndex}_priority`] && fieldError[`${index}_${accIndex}_priority`]}
                                                                />
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Box className='position-relative'>
                                                                <Dropdown
                                                                    data={beneficiary_data}
                                                                    name='beneficiary_id'
                                                                    style='width-100'
                                                                    value={termacc?.['beneficiary_id']}
                                                                    onChange={(e) => this.onChange(e, index, accIndex)}
                                                                    label='Beneficiary Account'
                                                                    hideSelect={true}
                                                                    size='small'
                                                                    variant='outlined'
                                                                    error={fieldError[`${index}_${accIndex}_beneficiary_id`] && fieldError[`${index}_${accIndex}_beneficiary_id`]}
                                                                    showErrorMessage={false}
                                                                />
                                                                {(fieldError[`${index}_${accIndex}_beneficiary_id`]) &&
                                                                    <Tooltip title={fieldError[`${index}_${accIndex}_beneficiary_id`]} enterDelay={400}
                                                                        enterNextDelay={400} placement='top-start'
                                                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                                                        <ErrorIcon className='fee-benifi-term-error-icon cursor-pointer ' />
                                                                    </Tooltip>
                                                                }
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Box className='position-relative'>
                                                                <TextField
                                                                    id="outlined-name"
                                                                    label={term.is_amount ? 'Amount' : 'Percentage'}
                                                                    fullWidth
                                                                    value={termacc?.rate}
                                                                    type="number"
                                                                    name={'rate'}
                                                                    onBlur={this.onBlurValidation}
                                                                    autoComplete="off"
                                                                    error={fieldError[`${index}_${accIndex}_rate`] && fieldError[`${index}_${accIndex}_rate`]}
                                                                    helperText={fieldError[`${index}_${accIndex}_rate`] && fieldError[`${index}_${accIndex}_rate`]}
                                                                    className="fee-term-date-filter"
                                                                    disabled={disabled}
                                                                    onChange={(e) => this.onChange(e, index, accIndex)}
                                                                />
                                                                {(fieldError[`${index}_${accIndex}_rate`]) &&
                                                                    <Tooltip title={fieldError[`${index}_${accIndex}_rate`]} enterDelay={400}
                                                                        enterNextDelay={400} placement='top-start'
                                                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                                                        <ErrorIcon className='fee-benifi-term-error-icon cursor-pointer ' />
                                                                    </Tooltip>
                                                                }
                                                            </Box>
                                                        </TableCell>
                                                    </TableRow>
                                                })}
                                            </>
                                        </>
                                    })}

                                    {/* {!disabled && <Box className='end-flex-prop'><Button className="submit fee-ter-submit-button" variant="contained" onClick={() => this.submit()} >Submit</Button></Box>} */}
                                </>
                            </TableBody>
                        </Table>
                    </TableCell>
                </TableRow>
                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={snackbar.show} autoHideDuration={10000} onClose={this.handleCloseSnackbar}>
                    <Alert onClose={this.handleCloseSnackbar} severity="error">
                        {snackbar.data}
                    </Alert>
                </Snackbar>
                {isDivideTermsDialogOpen &&
                    <DivideTermsDialog />
                }
            </>
        )
    }
}

FeeTermPlanBenificiary.propTypes = {
    menuItems: PropTypes.array,
}

FeeTermPlanBenificiary.defaultProps = {
    menuItems: []
};
export default FeeTermPlanBenificiary
