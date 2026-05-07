/* eslint-disable react/jsx-key */
import React, { useEffect } from "react";
import { makeStyles } from '@material-ui/core/styles';
import { Box, Dialog, DialogTitle, DialogActions, DialogContent, DialogContentText, Button, CircularProgress } from '@material-ui/core';
import { numberWithCommas, numberWithCommasWithoutSymbol, NumberFormatCustom } from 'Includes/functions';
import { FormattedMessage } from 'react-intl';
import messages from './../messages';
import { Dropdown } from "Components/DropDown";
import { NOT_INCLUDE_FEE_LIST } from 'Constants'
import {
  getRequest,
  putRequest,
} from "Includes/api/apicall";
import { GET_URL, PUT_URL } from "Includes/urls";
import Swal from 'sweetalert2'

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

export default function FeePlanEditDialog(props) {
  const [feePlan, setFeePlan] = React.useState([])
  const [disableButton, setDisableButton] = React.useState(false)
  const [groupList, setGroupList] = React.useState([])
  const [error, setError] = React.useState({})
  const [loading, setLoading] = React.useState(true)


  React.useEffect(() => {
    getGroupList();
  }, [])

  const getGroupList = () => {
    const url = GET_URL.feegroup.api;
    const params = { is_active: true };
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        setFeePlan(props.selectedFeeTypes.fee_types)
        setGroupList(response.data.data)
        setLoading(() => false)
      }
    });
  };

  const handleSubmit = () => {
    let validate = validation()
    if (validate) {
      let url = PUT_URL.feetypesindividual.api
      putRequest(url, validation(), props)
        .then((response) => {
          if (response && response.status === 200) {
            Swal.fire({
              position: 'top-end',
              type: 'success',
              title: 'Your Data has been updated',
              showConfirmButton: false,
              timer: 1500
            })
            props.updateParent()
          }
        });
    }
  }

  const validation = () => {
    let tempFeePlan = [...feePlan]
    let test = true
    let error = {}
    tempFeePlan.map((data, index) => {
      delete data['enabledActions']
      delete data['fee_type_name_field']
      if (!data.fee_group) {
        test = false
        error[`fee_group_${index}`] = 'This is field is mandatory'
      }
    })
    setError(() => error)
    if (test) {
      test = {
        academic_year: props.academicYear,
        standard: [
          props.selectedFeeTypes?.id
        ],
        fee_types: tempFeePlan
      }
    }
    return test
  }

  const getTotalAmount = () => {
    let return_value = 0
    feePlan.map((data) => {
      if (!NOT_INCLUDE_FEE_LIST.includes(data.codename)) {
        return_value += parseFloat(data.amount)
      }
    })
    return return_value
  }


  const onChange = (e, index) => {
    let tempFeePlan = [...feePlan]
    tempFeePlan[index]['fee_group'] = e.target.value
    setFeePlan(() => tempFeePlan)
  }

  return (
    <div>
      <Dialog className='fee-plan-edit-width' open={true} 
      // onClose={props.handleReasonClose} 
      aria-labelledby="form-dialog-title">
        <DialogTitle id="form-dialog-title"></DialogTitle>
        <DialogContent>
          {/* <DialogContentText className='align-items-center'> */}
          <div className="dashboard-year">
            Update Fee Plan
          </div>
          {loading &&
            <div className="loading">
              <CircularProgress />
            </div>
          }
          <div className='mt-30'>
            <table className='quick-pay-table mb-30 mt-30'>
              <thead>
                <tr className='fs-14 quick-pay-thead font-weight-bold'>
                  <td><FormattedMessage {...messages.viewFeeTermFeeType} /></td>
                  <td className='text-align-right'><FormattedMessage {...messages.viewFeeTermTotalAmount} /></td>
                  <td>Fee Group</td>
                </tr>
              </thead>
              <tbody>
                {feePlan &&
                  feePlan.map((standardData, findex) => {
                    return <tr key={findex}>
                      <td>
                        <Box>{standardData['fee_type_name']}</Box>
                      </td>
                      <td className="text-align-right">
                        {NOT_INCLUDE_FEE_LIST.includes(standardData.codename) ? standardData['amount'] : numberWithCommas(standardData['amount'])}
                      </td>
                      <td>
                        <Dropdown
                          data={groupList}
                          name='fee_group'
                          // style='width-100'
                          value={standardData['fee_group']}
                          onChange={(e) => onChange(e, findex)}
                          label='Group'
                          error={error[`fee_group_${findex}`] && error[`fee_group_${findex}`]}
                          hideSelect={true}
                          size='small'
                          variant='standard'
                        />
                      </td>
                    </tr>
                  })
                }
                <tr style={{ marginTop: "1rem" }}>
                  <td className='padding-top-10'><Box fontWeight="bold"> Total </Box></td>
                  <td className='padding-top-10 text-align-right'>
                    {numberWithCommas(getTotalAmount())}
                    <td></td>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className='text-red mt-10'>
            {props.transError}
          </div>
        </DialogContent>
        <DialogActions>
          <Button color="secondary text-bold" disabled={disableButton} style={{ textTransform: 'capitalize' }} onClick={handleSubmit}>
            Update
          </Button>
          <Button color='secondary' style={{ textTransform: "uppercase" }} onClick={props.handleEditClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>


    </div>
  );
}