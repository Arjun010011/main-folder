import React, { Component } from 'react'
import ReactToPrint from 'react-to-print';
import GetAppRoundedIcon from '@material-ui/icons/GetAppRounded';
import {
    Button, Box, Grid
} from '@material-ui/core';
import { numberWithCommas, getAmountInWords, dateFormat } from 'Includes/functions';
import './styles.scss';
import gurukulaIcon from './images/gurukula.jpeg';
import gurukula1Icon from './images/gurukula1.jpg';

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function differenceInMonths(startDate, endDate) {
    let startYear = parseInt(startDate.getFullYear());
    let endYear = parseInt(endDate.getFullYear());
    let dates = [];
    let return_data = []
    for (var i = startYear; i <= endYear; i++) {
        var endMonth = i != endYear ? 11 : parseInt(endDate.getMonth());
        var startMon = i === startYear ? parseInt(startDate.getMonth()) : 0;
        for (var j = startMon; j <= endMonth; j = j > 12 ? j % 12 || 11 : j + 1) {
            var month = j + 1;
            var displayMonth = month < 10 ? '0' + month : month;
            dates.push(new Date([i, displayMonth, '01'].join('-')));
        }
    }
    dates.map((data) => {
        return_data.push(monthNames[data.getMonth()])
    })
    return return_data;
}

export default class GurukulaFeeReciept extends Component {

    getMonthNames = (start_date, end_date) => {
        let months = differenceInMonths(new Date(start_date), new Date(end_date))
        return months
        // return `Monthly Fee ${months.join(' ')}`
    }

