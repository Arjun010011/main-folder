/* eslint-disable react/jsx-key */
import React, { useEffect } from "react";
import { makeStyles } from '@material-ui/core/styles';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { Box, Grid, Divider, Tooltip, IconButton } from '@material-ui/core';
import Checkbox from '@material-ui/core/Checkbox';
import TextField from '@material-ui/core/TextField';
import NumberFormat from 'react-number-format';
import _ from 'lodash';
import CheckCircleOutlinedIcon from "@material-ui/icons/CheckCircleOutlined";
import WarningIcon from '@material-ui/icons/Warning';
import { numberWithCommas, numberWithCommasWithoutSymbol, isUserHasPermission } from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import InfoIcon from '@material-ui/icons/Info';
import PaymentIcon from '@material-ui/icons/Payment';
import { FormattedMessage } from 'react-intl';
import messages from './../messages';
import commonMessages from 'Constants/messages';
import { Dropdown } from "Components/DropDown";
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import EditIcon from '@material-ui/icons/Edit';

const fee_config = JSON.parse(localStorage.getItem('fee_configurations')) ? JSON.parse(localStorage.getItem('fee_configurations')) : {}
const isEnabledSequence = fee_config?.['hide_fee_term_sequence'] ? fee_config?.['hide_fee_term_sequence'] == 1 ? false : true : true


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

