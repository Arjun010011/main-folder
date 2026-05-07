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

export default class GurukulaMiscReciept extends Component {

    render() {
        const { invoiceData } = this.props;
        let isEmpty = false;
        if (invoiceData && Object.keys(invoiceData).length === 0 && invoiceData.constructor === Object) {
            isEmpty = true;
        }
        let totalAmount = 0;
        let miscType = '';
        if ('payment_details' in invoiceData) {
            invoiceData['payment_details'].map((data) => {
                totalAmount += data['amount'];
                miscType += data['misc_type_name'] + ", ";
            })
        }
        return (
            <div>
                <Grid contianer>
                    <Grid item lg={8} xl={12} style={{ marginLeft: 'auto', marginRight: 'auto' }}>
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
                                                    <td style={{ width: '15%', textAlign: 'left' }}>
                                                        {invoiceData.institute_detail.company_id === 3 &&
                                                            <img className="gurukula-img-head" src={gurukula1Icon} alt="" />
                                                        }
                                                    </td>
                                                    <td style={{ width: '70%', textAlign: 'center' }}>
                                                        {invoiceData.institute_detail.name} <br />
                                                        {invoiceData.institute_detail.trust}
                                                    </td>
                                                    <td style={{ width: '15%', textAlign: 'right' }}>
                                                        {invoiceData.institute_detail.company_id === 3 &&
                                                            <img className="gurukula-img-head" src={gurukulaIcon} alt="" />
                                                        }
                                                    </td>
                                                </tr>
                                            </thead>
                                        </table>
                                    </div> <hr style={{ margin: '0px' }} />
                                    <div className="gurukula-body-main">
                                        <table className='w-100'>
                                            <tbody className='gurukula-invoice-tbody'>
                                                <tr>
                                                    <td>School Name</td>
                                                    <td>{invoiceData.institute_detail.name}</td>
                                                </tr>
                                                <tr>
                                                    <td>Date</td>
                                                    <td>{dateFormat(invoiceData.date, 'DD-MM-YYYY')}</td>
                                                </tr>
                                                <tr>
                                                    <td>Reciept Number</td>
                                                    <td>{invoiceData.receipt_num}</td>
                                                </tr>
                                                {invoiceData.student_first_name &&
                                                    (
                                                        <tr>
                                                            <td>Student Name</td>
                                                            <td>{invoiceData.student_first_name} {invoiceData.student_middle_name} {invoiceData.student_last_name}</td>
                                                        </tr>
                                                    )

                                                }
                                                {invoiceData.guest_name &&
                                                    (
                                                        <tr>
                                                            <td>Guest Name</td>
                                                            <td>{invoiceData.guest_name} </td>
                                                        </tr>
                                                    )

                                                }

                                                <tr>
                                                    <td>Miscellaneous</td>
                                                    <td>{miscType}</td>
                                                </tr>
                                                <tr>
                                                    <td>Amount</td>
                                                    <td>{numberWithCommas(totalAmount)}/-</td>
                                                </tr>
                                                <tr>
                                                    <td>Total Amount In Words</td>
                                                    <td>{getAmountInWords(totalAmount)}</td>
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
                                                    <td>Date: {dateFormat(invoiceData.date, 'DD-MM-YYYY')} </td>
                                                    <td>Amount: {numberWithCommas(totalAmount)} </td>
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