    render() {
        const { invoiceData } = this.props;
        let updatedInvoiceData = { ...invoiceData }

        let fee_plan = {}
        let months = []
        let isAdmissionFees = false
        let isDFFees = false
        if ('payment_detail' in updatedInvoiceData) {
            updatedInvoiceData['invloice_list'] = []
            updatedInvoiceData['payment_detail'].map((data) => {
                if (data.standard_fee_id in updatedInvoiceData.fee_plan_mapping_data) {
                    updatedInvoiceData.fee_plan_mapping_data[data.standard_fee_id].map((feePlan) => {
                        if (feePlan.id === data.fee_plan) {
                            if (updatedInvoiceData.fee_plan_mapping_data[data.standard_fee_id].length > 1) {
                                isAdmissionFees = true
                                months = []
                                if (data.standard_fee_id in fee_plan) {
                                    data['amount_paid'] = parseFloat(fee_plan[data.standard_fee_id]['amount_paid']) + parseFloat(data['amount_paid'])
                                    months = this.getMonthNames(fee_plan[data.standard_fee_id]['term_start_date'], feePlan['term_end_date'])
                                    data['fee_alias'] = `Monthly Fee ${months.join(' ')}`
                                    data['amount_rate'] = Math.round(data['amount_paid'] / months.length * 100) / 100
                                }
                                else {
                                    months = this.getMonthNames(feePlan['term_start_date'], feePlan['term_end_date'])
                                    data['fee_alias'] = `Monthly Fee ${months.join(' ')}`
                                    data['amount_rate'] = Math.round(data['amount_paid'] / months.length * 100) / 100
                                    data['term_start_date'] = feePlan['term_start_date']
                                    data['term_end_date'] = feePlan['term_end_date']
                                }
                            }
                            else {
                                isDFFees=true
                                data['fee_alias'] = data['fee_type_name']
                                data['amount_rate'] = data['amount_paid']
                            }
                            fee_plan[data.standard_fee_id] = data
                        }
                    })
                }
            })
            Object.keys(fee_plan).map((data) => {
                updatedInvoiceData['invloice_list'].push(fee_plan[data])
            })
        }
        let isEmpty = false;
        if (updatedInvoiceData && Object.keys(updatedInvoiceData).length === 0 && updatedInvoiceData.constructor === Object) {
            isEmpty = true;
        }
        return (
            <div>
                <Grid contianer>
                    <Grid item lg={5} xl={12} style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                        <Box className="submt-button-float-bottom">
                            <ReactToPrint
                                pageStyle={`{ size: 5.83in 5.83in }`}
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
                                <div className='gurukula1' style={{ fontSize: '10px', marginTop: '40px', marginLeft: '110px', marginRight: 'auto', width: '450px' }}>
                                    <div className="display-flex">
                                        <table className='w-100'>
                                            <thead className="gurukula1-letter-head">
                                                <tr>
                                                    <td style={{ width: '70%', textAlign: 'center', textTransform: 'uppercase' }}>
                                                        {updatedInvoiceData.institute_detail.name} <br />
                                                        {updatedInvoiceData?.institute_address?.map_address_data?.address_one_map}<br />
                                                        {`${updatedInvoiceData?.institute_address?.map_address_data?.city_map} - ${updatedInvoiceData?.institute_address?.map_address_data?.pincode_map.toString().slice(-2)}`}
                                                    </td>
                                                </tr>
                                            </thead>
                                        </table>
                                    </div>
                                    <table className='w-100' CELLSPACING={0} style={{ marginTop: '10px' }}>
                                        <thead className="gurukula1-letter-head">
                                            <tr>
                                                <td style={{ width: '50%', borderLeft: '1px solid', borderTop: '1px solid', borderBottom: '1px solid' }}>
                                                    Fee Reciept
                                                </td>
                                                <td style={{ textAlign: 'end', width: '50%', border: '1px solid' }}>
                                                    Academic Year:{`${new Date(updatedInvoiceData.academic_year.start_date).getFullYear()}-${new Date(updatedInvoiceData.academic_year.end_date).getFullYear()}`}
                                                </td>
                                            </tr>
                                        </thead>
                                    </table>
                                    <div className="gurukula1-body-main" style={{ marginTop: '10px' }}>
                                        <table className='w-100' cellSpacing={0}>
                                            <tbody className='gurukula1-invoice-tbody'>
                                                <tr>
                                                    <td style={{ width: '20%', borderLeft: '1px solid', borderTop: '1px solid', borderBottom: '1px solid' }}>Date</td>
                                                    <td style={{ width: '30%', borderLeft: '1px solid', borderTop: '1px solid', borderBottom: '1px solid' }}>{dateFormat(updatedInvoiceData.transaction_date, 'DD-MM-YYYY')}</td>
                                                    <td style={{ width: '25%', borderLeft: '1px solid', borderTop: '1px solid', borderBottom: '1px solid' }}>
                                                        Reciept No.
                                                    </td>
                                                    <td style={{ width: '25%', border: '1px solid' }}>
                                                        {updatedInvoiceData.receipt_num}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <table className='w-100' cellSpacing={0}>
                                            <tbody className='gurukula1-invoice-tbody'>
                                                <tr>
                                                    <td style={{ height: '40px', width: '30%', borderLeft: '1px solid', borderBottom: '1px solid' }}>Name</td>
                                                    <td style={{ width: '70%', borderLeft: '1px solid', borderRight: '1px solid', borderBottom: '1px solid' }}>{updatedInvoiceData.student_detail.first_name} {updatedInvoiceData.student_detail.middle_name} {updatedInvoiceData.student_detail.last_name}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ height: '40px', width: '30%', borderLeft: '1px solid', borderBottom: '1px solid' }}>Class</td>
                                                    <td style={{ width: '70%', borderLeft: '1px solid', borderRight: '1px solid', borderBottom: '1px solid' }}>
                                                        {updatedInvoiceData.student_detail.standard}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style={{ height: '40px', width: '30%', borderLeft: '1px solid', borderBottom: '1px solid' }}>Admission No.</td>
                                                    <td style={{ width: '70%', borderLeft: '1px solid', borderRight: '1px solid', borderBottom: '1px solid' }}>
                                                        {updatedInvoiceData.student_detail.admission_num}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="footer1-gurukula">
                                        <table className='w-100' cellSpacing={0}>
                                            <tbody className='gurukula1-invoice-tbody'>
                                                <tr>
                                                    <th style={{ height: '40px', width: '10%', borderLeft: '1px solid', borderTop: '1px solid', borderBottom: '1px solid' }}>
                                                        Sl.
                                                    </th>
                                                    <th style={{ height: '40px', width: '60%', borderLeft: '1px solid', borderTop: '1px solid', borderBottom: '1px solid' }}>
                                                        Particulars
                                                    </th>
                                                    <th style={{ height: '40px', width: '15%', borderLeft: '1px solid', borderTop: '1px solid', borderBottom: '1px solid', textAlign: 'right' }}>
                                                        Rate
                                                    </th>
                                                    <th style={{ height: '40px', width: '15%', borderLeft: '1px solid', borderRight: '1px solid', borderTop: '1px solid', borderBottom: '1px solid', textAlign: 'right' }}>
                                                        Amount
                                                    </th>
                                                </tr>
                                                {updatedInvoiceData.invloice_list.map((data, index) => {
                                                    return <tr>
                                                        <td style={{ height: '40px', width: '10%', borderLeft: '1px solid', borderBottom: '1px solid' }}>{index + 1}.</td>
                                                        <td style={{ height: '40px', width: '60%', borderLeft: '1px solid', borderBottom: '1px solid' }}>
                                                            {data.fee_alias}
                                                        </td>
                                                        <td style={{ height: '40px', width: '15%', borderLeft: '1px solid', borderBottom: '1px solid', textAlign: 'right' }}>{data.amount_rate}</td>
                                                        <td style={{ height: '40px', width: '15%', borderLeft: '1px solid', borderRight: '1px solid', borderBottom: '1px solid', textAlign: 'right' }}>{data.amount_paid}</td>
                                                    </tr>
                                                })}
                                            </tbody>
                                        </table>
                                        <table className='w-100 mt-20' cellSpacing={0}>
                                            <tbody className='gurukula1-invoice-tbody'>
                                                <tr>
                                                    <th style={{ height: '40px', width: '70%', borderLeft: '1px solid', borderTop: '1px solid', borderBottom: '1px solid' }}>
                                                        Amount In words
                                                    </th>
                                                    <th style={{ height: '40px', width: '15%', borderLeft: '1px solid', borderTop: '1px solid', borderBottom: '1px solid' }}>
                                                        Total
                                                    </th>
                                                    <th style={{ height: '40px', width: '15%', borderLeft: '1px solid', borderRight: '1px solid', borderTop: '1px solid', borderBottom: '1px solid', textAlign: 'right' }}>
                                                        {updatedInvoiceData.total_amount}
                                                    </th>
                                                </tr>
                                                <tr>
                                                    <td style={{ height: '40px', width: '70%', borderLeft: '1px solid', borderBottom: '1px solid' }}>
                                                        {getAmountInWords(updatedInvoiceData.total_amount)}
                                                        {isAdmissionFees ?
                                                            <div>
                                                                {isDFFees?
                                                                `Paid - Monthly Fee ( ${updatedInvoiceData.student_detail.is_new_student?'New Student':'Old Student'} ) `
                                                                    :
                                                                `Paid - Monthly Fee`
                                                            }
                                                            </div>
                                                            :
                                                            <div>
                                                                {`Paid - ${updatedInvoiceData.student_detail.is_new_student?'New Student':'Old Student'}`}
                                                            </div>
                                                        }
                                                    </td>
                                                    <td style={{ height: '40px', width: '15%', borderLeft: '1px solid', borderBottom: '1px solid' }}></td>
                                                    <td style={{ height: '40px', width: '15%', borderRight: '1px solid', borderBottom: '1px solid' }}></td>
                                                </tr>
                                            </tbody>
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