export default function FeeCollectionStudentProfilefrom(props) {
  const { feePlan, adjustmentEnabled, getAdjustmentTotalAmount, getAdjustmentPendingAmount,
    isAddPermission, sequenceNeedToPay, updateTermAmount, showPaidAmount, updateValue, updateAdjustmentValue,
    changeToggle, getPendingAmount, getLabel, handleExpand, expanded, sequenceMap, handleAdjustmentDetailDialog,
    handleOpenStoreList } = props;

  const classes = useStyles();

  return (
    <div>
      {feePlan && feePlan.map((data, findex) => {
        return <div className={classes.root}>
          <Accordion key={findex} expanded={expanded[findex]} onChange={() => handleExpand(findex)}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-label="Expand"
              aria-controls="additional-actions1-content"
              id="additional-actions1-header"
              className={classes.expanded}
              style={adjustmentEnabled ? {} : {}}
            >
              <div className='feecollection-feetype-heading align-items-center display-flex'>
                {data.name}
                <div className="ml-5">
                  {
                    `: ${numberWithCommas(data.total_payable_amount)}`
                  }
                </div>
                {/* {(!!data.adjustment_amount || !!data.concession_amount) &&
                  <Tooltip title={showFeeTypeCalculation(data)} enterDelay={400}
                    enterNextDelay={400} placement='top-start' arrow
                  >
                    <InfoIcon />
                  </Tooltip>
                } */}
                {
                  (data.reason) ? <span><WarningIcon style={{ color: '#f6c342' }} /></span> : ''
                }
              </div>
              <Box ml='auto' className='feecollection-feetype-heading'>
                <div className="display-flex">

                  <div className="ml-5">
                    {
                      `Pending : ${numberWithCommas(data.pending_amount)}`
                    }
                  </div>
                </div>
              </Box>
              <Divider />
            </AccordionSummary>
            <Grid className='d-flex flex-wrap padding-top-10'>
              {
                (data['reason']) ?
                  <Grid item xl={12} className='margin-bottom-20 pb-5 margin-left-auto margin-right-auto'>
                    <Box display="flex" className='warning-message padding-left-20 padding-right-20' mb={2} mt={2}>
                      {data['reason']}
                    </Box>
                  </Grid>
                  :
                  data.standard_fee.map((feetermData, index) => {
                    let is_amount_checked = feetermData.is_checked;
                    let selectedClassName = (is_amount_checked) ? 'selected-checkbox rounded-box display-flex' : 'rounded-box display-flex';
                    let isAmountDisabled = (isUserHasPermission('fee_collection_editable', 'create') && is_amount_checked && !adjustmentEnabled) ? false : true;
                    let isAdjustmentDisabled = (adjustmentEnabled && is_amount_checked) ? false : true;
                    let isNotOpted = feetermData['is_disabled'];
                    let isAdjustmentAmount = Boolean(feetermData['adjustment_amount']) ? true : false;
                    let hideCheckbox = false
                    let seq = sequenceMap?.[sequenceMap?.[feetermData.sequence]?.['depends']]
                    let seq_term_name = feePlan[seq?.['fee_type']]?.['name']
                    let seq_fee_type_name = feePlan[seq?.['fee_type']]?.['standard_fee'][seq.term]?.['fee_type_name']
                    let enabledAdjustmentList = adjustmentEnabled ? (feetermData['adjustment_list'] && feetermData['adjustment_list'].length > 0 || (feetermData['adjustment_deletable_ids'] && feetermData['adjustment_deletable_ids'].length > 0)) : false
                    // if ((!enabledAdjustmentList || !adjustmentEnabled) && !feetermData['reason'] && (!feetermData['pending_amount'] || isNotOpted)) {
                    //   selectedClassName += ' opacity';
                    // }
                    if (!isNotOpted) {
                      return <Grid item md={6} xl={6} key={index} className='margin-bottom-20 pb-5'>
                        {<div className={selectedClassName} >
                          {(adjustmentEnabled) || (!feetermData.reason && ((feetermData['pending_amount']) && isAddPermission && !!!hideCheckbox)) ?
                            <div>
                              {((!isEnabledSequence || adjustmentEnabled) || (isEnabledSequence && (!!feetermData.sequence && sequenceNeedToPay >= feetermData.sequence) || !!!feetermData.sequence)) ? (
                                <div>
                                  <Checkbox
                                    id={`${feetermData.terms}_${findex}_${index}`}
                                    color="primary"
                                    checked={is_amount_checked}
                                    value={is_amount_checked}
                                    inputProps={{ 'aria-label': 'secondary checkbox' }}
                                    onChange={(e) => updateTermAmount(e, findex, index, is_amount_checked)}
                                  />
                                </div>
                              ) : (
                                <Box ml={2} className='mt-10 pointer'>
                                  <Tooltip title={`Please Pay ${seq_term_name} - ${seq_fee_type_name}`} enterDelay={400}
                                    enterNextDelay={400} placement='top-start' classes={{ tooltip: 'tooltip-show-data' }}
                                  >
                                    <InfoIcon />
                                  </Tooltip>
                                </Box>
                              )
                              }
                            </div>
                            :
                            <Box ml={4}>
                            </Box>
                          }
                          {feetermData['reason'] &&
                            <div className='margin-left-10 pt-6 margin-right-10 w-100'>
                              <div className='feecollection-term-name d-flex align-items-center'>
                                <span><WarningIcon style={{ color: '#f6c342' }} /></span> {feetermData.fee_type_name}
                              </div>
                              {/* <div className="mt-30">
                                <span><WarningIcon style={{ color: '#f6c342' }} /></span> {feetermData['reason']}
                                </div> */}
                              <Box display="flex" className='warning-message margin-left-0 padding-left-20 padding-right-20' mb={2} mt={2}>
                                {feetermData['reason']}
                              </Box>
                            </div>
                          }
                          {!feetermData['reason'] &&
                            <div className='margin-left-10 pt-6 margin-right-10 w-100'>
                              <div className='feecollection-term-name'>
                                {feetermData.store_list && feetermData.store_list.length > 0 ?
                                  <div className='term-pending-amount d-flex'>
                                    <div className='feecollection-term-name'>
                                      {feetermData.fee_type_name}
                                    </div>
                                    <div className="ml-5 hover-visible">
                                      <Tooltip title={`Click for details store list`} enterDelay={400}
                                        enterNextDelay={400} placement='top-start' classes={{ tooltip: 'tooltip-show-data' }}
                                      >
                                        <VisibilityOutlinedIcon className="height-width-25px  pointer"
                                          disabled={!feetermData.is_checked}
                                          onClick={() => handleOpenStoreList(findex, index)}
                                        />
                                      </Tooltip>
                                    </div>
                                  </div>
                                  :
                                  feetermData.fee_type_name
                                }
                              </div>
                              <div className='term-total-amount d-flex'>
                                <div className='position-relative align-items-center display-flex pointer'>
                                  Term Total
                                  {/* {(('concession_amount' in feetermData && feetermData['concession_amount'] > 0) ||
                                  ('adjustment_amount' in feetermData && feetermData['adjustment_amount'] > 0) ||
                                  ('total_fine_amount' in feetermData && feetermData['total_fine_amount'] > 0) ||
                                  ('pending_fine_amount' in feetermData && feetermData['pending_fine_amount'] > 0)) &&
                                  <Tooltip title={showCalculation(feetermData)} enterDelay={400}
                                    enterNextDelay={400} placement='top-start' className='text-info' arrow
                                  >
                                    <InfoIcon />
                                  </Tooltip>
                                } */}
                                </div>
                                <div className='margin-left-auto'>{(feetermData.is_amount) ?
                                  numberWithCommas(feetermData.total_amount) : numberWithCommas(feetermData.rate_amount)}
                                </div>
                              </div>
                              {!!feetermData.total_fine_amount &&
                                <div className='term-pending-amount d-flex'>
                                  <div>
                                    <FormattedMessage {...messages.fineAmount} />
                                  </div>
                                  <div className='margin-left-auto'>
                                    {numberWithCommas(feetermData.total_fine_amount)}
                                  </div>
                                </div>
                              }
                              <div className='term-paid-amount d-flex '>
                                <div className="align-items-center display-flex pointer">
                                  <FormattedMessage {...messages.paidAmount} />
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
                              {!!feetermData.adjustment_amount && !adjustmentEnabled &&
                                <div className='term-pending-amount d-flex'>
                                  <div>
                                    Adjustment Amount
                                  </div>
                                  <div className="ml-5 hover-visible">
                                    <Tooltip title={`Click for details adjustment list`} enterDelay={400}
                                      enterNextDelay={400} placement='top-start' classes={{ tooltip: 'tooltip-show-data' }}
                                    >
                                      <VisibilityOutlinedIcon className="height-width-20px  pointer"
                                        disabled={!feetermData.is_checked}
                                        onClick={() => handleAdjustmentDetailDialog(findex, index)}
                                      />
                                    </Tooltip>
                                  </div>
                                  <div className='margin-left-auto'>
                                    {numberWithCommas(feetermData.adjustment_amount)}
                                  </div>
                                </div>
                              }
                              {adjustmentEnabled && feetermData.adjustment_list && feetermData.adjustment_list.length > 0 &&
                                <div className='term-pending-amount d-flex'>
                                  <div>
                                    Adjustment Amount
                                  </div>
                                  {feetermData.is_checked &&
                                    <div className="ml-5 hover-visible">
                                      <Tooltip title={`Click for details adjustment list`} enterDelay={400}
                                        enterNextDelay={400} placement='top-start' classes={{ tooltip: 'tooltip-show-data' }}
                                      >
                                        <VisibilityOutlinedIcon className="height-width-20px  pointer"
                                          disabled={!feetermData.is_checked}
                                          onClick={feetermData.is_checked ? () => handleAdjustmentDetailDialog(findex, index) : {}}
                                        />
                                      </Tooltip>
                                    </div>
                                  }
                                  <div className='margin-left-auto'>
                                    {numberWithCommas(feetermData.adjustment_amount)}
                                  </div>
                                </div>
                              }
                              {/* {(adjustmentEnabled && feetermData.total_amount !== feetermData.pending_amount) &&
                                <div className='term-pending-amount d-flex'>
                                  <div>
                                    Balance Amount
                                  </div>
                                  <div className='margin-left-auto'>
                                    {numberWithCommas(feetermData.pending_amount)}
                                  </div>
                                </div>
                              } */}
                              {/* {!adjustmentEnabled && */}
                              <div className='term-pending-amount d-flex'>
                                <div>
                                  <FormattedMessage {...messages.pendingAmount} />
                                </div>
                                <div className='margin-left-auto'>
                                  {numberWithCommas(feetermData.pending_amount)}
                                </div>
                              </div>
                              {/* } */}
                              {feetermData &&
                                // ((feetermData?.adjustment_list && feetermData?.adjustment_list.length>0 && adjustmentEnabled) || (feetermData['pending_amount'])) ? (
                                ((adjustmentEnabled) || (feetermData['pending_amount'])) ? (
                                <div className='term-paid-amount border-dotted-top margin-top-5'>
                                  <div className='margin-left-auto'>
                                    {!adjustmentEnabled &&
                                      <TextField
                                        id={`${findex}_${index}_rupees_id`}
                                        value={feetermData['amount_paid']}
                                        onChange={(e) => updateValue(e, findex, index)}
                                        name="amount_paid"
                                        disabled={isAmountDisabled}
                                        InputProps={{
                                          inputComponent: NumberFormatCustom,
                                          borderBottom: 'none'
                                        }}
                                        inputProps={{ maxLength: 15, width: '100%', style: { textAlign: 'right' } }}
                                        error={Boolean(feetermData['amount_paid_error']) ? true : false}
                                        helperText={Boolean(feetermData['amount_paid_error']) ? <Box>{feetermData['amount_paid_error']}</Box> : ''}
                                        style={{ width: '100%' }}
                                      />
                                    }
                                  </div>
                                  {adjustmentEnabled &&
                                    <Box mt={1}>
                                      <Box className='term-paid-amount text-bold' >
                                        {`Adjustment ${feetermData.type === 'increment' ? ' ( + )' : '( - )'}`}
                                      </Box>
                                      <TextField
                                        autoComplete="off"
                                        fullWidth
                                        // style={{ marginTop: '-5px' }}
                                        id={`${findex}_${index}_adj_rupees_id`}
                                        value={feetermData['adjust_amount_new']}
                                        onChange={(e) => updateAdjustmentValue(e, findex, index)}
                                        name="adjust_amount_new"
                                        disabled={isAdjustmentDisabled}
                                        InputProps={{
                                          inputComponent: NumberFormatCustom,
                                        }}
                                        inputProps={{ maxLength: 15, width: '100%', style: { textAlign: 'right' } }}
                                        error={Boolean(feetermData['adjust_amount_error']) ? true : false}
                                        helperText=
                                        {Boolean(feetermData['adjust_amount_error']) ? <Box>{feetermData['adjust_amount_error']}</Box> : ''}
                                      />
                                      <div className="mt-10">
                                        <ToggleButtonGroup className={feetermData.is_checked ? '' : 'pointer-event-none'} size="small" value={feetermData.type} disabled={!feetermData.is_checked} exclusive  style={{ backgroundColor: 'white' }}>
                                          <ToggleButton key={2} value="increment"
                                            className={feetermData.type == 'increment' ? 'selected-fee-collection' : 'not-selected-fee-collection'}
                                            onClick={feetermData.is_checked ? () => changeToggle(findex, index,'increment') : ''}
                                            >
                                            Increment
                                          </ToggleButton>
                                          <ToggleButton key={1} value="decrement"
                                            className={feetermData.type == 'decrement' ? 'selected-fee-collection' : 'not-selected-fee-collection'}
                                            onClick={feetermData.is_checked ? () => changeToggle(findex, index,'decrement') : ''}
                                            >
                                            Decrement
                                          </ToggleButton>
                                        </ToggleButtonGroup>
                                      </div>
                                    </Box>
                                  }
                                </div>
                              ) : (
                                <>
                                  <div className='amount-paid-fully'>
                                    {!feetermData['reason'] && ((!feetermData['paid_amount'] && (feetermData['adjustment_amount'] || feetermData['concession_amount'])) ?
                                      <div className="d-flex">
                                        {`${getLabel(feetermData)} Applied`}
                                      </div>
                                      :
                                      <div>
                                        Amount Paid
                                      </div>
                                    )
                                    }
                                    <div className='margin-left-5'>
                                      <PaymentIcon />
                                    </div>
                                  </div>
                                </>
                              )
                              }
                            </div>

                          }
                          {(enabledAdjustmentList) || !feetermData['reason'] && (feetermData['pending_amount'] ? (
                            <Box></Box>
                          ) : (
                            <Box marginLeft='auto' color='green'>
                              <CheckCircleOutlinedIcon />
                            </Box>
                          ))
                          }
                        </div>
                        }
                      </Grid>
                    }
                  })
              }
            </Grid>
          </Accordion></div>
      })
      }
    </div>
  );
}