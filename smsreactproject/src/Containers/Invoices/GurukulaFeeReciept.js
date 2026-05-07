import React, { Component } from 'react'
import ReactToPrint from 'react-to-print';
import GetAppRoundedIcon from '@material-ui/icons/GetAppRounded';
import {
  Button, Box, Grid
} from '@material-ui/core';
import { numberWithCommas, getAmountInWords, dateFormat } from 'Includes/functions';
import './styles.scss'
import gurukulaIcon from './images/gurukula.jpeg'
import gurukula1Icon from './images/gurukula1.jpg'

export default class GurukulaFeeReciept extends Component {

  render() {
    const { invoiceData } = this.props;
    let totalAmount = 0;
    if ('payment_detail' in invoiceData) {
      invoiceData['payment_detail'].map((data) => {
        totalAmount += data['amount_paid']
      })
    }
    let isEmpty = false;
    if (invoiceData && Object.keys(invoiceData).length === 0 && invoiceData.constructor === Object) {
      isEmpty = true;
    }
    return (
      <div>
        <Grid contianer>
          <Grid item lg={8} xl={12} style={{marginLeft: 'auto', marginRight: 'auto'}}>
          <Box display='flex' justifyContent='flex-end' mb={2} p={2}>
            <ReactToPrint
              trigger={() =>
                <Button variant='contained' color="secondary"
                  className='submit print '>
                  <GetAppRoundedIcon />Print
                        </Button>
              }
              content={() => this.componentRef}
            />
          </Box>
          {!isEmpty &&
            <div ref={(el) => (this.componentRef = el)}>
              <div className="gurukula-main-pg">
                <div className="display-flex">
                    <table className='w-100'>
                      <thead className="gurukula-letter-head">
                        <tr>
                          <td style={{width: '15%', textAlign: 'left'}}>
                            {invoiceData.institute_detail.company_id === 3 && 
                              <img className="gurukula-img-head" src={gurukula1Icon} alt="" />
                            }
                          </td>
                          <td style={{width: '70%', textAlign: 'center'}}> 
                            {invoiceData.institute_detail.name} <br />
                            {invoiceData.institute_detail.trust}
                          </td>
                          <td style={{width: '15%', textAlign: 'right'}}> 
                            {invoiceData.institute_detail.company_id === 3 && 
                              <img className="gurukula-img-head" src={gurukulaIcon} alt="" />
                            }
                          </td>
                        </tr>
                      </thead>
                    </table>
                  </div> <hr style={{margin: '0px'}}/>
                  <div className="gurukula-body-main">
                      <table className='w-100'>
                        <tbody className='gurukula-invoice-tbody'>
                          <tr>
                            <td>School Name</td>
                            <td>{invoiceData.institute_detail.name}</td>
                          </tr>
                          <tr>
                            <td>Date</td>
                            <td>{dateFormat(invoiceData.transaction_date, 'DD-MM-YYYY')}</td>
                          </tr>
                          <tr>
                            <td>Reciept Number</td>
                            <td>{invoiceData.receipt_num}</td>
                          </tr>
                          <tr>
                            <td>Student Name</td>
                            <td>{invoiceData.student_detail.first_name} {invoiceData.student_detail.middle_name} {invoiceData.student_detail.last_name}</td>
                          </tr>
                          <tr>
                            <td>Mobile Number</td>
                            <td>{invoiceData.student_detail.mobile_num}</td>
                          </tr>
                          <tr>
                            <td>Paid Amount</td>
                            <td>{numberWithCommas(invoiceData.total_amount)}/-</td>
                          </tr>
                          <tr>
                            <td>Paid Amount In Words</td>
                            <td>{getAmountInWords(invoiceData.total_amount)}</td>
                          </tr>
                          <tr>
                            <td>Pending Amount</td>
                            <td>{numberWithCommas(invoiceData.pending_amount)}</td>
                          </tr>
                          <tr>
                            <td>Signature</td>
                            <td></td>
                          </tr>
                          <tr>
                            <td colSpan='2'> (Paid Fees Cannot be Returned back)</td>
                          </tr>
                        </tbody>
                      </table>
                  </div>
                  <div className="footer-gurukula">
                    <table className='w-100'>
                      <thead>
                      <tr>
                        <td>Reciept Number : {invoiceData.receipt_num} </td>
                        <td>Date: {dateFormat(invoiceData.transaction_date, 'DD-MM-YYYY')} </td>
                        <td>Amount: {numberWithCommas(invoiceData.total_amount)} </td>
                      </tr>
                      </thead>
                    </table>
                  </div>
              </div>
            </div>
          }
        </Grid>
      </Grid>
      </div>
    )
  }
}
